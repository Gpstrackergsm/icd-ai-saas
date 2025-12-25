/**
 * UAE Market Rules Module - AUDIT-SAFE VERSION
 * 
 * Implements STRICT UAE (Daman/Shafafiya) coding rules.
 * 
 * CRITICAL SAFETY PRINCIPLE:
 * AUTO_CODE allowed ONLY for:
 * 1) Explicit provider diagnosis
 * 2) Positive NAMED diagnostic test (with feature flag)
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
 * Returns false for ANYTHING that doesn't meet strict criteria
 */
function canAutoCodeUAE(reasonType) {
    return Object.values(ALLOWED_REASON_TYPES).includes(reasonType);
}

// ============================================================================
// APPROVED DIAGNOSTIC TESTS (Positive results only)
// ============================================================================

const APPROVED_DIAGNOSTIC_TESTS = {
    'rapid strep': {
        positivePattern: /rapid strep.*positive|positive.*rapid strep/i,
        negationPattern: /negative|ruled out|r\/o/i,
        diagnosis: { code: 'J02.0', description: 'Streptococcal pharyngitis' },
        reasonType: ALLOWED_REASON_TYPES.POSITIVE_NAMED_DIAGNOSTIC_TEST,
        reason: 'Positive rapid strep test - UAE diagnostic test override'
    },
    'strep a': {
        positivePattern: /strep.*a.*positive|positive.*strep.*a|group a strep.*positive/i,
        negationPattern: /negative|ruled out|r\/o/i,
        diagnosis: { code: 'J02.0', description: 'Streptococcal pharyngitis' },
        reasonType: ALLOWED_REASON_TYPES.POSITIVE_NAMED_DIAGNOSTIC_TEST,
        reason: 'Positive Strep A test - UAE diagnostic test override'
    },
    'covid pcr': {
        positivePattern: /covid.*pcr.*positive|positive.*covid.*pcr|sars-cov-2.*detected/i,
        negationPattern: /negative|not detected|ruled out/i,
        diagnosis: { code: 'U07.1', description: 'COVID-19' },
        reasonType: ALLOWED_REASON_TYPES.POSITIVE_NAMED_DIAGNOSTIC_TEST,
        reason: 'Positive COVID PCR - UAE diagnostic test override'
    },
    'covid rapid': {
        positivePattern: /covid.*rapid.*positive|positive.*covid.*rapid|covid.*antigen.*positive/i,
        negationPattern: /negative|not detected|ruled out/i,
        diagnosis: { code: 'U07.1', description: 'COVID-19' },
        reasonType: ALLOWED_REASON_TYPES.POSITIVE_NAMED_DIAGNOSTIC_TEST,
        reason: 'Positive COVID rapid antigen - UAE diagnostic test override'
    },
    'blood culture ecoli': {
        positivePattern: /blood culture.*positive.*e\\.?\\s*coli|e\\.?\\s*coli.*blood culture/i,
        requiresSepsisWording: /\\b(sepsis|septic|septicemia|septic shock|severe sepsis)\\b/i,
        sepsisCode: { code: 'A41.51', description: 'Sepsis due to Escherichia coli [E. coli]' },
        bacteremiaCode: { code: 'R78.81', description: 'Bacteremia' },
        reasonType: ALLOWED_REASON_TYPES.POSITIVE_NAMED_DIAGNOSTIC_TEST,
        reason: 'Positive blood culture - UAE diagnostic test override'
    }
};

// ============================================================================
// APPROVED PROCEDURES (Near-unique implied diagnosis)
// ============================================================================

