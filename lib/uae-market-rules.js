/**
 * UAE Market Rules Module
 * 
 * Implements UAE (Daman/Shafafiya) specific coding rules that override
 * strict CMS constraints when UAE market is selected.
 * 
 * CRITICAL: This module ONLY applies when marketProfile === 'UAE'
 */

// ============================================================================
// DIAGNOSTIC TEST MAPPINGS
// ============================================================================

const DIAGNOSTIC_TESTS = {
    'rapid strep': {
        positivePattern: /rapid strep.*positive|positive.*rapid strep/i,
        diagnosis: { code: 'J02.0', description: 'Streptococcal pharyngitis' },
        reason: 'Diagnostic-test-derived – UAE rules (Rapid Strep Test positive)'
    },
    'covid pcr': {
        positivePattern: /covid.*pcr.*positive|positive.*covid.*pcr|sars-cov-2.*detected/i,
        diagnosis: { code: 'U07.1', description: 'COVID-19' },
        reason: 'Diagnostic-test-derived – UAE rules (COVID PCR positive)'
    },
    'covid rapid': {
        positivePattern: /covid.*rapid.*positive|positive.*covid.*rapid|covid.*antigen.*positive|rapid covid.*positive/i,
        diagnosis: { code: 'U07.1', description: 'COVID-19' },
        reason: 'Diagnostic-test-derived – UAE rules (COVID rapid test positive)'
    },
    'troponin': {
        positivePattern: /troponin.*elevated|elevated.*troponin|troponin.*positive/i,
        requiresContext: /chest pain|acs|acute coronary|myocardial/i,
        diagnosis: { code: 'I21.9', description: 'Acute myocardial infarction, unspecified' },
        reason: 'Diagnostic-test-derived – UAE rules (Elevated troponin with ACS context)'
    },
    'strep a': {
        positivePattern: /strep.*a.*positive|positive.*strep.*a|group a strep.*positive/i,
        diagnosis: { code: 'J02.0', description: 'Streptococcal pharyngitis' },
        reason: 'Diagnostic-test-derived – UAE rules (Strep A positive)'
    },
    'chest xray pneumonia': {
        positivePattern: /chest.*x-?ray.*(?:shows|reveals|demonstrates).*(?:consolidation|infiltrate|opacity).*(?:consistent with|suggestive of)?.*pneumonia|pneumonia.*chest.*x-?ray/i,
        diagnosis: { code: 'J18.9', description: 'Pneumonia, unspecified organism' },
        reason: 'Diagnostic-test-derived – UAE rules (Chest X-ray shows pneumonia)'
    },
    'blood culture ecoli': {
        positivePattern: /blood culture.*positive.*e\.?\s*coli|e\.?\s*coli.*blood culture/i,
        requiresSepsisWording: /\b(sepsis|septic|septicemia|septic shock|severe sepsis)\b/i,
        sepsisCode: { code: 'A41.51', description: 'Sepsis due to Escherichia coli [E. coli]' },
        bacteremiaCode: { code: 'R78.81', description: 'Bacteremia' },
        reason: 'Diagnostic-test-derived – UAE rules (Blood culture positive for E. coli)'
    },
    'hypertension management': {
        positivePattern: /(?:continue|continuing|maintained on|taking).*(?:hypertension|antihypertensive|blood pressure).*(?:medication|med|drug|therapy)|hypertension.*(?:continued|stable|controlled)/i,
        diagnosis: { code: 'I10', description: 'Essential (primary) hypertension' },
        reason: 'Chronic condition management – UAE rules (Hypertension medication continued)'
    },
    'diabetes insulin': {
        positivePattern: /(?:on|taking|receiving|continues?).*insulin.*therapy|insulin.*(?:therapy|treatment|regimen)|blood glucose.*monitored.*insulin/i,
        diagnosis: { code: 'E11.9', description: 'Type 2 diabetes mellitus without complications' },
        reason: 'Chronic condition management – UAE rules (Insulin therapy documented)'
    },
    // Lab Test Inference
    'troponin': {
        positivePattern: /troponin.*(?:elevated|positive|\d+)|elevated.*troponin/i,
        requiresContext: /chest pain|acs|acute coronary|myocardial infarction|mi|stemi|nstemi/i,
        diagnosis: { code: 'I21.9', description: 'Acute myocardial infarction, unspecified' },
        reason: 'Lab-test-derived – UAE rules (Elevated troponin with cardiac context)'
    },
    'hba1c': {
        positivePattern: /hba1c.*(?:>|above|greater than|elevated).*6\.5|hba1c.*(?:7|8|9|10|11|12)/i,
        diagnosis: { code: 'E11.9', description: 'Type 2 diabetes mellitus without complications' },
        reason: 'Lab-test-derived – UAE rules (HbA1c >6.5%)'
    },
    'bnp': {
        positivePattern: /(?:bnp|brain natriuretic peptide|pro-?bnp).*(?:elevated|positive|\d{3,})/i,
        diagnosis: { code: 'I50.9', description: 'Heart failure, unspecified' },
        reason: 'Lab-test-derived – UAE rules (Elevated BNP/Pro-BNP)'
    },
    'tsh': {
        positivePattern: /tsh.*(?:elevated|high|>\s*\d+)|elevated.*tsh/i,
        diagnosis: { code: 'E03.9', description: 'Hypothyroidism, unspecified' },
        reason: 'Lab-test-derived – UAE rules (Elevated TSH)'
    },
    // Medication Inference
    'metformin': {
        positivePattern: /\b(?:metformin|glucophage)\b/i,
        diagnosis: { code: 'E11.9', description: 'Type 2 diabetes mellitus without complications' },
        reason: 'Medication-based inference – UAE rules (Metformin prescribed)'
    },
    'ace_inhibitor': {
        positivePattern: /\b(?:lisinopril|enalapril|ramipril|losartan|valsartan)\b/i,
        diagnosis: { code: 'I10', description: 'Essential (primary) hypertension' },
        reason: 'Medication-based inference – UAE rules (ACE inhibitor/ARB prescribed)'
    },
    'statin': {
        positivePattern: /\b(?:atorvastatin|simvastatin|rosuvastatin|lipitor)\b/i,
        diagnosis: { code: 'E78.5', description: 'Hyperlipidemia, unspecified' },
        reason: 'Medication-based inference – UAE rules (Statin prescribed)'
    },
    'anticoagulant': {
        positivePattern: /\b(?:warfarin|coumadin|eliquis|xarelto|rivaroxaban|apixaban)\b/i,
        diagnosis: { code: 'I48.91', description: 'Unspecified atrial fibrillation' },
        reason: 'Medication-based inference – UAE rules (Anticoagulant prescribed)'
    },
    'levothyroxine': {
        positivePattern: /\b(?:levothyroxine|synthroid)\b/i,
        diagnosis: { code: 'E03.9', description: 'Hypothyroidism, unspecified' },
        reason: 'Medication-based inference – UAE rules (Levothyroxine prescribed)'
    },
    'albuterol': {
        positivePattern: /\b(?:albuterol|ventolin|salbutamol)\b/i,
        diagnosis: {
            code: '

J45.909', description: 'Unspecified asthma, uncomplicated' },
        reason: 'Medication-based inference – UAE rules (Albuterol prescribed)'
    },
        // Chronic Disease Management
        'copd_management': {
            positivePattern: /\b(?:spiriva|tiotropium|advair|symbicort|breo)\b/i,
            diagnosis: { code: 'J44.9', description: 'Chronic obstructive pulmonary disease, unspecified' },
            reason: 'Chronic condition management – UAE rules (COPD controller therapy)'
        },
        'chf_management': {
            positivePattern: /\b(?:furosemide|lasix|bumetanide|torsemide)\b.*(?:heart failure|chf|hf)/i,
            diagnosis: { code: 'I50.9', description: 'Heart failure, unspecified' },
            reason: 'Chronic condition management – UAE rules (Diuretic for heart failure)'
        },
        'depression': {
            positivePattern: /\b(?:sertraline|zoloft|fluoxetine|prozac|escitalopram|lexapro|citalopram|paroxetine)\b/i,
            diagnosis: { code: 'F32.9', description: 'Major depressive disorder, single episode, unspecified' },
            reason: 'Medication-based inference – UAE rules (SSRI prescribed)'
        },
        'anxiety': {
            positivePattern: /\b(?:alprazolam|xanax|lorazepam|ativan|clonazepam|klonopin|diazepam|valium)\b/i,
            diagnosis: { code: 'F41.9', description: 'Anxiety disorder, unspecified' },
            reason: 'Medication-based inference – UAE rules (Benzodiazepine prescribed)'
        },
        'gerd': {
            positivePattern: /\b(?:omeprazole|prilosec|esomeprazole|nexium|pantoprazole|protonix|lansoprazole)\b/i,
            diagnosis: { code: 'K21.9', description: 'Gastro-esophageal reflux disease without esophagitis' },
            reason: 'Medication-based inference – UAE rules (PPI prescribed)'
        },
        'osteoporosis': {
            positivePattern: /\b(?:alendronate|fosamax|risedronate|actonel|ibandronate|boniva)\b/i,
            diagnosis: { code: 'M81.0', description: 'Age-related osteoporosis without current pathological fracture' },
            reason: 'Medication-based inference – UAE rules (Bisphosphonate prescribed)'
        },
        'rheumatoid_arthritis': {
            positivePattern: /\b(?:methotrexate|hydroxychloroquine|plaquenil|sulfasalazine)\b.*(?:rheumatoid|ra|arthritis)/i,
            diagnosis: { code: 'M06.9', description: 'Rheumatoid arthritis, unspecified' },
            reason: 'Medication-based inference – UAE rules (DMARD for RA)'
        }
    };

    // ============================================================================
    // MULTI-CONDITION COMPLICATION MAPPINGS
    // ============================================================================

    const COMPLICATIONS = {
        'diabetes_foot': {
            baseCondition: /diabetes|diabetic|dm/i,
            complication: /foot\s+(?:wound|ulcer|infection)|diabetic\s+foot/i,
            code: 'E11.621',
            description: 'Type 2 diabetes mellitus with foot ulcer',
            reason: 'Multi-condition logic – UAE rules (Diabetes with foot complication)'
        },
        'diabetes_retinopathy': {
            baseCondition: /diabetes|diabetic|dm/i,
            complication: /retinopathy|retinal/i,
            code: 'E11.319',
            description: 'Type 2 diabetes mellitus with unspecified diabetic retinopathy',
            reason: 'Multi-condition logic – UAE rules (Diabetes with retinopathy)'
        },
        'diabetes_nephropathy': {
            baseCondition: /diabetes|diabetic|dm/i,
            complication: /nephropathy|kidney\s+disease|renal/i,
            code: 'E11.21',
            description: 'Type 2 diabetes mellitus with diabetic nephropathy',
            reason: 'Multi-condition logic – UAE rules (Diabetes with nephropathy)'
        },
        'diabetes_neuropathy': {
            baseCondition: /diabetes|diabetic|dm/i,
            complication: /neuropathy|nerve|peripheral\s+neuropathy/i,
            code: 'E11.40',
            description: 'Type 2 diabetes mellitus with diabetic neuropathy',
            reason: 'Multi-condition logic – UAE rules (Diabetes with neuropathy)'
        },
        'htn_heart_failure': {
            baseCondition: /hypertension|htn|elevated\s+blood\s+pressure/i,
            complication: /heart\s+failure|chf|hf/i,
            code: 'I11.0',
            description: 'Hypertensive heart disease with heart failure',
            reason: 'Multi-condition logic – UAE rules (HTN with heart failure)'
        },
        'htn_ckd': {
            baseCondition: /hypertension|htn/i,
            complication: /chronic\s+kidney\s+disease|ckd|renal\s+insufficiency/i,
            code: 'I12.9',
            description: 'Hypertensive chronic kidney disease',
            reason: 'Multi-condition logic – UAE rules (HTN with CKD)'
        }
    };

    // ============================================================================
    // PROCEDURE-TO-DIAGNOSIS MAPPINGS
    // ============================================================================

    const PROCEDURE_DIAGNOSES = {
        'incision and drainage': {
            patterns: [
                /incision\s+and\s+drainage/i,
                /i\s*&\s*d\s+(?:of|performed)/i,
                /i\/d\s+(?:of|performed)/i,
                /drainage\s+of\s+abscess/i
            ],
            diagnosis: { code: 'L02.91', description: 'Cutaneous abscess, unspecified' },
            siteMapping: {
                // Specific laterality
                'right index finger': 'L02.511',
                'right hand': 'L02.511',
                'right finger': 'L02.511',
                'left index finger': 'L02.512',
                'left hand': 'L02.512',
                'left finger': 'L02.512',
                'right thigh': 'L02.416',
                'left thigh': 'L02.416',
                'thigh': 'L02.416',
                // General sites
                'buttock': 'L02.31',
                'face': 'L02.01',
                'neck': 'L02.11',
                'trunk': 'L02.219',
                'hand': 'L02.511',
                'finger': 'L02.511',
                'upper limb': 'L02.419',
                'lower limb': 'L02.419',
                'leg': 'L02.419',
                'axilla': 'L02.419'
            },
            reason: 'Procedure-supported diagnosis – UAE rules (I&D performed)'
        },
        'dialysis': {
            patterns: [
                /hemodialysis/i,
                /peritoneal dialysis/i,
                /dialysis\s+(?:performed|session)/i
            ],
            diagnosis: { code: 'N18.6', description: 'End stage renal disease' },
            reason: 'Procedure-supported diagnosis – UAE rules (Dialysis requires ESRD)'
        },
        'intubation': {
            patterns: [
                /intubat(?:ed|ion)/i,
                /endotracheal\s+tube/i,
                /mechanical\s+ventilation/i
            ],
            requiresContext: /respiratory\s+failure|acute\s+respiratory|hypoxia|respiratory\s+distress/i,
            diagnosis: { code: 'J96.01', description: 'Acute respiratory failure with hypoxia' },
            reason: 'Procedure-supported diagnosis – UAE rules (Intubation for respiratory failure)'
        },
        'colonoscopy': {
            patterns: [/colonoscopy/i],
            requiresContext: /polyp|adenoma|colon/i,
            diagnosis: { code: 'K63.5', description: 'Polyp of colon' },
            reason: 'Procedure-supported diagnosis – UAE rules (Colonoscopy with polyp)'
        },
        'egd': {
            patterns: [/(?:egd|esophagogastroduodenoscopy)/i],
            requiresContext: /reflux|gerd|gastritis|esophagitis/i,
            diagnosis: { code: 'K21.9', description: 'Gastro-esophageal reflux disease without esophagitis' },
            reason: 'Procedure-supported diagnosis – UAE rules (EGD with reflux)'
        },
        'bronchoscopy': {
            patterns: [/bronchoscopy/i],
            requiresContext: /copd|chronic obstructive|emphysema/i,
            diagnosis: { code: 'J44.9', description: 'Chronic obstructive pulmonary disease, unspecified' },
            reason: 'Procedure-supported diagnosis – UAE rules (Bronchoscopy in COPD)'
        },
        'cardiac_cath': {
            patterns: [/cardiac\s+cath|coronary\s+angiogram/i],
            requiresContext: /cad|coronary.*disease|chest pain|angina/i,
            diagnosis: { code: 'I25.10', description: 'Atherosclerotic heart disease without angina pectoris' },
            reason: 'Procedure-supported diagnosis – UAE rules (Cardiac cath for CAD)'
        },
        'joint_injection': {
            patterns: [/joint\s+injection|intra-?articular\s+injection/i],
            diagnosis: { code: 'M25.50', description: 'Pain in unspecified joint' },
            reason: 'Procedure-supported diagnosis – UAE rules (Joint injection performed)'
        },
        'chest_tube': {
            patterns: [/chest\s+tube|thoracostomy/i],
            diagnosis: { code: 'J93.9', description: 'Pneumothorax, unspecified' },
            reason: 'Procedure-supported diagnosis – UAE rules (Chest tube insertion)'
        },
        'thoracentesis': {
            patterns: [/thoracentesis|pleural\s+tap/i],
            diagnosis: { code: 'J91.8', description: 'Pleural effusion in other conditions' },
            reason: 'Procedure-supported diagnosis – UAE rules (Thoracentesis performed)'
        },
        'paracentesis': {
            patterns: [/paracentesis|abdominal\s+tap/i],
            diagnosis: { code: 'R18.8', description: 'Other ascites' },
            reason: 'Procedure-supported diagnosis – UAE rules (Paracentesis performed)'
        },
        'lumbar_puncture': {
            patterns: [/lumbar\s+puncture|spinal\s+tap/i],
            requiresContext: /meningitis|encephalitis|infection/i,
            diagnosis: { code: 'G03.9', description: 'Meningitis, unspecified' },
            reason: 'Procedure-supported diagnosis – UAE rules (LP for meningitis)'
        },
        'tracheostomy': {
            patterns: [/tracheostomy|trach/i],
            requiresContext: /respiratory\s+failure|prolonged\s+ventilation/i,
            diagnosis: { code: 'J96.01', description: 'Acute respiratory failure with hypoxia' },
            reason: 'Procedure-supported diagnosis – UAE rules (Tracheostomy for resp failure)'
        },
        'peg_tube': {
            patterns: [/peg\s+tube|percutaneous.*gastrostomy|feeding\s+tube/i],
            diagnosis: { code: 'R63.3', description: 'Feeding difficulties' },
            reason: 'Procedure-supported diagnosis – UAE rules (PEG tube placement)'
        }
    };

    // ============================================================================
    // UAE MARKET VALIDATION
    // ============================================================================

    /**
     * Check if UAE rules should apply
     */
    function isUAEMarket(marketProfile) {
        return marketProfile === 'UAE' || marketProfile === 'Daman';
}

/**
 * Detect diagnostic tests with positive results
 */
function detectDiagnosticTests(narrative) {
    const detected = [];
    const lower = narrative.toLowerCase();

    for (const [testName, config] of Object.entries(DIAGNOSTIC_TESTS)) {
        if (config.positivePattern.test(narrative)) {
            // Check if context requirement is met (if applicable)
            if (config.requiresContext && !config.requiresContext.test(narrative)) {
                continue;
            }

            // ===================================================================
            // BLOOD CULTURE SEVERITY ESCALATION GUARDRAIL (CRITICAL)
            // Prevent unsafe escalation from bacteremia to sepsis
            // ===================================================================
            if (config.requiresSepsisWording) {
                // Check if narrative contains explicit sepsis terminology
                const hasSepsisWording = config.requiresSepsisWording.test(narrative);

                const diagnosis = hasSepsisWording ? config.sepsisCode : config.bacteremiaCode;
                const reason = hasSepsisWording
                    ? 'Provider-documented sepsis with laboratory confirmation – UAE rules'
                    : 'Laboratory-derived bacteremia – UAE rules (Blood culture positive, no explicit sepsis documentation)';

                detected.push({
                    test: testName,
                    diagnosis: diagnosis,
                    reason: reason
                });
                continue;
            }

            // Standard diagnostic test handling
            detected.push({
                test: testName,
                diagnosis: config.diagnosis,
                reason: config.reason
            });
        }
    }

    return detected;
}

/**
 * Detect procedures that imply diagnoses
 */
function detectProcedures(narrative) {
    const detected = [];

    for (const [procName, config] of Object.entries(PROCEDURE_DIAGNOSES)) {
        // Check if any pattern matches
        const matches = config.patterns.some(pattern => pattern.test(narrative));

        if (matches) {
            // Check context requirement if applicable
            if (config.requiresContext && !config.requiresContext.test(narrative)) {
                continue;
            }

            // Try to find anatomical site for more specific coding
            let diagnosis = config.diagnosis;
            if (config.siteMapping) {
                for (const [site, code] of Object.entries(config.siteMapping)) {
                    if (new RegExp(site, 'i').test(narrative)) {
                        diagnosis = {
                            code: code,
                            description: `Cutaneous abscess of ${site}`
                        };
                        break;
                    }
                }
            }

            detected.push({
                procedure: procName,
                diagnosis: diagnosis,
                reason: config.reason
            });
        }
    }

    return detected;
}

/**
 * Check if UAE rules should override AUTO EXCLUDE
 * 
 * Returns:
 * - null if no UAE override applies (allow AUTO EXCLUDE)
 * - Object with diagnosis info if UAE rules provide a code
 */
function checkUAEOverride(narrative, marketProfile) {
    // Only apply in UAE market
    if (!isUAEMarket(marketProfile)) {
        return null;
    }

    // ===================================================================
    // FEATURE-FLAGGED TEST OVERRIDES (PRIORITY)
    // Independent, auditable, reversible test rules
    // ===================================================================
    try {
        const testOverrides = require('./uae/testOverrideRules.js');
        const FLAGS = testOverrides.resolveUaeFlags(null); // Per-request
        const flaggedTest = testOverrides.applyUaeTestOverrides(narrative, 'UAE', FLAGS);

        if (flaggedTest.triggered) {
            return {
                shouldOverride: true,
                diagnoses: [flaggedTest.diagnosis],
                reasons: [flaggedTest.reason],
                metadata: flaggedTest.metadata,
                _debug: flaggedTest._debug
            };
        }
    } catch (err) {
        // Feature flags module not available - continue to standard rules
    }

    // ===================================================================
    // STANDARD UAE RULES (Existing logic)
    // ===================================================================
    const results = {
        shouldOverride: false,
        diagnoses: [],
        reasons: []
    };

    // Check diagnostic tests
    const tests = detectDiagnosticTests(narrative);
    if (tests.length > 0) {
        results.shouldOverride = true;
        results.diagnoses.push(...tests.map(t => t.diagnosis));
        results.reasons.push(...tests.map(t => t.reason));
    }

    // Check procedures
    const procedures = detectProcedures(narrative);
    if (procedures.length > 0) {
        results.shouldOverride = true;
        results.diagnoses.push(...procedures.map(p => p.diagnosis));
        results.reasons.push(...procedures.map(p => p.reason));
    }

    // ========================================================================
    // CRITICAL: DEDUPLICATION LAYER
    // Ensure no duplicate ICD codes (PRIMARY vs SECONDARY conflict)
    // ========================================================================
    if (results.shouldOverride) {
        const seenCodes = new Map(); // Map<code, {diagnosis, reason}>
        const uniqueDiagnoses = [];
        const uniqueReasons = [];

        for (let i = 0; i < results.diagnoses.length; i++) {
            const diagnosis = results.diagnoses[i];
            const reason = results.reasons[i];
            const code = diagnosis.code;

            if (!seenCodes.has(code)) {
                // First occurrence - keep it
                seenCodes.set(code, { diagnosis, reason });
                uniqueDiagnoses.push(diagnosis);
                uniqueReasons.push(reason);
            } else {
                // Duplicate detected - merge reasons if different
                const existing = seenCodes.get(code);
                if (existing.reason !== reason) {
                    // Merge reasons
                    existing.reason = `${existing.reason}; ${reason}`;
                    // Update in unique arrays
                    const index = uniqueDiagnoses.findIndex(d => d.code === code);
                    if (index !== -1) {
                        uniqueReasons[index] = existing.reason;
                    }
                }
            }
        }

        results.diagnoses = uniqueDiagnoses;
        results.reasons = uniqueReasons;
    }

    return results.shouldOverride ? results : null;
}

/**
 * Format UAE AUTO CODE result
 */
function formatUAEAutoCode(uaeOverride) {
    const diagnoses = uaeOverride.diagnoses;
    const primary = diagnoses[0];
    const secondary = diagnoses.slice(1);

    const auditDecisionBlock = `
    <div class="bg-green-50 border-l-4 border-green-500 p-4 rounded-r-md">
      <div class="flex items-start gap-3">
        <i class="fa-solid fa-check-circle text-green-600 text-xl mt-1"></i>
        <div class="flex-1">
          <h3 class="font-bold text-green-900 text-sm uppercase tracking-wide mb-2">
            AUDIT DECISION — AUTO CODE (UAE)
          </h3>
          <div class="text-sm text-green-800 space-y-2 mb-3">
            <p class="leading-relaxed">
              Diagnosis assigned per <strong>UAE Daman/Shafafiya market rules</strong>.
            </p>
            ${uaeOverride.reasons.map(reason => `
              <p class="leading-relaxed">
                <i class="fa-solid fa-info-circle text-green-600 mr-1"></i>
                ${reason}
              </p>
            `).join('')}
          </div>
          <div class="bg-green-100 border border-green-200 rounded p-2 mb-3">
            <p class="text-xs font-semibold text-green-900 mb-1">UAE MARKET RULE</p>
            <p class="text-xs text-green-800">Procedure-derived and diagnostic test-supported diagnoses permitted</p>
          </div>
          <div class="space-y-1 mb-3">
            <p class="text-xs font-semibold text-green-900 uppercase tracking-wide">OUTCOME CONFIRMATION</p>
            <p class="text-xs text-green-800">
              <i class="fa-solid fa-check text-green-600 mr-1"></i> ICD-10-CM diagnosis codes assigned
            </p>
            <p class="text-xs text-green-800">
              <i class="fa-solid fa-check text-green-600 mr-1"></i> UAE market compliance verified
            </p>
          </div>
          <div class="bg-white border border-green-200 rounded p-2">
            <p class="text-xs italic text-green-700">
              This determination is compliant with UAE Daman/Shafafiya claim acceptance standards.
            </p>
          </div>
        </div>
      </div>
    </div>
  `;

    return {
        primary: {
            code: primary.code,
            description: primary.description,
            reason: uaeOverride.reasons[0]
        },
        secondary: secondary.map((d, i) => ({
            code: d.code,
            description: d.description,
            reason: uaeOverride.reasons[i + 1] || 'UAE market rule'
        })),
        validationErrors: [auditDecisionBlock],
        decisionState: 'AUTO_CODE',
        uaeOverride: true
    };
}

module.exports = {
    isUAEMarket,
    checkUAEOverride,
    formatUAEAutoCode,
    detectDiagnosticTests,
    detectProcedures,
    DIAGNOSTIC_TESTS,
    PROCEDURE_DIAGNOSES
};
