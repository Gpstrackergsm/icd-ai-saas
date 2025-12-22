// REGRESSION TEST: Explicit Diagnosis Override for Lab-Only Exclusion
// Tests that explicit provider diagnoses in structured sections (Diagnosis:, Assessment:, etc.)
// correctly override the "Laboratory Values Alone" exclusion rule

const handler = require('./api/encode.js');

const TEST_CASES = [
    {
        id: 'EXPLICIT-01',
        name: 'Strep Throat with Lab',
        input: 'Diagnosis: Strep throat. Rapid strep test positive.',
        expectedCode: null, // "strep throat" not in ICD10_MAPPING, but should NOT AUTO_EXCLUDE
        expectedDecisionState: 'AUTO_CODE', // Should proceed to normal processing
        shouldNotExclude: true,
        description: 'Explicit diagnosis in Diagnosis: section should override lab-only exclusion'
    },
    {
        id: 'EXPLICIT-02',
        name: 'Sepsis in Assessment Section',
        input: 'Assessment: Sepsis. Blood cultures pending.',
        expectedCode: 'A41.9',
        expectedDecisionState: 'AUTO_CODE',
        shouldNotExclude: true,
        description: 'Explicit diagnosis in Assessment: section should allow code assignment'
    },
    {
        id: 'EXPLICIT-03',
        name: 'No Explicit Diagnosis (Lab Only)',
        input: 'Rapid strep test positive. Awaiting culture results.',
        expectedCode: null,
        expectedDecisionState: 'AUTO_EXCLUDE',
        shouldExclude: true,
        description: 'Lab result alone with NO explicit diagnosis should still AUTO_EXCLUDE'
    },
    {
        id: 'EXPLICIT-04',
        name: 'Explicit Diagnosis in Impression',
        input: 'Impression: Acute kidney injury. Creatinine 3.2.',
        expectedCode: 'N17.9',
        expectedDecisionState: 'AUTO_CODE',
        shouldNotExclude: true,
        description: 'Impression: section should be recognized as explicit diagnosis'
    },
    {
        id: 'EXPLICIT-05',
        name: 'Rule Out Should Still Exclude',
        input: 'Diagnosis: Rule out sepsis. Blood cultures ordered.',
        expectedCode: null,
        expectedDecisionState: 'AUTO_EXCLUDE',
        shouldExclude: true,
        description: '"Rule out" should be treated as negation, NOT explicit diagnosis'
    },
    {
        id: 'EXPLICIT-06',
        name: 'Possible Diagnosis Should Exclude',
        input: 'Assessment: Possible pneumonia. Chest X-ray ordered.',
        expectedCode: null,
        expectedDecisionState: 'AUTO_EXCLUDE',
        shouldExclude: true,
        description: '"Possible" should not be treated as explicit diagnosis'
    },
    {
        id: 'EXPLICIT-07',
        name: 'Query Format Should Exclude',
        input: 'Diagnosis: Pneumonia? Awaiting radiology.',
        expectedCode: null,
        expectedDecisionState: 'AUTO_EXCLUDE',
        shouldExclude: true,
        description: 'Query format (ending with ?) should not be treated as explicit diagnosis'
    }
];

async function runTest(testCase) {
    const mockReq = { method: 'POST', body: { text: testCase.input } };
    let responseData = null;
    const mockRes = {
        status: (code) => ({
            json: (data) => {
                responseData = data;
                return data;
            }
        })
    };

    await handler(mockReq, mockRes);

    const primary = responseData?.data?.primary;
    const decisionState = responseData?.data?._debug?.decisionState;

    let passed = true;
    const issues = [];

    // Check 1: Should NOT auto-exclude when explicit diagnosis present
    if (testCase.shouldNotExclude && decisionState === 'AUTO_EXCLUDE') {
        passed = false;
        issues.push('❌ AUTO_EXCLUDE triggered despite explicit provider diagnosis');
    }

    // Check 2: SHOULD auto-exclude when no explicit diagnosis
    if (testCase.shouldExclude && decisionState !== 'AUTO_EXCLUDE') {
        passed = false;
        issues.push(`❌ Expected AUTO_EXCLUDE, got ${decisionState}`);
    }

    // Check 3: Code match (if specified)
    if (testCase.expectedCode && primary !== testCase.expectedCode) {
        passed = false;
        issues.push(`❌ Expected code ${testCase.expectedCode}, got ${primary}`);
    }

    return {
        ...testCase,
        actualCode: primary,
        actualDecisionState: decisionState,
        passed,
        issues
    };
}

async function runAllTests() {
    console.log('═══════════════════════════════════════════════════════════════════');
    console.log('  REGRESSION TEST: Explicit Diagnosis Override');
    console.log('  Tests Lab-Only Exclusion Fix');
    console.log('═══════════════════════════════════════════════════════════════════\n');

    const results = [];
    let totalPassed = 0;
    let totalFailed = 0;

    for (const testCase of TEST_CASES) {
        const result = await runTest(testCase);
        results.push(result);

        if (result.passed) {
            totalPassed++;
            console.log(`✅ ${result.id}: ${result.name}`);
        } else {
            totalFailed++;
            console.log(`❌ ${result.id}: ${result.name}`);
            result.issues.forEach(issue => console.log(`   ${issue}`));
        }
        console.log(`   Input: "${result.input}"`);
        console.log(`   Decision: ${result.actualDecisionState}${result.actualCode ? ` | Code: ${result.actualCode}` : ''}`);
        console.log(`   ${result.description}\n`);
    }

    console.log('═══════════════════════════════════════════════════════════════════');
    console.log(`RESULTS: ${totalPassed}/${TEST_CASES.length} PASSED`);
    console.log('═══════════════════════════════════════════════════════════════════');

    if (totalFailed > 0) {
        console.log(`\n⚠️  ${totalFailed} test(s) failed - review implementation\n`);
        process.exit(1);
    } else {
        console.log('\n✅ ALL TESTS PASSED - Lab-Only Exclusion Override Working Correctly\n');
        process.exit(0);
    }
}

runAllTests().catch(err => {
    console.error('❌ Test execution failed:', err);
    process.exit(1);
});
