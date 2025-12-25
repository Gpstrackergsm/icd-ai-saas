/**
 * UAE Market Rules Module - AUDIT-SAFE + CERTIFICATION-READY
 * 
 * Implements STRICT UAE (Daman/Shafafiya) coding rules.
 * 
 * CRITICAL SAFETY PRINCIPLE:
 * AUTO_CODE allowed ONLY for:
 * 1) Explicit provider diagnosis
 * 2) Positive NAMED diagnostic test (current, not historical/pending)
 * 3) Approved procedures (I&D → Abscess, Dialysis → ESRD)
 * 
 * EVERYTHING ELSE is FORBIDDEN from AUTO_CODE
 */

// ============================================================================
// ALLOWED AUTO_CODE REASON TYPES
// ============================================================================

const ALLOWED_REASON_TYPES = Object.freeze({
    EXPLICIT_PROVIDER_DX: 'EXPLICIT_PROVIDER_DX',
    POSITIVE_NAMED_DIAGNOSTIC_TEST: 'POSITIVE_NAMED_DIAGNOSTIC_TEST',
    APPROVED_PROCEDURE_IMPLIED_DX: 'APPROVED_PROCEDURE_IMPLIED_DX'
});

/**
 * GATEKEEPER: Determines if AUTO_CODE is allowed
 */
function canAutoCodeUAE(reasonType) {
    return Object.values(ALLOWED_REASON_TYPES).includes(reasonType);
}

// ============================================================================
// TEMPORAL & UNCERTAINTY FILTERS
// ============================================================================

const TEMPORAL_EXCLUSIONS = {
    historical: /\b(last week|last month|last year|previously tested|prior admission|history of.*(?:positive|negative)|in 20\d{2}|earlier this year)\b/i,
    future: /\b(scheduled for|next week|next month|will do|upcoming|planned for|to be done)\b/i,
    pending: /\b(pending result|awaiting results|sent for culture|ordered but not)\b/i
};

const UNCERTAINTY_EXCLUSIONS = /\b(likely|suspected|possible|query|rule out|r\/o|probable|consider for|equivocal|indeterminate|false positive)\b/i;

function hasTemporalExclusion(text) {
    // Only exclude if there's EXPLICIT historical/future/pending language
    // Do NOT exclude current encounter narratives that are simply written in past tense
    return TEMPORAL_EXCLUSIONS.historical.test(text) ||
        TEMPORAL_EXCLUSIONS.future.test(text) ||
        TEMPORAL_EXCLUSIONS.pending.test(text);
}

function hasUncertainty(text) {
    return UNCERTAINTY_EXCLUSIONS.test(text);
}

// ============================================================================
// APPROVED DIAGNOSTIC TESTS
// ============================================================================

const APPROVED_DIAGNOSTIC_TESTS = {
    'rapid strep': {
        positivePattern: /rapid strep.*positive|positive.*rapid strep/i,
        negationPattern: /negative|not detected|ruled out|no strep/i,
        diagnosis: { code: 'J02.0', description: 'Streptococcal pharyngitis' },
        reasonType: ALLOWED_REASON_TYPES.POSITIVE_NAMED_DIAGNOSTIC_TEST,
        reason: 'Positive rapid strep test - UAE diagnostic test override'
    },
    'strep a': {
        positivePattern: /(?:strep\s*a|group\s*a\s*strep).*positive|positive.*(?:strep\s*a|group\s*a\s*strep)/i,
        negationPattern: /negative|not detected|ruled out/i,
        diagnosis: { code: 'J02.0', description: 'Streptococcal pharyngitis' },
        reasonType: ALLOWED_REASON_TYPES.POSITIVE_NAMED_DIAGNOSTIC_TEST,
        reason: 'Positive Strep A test - UAE diagnostic test override'
    },
    'covid pcr': {
        positivePattern: /(?:covid|sars-cov-2).*(?:pcr|detected)|pcr.*positive.*covid/i,
        negationPattern: /negative|not detected|ruled out/i,
        diagnosis: { code: 'U07.1', description: 'COVID-19' },
        reasonType: ALLOWED_REASON_TYPES.POSITIVE_NAMED_DIAGNOSTIC_TEST,
        reason: 'Positive COVID PCR - UAE diagnostic test override'
    },
    'covid rapid': {
        positivePattern: /covid.*(?:rapid|antigen).*positive|positive.*covid.*(?:rapid|antigen)/i,
        negationPattern: /negative|not detected|ruled out/i,
        diagnosis: { code: 'U07.1', description: 'COVID-19' },
        reasonType: ALLOWED_REASON_TYPES.POSITIVE_NAMED_DIAGNOSTIC_TEST,
        reason: 'Positive COVID rapid antigen - UAE diagnostic test override'
    },
    'blood culture': {
        positivePattern: /blood\s+culture.*(?:positive|grew|growth)|e\.?\s*coli.*blood\s+culture|blood\s+culture.*e\.?\s*coli/i,
        negationPattern: /no growth|negative|not detected/i,
        requiresSepsisWording: /\b(sepsis|septic|septicemia)\b/i,
        sepsisNegation: /\b(no sepsis|not septic|ruled out sepsis|sepsis ruled out)\b/i,
        sepsisCode: { code: 'A41.51', description: 'Sepsis due to Escherichia coli [E. coli]' },
        bacteremiaCode: { code: 'R78.81', description: 'Bacteremia' },
        reasonType: ALLOWED_REASON_TYPES.POSITIVE_NAMED_DIAGNOSTIC_TEST,
        reason: 'Positive blood culture - UAE diagnostic test override'
    }
};

