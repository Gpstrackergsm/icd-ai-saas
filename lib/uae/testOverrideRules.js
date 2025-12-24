/**
 * UAE Test Override Rules - PRODUCTION SAFE
 * 
 * Each test accepts FLAGS as parameter (immutable, per-request)
 * Returns detailed debug info for full auditability
 * 
 * NO shared state, NO global FLAGS
 */

const { resolveUaeFlags } = require('./featureFlags.js');

/**
 * Helper: Check for negation
 */
function hasNegation(text) {
    return /\b(negative|ruled out|equivocal|not detected|absent)\b/i.test(text);
}

/**
 * Build debug object with detailed match information
 */
function buildDebug(testName, flagName, FLAGS, text, patterns) {
    const debug = {
        testName,
        flagChecked: flagName,
        flagEnabled: FLAGS[flagName],
        matchedTestPhrase: null,
        matchedPositivePhrase: null,
        matchedContextPhrase: null,
        hasNegation: hasNegation(text),
        rejectionReason: null
    };

    if (!FLAGS[flagName]) {
        debug.rejectionReason = 'Flag disabled';
        return debug;
    }

    const testMatch = text.match(patterns.test);
    const positiveMatch = text.match(patterns.positive);
    const contextMatch = text.match(patterns.context);

    debug.matchedTestPhrase = testMatch ? testMatch[0] : null;
    debug.matchedPositivePhrase = positiveMatch ? positiveMatch[0] : null;
    debug.matchedContextPhrase = contextMatch ? contextMatch[0] : null;

    if (!testMatch) {
        debug.rejectionReason = 'Test name not detected';
    } else if (!positiveMatch) {
        debug.rejectionReason = 'Positive result not detected';
    } else if (debug.hasNegation) {
        debug.rejectionReason = 'Negation detected';
    } else if (!contextMatch) {
        debug.rejectionReason = 'Clinical context missing';
    }

    return debug;
}

/**
 * DENGUE TEST RULE
 */
function checkDengueTest(text, FLAGS) {
    const patterns = {
        test: /\b(dengue\s+test|dengue\s+ns1|dengue\s+igm)\b/i,
        positive: /\b(positive|detected)\b/i,
        context: /\b(fever|rash|headache|joint|pain|screening)\b/i
    };

    const debug = buildDebug('Dengue', 'ENABLE_DENGUE_TEST', FLAGS, text, patterns);

    if (debug.rejectionReason) {
        return { result: null, debug };
    }

    return {
        result: {
            code: 'A90',
            description: 'Dengue fever',
            testName: 'Dengue',
            flagUsed: 'ENABLE_DENGUE_TEST'
        },
        debug
    };
}

/**
 * TB TEST RULE
 */
function checkTBTest(text, FLAGS) {
    const patterns = {
        test: /\b(tb\s+pcr|mtb\s+detected|gene\s*xpert|tuberculosis\s+pcr)\b/i,
        positive: /\b(positive|detected)\b/i,
        context: /\b(cough|hemoptysis|weight\s+loss|screening|contact)\b/i
    };

    const debug = buildDebug('TB', 'ENABLE_TB_TEST', FLAGS, text, patterns);

    if (debug.rejectionReason) {
        return { result: null, debug };
    }

    return {
        result: {
            code: 'A15.0',
            description: 'Tuberculosis of lung',
            testName: 'TB PCR',
            flagUsed: 'ENABLE_TB_TEST'
        },
        debug
    };
}

/**
 * INFLUENZA TEST RULE
 */
function checkInfluenzaTest(text, FLAGS) {
    const patterns = {
        test: /\b(influenza\s+rapid|flu\s+test|influenza\s+a)\b/i,
        positive: /\b(positive)\b/i,
        context: /\b(fever|cough|flu|respiratory|screening)\b/i
    };

    const debug = buildDebug('Influenza', 'ENABLE_INFLUENZA_TEST', FLAGS, text, patterns);

    if (debug.rejectionReason) {
        return { result: null, debug };
    }

    return {
        result: {
            code: 'J10.1',
            description: 'Influenza with other respiratory manifestations',
            testName: 'Influenza Rapid Test',
            flagUsed: 'ENABLE_INFLUENZA_TEST'
        },
        debug
    };
}

/**
 * RSV TEST RULE
 */
function checkRSVTest(text, FLAGS) {
    const patterns = {
        test: /\b(rsv\s+antigen|rsv\s+pcr|respiratory\s+syncytial)\b/i,
        positive: /\b(positive|detected)\b/i,
        context: /\b(pediatric|child|infant|respiratory|bronchiolitis)\b/i
    };

    const debug = buildDebug('RSV', 'ENABLE_RSV_TEST', FLAGS, text, patterns);

    if (debug.rejectionReason) {
        return { result: null, debug };
    }

    return {
        result: {
            code: 'B97.4',
            description: 'Respiratory syncytial virus',
            testName: 'RSV Test',
            flagUsed: 'ENABLE_RSV_TEST'
        },
        debug
    };
}

/**
 * MALARIA TEST RULE
 */
function checkMalariaTest(text, FLAGS) {
    const patterns = {
        test: /\b(malaria\s+smear|plasmodium\s+detected|malaria\s+test)\b/i,
        positive: /\b(positive|detected)\b/i,
        context: /\b(fever|chills|travel|screening)\b/i
    };

    const debug = buildDebug('Malaria', 'ENABLE_MALARIA_TEST', FLAGS, text, patterns);

    if (debug.rejectionReason) {
        return { result: null, debug };
    }

    return {
        result: {
            code: 'B54',
            description: 'Unspecified malaria',
            testName: 'Malaria Test',
            flagUsed: 'ENABLE_MALARIA_TEST'
        },
        debug
    };
}

