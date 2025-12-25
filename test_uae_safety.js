/**
 * UAE Safety Validation Test
 * 
 * Tests that ONLY approved sources can AUTO_CODE
 */

const { checkUAEOverride, canAutoCodeUAE, ALLOWED_REASON_TYPES } = require('./lib/uae-market-rules.js');

const SAFETY_TESTS = [
    // SHOULD AUTO_CODE (Approved)
    {
        id: 1,
        name: 'Rapid Strep Positive',
        narrative: 'Sore throat. Rapid strep test positive.',
        expected: { shouldAutoCode: true, code: 'J02.0' }
    },
    {
        id: 2,
        name: 'COVID PCR Positive',
        narrative: 'COVID PCR positive.',
        expected: { shouldAutoCode: true, code: 'U07.1' }
    },
    {
        id: 3,
        name: 'I&D Right Hand',
        narrative: 'Incision and drainage of right hand abscess performed.',
        expected: { shouldAutoCode: true, code: 'L02.511' }
    },
    {
        id: 4,
        name: 'Dialysis Session',
        narrative: 'Patient received hemodialysis.',
        expected: { shouldAutoCode: true, code: 'N18.6' }
    },
    {
        id: 5,
        name: 'Blood Culture + Sepsis',
        narrative: 'Sepsis. Blood culture grew E. coli.',
        expected: { shouldAutoCode: true, code: 'A41.51' }
    },
    {
        id: 6,
        name: 'Blood Culture - No Sepsis',
        narrative: 'Blood culture positive for E. coli.',
        expected: { shouldAutoCode: true, code: 'R78.81' }
    },

    // MUST NOT AUTO_CODE (Unsafe inference)
    {
        id: 101,
        name: 'Troponin Elevated (LAB)',
        narrative: 'Troponin elevated at 2.5.',
        expected: { shouldAutoCode: false }
    },
    {
        id: 102,
        name: 'HbA1c >6.5 (LAB)',
        narrative: 'HbA1c 7.2%.',
        expected: { shouldAutoCode: false }
    },
    {
        id: 103,
        name: 'BNP Elevated (LAB)',
        narrative: 'BNP 800 pg/mL.',
        expected: { shouldAutoCode: false }
    },
    {
        id: 104,
        name: 'Metformin (MEDICATION)',
        narrative: 'Continue metformin 500mg twice daily.',
        expected: { shouldAutoCode: false }
    },
    {
        id: 105,
        name: 'Insulin (MEDICATION)',
        narrative: 'Patient on insulin therapy.',
        expected: { shouldAutoCode: false }
    },
    {
        id: 106,
        name: 'Lisinopril (MEDICATION)',
        narrative: 'Lisinopril 10mg daily.',
        expected: { shouldAutoCode: false }
    },
    {
        id: 107,
        name: 'Atorvastatin (MEDICATION)',
        narrative: 'Started on atorvastatin 20mg.',
        expected: { shouldAutoCode: false }
    },
    {
        id: 108,
        name: 'TSH Elevated (LAB)',
        narrative: 'TSH 8.5 mIU/L.',
        expected: { shouldAutoCode: false }
    }
];

function runSafetyTests() {
    console.log('# UAE SAFETY VALIDATION TEST');
    console.log('# Testing STRICT enforcement of AUTO_CODE restrictions\n');

    let passed = 0;
    let failed = 0;
    const failures = [];

    SAFETY_TESTS.forEach(test => {
        const result = checkUAEOverride(test.narrative, 'UAE');

        const shouldAutoCode = result && result.shouldOverride;
        const success = shouldAutoCode === test.expected.shouldAutoCode;

        if (test.expected.shouldAutoCode && success && test.expected.code) {
            // Verify correct code
            const hasCode = result.diagnoses.some(d => d.code === test.expected.code);
            if (!hasCode) {
                failed++;
                failures.push({
                    id: test.id,
                    name: test.name,
                    issue: `Wrong code. Expected ${test.expected.code}, got ${result.diagnoses[0]?.code}`
                });
                console.log(`❌ Test ${test.id}: ${test.name} (Wrong code)`);
                return;
            }
        }

        if (success) {
            passed++;
            console.log(`✅ Test ${test.id}: ${test.name}`);
        } else {
            failed++;
            failures.push({
                id: test.id,
                name: test.name,
                expected: test.expected.shouldAutoCode ? 'AUTO_CODE' : 'NO AUTO_CODE',
                got: shouldAutoCode ? 'AUTO_CODE' : 'NO AUTO_CODE'
            });
            console.log(`❌ Test ${test.id}: ${test.name}`);
        }
    });

    console.log(`\n# RESULTS`);
    console.log(`Passed: ${passed}/${SAFETY_TESTS.length}`);
    console.log(`Failed: ${failed}/${SAFETY_TESTS.length}`);
    console.log(`Safety Rate: ${((passed / SAFETY_TESTS.length) * 100).toFixed(1)}%\n`);

    if (failures.length > 0) {
        console.log('# FAILURES\n');
        failures.forEach(f => {
            console.log(`Test ${f.id}: ${f.name}`);
            console.log(`  Expected: ${f.expected || f.issue}`);
            if (f.got) console.log(`  Got: ${f.got}`);
            console.log('');
        });
    }

    // Test gatekeeper directly
    console.log('# GATEKEEPER FUNCTION TEST\n');
    console.log(`✅ EXPLICIT_PROVIDER_DX: ${canAutoCodeUAE(ALLOWED_REASON_TYPES.EXPLICIT_PROVIDER_DX)}`);
    console.log(`✅ POSITIVE_NAMED_DIAGNOSTIC_TEST: ${canAutoCodeUAE(ALLOWED_REASON_TYPES.POSITIVE_NAMED_DIAGNOSTIC_TEST)}`);
    console.log(`✅ APPROVED_PROCEDURE_IMPLIED_DX: ${canAutoCodeUAE(ALLOWED_REASON_TYPES.APPROVED_PROCEDURE_IMPLIED_DX)}`);
    console.log(`❌ LAB_INFERENCE (should be false): ${canAutoCodeUAE('LAB_INFERENCE')}`);
    console.log(`❌ MEDICATION_INFERENCE (should be false): ${canAutoCodeUAE('MEDICATION_INFERENCE')}`);

    return { passed, failed, total: SAFETY_TESTS.length };
}

if (require.main === module) {
    const results = runSafetyTests();
    process.exit(results.failed > 0 ? 1 : 0);
}

module.exports = { runSafetyTests };