// ============================================================================
// APPROVED PROCEDURES
// ============================================================================

const APPROVED_PROCEDURES = {
    'incision and drainage': {
        patterns: [
            /incision\s+and\s+drainage/i,
            /i\s*&\s*d/i,
            /drainage\s+of\s+abscess/i
        ],
        decliningPattern: /(?:recommended|declined|refused|patient declined|consider|planned)/i,
        diagnosis: { code: 'L02.91', description: 'Cutaneous abscess, unspecified' },
        siteMapping: {
            'right index finger': 'L02.511',
            'right hand': 'L02.511',
            'right palm': 'L02.511',
            'right finger': 'L02.511',
            'left index finger': 'L02.512',
            'left hand': 'L02.512',
            'left palm': 'L02.512',
            'left finger': 'L02.512',
            'right thigh': 'L02.416',
            'left thigh': 'L02.416',
            'thigh': 'L02.416',
            'buttock': 'L02.31',
            'face': 'L02.01',
            'facial': 'L02.01',
            'neck': 'L02.11',
            'trunk': 'L02.219'
        },
        reasonType: ALLOWED_REASON_TYPES.APPROVED_PROCEDURE_IMPLIED_DX,
        reason: 'I&D procedure - UAE approved procedure-implied diagnosis'
    },
    'dialysis': {
        patterns: [
            /hemodialysis\s+(?:session|performed|completed)/i,
            /peritoneal\s+dialysis/i,
            /dialysis\s+(?:performed|session|completed)/i
        ],
        decliningPattern: /(?:scheduled|planned|refused|declined|recommended)/i,
        diagnosis: { code: 'N18.6', description: 'End stage renal disease' },
        reasonType: ALLOWED_REASON_TYPES.APPROVED_PROCEDURE_IMPLIED_DX,
        reason: 'Dialysis performed - UAE approved procedure-implied diagnosis'
    }
};

// ============================================================================
// UAE MARKET VALIDATION
// ============================================================================

function isUAEMarket(marketProfile) {
    if (!marketProfile) return false;
    const profile = marketProfile.toUpperCase();
    return profile === 'UAE' ||
        profile.includes('DAMAN') ||
        profile.includes('SHAFAFIYA') ||
        profile.includes('DOH') ||
        profile.includes('DHA');
}

/**
 * Detect approved diagnostic tests with strict filters
 */
