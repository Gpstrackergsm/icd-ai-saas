/**
 * Feature Flag Test Suite
 * Tests each flag independently with positive, negative, and edge cases
 */

const testRules = require('./lib/uae/testOverrideRules.js');
const FLAGS = require('./lib/uae/featureFlags.js');

// Enable all flags for testing
FLAGS.ENABLE_DENGUE_TEST = true;
FLAGS.ENABLE_TB_TEST = true;
FLAGS.ENABLE_RSV_TEST = true;
FLAGS.ENABLE_INFLUENZA_TEST = true;
FLAGS.ENABLE_MALARIA_TEST = true;
FLAGS.ENABLE_HIV_TEST = true;
FLAGS.ENABLE_PREGNANCY_TEST = true;
FLAGS.ENABLE_HEPB_TEST = true;
FLAGS.ENABLE_ROTAVIRUS_TEST = true;

const tests = [
    // DENGUE
    {
        name: 'Dengue - Positive',
        text: 'Patient with fever. Dengue NS1 test positive.',
        expected: 'A90'
    },
    {
        name: 'Dengue - Negative',
        text: 'Patient with fever. Dengue test negative.',
        expected: null
    },

    // TB
    {
        name: 'TB - Positive',
        text: 'Patient with cough. TB PCR positive.',
        expected: 'A15.0'
    },
    {
        name: 'TB - Negative',
        text: 'Patient with cough. TB PCR negative.',
        expected: null
    },

    // INFLUENZA
    {
        name: 'Influenza - Positive',
        text: 'Patient with fever. Influenza rapid test positive.',
        expected: 'J10.1'
    },
    {
        name: 'Influenza - Negative',
        text: 'Influenza test negative.',
        expected: null
    },

    // RSV
    {
        name: 'RSV - Positive',
        text: 'Pediatric patient with respiratory distress. RSV antigen positive.',
        expected: 'B97.4'
    },
    {
        name: 'RSV - No Context',
        text: 'RSV antigen positive.',
        expected: null
    },

    // MALARIA
    {
        name: 'Malaria - Positive',
        text: 'Patient with fever after travel. Malaria smear positive.',
        expected: 'B54'
    },

    // HIV
    {
        name: 'HIV - Positive',
        text: 'HIV screening test positive.',
        expected: 'B20'
    },

    // PREGNANCY
    {
        name: 'Pregnancy - Positive',
        text: 'Amenorrhea. Urine pregnancy test positive.',
        expected: 'Z32.01'
    },

    // HEP B
    {
        name: 'Hep B - Positive',
        text: 'Screening. HBsAg positive.',
        expected: 'B18.1'
    },

    // ROTAVIRUS
    {
        name: 'Rotavirus - Positive',
        text: 'Child with diarrhea. Rotavirus antigen positive.',
        expected: 'A08.0'
    },

    // USA MODE TEST
    {
        name: 'USA Mode - Should Not Override',
        text: 'Patient with fever. Dengue test positive.',
        expected: null,
        market: 'USA'
    }
];

console.log('# FEATURE FLAG TEST RESULTS\n');

let passed = 0;
let failed = 0;

tests.forEach(test => {
    const market = test.market || 'UAE';
    const result = testRules.applyUaeTestOverrides(test.text, market);

    const actualCode = result.triggered ? result.diagnosis.code : null;
    const success = actualCode === test.expected;

    if (success) {
        passed++;
        console.log(`✅ ${test.name}`);
        if (result.triggered) {
            console.log(`   Code: ${actualCode}`);
            console.log(`   Flag: ${result.metadata.flagUsed}`);
        }
    } else {
        failed++;
        console.log(`❌ ${test.name}`);
        console.log(`   Expected: ${test.expected}`);
        console.log(`   Got: ${actualCode}`);
    }
    console.log('');
});

console.log(`\n# SUMMARY: ${passed} PASS, ${failed} FAIL\n`);

process.exit(failed > 0 ? 1 : 0);