/**
 * HIV TEST RULE
 */
function checkHIVTest(text, FLAGS) {
    const patterns = {
        test: /\b(hiv\s+test|elisa\s+hiv|hiv\s+pcr|hiv\s+screening)\b/i,
        positive: /\b(positive|reactive)\b/i,
        context: /\b(screening|test|confirm|status)\b/i
    };

    const debug = buildDebug('HIV', 'ENABLE_HIV_TEST', FLAGS, text, patterns);

    if (debug.rejectionReason) {
        return { result: null, debug };
    }

    return {
        result: {
            code: 'B20',
            description: 'Human immunodeficiency virus [HIV] disease',
            testName: 'HIV Test',
            flagUsed: 'ENABLE_HIV_TEST'
        },
        debug
    };
}

/**
 * PREGNANCY TEST RULE
 */
function checkPregnancyTest(text, FLAGS) {
    const patterns = {
        test: /\b(urine\s+pregnancy|pregnancy\s+test|hcg\s+positive|rapid\s+pregnancy)\b/i,
        positive: /\b(positive)\b/i,
        context: /\b(screening|confirm|suspected|amenorrhea)\b/i
    };

    const debug = buildDebug('Pregnancy', 'ENABLE_PREGNANCY_TEST', FLAGS, text, patterns);

    if (debug.rejectionReason) {
        return { result: null, debug };
    }

    return {
        result: {
            code: 'Z32.01',
            description: 'Pregnant state, incidental',
            testName: 'Pregnancy Test',
            flagUsed: 'ENABLE_PREGNANCY_TEST'
        },
        debug
    };
}

/**
 * HEPATITIS B TEST RULE
 */
function checkHepBTest(text, FLAGS) {
    const patterns = {
        test: /\b(hbsag|hepatitis\s+b\s+surface\s+antigen)\b/i,
        positive: /\b(positive|reactive)\b/i,
        context: /\b(screening|test|chronic|status)\b/i
    };

    const debug = buildDebug('Hep B', 'ENABLE_HEPB_TEST', FLAGS, text, patterns);

    if (debug.rejectionReason) {
        return { result: null, debug };
    }

    return {
        result: {
            code: 'B18.1',
            description: 'Chronic viral hepatitis B without delta-agent',
            testName: 'Hepatitis B Surface Antigen',
            flagUsed: 'ENABLE_HEPB_TEST'
        },
        debug
    };
}

/**
 * ROTAVIRUS TEST RULE
 */
function checkRotavirusTest(text, FLAGS) {
    const patterns = {
        test: /\b(rotavirus\s+antigen|rotavirus\s+test)\b/i,
        positive: /\b(positive)\b/i,
        context: /\b(diarrhea|gastroenteritis|child|vomit)\b/i
    };

    const debug = buildDebug('Rotavirus', 'ENABLE_ROTAVIRUS_TEST', FLAGS, text, patterns);

    if (debug.rejectionReason) {
        return { result: null, debug };
    }

    return {
        result: {
            code: 'A08.0',
            description: 'Rotaviral enteritis',
            testName: 'Rotavirus Antigen',
            flagUsed: 'ENABLE_ROTAVIRUS_TEST'
        },
        debug
    };
}

/**
 * DISPATCHER - Apply UAE Test Overrides (PRODUCTION SAFE)
 * 
 * Accepts FLAGS as parameter (per-request, immutable)
 * Returns detailed debug info
 */
function applyUaeTestOverrides(text, countryProfile, FLAGS) {
    // ONLY apply in UAE mode
    if (countryProfile !== 'UAE') {
        return {
            triggered: false,
            debug: { rejectionReason: 'Not UAE market' }
        };
    }

    if (!FLAGS) {
        return {
            triggered: false,
            debug: { rejectionReason: 'FLAGS not provided' }
        };
    }

    // Check each test independently
    const tests = [
        checkDengueTest,
        checkTBTest,
        checkInfluenzaTest,
        checkRSVTest,
        checkMalariaTest,
        checkHIVTest,
        checkPregnancyTest,
        checkHepBTest,
        checkRotavirusTest
    ];

    const allDebug = [];

    for (const testFunc of tests) {
        const { result, debug } = testFunc(text, FLAGS);
        allDebug.push(debug);

        if (result) {
            return {
                triggered: true,
                diagnosis: {
                    code: result.code,
                    description: result.description
                },
                reason: `Diagnostic-test-derived – UAE rules (${result.testName})`,
                metadata: {
                    testName: result.testName,
                    flagUsed: result.flagUsed,
                    market: 'UAE'
                },
                _debug: debug
            };
        }
    }

    // No override triggered - return all debug info
    return {
        triggered: false,
        _debug: {
            flagsEvaluated: allDebug,
            rejectionReason: 'No test conditions met'
        }
    };
}

module.exports = {
    applyUaeTestOverrides,
    resolveUaeFlags,
    // Export individual functions for testing
    checkDengueTest,
    checkTBTest,
    checkInfluenzaTest,
    checkRSVTest,
    checkMalariaTest,
    checkHIVTest,
    checkPregnancyTest,
    checkHepBTest,
    checkRotavirusTest
};
