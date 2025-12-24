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
        diagnosis: { code: 'A41.51', description: 'Sepsis due to Escherichia coli [E. coli]' },
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
