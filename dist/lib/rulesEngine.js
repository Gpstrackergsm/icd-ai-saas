"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runRulesEngine = runRulesEngine;
const sequencingRulesEngine_js_1 = require("./sequencingRulesEngine.js");
const exclusionEngine_js_1 = require("./exclusionEngine.js");
const diabetesResolver_js_1 = require("./diabetesResolver.js");
const retinopathyResolver_js_1 = require("./retinopathyResolver.js");
const poisoningEngine_js_1 = require("./poisoningEngine.js");
const hierarchyValidator_js_1 = require("./hierarchyValidator.js");
const scoringEngine_js_1 = require("./scoringEngine.js");
const auditEngine_js_1 = require("./auditEngine.js");
const hccEngine_js_1 = require("./hccEngine.js");
const cardiovascularResolver_js_1 = require("./cardiovascularResolver.js");
const renalResolver_js_1 = require("./renalResolver.js");
const infectionResolver_js_1 = require("./infectionResolver.js");
const gastroResolver_js_1 = require("./gastroResolver.js");
const respiratoryResolver_js_1 = require("./respiratoryResolver.js");
const neoplasmResolver_js_1 = require("./neoplasmResolver.js");
const traumaResolver_js_1 = require("./traumaResolver.js");
const obstetricsResolver_js_1 = require("./obstetricsResolver.js");
const psychiatricResolver_js_1 = require("./psychiatricResolver.js");
const specificityValidator_js_1 = require("./specificityValidator.js");
const complianceValidator_js_1 = require("./complianceValidator.js");
const rationaleEngine_js_1 = require("./rationaleEngine.js");
const confidenceEngine_js_1 = require("./confidenceEngine.js");
function mapCkdStageToCode(stage) {
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
function diabetesEntry(resolution) {
    return {
        code: resolution.code,
        label: resolution.label,
        triggeredBy: 'diabetes_resolution',
        hcc: false,
    };
}
function runRulesEngine(text) {
    const warnings = [];
    const diabetes = (0, diabetesResolver_js_1.resolveDiabetes)(text);
    let attributes = (diabetes === null || diabetes === void 0 ? void 0 : diabetes.attributes) || {
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
    const sequence = [];
    // 1. Diabetes (Gold Standard)
    if (diabetes) {
        warnings.push(...(diabetes.warnings || []));
        sequence.push(diabetesEntry(diabetes));
        // Add retinopathy secondary code if applicable
        if (diabetes.attributes.complication === 'retinopathy') {
            const ret = (0, retinopathyResolver_js_1.resolveRetinopathy)(diabetes.attributes);
            if (ret === null || ret === void 0 ? void 0 : ret.code) {
                sequence.push({
                    code: ret.code,
                    label: ret.label || 'Diabetic retinopathy',
                    triggeredBy: 'retinopathy_resolution',
                    hcc: false,
                });
            }
            warnings.push(...((ret === null || ret === void 0 ? void 0 : ret.warnings) || []));
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
    const renal = (0, renalResolver_js_1.resolveRenal)(text);
    if (renal) {
        sequence.push({ code: renal.code, label: renal.label, triggeredBy: 'renal_resolution', hcc: false });
        if (renal.warnings)
            warnings.push(...renal.warnings);
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
    const cardio = (0, cardiovascularResolver_js_1.resolveCardiovascular)(text);
    if (cardio) {
        sequence.push({ code: cardio.code, label: cardio.label, triggeredBy: 'cardiovascular_resolution', hcc: false });
        if (cardio.warnings)
            warnings.push(...cardio.warnings);
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
    const infection = (0, infectionResolver_js_1.resolveInfection)(text);
    if (infection) {
        sequence.push({ code: infection.code, label: infection.label, triggeredBy: 'infection_resolution', hcc: false });
        if (infection.warnings)
            warnings.push(...infection.warnings);
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
    const gastro = (0, gastroResolver_js_1.resolveGastro)(text);
    if (gastro) {
        sequence.push({ code: gastro.code, label: gastro.label, triggeredBy: 'gastro_resolution', hcc: false });
        if (gastro.warnings)
            warnings.push(...gastro.warnings);
    }
    // 6. Respiratory
    const respiratory = (0, respiratoryResolver_js_1.resolveRespiratory)(text);
    if (respiratory) {
        sequence.push({ code: respiratory.code, label: respiratory.label, triggeredBy: 'respiratory_resolution', hcc: false });
        if (respiratory.warnings)
            warnings.push(...respiratory.warnings);
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
    const neoplasm = (0, neoplasmResolver_js_1.resolveNeoplasm)(text);
    if (neoplasm) {
        sequence.push({ code: neoplasm.code, label: neoplasm.label, triggeredBy: 'neoplasm_resolution', hcc: false });
        if (neoplasm.warnings)
            warnings.push(...neoplasm.warnings);
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
    const trauma = (0, traumaResolver_js_1.resolveTrauma)(text);
    if (trauma) {
        sequence.push({ code: trauma.code, label: trauma.label, triggeredBy: 'trauma_resolution', hcc: false });
        if (trauma.warnings)
            warnings.push(...trauma.warnings);
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
    const obstetrics = (0, obstetricsResolver_js_1.resolveObstetrics)(text);
    if (obstetrics) {
        sequence.push({ code: obstetrics.code, label: obstetrics.label, triggeredBy: 'obstetrics_resolution', hcc: false });
        if (obstetrics.warnings)
            warnings.push(...obstetrics.warnings);
        // Add secondary codes (Z3A, Z37, etc.)
        if (obstetrics.secondary_codes) {
            obstetrics.secondary_codes.forEach(sc => {
                sequence.push({
                    code: sc.code,
                    label: sc.label,
                    triggeredBy: `obstetrics_${sc.type}`,
                    hcc: false
                });
            });
        }
    }
    // 10. Psychiatric
    const psych = (0, psychiatricResolver_js_1.resolvePsychiatric)(text);
    if (psych) {
        sequence.push({ code: psych.code, label: psych.label, triggeredBy: 'psychiatric_resolution', hcc: false });
        if (psych.warnings)
            warnings.push(...psych.warnings);
    }
    // Drug-induced diabetes adverse effects: diabetes first then adverse-effect T code
    if ((diabetes === null || diabetes === void 0 ? void 0 : diabetes.attributes.cause) === 'drug' && /adverse effect/.test(text.toLowerCase())) {
        sequence.push({
            code: 'T50.905A',
            label: 'Adverse effect of unspecified drug',
            triggeredBy: 'drug_induced_diabetes',
            hcc: false,
        });
    }
    const pump = (0, poisoningEngine_js_1.evaluateInsulinPumpFailure)(text, sequence[0]);
    if (pump.matched) {
        attributes.overdose_or_underdose = pump.intent === 1 ? 'overdose' : 'underdose';
        attributes.pump_failure = true;
        sequence.splice(0, sequence.length, ...pump.sequence);
    }
    else {
        const poison = (0, poisoningEngine_js_1.evaluatePoisoning)(text);
        if (poison.matched) {
            warnings.push(...poison.warnings);
            const diabetesIsDrugInduced = (diabetes === null || diabetes === void 0 ? void 0 : diabetes.attributes.cause) === 'drug';
            if (poison.intent === 5 && diabetesIsDrugInduced) {
                sequence.push(...poison.sequence);
            }
            else {
                sequence.unshift(...poison.sequence);
            }
        }
    }
    // Deduplicate sequence based on code
    const uniqueSequence = sequence.filter((v, i, a) => a.findIndex(t => t.code === v.code) === i);
    // Apply ICD-10-CM sequencing rules
    const sequencingResult = (0, sequencingRulesEngine_js_1.applySequencingRules)(uniqueSequence);
    warnings.push(...sequencingResult.errors);
    warnings.push(...sequencingResult.warnings);
    // Use sequenced codes from sequencing engine
    const sequencedCodes = sequencingResult.sequencedCodes;
    const exclusionResult = (0, exclusionEngine_js_1.applyExclusions)(sequencedCodes);
    warnings.push(...exclusionResult.errors);
    const hierarchyResult = (0, hierarchyValidator_js_1.validateHierarchy)(exclusionResult.filtered);
    warnings.push(...hierarchyResult.warnings);
    // ... (inside runRulesEngine, before final return)
    const withHcc = (0, hccEngine_js_1.flagHcc)(hierarchyResult.filtered);
    const scored = (0, scoringEngine_js_1.scoreSequence)(withHcc, warnings);
    // Phase 4: Specificity and Compliance Validation
    const specificityResult = (0, specificityValidator_js_1.validateSpecificity)(withHcc); // Check against filtered list
    warnings.push(...specificityResult.warnings);
    const complianceResult = (0, complianceValidator_js_1.validateCompliance)(withHcc);
    warnings.push(...complianceResult.warnings);
    // Build audit trail with sequencing rationale
    const audit = (0, auditEngine_js_1.buildAuditTrail)(scored, warnings);
    sequencingResult.rationale.forEach(r => audit.push(`[SEQUENCING] ${r}`));
    const finalSequence = scored.map(({ score, ...rest }) => rest);
    // Phase 5: Generate Rationale and Confidence
    const rationaleResult = (0, rationaleEngine_js_1.generateRationale)(withHcc, warnings);
    const confidenceResult = (0, confidenceEngine_js_1.calculateConfidence)(withHcc, warnings);
    // Add rationale summary to audit trail
    audit.push(`\n[RATIONALE] ${rationaleResult.summary}`);
    audit.push(`[CONFIDENCE] Overall: ${confidenceResult.overallConfidence}% - ${confidenceResult.explanation}`);
    if (!hierarchyResult.valid || !exclusionResult.valid || !sequencingResult.valid) {
        return {
            sequence: [],
            attributes,
            warnings,
            audit,
            rationale: [],
            confidence: { overallConfidence: 0, factors: [], explanation: 'Validation failed' }
        };
    }
    return {
        sequence: finalSequence,
        attributes,
        warnings,
        audit,
        rationale: rationaleResult.rationales,
        confidence: confidenceResult
    };
}
