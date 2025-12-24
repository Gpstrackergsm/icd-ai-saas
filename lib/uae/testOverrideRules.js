/**
 * UAE Test Override Rules
 * 
 * Each test has its OWN independent rule function
 * NO shared inference, NO fallback, NO chaining
 * 
 * Activation requires ALL conditions to pass:
 * 1. Feature flag enabled
 * 2. Explicit test name detected
 * 3. Explicit POSITIVE result
 * 4. No negation
 * 5. Clinical context present
 */

const FLAGS = require('./featureFlags.js');

/**
 * Helper: Check for negation
 */
function hasNegation(text) {
    return /\b(negative|ruled out|equivocal|not detected|absent)\b/i.test(text);
}

/**
 * DENGUE TEST RULE
 */
function checkDengueTest(text) {
    if (!FLAGS.ENABLE_DENGUE_TEST) return null;

    const hasTestName = /\b(dengue\s+test|dengue\s+ns1|dengue\s+igm)\b/i.test(text);
    const hasPositive = /\b(positive|detected)\b/i.test(text);
    const hasContext = /\b(fever|rash|headache|joint|pain|screening)\b/i.test(text);

    if (hasTestName && hasPositive && !hasNegation(text) && hasContext) {
        return {
            code: 'A90',
            description: 'Dengue fever',
            testName: 'Dengue',
            flagUsed: 'ENABLE_DENGUE_TEST'
        };
    }

    return null;
}

/**
 * TUBERCULOSIS TEST RULE
 */
function checkTBTest(text) {
    if (!FLAGS.ENABLE_TB_TEST) return null;

    const hasTestName = /\b(tb\s+pcr|mtb\s+detected|gene\s*xpert|tuberculosis\s+pcr)\b/i.test(text);
    const hasPositive = /\b(positive|detected)\b/i.test(text);
    const hasContext = /\b(cough|hemoptysis|weight\s+loss|screening|contact)\b/i.test(text);

    if (hasTestName && hasPositive && !hasNegation(text) && hasContext) {
        return {
            code: 'A15.0',
            description: 'Tuberculosis of lung',
            testName: 'TB PCR',
            flagUsed: 'ENABLE_TB_TEST'
        };
    }

    return null;
}

/**
 * INFLUENZA TEST RULE
 */
function checkInfluenzaTest(text) {
    if (!FLAGS.ENABLE_INFLUENZA_TEST) return null;

    const hasTestName = /\b(influenza\s+rapid|flu\s+test|influenza\s+a)\b/i.test(text);
    const hasPositive = /\b(positive)\b/i.test(text);
    const hasContext = /\b(fever|cough|flu|respiratory|screening)\b/i.test(text);

    if (hasTestName && hasPositive && !hasNegation(text) && hasContext) {
        return {
            code: 'J10.1',
            description: 'Influenza with other respiratory manifestations',
            testName: 'Influenza Rapid Test',
            flagUsed: 'ENABLE_INFLUENZA_TEST'
        };
    }

    return null;
}

/**
 * RSV TEST RULE
 */
function checkRSVTest(text) {
    if (!FLAGS.ENABLE_RSV_TEST) return null;

    const hasTestName = /\b(rsv\s+antigen|rsv\s+pcr|respiratory\s+syncytial)\b/i.test(text);
    const hasPositive = /\b(positive|detected)\b/i.test(text);
    const hasContext = /\b(pediatric|child|infant|respiratory|bronchiolitis)\b/i.test(text);

    if (hasTestName && hasPositive && !hasNegation(text) && hasContext) {
        return {
            code: 'B97.4',
            description: 'Respiratory syncytial virus',
            testName: 'RSV Test',
            flagUsed: 'ENABLE_RSV_TEST'
        };
    }

    return null;
}

/**
 * MALARIA TEST RULE
 */
