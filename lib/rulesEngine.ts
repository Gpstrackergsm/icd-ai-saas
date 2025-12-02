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
  };

  const sequence: SequencedCode[] = [];

  if (diabetes) {
    warnings.push(...(diabetes.warnings || []));
    sequence.push(diabetesEntry(diabetes));
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
