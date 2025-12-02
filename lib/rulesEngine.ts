import { applyExclusions, ExclusionResult } from './exclusionEngine';
import { resolveDiabetes, DiabetesAttributes } from './diabetesResolver';

export interface SequencedCode {
  code: string;
  label: string;
  rule_triggered: string;
  note?: string;
}

export interface EngineResult {
  sequence: SequencedCode[];
  attributes: DiabetesAttributes & {
    complication?: string;
    cause?: string;
  };
  warnings: string[];
}

function buildPumpMechanicalCode(intent: 'overdose' | 'underdose'): SequencedCode {
  const seventh = 'A';
  const mechCode = intent === 'overdose' ? 'T85.695' : 'T85.614';
  return {
    code: `${mechCode}${seventh}`,
    label: 'Mechanical complication of insulin pump',
    rule_triggered: 'insulin_pump_failure',
  };
}

function buildInsulinExposureCode(intent: 'overdose' | 'underdose'): SequencedCode {
  const seventh = 'A';
  if (intent === 'overdose') {
    return {
      code: `T38.3X1${seventh}`,
      label: 'Poisoning by insulin and oral hypoglycemics, accidental',
      rule_triggered: 'insulin_pump_failure',
    };
  }
  return {
    code: `T38.3X6${seventh}`,
    label: 'Underdosing of insulin and oral hypoglycemics',
    rule_triggered: 'insulin_pump_failure',
  };
}

function mapDiabetesCodeForPump(intent: 'overdose' | 'underdose', text: string): SequencedCode | undefined {
  const resolved = resolveDiabetes(text);
  if (!resolved) return undefined;
  const diabetesCode = resolved.code;
  if (intent === 'overdose' && /\.64/.test(diabetesCode)) {
    return {
      code: diabetesCode,
      label: 'Diabetes with hypoglycemia',
      rule_triggered: 'insulin_pump_failure',
    };
  }
  if (intent === 'underdose' && /\.65/.test(diabetesCode)) {
    return {
      code: diabetesCode,
      label: 'Diabetes with hyperglycemia',
      rule_triggered: 'insulin_pump_failure',
    };
  }
  if (intent === 'overdose' && /hypoglyc/.test(text.toLowerCase())) {
    return {
      code: diabetesCode.replace(/\.9$/, '.649'),
      label: 'Diabetes with hypoglycemia',
      rule_triggered: 'insulin_pump_failure',
    };
  }
  if (intent === 'underdose' && /hyperglyc/.test(text.toLowerCase())) {
    return {
      code: diabetesCode.replace(/\.9$/, '.65'),
      label: 'Diabetes with hyperglycemia',
      rule_triggered: 'insulin_pump_failure',
    };
  }
  return {
    code: diabetesCode,
    label: 'Diabetes mellitus',
    rule_triggered: 'diabetes_resolution',
  };
}

function evaluatePumpFailure(text: string): { matched: boolean; intent?: 'overdose' | 'underdose'; sequence: SequencedCode[] } {
  const lower = text.toLowerCase();
  const hasPump = /insulin pump/.test(lower);
  if (!hasPump) return { matched: false, sequence: [] };

  const underdose = /(underdos|too little|missed bolus|hyperglyc)/.test(lower);
  const overdose = /(overdos|too much|extra dose|hypoglyc)/.test(lower);
  const intent = underdose && !overdose ? 'underdose' : overdose ? 'overdose' : undefined;
  if (!intent) return { matched: false, sequence: [] };

  const sequence: SequencedCode[] = [];
  sequence.push(buildPumpMechanicalCode(intent));
  sequence.push(buildInsulinExposureCode(intent));
  const diabetesCode = mapDiabetesCodeForPump(intent, text);
  if (diabetesCode) sequence.push(diabetesCode);

  return { matched: true, intent, sequence };
}

function enforceDrugInducedDiabetes(text: string, sequence: SequencedCode[]): SequencedCode[] {
  const lower = text.toLowerCase();
  const isAdverse = /adverse effect/.test(lower);
  const isPoison = /(poison|overdos)/.test(lower);
  const diabetes = resolveDiabetes(text);
  if (!diabetes) return sequence;

  if (isAdverse && diabetes.code.startsWith('E09')) {
    return [
      { code: diabetes.code, label: 'Drug-induced diabetes mellitus', rule_triggered: 'drug_induced_diabetes' },
      {
        code: 'T50.905A',
        label: 'Adverse effect of unspecified drug',
        rule_triggered: 'drug_induced_diabetes',
      },
    ];
  }

  if (isPoison) {
    return [
      {
        code: 'T50.901A',
        label: 'Poisoning by unspecified drug',
        rule_triggered: 'drug_induced_diabetes',
      },
      { code: diabetes.code, label: 'Drug-induced diabetes mellitus', rule_triggered: 'drug_induced_diabetes' },
    ];
  }

  return sequence.length ? sequence : [{ code: diabetes.code, label: 'Diabetes mellitus', rule_triggered: 'diabetes_resolution' }];
}

export function runRulesEngine(text: string): EngineResult {
  const warnings: string[] = [];
  const pump = evaluatePumpFailure(text);
  let sequence: SequencedCode[] = [];
  let attributes: DiabetesAttributes & { complication?: string; cause?: string } = {
    diabetes_type: 'E11',
    complication: 'none',
    cause: undefined,
    pump_failure: false,
    overdose_or_underdose: 'none',
  };

  if (pump.matched && pump.intent) {
    sequence = pump.sequence;
    const resolved = resolveDiabetes(text);
    if (resolved) {
      attributes = { ...resolved.attributes, complication: resolved.attributes.complication };
      attributes.overdose_or_underdose = pump.intent === 'overdose' ? 'overdose' : 'underdose';
      attributes.pump_failure = true;
    }
  } else {
    const diabetes = resolveDiabetes(text);
    if (diabetes) {
      attributes = { ...diabetes.attributes, complication: diabetes.attributes.complication };
    }
    sequence = enforceDrugInducedDiabetes(text, sequence);
  }

  const exclusionResult: ExclusionResult = applyExclusions(sequence);
  if (!exclusionResult.valid) {
    exclusionResult.errors.forEach((err) => warnings.push(err));
  }

  return { sequence: exclusionResult.filtered, attributes, warnings };
}