function detectApprovedDiagnosticTests(narrative) {
    const detected = [];
    const debug = {
        triggers: [],
        negations: [],
        temporality: [],
        uncertainty: []
    };

    for (const [testName, config] of Object.entries(APPROVED_DIAGNOSTIC_TESTS)) {
        // Check temporal exclusion
        if (hasTemporalExclusion(narrative)) {
            debug.temporality.push(`${testName}: temporal exclusion detected`);
            continue;
        }

        // Check uncertainty
        if (hasUncertainty(narrative)) {
            debug.uncertainty.push(`${testName}: uncertainty marker detected`);
            continue;
        }

        // Special handling for blood culture
        if (testName === 'blood culture') {
            const hasPositive = config.positivePattern.test(narrative);
            if (!hasPositive) continue;

            debug.triggers.push(`${testName}: positive pattern matched`);

            // Check for negative culture
            if (config.negationPattern.test(narrative)) {
                debug.negations.push(`${testName}: negative culture`);
                continue;
            }

            // Check for explicit sepsis wording
            const hasSepsisWording = config.requiresSepsisWording.test(narrative);
            const hasSepsisNegation = config.sepsisNegation.test(narrative);

            if (hasSepsisNegation) {
                debug.negations.push(`${testName}: sepsis negated`);
                // Still code as bacteremia if culture positive
                detected.push({
                    test: testName,
                    diagnosis: config.bacteremiaCode,
                    reasonType: config.reasonType,
                    reason: 'Positive blood culture (bacteremia only, sepsis ruled out) - UAE override',
                    evidenceSource: narrative.match(config.positivePattern)?.[0] || 'blood culture'
                });
                continue;
            }

            if (hasSepsisWording) {
                detected.push({
                    test: testName,
                    diagnosis: config.sepsisCode,
                    reasonType: config.reasonType,
                    reason: 'Positive blood culture + explicit sepsis - UAE override',
                    evidenceSource: narrative.match(config.positivePattern)?.[0] || 'blood culture'
                });
            } else {
                detected.push({
                    test: testName,
                    diagnosis: config.bacteremiaCode,
                    reasonType: config.reasonType,
                    reason: 'Positive blood culture (bacteremia only, no sepsis documented) - UAE override',
                    evidenceSource: narrative.match(config.positivePattern)?.[0] || 'blood culture'
                });
            }
            continue;
        }

        // Standard diagnostic test handling
        if (!config.positivePattern.test(narrative)) {
            continue;
        }

        debug.triggers.push(`${testName}: positive pattern matched`);

        // Check for negation
        if (config.negationPattern && config.negationPattern.test(narrative)) {
            debug.negations.push(`${testName}: negation detected`);
            continue;
        }

        detected.push({
            test: testName,
            diagnosis: config.diagnosis,
            reasonType: config.reasonType,
            reason: config.reason,
            evidenceSource: narrative.match(config.positivePattern)?.[0] || testName
        });
    }

    return { detected, debug };
}

/**
 * Detect approved procedures with strict filters
 */
function detectApprovedProcedures(narrative) {
    const detected = [];
    const debug = {
        triggers: [],
        negations: [],
        temporality: []
    };

    for (const [procedureName, config] of Object.entries(APPROVED_PROCEDURES)) {
        // Check temporal exclusion
        if (hasTemporalExclusion(narrative)) {
            debug.temporality.push(`${procedureName}: temporal exclusion detected`);
            continue;
        }

        // Check if procedure pattern matches
        const matched = config.patterns.some(pattern => pattern.test(narrative));
        if (!matched) continue;

        debug.triggers.push(`${procedureName}: procedure pattern matched`);

        // Check for declining/planning pattern
        if (config.decliningPattern && config.decliningPattern.test(narrative)) {
            debug.negations.push(`${procedureName}: declined/recommended/planned`);
            continue;
        }

        let diagnosisCode = config.diagnosis.code;
        let description = config.diagnosis.description;

        // Check for site-specific mapping (I&D only)
        if (procedureName === 'incision and drainage' && config.siteMapping) {
            for (const [site, code] of Object.entries(config.siteMapping)) {
                if (new RegExp(site, 'i').test(narrative)) {
                    diagnosisCode = code;
                    debug.triggers.push(`${procedureName}: site matched - ${site} → ${code}`);
                    break;
                }
            }
        }

        detected.push({
            procedure: procedureName,
            diagnosis: {
                code: diagnosisCode,
                description: description
            },
            reasonType: config.reasonType,
            reason: config.reason,
            evidenceSource: narrative.match(config.patterns[0])?.[0] || procedureName
        });
    }

    return { detected, debug };
}

/**
 * Main UAE Override Check
 * PHASE 6: JURISDICTION ISOLATION - Immediate return if not UAE
 */
