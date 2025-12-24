/**
 * Feature Flag Test Suite - PRODUCTION SAFE
 */

const testRules = require('./lib/uae/testOverrideRules.js');

// Test with environment variables (simulated)
process.env.UAE_ENABLE_DENGUE = 'true';
process.env.UAE_ENABLE_TB = 'true';
process.env.UAE_ENABLE_INFLUENZA = 'true';

const tests = [
    {
        name: 'Dengue - Positive (via ENV)',
        text: 'Patient with fever. Dengue NS1 test positive.',
        expected: 'A90'
    },
    {
        name: 'Dengue - Flag OFF',
        text: 'Patient with fever. Dengue test positive.',
        expected: null,
        customFlags: { ENABLE_DENGUE_TEST: false }
    },
    {
        name: 'TB - Positive (via ENV)',
        text: 'Patient with cough. TB PCR positive.',
        expected: 'A15.0'
    },
    {
        name: 'Influenza - Positive (via ENV)',
        text: 'Patient with fever. Influenza rapid test positive.',
        expected: 'J10.1'
    },
    {
        name: 'RSV - Flag OFF (no ENV)',
        text: 'Pediatric patient. RSV antigen positive.',
        expected: null
    }
];

console.log('# PRODUCTION-SAFE FEATURE FLAG TESTS\n');

let passed = 0;
let failed = 0;

tests.forEach(test => {
    const FLAGS = test.customFlags || testRules.resolveUaeFlags(null);
    const result = testRules.applyUaeTestOverrides(test.text, 'UAE', FLAGS);

    const actualCode = result.triggered ? result.diagnosis.code : null;
    const success = actualCode === test.expected;

    if (success) {
        passed++;
        console.log(`✅ ${test.name}`);
        if (result.triggered) {
            console.log(`   Code: ${actualCode}`);
            console.log(`   Debug: ${JSON.stringify(result._debug, null, 2)}`);
        }
    } else {
        failed++;
        console.log(`❌ ${test.name}`);
        console.log(`   Expected: ${test.expected}`);
        console.log(`   Got: ${actualCode}`);
        if (result._debug) {
            console.log(`   Debug: ${JSON.stringify(result._debug, null, 2)}`);
        }
    }
    console.log('');
});

console.log(`\n# SUMMARY: ${passed} PASS, ${failed} FAIL\n`);

process.exit(failed > 0 ? 1 : 0);
