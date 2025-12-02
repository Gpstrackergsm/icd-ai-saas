import { applyExclusions } from './exclusionEngine.js';
import { resolveDiabetes, DiabetesResolution, DiabetesAttributes } from './diabetesResolver.js';
import { resolveRetinopathy } from './retinopathyResolver.js';
import { evaluatePoisoning, evaluateInsulinPumpFailure } from './poisoningEngine.js';
import { validateHierarchy } from './hierarchyValidator.js';
import { scoreSequence, ScoredCode } from './scoringEngine.js';
import { buildAuditTrail } from './auditEngine.js';
import { flagHcc } from './hccEngine.js';

export interface SequencedCode {
  code: string;
  label: string;
  triggeredBy: string;
  hcc: boolean;
  note?: string;
}

export interface EngineResult {
  sequence: Array<Omit<ScoredCode, 'score'>>;
  attributes: DiabetesAttributes;
  warnings: string[];
  audit: string[];
}

function mapCkdStageToCode(stage: 1 | 2 | 3 | 4 | 5 | 'ESRD'): string | undefined {
  switch (stage) {
    case 1: return 'N18.1';
    case 2: return 'N18.2';
    case 3: return 'N18.3';
    case 4: return 'N18.4';
    case 5:
    case 'ESRD': return 'N18.5';
    default: return undefined;
  }
}

function diabetesEntry(resolution: DiabetesResolution): SequencedCode {
  return {
    code: resolution.code,
    label: resolution.label,
    triggeredBy: 'diabetes_resolution',
    hcc: false,
  };
}

export function runRulesEngine(text: string): EngineResult {
  const warnings: string[] = [];
  const diabetes = resolveDiabetes(text);
  let attributes: DiabetesAttributes = diabetes?.attributes || {
    diabetes_type: 'E11',
    complication: 'none',
    cause: undefined,
    pump_failure: false,
    overdose_or_underdose: 'none',
    laterality: 'unspecified',
    stage: undefined,
    macular_edema: false,
    neuropathy_type: undefined,
    ckd_stage: undefined,
    charcot_joint: false,
    charcot_laterality: 'unspecified',
  };

  const sequence: SequencedCode[] = [];

  if (diabetes) {
    warnings.push(...(diabetes.warnings || []));
    sequence.push(diabetesEntry(diabetes));

    // Add retinopathy secondary code if applicable
    if (diabetes.attributes.complication === 'retinopathy') {
      const ret = resolveRetinopathy(diabetes.attributes);
      if (ret?.code) {
        sequence.push({
          code: ret.code,
          label: ret.label || 'Diabetic retinopathy',
          triggeredBy: 'retinopathy_resolution',
          hcc: false,
        });
      }
      warnings.push(...(ret?.warnings || []));
    }

    // Add CKD secondary code if nephropathy detected
    if (diabetes.attributes.complication === 'nephropathy' && diabetes.attributes.ckd_stage) {
      const ckdCode = mapCkdStageToCode(diabetes.attributes.ckd_stage);
      if (ckdCode) {
        sequence.push({
          code: ckdCode,
          label: `Chronic kidney disease, stage ${diabetes.attributes.ckd_stage}`,
          triggeredBy: 'nephropathy_resolution',
          hcc: true,
        });
      }
    }
  }

  // Drug-induced diabetes adverse effects: diabetes first then adverse-effect T code
  if (diabetes?.attributes.cause === 'drug' && /adverse effect/.test(text.toLowerCase())) {
    sequence.push({
      code: 'T50.905A',
      label: 'Adverse effect of unspecified drug',
      triggeredBy: 'drug_induced_diabetes',
      hcc: false,
    });
  }

  const pump = evaluateInsulinPumpFailure(text, sequence[0]);
  if (pump.matched) {
    attributes.overdose_or_underdose = pump.intent === 1 ? 'overdose' : 'underdose';
    attributes.pump_failure = true;
    sequence.splice(0, sequence.length, ...pump.sequence);
  } else {
    const poison = evaluatePoisoning(text);
    if (poison.matched) {
      warnings.push(...poison.warnings);
      const diabetesIsDrugInduced = diabetes?.attributes.cause === 'drug';
      if (poison.intent === 5 && diabetesIsDrugInduced) {
        sequence.push(...poison.sequence);
      } else {
        sequence.unshift(...poison.sequence);
      }
    }
  }

  const exclusionResult = applyExclusions(sequence);
  warnings.push(...exclusionResult.errors);

  const hierarchyResult = validateHierarchy(exclusionResult.filtered);
  warnings.push(...hierarchyResult.warnings);

  const withHcc = flagHcc(hierarchyResult.filtered);
  const scored = scoreSequence(withHcc, warnings);
  const audit = buildAuditTrail(scored, warnings);

  const finalSequence = scored.map(({ score, ...rest }) => rest);

  if (!hierarchyResult.valid || !exclusionResult.valid) {
    return { sequence: [], attributes, warnings, audit };
  }

  return { sequence: finalSequence, attributes, warnings, audit };
}