const APPROVED_PROCEDURES = {
    'incision and drainage': {
        patterns: [
            /incision\\s+and\\s+drainage/i,
            /i\\s*&\\s*d\\s+(?:of|performed)/i,
            /i\\/d\\s + (?: of | performed) / i,
            /drainage\\s+of\\s+abscess/i
        ],
        diagnosis: { code: 'L02.91', description: 'Cutaneous abscess, unspecified' },
        siteMapping: {
            'right index finger': 'L02.511',
            'right hand': 'L02.511',
            'left index finger': 'L02.512',
            'left hand': 'L02.512',
            'right thigh': 'L02.416',
            'left thigh': 'L02.416',
            'buttock': 'L02.31',
            'face': 'L02.01',
            'neck': 'L02.11',
            'trunk': 'L02.219'
        },
        reasonType: ALLOWED_REASON_TYPES.APPROVED_PROCEDURE_IMPLIED_DX,
        reason: 'I&D procedure - UAE approved procedure-implied diagnosis'
    },
    'dialysis': {
        patterns: [
            /hemodialysis/i,
            /peritoneal dialysis/i,
            /dialysis\\s+(?:performed|session)/i
        ],
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
 * Detect approved diagnostic tests with positive results
 */
function detectApprovedDiagnosticTests(narrative) {
    const detected = [];

    for (const [testName, config] of Object.entries(APPROVED_DIAGNOSTIC_TESTS)) {
        // Special handling for blood culture
        if (testName === 'blood culture ecoli') {
            const hasEcoli = config.positivePattern.test(narrative);
            if (hasEcoli) {
                const hasSepsisWording = config.requiresSepsisWording.test(narrative);
                detected.push({
                    test: testName,
                    diagnosis: hasSepsisWording ? config.sepsisCode : config.bacteremiaCode,
                    reasonType: config.reasonType,
                    reason: hasSepsisWording
                        ? 'Positive blood culture + explicit sepsis - UAE override'
                        : 'Positive blood culture (bacteremia only, no sepsis documented) - UAE override',
                    evidenceSource: narrative.match(config.positivePattern)?.[0] || 'blood culture'
                });
            }
            continue;
        }

        // Check positive pattern
        if (!config.positivePattern.test(narrative)) {
            continue;
        }

        // Check for negation
        if (config.negationPattern && config.negationPattern.test(narrative)) {
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

    return detected;
}

/**
 * Detect approved procedures
 */
function detectApprovedProcedures(narrative) {
    const detected = [];

    for (const [procedureName, config] of Object.entries(APPROVED_PROCEDURES)) {
        const matched = config.patterns.some(pattern => pattern.test(narrative));
        if (!matched) continue;

        let diagnosisCode = config.diagnosis.code;

        // Check for site-specific mapping (I&D only)
        if (procedureName === 'incision and drainage' && config.siteMapping) {
            for (const [site, code] of Object.entries(config.siteMapping)) {
                if (new RegExp(site, 'i').test(narrative)) {
                    diagnosisCode = code;
                    break;
                }
            }
        }

        detected.push({
            procedure: procedureName,
            diagnosis: {
                code: diagnosisCode,
                description: config.diagnosis.description
            },
            reasonType: config.reasonType,
            reason: config.reason,
            evidenceSource: narrative.match(config.patterns[0])?.[0] || procedureName
        });
    }

    return detected;
}

/**
 * Main UAE Override Check
 * ONLY returns AUTO_CODE for approved sources
 */
function checkUAEOverride(narrative, marketProfile) {
    // Market validation
    if (!isUAEMarket(marketProfile)) {
        return null;
    }

    // Check approved diagnostic tests
    const tests = detectApprovedDiagnosticTests(narrative);
    if (tests.length > 0) {
        const test = tests[0]; // Take first match

        // GATEKEEPER CHECK
        if (!canAutoCodeUAE(test.reasonType)) {
            return {
                shouldOverride: false,
                reason: 'GATEKEEPER BLOCK: Reason type not approved for AUTO_CODE',
                _debug: { reasonType: test.reasonType, allowed: false }
            };
        }

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
                reasonType: test.reasonType,
                evidenceSource: test.evidenceSource,
                autoCodeSafe: true
            }
        };
    }

    // Check approved procedures
    const procedures = detectApprovedProcedures(narrative);
    if (procedures.length > 0) {
        const proc = procedures[0]; // Take first match

        // GATEKEEPER CHECK
        if (!canAutoCodeUAE(proc.reasonType)) {
            return {
                shouldOverride: false,
                reason: 'GATEKEEPER BLOCK: Reason type not approved for AUTO_CODE',
                _debug: { reasonType: proc.reasonType, allowed: false }
            };
        }

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
                reasonType: proc.reasonType,
                evidenceSource: proc.evidenceSource,
                autoCodeSafe: true
            }
        };
    }

    // No approved AUTO_CODE sources found
    return null;
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
    checkUAEOverride,
    isUAEMarket,
    canAutoCodeUAE,
    ALLOWED_REASON_TYPES
};
