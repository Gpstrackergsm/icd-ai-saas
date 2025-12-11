
import { applySequencingRules } from './sequencingRulesEngine';
import { applyExclusions } from './exclusionEngine';
import { resolveDiabetes, DiabetesResolution, DiabetesAttributes } from './diabetesResolver';
import { resolveRetinopathy } from './retinopathyResolver';
import { evaluatePoisoning, evaluateInsulinPumpFailure } from './poisoningEngine';
import { validateHierarchy } from './hierarchyValidator';
import { scoreSequence, ScoredCode } from './scoringEngine';
import { buildAuditTrail } from './auditEngine';
import { flagHcc } from './hccEngine';
import { resolveCardiovascular } from './cardiovascularResolver';
import { resolveRenal } from './renalResolver';
import { resolveInfection } from './infectionResolver';
import { resolveGastro } from './gastroResolver';
import { resolveRespiratory } from './respiratoryResolver';
import { resolveNeoplasm } from './neoplasmResolver';
import { resolveTrauma } from './traumaResolver';
import { resolveObstetrics } from './obstetricsResolver';
import { resolvePsychiatric } from './psychiatricResolver';
import { validateSpecificity } from './specificityValidator';
import { validateCompliance } from './complianceValidator';
import { generateRationale, CodeRationale } from './rationaleEngine';
import { calculateConfidence, ConfidenceAssessment } from './confidenceEngine';
import { runValidation } from './validation/validationEngine';
import { parseInput } from './structured/parser';
import { runStructuredRules } from './structured/engine';
import { validateCodeSet } from './structured/validator-post';

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
  errors: string[]; // Added errors field
  audit: string[];
  rationale: CodeRationale[];
  confidence: ConfidenceAssessment;
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
  const errors: string[] = []; // Initialize errors
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

    // Add secondary codes from diabetes resolver (CKD, Ulcers, etc.)
    if (diabetes.secondary_codes) {
      diabetes.secondary_codes.forEach(sc => {
        sequence.push({
          code: sc.code,
          label: sc.label,
          triggeredBy: `diabetes_${sc.type}`,
          hcc: sc.code.startsWith('N18') // HCC for CKD
        });
      });
    }
  }

  // 2. Renal (Run early to catch AKI before cardiovascular handles CKD)
  const renal = resolveRenal(text);
  if (renal) {
    sequence.push({ code: renal.code, label: renal.label, triggeredBy: 'renal_resolution', hcc: false });
    if (renal.warnings) warnings.push(...renal.warnings);

    // Add secondary codes (Organism, Dialysis, etc.)
    if (renal.secondary_codes) {
      renal.secondary_codes.forEach(sc => {
        sequence.push({
          code: sc.code,
          label: sc.label,
          triggeredBy: `renal_${sc.type}`,
          hcc: false
        });
      });
    }
  }

  // 3. Cardiovascular
  const cardio = resolveCardiovascular(text);
  if (cardio) {
    sequence.push({ code: cardio.code, label: cardio.label, triggeredBy: 'cardiovascular_resolution', hcc: false });
    if (cardio.warnings) warnings.push(...cardio.warnings);

    if (cardio.secondary_codes) {
      cardio.secondary_codes.forEach(sc => {
        sequence.push({
          code: sc.code,
          label: sc.label,
          triggeredBy: `cardiovascular_${sc.type}`,
          hcc: sc.code.startsWith('N18') // HCC for CKD
        });
      });
    }
  }

  // 4. Infection
  const infection = resolveInfection(text);
  if (infection) {
    sequence.push({ code: infection.code, label: infection.label, triggeredBy: 'infection_resolution', hcc: false });
    if (infection.warnings) warnings.push(...infection.warnings);

    // Add secondary codes from infection resolver (shock, source, organism, organ dysfunction)
    if (infection.secondary_codes) {
      infection.secondary_codes.forEach(sc => {
        sequence.push({
          code: sc.code,
          label: sc.label,
          triggeredBy: `infection_${sc.type}`,
          hcc: sc.code === 'R65.21' || sc.code === 'A41.9' // HCC for shock and sepsis
        });
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
    if (respiratory.secondary_codes) {
      respiratory.secondary_codes.forEach(sc => {
        sequence.push({
          code: sc.code,
          label: sc.label,
          triggeredBy: `respiratory_${sc.type}`,
          hcc: sc.code.startsWith('J44') // HCC for COPD
        });
      });
    }
  }

  // 7. Neoplasm
  const neoplasm = resolveNeoplasm(text);
  if (neoplasm) {
    sequence.push({ code: neoplasm.code, label: neoplasm.label, triggeredBy: 'neoplasm_resolution', hcc: false });
    if (neoplasm.warnings) warnings.push(...neoplasm.warnings);

    if (neoplasm.secondary_codes) {
      neoplasm.secondary_codes.forEach(sc => {
        sequence.push({
          code: sc.code,
          label: sc.label,
          triggeredBy: `neoplasm_${sc.type}`,
          hcc: false
        });
      });
    }
  }

  // 8. Trauma
  const trauma = resolveTrauma(text);
  if (trauma) {
    sequence.push({ code: trauma.code, label: trauma.label, triggeredBy: 'trauma_resolution', hcc: false });
    if (trauma.warnings) warnings.push(...trauma.warnings);

    // Add secondary codes (pain, external cause) in correct order
    if (trauma.secondary_codes) {
      // Pain codes come first (after injury)
      trauma.secondary_codes
        .filter(sc => sc.type === 'pain')
        .forEach(sc => {
          sequence.push({
            code: sc.code,
            label: sc.label,
            triggeredBy: 'trauma_pain',
            hcc: false
          });
        });

      // External cause codes come last
      trauma.secondary_codes
        .filter(sc => sc.type === 'external_cause')
        .forEach(sc => {
          sequence.push({
            code: sc.code,
            label: sc.label,
            triggeredBy: 'trauma_external_cause',
            hcc: false
          });
        });
    }
  }

  // 9. Obstetrics
  // 9. Obstetrics (switched to v2.1 Structured Engine)
  // const obstetrics = resolveObstetrics(text);
  const { context: obContext } = parseInput(text);

  // Only run if OB indicators are present
  if (obContext.conditions.obstetric?.pregnant || obContext.conditions.obstetric?.delivery?.occurred) {
    const obResults = runStructuredRules(obContext);
    const obValidated = validateCodeSet(obResults.primary, obResults.secondary, obContext);

    obValidated.codes.forEach(c => {
      sequence.push({
        code: c.code,
        label: c.label,
        triggeredBy: `structured_engine_${c.rule || 'rule'}`,
        hcc: false // Will be re-calculated by flagHcc
      });
    });

    if (obResults.warnings) warnings.push(...obResults.warnings);
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

  // Apply ICD-10-CM sequencing rules
  const sequencingResult = applySequencingRules(uniqueSequence);
  errors.push(...sequencingResult.errors);
  warnings.push(...sequencingResult.warnings);

  // Use sequenced codes from sequencing engine
  const sequencedCodes = sequencingResult.sequencedCodes;

  const exclusionResult = applyExclusions(sequencedCodes);
  errors.push(...exclusionResult.errors);

  const hierarchyResult = validateHierarchy(exclusionResult.filtered);
  warnings.push(...hierarchyResult.warnings);

  // ... (inside runRulesEngine, before final return)

  const withHcc = flagHcc(hierarchyResult.filtered);
  const scored = scoreSequence(withHcc, warnings);

  // Phase 4: Specificity and Compliance Validation
  const specificityResult = validateSpecificity(withHcc); // Check against filtered list
  warnings.push(...specificityResult.warnings);

  const complianceResult = validateCompliance(withHcc);
  warnings.push(...complianceResult.warnings);

  // STICT VALIDATION (High Risk Rules)
  // We pass 'text' as context for now, ideally we'd pass parsed object
  const validationResult = runValidation(withHcc, { text });
  warnings.push(...validationResult.warnings);
  // Errors from validation are hard stops
  errors.push(...validationResult.errors);

  // Build audit trail with sequencing rationale
  const audit = buildAuditTrail(scored, warnings);
  sequencingResult.rationale.forEach(r => audit.push(`[SEQUENCING] ${r}`));

  const finalSequence = scored.map(({ score, ...rest }) => rest);

  // Phase 5: Generate Rationale and Confidence
  const rationaleResult = generateRationale(withHcc, warnings);
  const confidenceResult = calculateConfidence(withHcc, warnings);

  // Add rationale summary to audit trail
  audit.push(`\n[RATIONALE] ${rationaleResult.summary}`);
  audit.push(`[CONFIDENCE] Overall: ${confidenceResult.overallConfidence}% - ${confidenceResult.explanation}`);

  if (!hierarchyResult.valid || !exclusionResult.valid || !sequencingResult.valid || !validationResult.isValid) {
    return {
      sequence: [],
      attributes,
      warnings,
      errors, // Return errors
      audit,
      rationale: [],
      confidence: { overallConfidence: 0, factors: [], explanation: 'Validation failed' }
    };
  }

  return {
    sequence: finalSequence,
    attributes,
    warnings,
    errors, // Return errors
    audit,
    rationale: rationaleResult.rationales,
    confidence: confidenceResult
  };
}
