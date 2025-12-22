// ============================================================================
// DIABETES-CKD MANIFESTATION LINKING REGRESSION TEST
// Tests deterministic manifestation detection and combination code enforcement
// ============================================================================

const handler = require('./api/encode.js');

const testCases = [
    {
        id: 'MANIFEST-01',
        description: 'Diabetes + CKD Stage 4 with explicit manifestation language',
        input: 'Patient has type 2 diabetes. CKD stage 4. Physician documents CKD is a manifestation of diabetes.',
        expectedCodes: ['E11.22', 'N18.4'],
        expectedDecision: 'AUTO_CODE (LINKED)',
        mustNotHave: ['E11.9']  // Must NOT output unlinked diabetes code
    },
    {
        id: 'MANIFEST-02',
        description: 'Diabetes + CKD Stage 3 with "due to" language',
        input: 'Type 2 diabetes mellitus. Chronic kidney disease stage 3 due to diabetes.',
        expectedCodes: ['E11.22', 'N18.30'],
        expectedDecision: 'AUTO_CODE (LINKED)',
        mustNotHave: ['E11.9']
    },
    {
        id: 'MANIFEST-03',
        description: 'Diabetes + CKD WITHOUT manifestation language (unlinked)',
        input: 'Patient has type 2 diabetes. Also has chronic kidney disease stage 4.',
        expectedCodes: ['E11.9', 'N18.4'],
        expectedDecision: 'AUTO_CODE',
        mustNotHave: ['E11.22']  // Should NOT force combination code
    },
    {
        id: 'MANIFEST-04',
        description: 'Diabetes + CKD with "secondary to" language',
        input: 'CKD stage 4 secondary to type 2 diabetes mellitus.',
        expectedCodes: ['E11.22', 'N18.4'],
        expectedDecision: 'AUTO_CODE (LINKED)',
        mustNotHave: ['E11.9']
    }
];

console.log('═══════════════════════════════════════════════════════════════════');
console.log('  DIABETES-CKD MANIFESTATION LINKING TEST');
console.log('  Deterministic Combination Code Enforcement');
console.log('═══════════════════════════════════════════════════════════════════\n');

let passed = 0;
let failed = 0;

testCases.forEach(test => {
    console.log(`\n${test.id}: ${test.description}`);
    console.log(`Input: "${test.input}"`);

    const req = { method: 'POST', body: { text: test.input } };
    let result = null;

    const res = {
        status: (code) => ({
            json: (data) => {
                result = data;
            }
        })
    };

    try {
        handler(req, res);

        if (!result || !result.data) {
            console.log('❌ FAIL - No result returned');
            failed++;
            return;
        }

        const actualCodes = [];
        if (result.data.primary) actualCodes.push(result.data.primary);
        if (result.data.secondary) {
            result.data.secondary.forEach(s => actualCodes.push(s.code));
        }

        const actualDecision = result.data._debug.decisionState;

        // Check expected codes
        const hasAllExpected = test.expectedCodes.every(code =>
            actualCodes.some(ac => ac.startsWith(code))
        );

        // Check must not have codes
        const hasForbidden = test.mustNotHave && test.mustNotHave.some(code =>
            actualCodes.some(ac => ac.startsWith(code))
        );

        console.log(`Expected codes: ${test.expectedCodes.join(', ')}`);
        console.log(`Actual codes:   ${actualCodes.join(', ')}`);
        console.log(`Expected decision: ${test.expectedDecision}`);
        console.log(`Actual decision:   ${actualDecision}`);

        if (hasAllExpected && !hasForbidden) {
            console.log('✅ PASS');
            passed++;
        } else {
            console.log('❌ FAIL');
            if (hasForbidden) {
                console.log(`   Forbidden code detected: ${test.mustNotHave.find(code => actualCodes.some(ac => ac.startsWith(code)))}`);
            }
            if (!hasAllExpected) {
                console.log(`   Missing expected codes`);
            }
            failed++;
        }

    } catch (error) {
        console.log(`❌ FAIL - Error: ${error.message}`);
        failed++;
    }
});

console.log('\n═══════════════════════════════════════════════════════════════════');
console.log(`RESULTS: ${passed}/${testCases.length} PASSED`);
console.log('═══════════════════════════════════════════════════════════════════\n');

if (failed === 0) {
    console.log('✅ ALL TESTS PASSED - Manifestation linking working correctly\n');
    process.exit(0);
} else {
    console.log(`⚠️  ${failed} test(s) failed\n`);
    process.exit(1);
}