function checkUAEOverride(narrative, marketProfile) {
    // PHASE 6: Top-level market guard - USA mode immediate return
    if (!isUAEMarket(marketProfile)) {
        return {
            shouldOverride: false,
            _debug: {
                uaeCert: {
                    market: marketProfile || 'UNKNOWN',
                    triggers: [],
                    negations: [],
                    temporality: [],
                    matchedRules: [],
                    jurisdictionBlock: 'Not UAE market - no UAE rules applied'
                }
            }
        };
    }

    // PHASE 1: Structured debug object
    const certDebug = {
        market: marketProfile,
        triggers: [],
        negations: [],
        temporality: [],
        uncertainty: [],
        matchedRules: []
    };

    // Check approved diagnostic tests
    const testResult = detectApprovedDiagnosticTests(narrative);
    certDebug.triggers.push(...testResult.debug.triggers);
    certDebug.negations.push(...testResult.debug.negations);
    certDebug.temporality.push(...testResult.debug.temporality);
    certDebug.uncertainty.push(...testResult.debug.uncertainty);

    if (testResult.detected.length > 0) {
        const test = testResult.detected[0];

        // GATEKEEPER CHECK
        if (!canAutoCodeUAE(test.reasonType)) {
            return {
                shouldOverride: false,
                reason: 'GATEKEEPER BLOCK: Reason type not approved for AUTO_CODE',
                _debug: {
                    uaeCert: certDebug,
                    reasonType: test.reasonType,
                    allowed: false
                }
            };
        }

        certDebug.matchedRules.push(`Diagnostic test: ${test.test} → ${test.diagnosis.code}`);

        return {
            shouldOverride: true,
            diagnoses: [{
                code: test.diagnosis.code,
                description: test.diagnosis.description,
                reasonType: test.reasonType,
                evidenceSource: test.evidenceSource,
                auditTrailText: test.reason
            }],
            reasons: [test.reason],
            metadata: {
                uae_override: true,
                test_name: test.test,
                evidence_type: 'POSITIVE_NAMED_DIAGNOSTIC_TEST'
            },
            _debug: {
                uaeCert: certDebug,
                reasonType: test.reasonType,
                evidenceSource: test.evidenceSource,
                autoCodeSafe: true
            }
        };
    }

    // Check approved procedures
    const procResult = detectApprovedProcedures(narrative);
    certDebug.triggers.push(...procResult.debug.triggers);
    certDebug.negations.push(...procResult.debug.negations);
    certDebug.temporality.push(...procResult.debug.temporality);

    if (procResult.detected.length > 0) {
        const proc = procResult.detected[0];

        // GATEKEEPER CHECK
        if (!canAutoCodeUAE(proc.reasonType)) {
            return {
                shouldOverride: false,
                reason: 'GATEKEEPER BLOCK: Reason type not approved for AUTO_CODE',
                _debug: {
                    uaeCert: certDebug,
                    reasonType: proc.reasonType,
                    allowed: false
                }
            };
        }

        certDebug.matchedRules.push(`Procedure: ${proc.procedure} → ${proc.diagnosis.code}`);

        return {
            shouldOverride: true,
            diagnoses: [{
                code: proc.diagnosis.code,
                description: proc.diagnosis.description,
                reasonType: proc.reasonType,
                evidenceSource: proc.evidenceSource,
                auditTrailText: proc.reason
            }],
            reasons: [proc.reason],
            metadata: {
                uae_override: true,
                procedure_name: proc.procedure,
                evidence_type: 'APPROVED_PROCEDURE_IMPLIED_DX'
            },
            _debug: {
                uaeCert: certDebug,
                reasonType: proc.reasonType,
                evidenceSource: proc.evidenceSource,
                autoCodeSafe: true
            }
        };
    }

    // No approved AUTO_CODE sources found
    return {
        shouldOverride: false,
        _debug: {
            uaeCert: certDebug
        }
    };
}

/**
 * Format UAE override result for API response
 */
function formatUAEAutoCode(uaeOverride) {
    if (!uaeOverride || !uaeOverride.shouldOverride) {
        return null;
    }

    const firstDiagnosis = uaeOverride.diagnoses?.[0];
    if (!firstDiagnosis) {
        return null;
    }

    const marketNote = uaeOverride.metadata?.uae_override
        ? `AUTO APPROVED: ${firstDiagnosis.reasonType === 'POSITIVE_NAMED_DIAGNOSTIC_TEST'
            ? 'Positive diagnostic test result'
            : 'Approved procedure-implied diagnosis'}`
        : 'UAE market override applied';

    const ruleReference = firstDiagnosis.auditTrailText ||
        `Evidence: ${firstDiagnosis.evidenceSource}`;

    return {
        primary: {
            code: firstDiagnosis.code,
            description: firstDiagnosis.description,
            reason: firstDiagnosis.auditTrailText
        },
        secondary: uaeOverride.diagnoses?.slice(1).map(d => ({
            code: d.code,
            description: d.description,
            reason: d.auditTrailText
        })) || [],
        marketNote,
        ruleReference,
        primaryDescription: firstDiagnosis.description,
        primaryPOA: 'Y'
    };
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
    checkUAEOverride,
    formatUAEAutoCode,
    isUAEMarket,
    canAutoCodeUAE,
    ALLOWED_REASON_TYPES
};
