
import { applyExclusions } from './exclusionEngine.js';
import { resolveDiabetes, DiabetesResolution, DiabetesAttributes } from './diabetesResolver.js';
import { resolveRetinopathy } from './retinopathyResolver.js';
import { evaluatePoisoning, evaluateInsulinPumpFailure } from './poisoningEngine.js';
import { validateHierarchy } from './hierarchyValidator.js';
import { scoreSequence, ScoredCode } from './scoringEngine.js';
import { buildAuditTrail } from './auditEngine.js';
import { flagHcc } from './hccEngine.js';
import { resolveCardiovascular } from './cardiovascularResolver.js';
import { resolveRenal } from './renalResolver.js';
import { resolveInfection } from './infectionResolver.js';
import { resolveGastro } from './gastroResolver.js';
import { resolveRespiratory } from './respiratoryResolver.js';
import { resolveNeoplasm } from './neoplasmResolver.js';
import { resolveTrauma } from './traumaResolver.js';
import { resolveObstetrics } from './obstetricsResolver.js';
import { resolvePsychiatric } from './psychiatricResolver.js';

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

  // 1. Diabetes (Gold Standard)
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

  // 2. Cardiovascular
  const cardio = resolveCardiovascular(text);
  if (cardio) {
    sequence.push({ code: cardio.code, label: cardio.label, triggeredBy: 'cardiovascular_resolution', hcc: false });
    if (cardio.warnings) warnings.push(...cardio.warnings);
  }

  // 3. Renal
  const renal = resolveRenal(text);
  if (renal) {
    sequence.push({ code: renal.code, label: renal.label, triggeredBy: 'renal_resolution', hcc: false });
    if (renal.warnings) warnings.push(...renal.warnings);

    // Add organism code if required
    if (renal.attributes.requires_organism_code && renal.attributes.organism) {
      const organismMap: Record<string, { code: string; label: string }> = {
        'e_coli': { code: 'B96.20', label: 'Unspecified Escherichia coli [E. coli] as the cause of diseases classified elsewhere' },
        'klebsiella': { code: 'B96.1', label: 'Klebsiella pneumoniae [K. pneumoniae] as the cause of diseases classified elsewhere' },
        'proteus': { code: 'B96.4', label: 'Proteus (mirabilis) (morganii) as the cause of diseases classified elsewhere' },
        'pseudomonas': { code: 'B96.5', label: 'Pseudomonas (aeruginosa) (mallei) (pseudomallei) as the cause of diseases classified elsewhere' },
        'enterococcus': { code: 'B95.2', label: 'Enterococcus as the cause of diseases classified elsewhere' }
      };

      const organismInfo = organismMap[renal.attributes.organism];
      if (organismInfo) {
        sequence.push({
          code: organismInfo.code,
          label: organismInfo.label,
          triggeredBy: 'renal_organism',
          hcc: false
        });
      }
    }

    // Add Dialysis Z99.2 if indicated
    if (renal.attributes.on_dialysis) {
      sequence.push({
        code: 'Z99.2',
        label: 'Dependence on renal dialysis',
        triggeredBy: 'renal_resolution_dialysis',
        hcc: true
      });
    }
  }

  // 4. Infection
  const infection = resolveInfection(text);
  if (infection) {
    sequence.push({ code: infection.code, label: infection.label, triggeredBy: 'infection_resolution', hcc: false });
    if (infection.warnings) warnings.push(...infection.warnings);

    // Handle post-procedural sepsis sequencing
    if (infection.attributes.requires_sepsis_code) {
      // Add A41.9 (Sepsis, unspecified organism) as required secondary
      sequence.push({
        code: 'A41.9',
        label: 'Sepsis, unspecified organism',
        triggeredBy: 'infection_sepsis_code',
        hcc: true
      });
    }
  }

  // 5. Gastrointestinal
  const gastro = resolveGastro(text);
  if (gastro) {
    sequence.push({ code: gastro.code, label: gastro.label, triggeredBy: 'gastro_resolution', hcc: false });
    if (gastro.warnings) warnings.push(...gastro.warnings);
  }

  // 6. Respiratory
  const respiratory = resolveRespiratory(text);
  if (respiratory) {
    sequence.push({ code: respiratory.code, label: respiratory.label, triggeredBy: 'respiratory_resolution', hcc: false });
    if (respiratory.warnings) warnings.push(...respiratory.warnings);

    // Handle secondary respiratory conditions
    if (respiratory.attributes.secondary_conditions) {
      if (respiratory.attributes.secondary_conditions.includes('pneumonia')) {
        sequence.push({ code: 'J18.9', label: 'Pneumonia, unspecified organism', triggeredBy: 'respiratory_secondary', hcc: false });
      }
      if (respiratory.attributes.secondary_conditions.includes('copd')) {
        sequence.push({ code: 'J44.9', label: 'Chronic obstructive pulmonary disease, unspecified', triggeredBy: 'respiratory_secondary', hcc: true });
      }
      if (respiratory.attributes.secondary_conditions.includes('asthma')) {
        sequence.push({ code: 'J45.909', label: 'Unspecified asthma, uncomplicated', triggeredBy: 'respiratory_secondary', hcc: false });
      }
      // If primary is Pneumonia/COPD but has Failure as secondary?
      // The resolver logic prioritizes Failure, so Failure is usually primary.
      // But if we add logic for Failure as secondary:
      if (respiratory.attributes.secondary_conditions.includes('respiratory_failure')) {
        sequence.push({ code: 'J96.90', label: 'Respiratory failure, unspecified', triggeredBy: 'respiratory_secondary', hcc: true });
      }
    }
  }

  // 7. Neoplasm
  const neoplasm = resolveNeoplasm(text);
  if (neoplasm) {
    sequence.push({ code: neoplasm.code, label: neoplasm.label, triggeredBy: 'neoplasm_resolution', hcc: false });
    if (neoplasm.warnings) warnings.push(...neoplasm.warnings);
  }

  // 8. Trauma
  const trauma = resolveTrauma(text);
  if (trauma) {
    sequence.push({ code: trauma.code, label: trauma.label, triggeredBy: 'trauma_resolution', hcc: false });
    if (trauma.warnings) warnings.push(...trauma.warnings);
  }

  // 9. Obstetrics
  const obstetrics = resolveObstetrics(text);
  if (obstetrics) {
    sequence.push({ code: obstetrics.code, label: obstetrics.label, triggeredBy: 'obstetrics_resolution', hcc: false });
    if (obstetrics.warnings) warnings.push(...obstetrics.warnings);

    // Add Z3A Weeks of Gestation
    if (obstetrics.attributes.weeks) {
      const w = obstetrics.attributes.weeks;
      let z3a = 'Z3A.00';
      if (w < 8) z3a = 'Z3A.01';
      else if (w >= 8 && w <= 42) z3a = `Z3A.${w}`;
      else if (w > 42) z3a = 'Z3A.49';

      sequence.push({
        code: z3a,
        label: `Weeks of gestation of pregnancy, ${w} weeks`,
        triggeredBy: 'obstetrics_weeks',
        hcc: false
      });
    }
  }

  // 10. Psychiatric
  const psych = resolvePsychiatric(text);
  if (psych) {
    sequence.push({ code: psych.code, label: psych.label, triggeredBy: 'psychiatric_resolution', hcc: false });
    if (psych.warnings) warnings.push(...psych.warnings);
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

  // Deduplicate sequence based on code
  const uniqueSequence = sequence.filter((v, i, a) => a.findIndex(t => t.code === v.code) === i);

  const exclusionResult = applyExclusions(uniqueSequence);
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