function checkMalariaTest(text) {
    if (!FLAGS.ENABLE_MALARIA_TEST) return null;

    const hasTestName = /\b(malaria\s+smear|plasmodium\s+detected|malaria\s+test)\b/i.test(text);
    const hasPositive = /\b(positive|detected)\b/i.test(text);
    const hasContext = /\b(fever|chills|travel|screening)\b/i.test(text);

    if (hasTestName && hasPositive && !hasNegation(text) && hasContext) {
        return {
            code: 'B54',
            description: 'Unspecified malaria',
            testName: 'Malaria Test',
            flagUsed: 'ENABLE_MALARIA_TEST'
        };
    }

    return null;
}

/**
 * HIV TEST RULE
 */
function checkHIVTest(text) {
    if (!FLAGS.ENABLE_HIV_TEST) return null;

    const hasTestName = /\b(hiv\s+test|elisa\s+hiv|hiv\s+pcr|hiv\s+screening)\b/i.test(text);
    const hasPositive = /\b(positive|reactive)\b/i.test(text);
    const hasContext = /\b(screening|test|confirm|status)\b/i.test(text);

    if (hasTestName && hasPositive && !hasNegation(text) && hasContext) {
        return {
            code: 'B20',
            description: 'Human immunodeficiency virus [HIV] disease',
            testName: 'HIV Test',
            flagUsed: 'ENABLE_HIV_TEST'
        };
    }

    return null;
}

/**
 * PREGNANCY TEST RULE
 */
function checkPregnancyTest(text) {
    if (!FLAGS.ENABLE_PREGNANCY_TEST) return null;

    const hasTestName = /\b(urine\s+pregnancy|pregnancy\s+test|hcg\s+positive|rapid\s+pregnancy)\b/i.test(text);
    const hasPositive = /\b(positive)\b/i.test(text);
    const hasContext = /\b(screening|confirm|suspected|amenorrhea)\b/i.test(text);

    if (hasTestName && hasPositive && !hasNegation(text) && hasContext) {
        return {
            code: 'Z32.01',
            description: 'Pregnant state, incidental',
            testName: 'Pregnancy Test',
            flagUsed: 'ENABLE_PREGNANCY_TEST'
        };
    }

    return null;
}

/**
 * HEPATITIS B TEST RULE
 */
function checkHepBTest(text) {
    if (!FLAGS.ENABLE_HEPB_TEST) return null;

    const hasTestName = /\b(hbsag|hepatitis\s+b\s+surface\s+antigen)\b/i.test(text);
    const hasPositive = /\b(positive|reactive)\b/i.test(text);
    const hasContext = /\b(screening|test|chronic|status)\b/i.test(text);

    if (hasTestName && hasPositive && !hasNegation(text) && hasContext) {
        return {
            code: 'B18.1',
            description: 'Chronic viral hepatitis B without delta-agent',
            testName: 'Hepatitis B Surface Antigen',
            flagUsed: 'ENABLE_HEPB_TEST'
        };
    }

    return null;
}

/**
 * ROTAVIRUS TEST RULE
 */
function checkRotavirusTest(text) {
    if (!FLAGS.ENABLE_ROTAVIRUS_TEST) return null;

    const hasTestName = /\b(rotavirus\s+antigen|rotavirus\s+test)\b/i.test(text);
    const hasPositive = /\b(positive)\b/i.test(text);
    const hasContext = /\b(diarrhea|gastroenteritis|child|vomit)\b/i.test(text);

    if (hasTestName && hasPositive && !hasNegation(text) && hasContext) {
        return {
            code: 'A08.0',
            description: 'Rotaviral enteritis',
            testName: 'Rotavirus Antigen',
            flagUsed: 'ENABLE_ROTAVIRUS_TEST'
        };
    }

    return null;
}

/**
 * DISPATCHER - Apply UAE Test Overrides
 * 
 * Returns { triggered: false } by default
 * Only evaluates if countryProfile === "UAE"
 */
function applyUaeTestOverrides(text, countryProfile) {
    // ONLY apply in UAE mode
    if (countryProfile !== 'UAE') {
        return { triggered: false };
    }

    // Check each test independently (no chaining, no fallback)
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

    for (const testFunc of tests) {
        const result = testFunc(text);
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
                }
            };
        }
    }

    // No override triggered
    return { triggered: false };
}

module.exports = {
    applyUaeTestOverrides,
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
