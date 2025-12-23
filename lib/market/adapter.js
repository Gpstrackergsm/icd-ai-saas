/**
 * Market Jurisdiction Adapter
 * Post-engine layer that applies market-specific diagnostic admissibility rules
 * 
 * Markets:
 * - USA: Strict CMS/ICD-10-CM rules (current behavior)
 * - UAE: Daman/Shafafiya rules (allows procedure-derived diagnoses)
 */

// Procedure → Diagnosis mapping for UAE market
const UAE_PROCEDURE_DIAGNOSIS_MAP = {
    'incision and drainage': {
        requiredTerms: ['abscess', 'infected', 'purulent'],
        derivedDiagnosis: 'abscess',
        icdCode: 'L02.91',  // Cutaneous abscess, unspecified
        ruleReference: 'UAE-PROC-001: I&D procedure supports abscess diagnosis'
    },
    'i&d': {
        requiredTerms: ['abscess', 'infected', 'purulent'],
        derivedDiagnosis: 'abscess',
        icdCode: 'L02.91',
        ruleReference: 'UAE-PROC-001: I&D procedure supports abscess diagnosis'
    },
    'appendectomy': {
        requiredTerms: ['appendix', 'appendicitis', 'acute abdomen'],
        derivedDiagnosis: 'acute appendicitis',
        icdCode: 'K35.80',
        ruleReference: 'UAE-PROC-002: Appendectomy supports appendicitis diagnosis'
    },
    'laparoscopic appendectomy': {
        requiredTerms: ['appendix', 'appendicitis', 'acute abdomen'],
        derivedDiagnosis: 'acute appendicitis',
        icdCode: 'K35.80',
        ruleReference: 'UAE-PROC-002: Appendectomy supports appendicitis diagnosis'
    }
};

/**
 * Detect procedures from clinical narrative
 */
function detectProcedures(text) {
    const lower = text.toLowerCase();
    const detected = [];

    // I&D detection
    if (/\b(incision and drainage|i\s*&\s*d|i\s*and\s*d)\b/.test(lower)) {
        detected.push({
            procedure: 'incision and drainage',
            found: true
        });
    }

    // Appendectomy
    if (/\b(appendectomy|laparoscopic appendectomy)\b/.test(lower)) {
        detected.push({
            procedure: lower.includes('laparoscopic') ? 'laparoscopic appendectomy' : 'appendectomy',
            found: true
        });
    }

    return detected;
}

/**
 * Check for required clinical terms
 */
function hasRequiredTerms(text, requiredTerms) {
    const lower = text.toLowerCase();
    return requiredTerms.some(term => {
        const pattern = new RegExp(`\\b${term}\\b`, 'i');
        return pattern.test(lower);
    });
}

/**
 * Check for negation (simple version for UAE mode)
 */
function isNegatedUAE(text, term) {
    const lower = text.toLowerCase();
    const termPattern = new RegExp(`\\b${term}\\b`, 'i');
    const match = termPattern.exec(lower);

    if (!match) return false;

    const before = lower.substring(Math.max(0, match.index - 50), match.index);
    const negationWords = ['no', 'denies', 'negative', 'ruled out', 'absent'];

    return negationWords.some(neg => before.includes(neg));
}

/**
 * ICD-10 Code Mapping (subset for common conditions)
 * Full mapping is in encode.js, this is a lightweight version for adapter
 */
const ICD10_MAPPING = {
    'hypertension': { code: 'I10', description: 'Essential (primary) hypertension' },
    'essential hypertension': { code: 'I10', description: 'Essential (primary) hypertension' },
    'type 2 diabetes': { code: 'E11.9', description: 'Type 2 diabetes mellitus without complications' },
    'diabetes': { code: 'E11.9', description: 'Type 2 diabetes mellitus without complications' },
    'copd': { code: 'J44.9', description: 'Chronic obstructive pulmonary disease, unspecified' },
    'copd exacerbation': { code: 'J44.1', description: 'Chronic obstructive pulmonary disease with (acute) exacerbation' },
    'chronic obstructive pulmonary disease': { code: 'J44.9', description: 'Chronic obstructive pulmonary disease, unspecified' },
    'atrial fibrillation': { code: 'I48.91', description: 'Unspecified atrial fibrillation' },
    'atrial fibrillation, permanent': { code: 'I48.21', description: 'Permanent atrial fibrillation' },
    'ckd stage 3': { code: 'N18.30', description: 'Chronic kidney disease, stage 3 unspecified' },
    'ckd stage 4': { code: 'N18.4', description: 'Chronic kidney disease, stage 4 (severe)' },
    'chronic kidney disease stage 3': { code: 'N18.30', description: 'Chronic kidney disease, stage 3 unspecified' },
    'chronic kidney disease stage 4': { code: 'N18.4', description: 'Chronic kidney disease, stage 4 (severe)' },
    'pneumonia': { code: 'J18.9', description: 'Pneumonia, unspecified organism' },
    'uti': { code: 'N39.0', description: 'Urinary tract infection, site not specified' },
    'urinary tract infection': { code: 'N39.0', description: 'Urinary tract infection, site not specified' }
};

/**
 * Convert detected diagnoses to ICD code objects
 */
function convertDiagnosesToCodes(detectedDiagnoses) {
    const codes = [];

    for (const diagnosis of detectedDiagnoses) {
        const mapping = ICD10_MAPPING[diagnosis.toLowerCase()];

        if (mapping) {
            codes.push({
                code: mapping.code,
                description: mapping.description,
                poa: 'Y',  // Assume present on admission unless specified otherwise
                rationale: 'Provider-documented diagnosis',
                references: [],
                source: 'provider-documented'
            });
        }
    }

    return codes;
}

/**
 * Apply market-specific adapter rules
 * @param {Object} params - { marketProfile, coreDecision, text }
 * @returns {Object} - Final decision with market metadata
 */
function applyMarketAdapter(params) {
    const {
        marketProfile = 'USA',
        coreDecision,  // { primary, secondary, decisionState }
        text
    } = params;

    // USA Mode: Preserve strict CMS behavior
    if (marketProfile === 'USA') {
        return {
            ...coreDecision,
            marketProfile: 'USA',
            marketRuleApplied: false,
            marketNote: 'Strict CMS/ICD-10-CM rules applied'
        };
    }

    // UAE Mode: Check for procedure-derived diagnoses
    if (marketProfile === 'UAE') {
        // Only override if core decision was AUTO_EXCLUDE
        if (coreDecision.decisionState !== 'AUTO_EXCLUDE') {
            return {
                ...coreDecision,
                marketProfile: 'UAE',
                marketRuleApplied: false,
                marketNote: 'Core diagnosis detected - no market override needed'
            };
        }

        // Detect procedures
        const procedures = detectProcedures(text);

        // Check each procedure for matching terms
        for (const proc of procedures) {
            const mapping = UAE_PROCEDURE_DIAGNOSIS_MAP[proc.procedure];

            if (!mapping) continue;

            // Check if required clinical terms present
            if (hasRequiredTerms(text, mapping.requiredTerms)) {
                // Check for negation
                if (isNegatedUAE(text, mapping.derivedDiagnosis)) {
                    continue;
                }

                // ALL CONDITIONS MET: Override AUTO_EXCLUDE → AUTO_CODE

                // Convert explicit diagnoses to secondary codes
                const explicitDiagnoses = coreDecision.detectedDiagnoses || [];
                const secondaryCodes = convertDiagnosesToCodes(explicitDiagnoses);

                return {
                    primary: {
                        code: mapping.icdCode,
                        description: mapping.derivedDiagnosis,
                        poa: 'Y',
                        rationale: `Procedure-supported diagnosis per UAE market rules (${proc.procedure})`,
                        references: [],
                        source: 'procedure-derived'
                    },
                    primaryDescription: mapping.derivedDiagnosis,  // For backward compatibility
                    primaryPOA: 'Y',  // For backward compatibility
                    secondary: secondaryCodes,  // Include explicit provider-documented diagnoses
                    decisionState: 'AUTO_CODE',
                    marketProfile: 'UAE',
                    marketRuleApplied: true,
                    derivedByMarketRule: true,
                    marketNote: 'Diagnosis derived per UAE market rules',
                    ruleReference: mapping.ruleReference,
                    derivationDetails: {
                        procedure: proc.procedure,
                        derivedDiagnosis: mapping.derivedDiagnosis,
                        supportingTerms: mapping.requiredTerms.filter(t =>
                            hasRequiredTerms(text, [t])
                        ),
                        explicitDiagnoses: explicitDiagnoses,
                        secondaryCodesFromExplicit: secondaryCodes.length
                    }
                };
            }
        }

        // No procedure-diagnosis derivation applicable
        return {
            ...coreDecision,
            marketProfile: 'UAE',
            marketRuleApplied: false,
            marketNote: 'No procedure-derived diagnosis applicable'
        };
    }

    // Unknown market profile - default to USA (strict)
    return {
        ...coreDecision,
        marketProfile: 'USA',
        marketRuleApplied: false,
        marketNote: 'Unknown market profile - defaulting to strict CMS rules'
    };
}

module.exports = {
    applyMarketAdapter,
    detectProcedures,
    UAE_PROCEDURE_DIAGNOSIS_MAP
};
