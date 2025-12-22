// LEVEL 3 Test Suite - Temporal Logic & POA Authority
// 12 required test cases

const handler = require('./api/encode.js');

const LEVEL3_TESTS = [
    // ========================================================================
    // SECTION A — POA CONFIRMED (Y) - 2 cases
    // ========================================================================
    {
        id: 'L3-A-01',
        section: 'A - POA Confirmed (Y)',
        narrative: 'Patient admitted with acute respiratory failure.',
        expectedCodes: ['J96.01'],
        expectedPOA: ['Y'],
        description: 'Simple POA=Y case'
    },
    {
        id: 'L3-A-02',
        section: 'A - POA Confirmed (Y)',
        narrative: 'Admitted with sepsis due to pneumonia.',
        expectedCodes: ['A41.9', 'J18.9'],
        expectedPOA: ['Y', 'Y'],
        description: 'Multiple codes all POA=Y with causality'
    },

    // ========================================================================
    // SECTION B — HOSPITAL-ACQUIRED (N) - 2 cases
    // ========================================================================
    {
        id: 'L3-B-01',
        section: 'B - Hospital-Acquired (N)',
        narrative: 'Admitted for pneumonia. Developed acute respiratory failure on day 3.',
        expectedCodes: ['J18.9', 'J96.01'],
        expectedPOA: ['Y', 'N'],
        description: 'Mixed POA: pneumonia POA=Y, resp failure POA=N'
    },
    {
        id: 'L3-B-02',
        section: 'B - Hospital-Acquired (N)',
        narrative: 'Severe sepsis developed after admission.',
        expectedCodes: ['A41.9', 'R65.20'],
        expectedPOA: ['N', 'N'],
        description: 'Both codes POA=N (hospital-acquired)'
    },

    // ========================================================================
    // SECTION C — POA UNKNOWN (U) - 2 cases
    // ========================================================================
    {
        id: 'L3-C-01',
        section: 'C - POA Unknown (U)',
        narrative: 'Patient with acute kidney injury noted during hospitalization.',
        expectedCodes: ['N17.9'],
        expectedPOA: ['U'],
        description: 'AKI timing unclear, POA=U'
    },
    {
        id: 'L3-C-02',
        section: 'C - POA Unknown (U)',
        narrative: 'Respiratory failure documented. Timing unclear.',
        expectedCodes: ['J96.01'],
        expectedPOA: ['U'],
        description: 'Resp failure timing unclear, POA=U'
    },

    // ========================================================================
    // SECTION D — QUERY REQUIRED - 2 cases
    // Note: For now these will code with POA=U, future enhancement for AUTO_QUERY
    // ========================================================================
    {
        id: 'L3-D-01',
        section: 'D - Query Required',
        narrative: 'Admitted for congestive heart failure. Acute kidney injury documented.',
        expectedDecision: 'AUTO_QUERY',  // LEVEL 1 requires specificity for heart failure
        expectedCodes: [],  // No codes assigned in query state
        expectedPOA: null,
        description: 'CHF requires specificity (LEVEL 1 AUTO_QUERY)'
    },
    {
        id: 'L3-D-02',
        section: 'D - Query Required',
        narrative: 'Sepsis documented. No timing specified.',
        expectedCodes: ['A41.9'],
        expectedPOA: ['U'],  // For now POA=U, future could be query
        description: 'Sepsis no timing, POA=U'
    },

    // ========================================================================
    // SECTION E — POA + CAUSALITY STACKING - 4 cases  
    // ========================================================================
    {
        id: 'L3-E-01',
        section: 'E - POA + Causality',
        narrative: 'Admitted with severe sepsis and acute renal failure.',
        expectedCodes: ['A41.9', 'R65.20', 'N17.9'],
        expectedPOA: ['Y', 'Y', 'Y'],
        description: 'All codes POA=Y with causality'
    },
    {
        id: 'L3-E-02',
        section: 'E - POA + Causality',
        narrative: 'Sepsis present on admission. Acute kidney injury developed later.',
        expectedCodes: ['A41.9', 'N17.9'],
        expectedPOA: ['Y', 'N'],
        description: 'Mixed POA: sepsis POA=Y, AKI POA=N'
    },
    {
        id: 'L3-E-03',
        section: 'E - POA + Causality',
        narrative: 'Diabetic foot ulcer present on admission.',
        expectedCodes: ['E11.621'],
        expectedPOA: ['Y'],
        description: 'Diabetic complication POA=Y'
    },
    {
        id: 'L3-E-04',
        section: 'E - POA + Causality',
        narrative: 'Type 2 diabetes on admission. Foot ulcer noted. No linkage stated.',
        expectedCodes: ['E11.9', 'L97.'],
        expectedPOA: ['Y', 'U'],  // Diabetes POA=Y (on admission), ulcer POA=U (just noted)
        description: 'Unlinked diabetes POA=Y, foot ulcer POA=U'
    }
];

async function runLevel3Tests() {
    console.log('╔════════════════════════════════════════════════════════════════════╗');
    console.log('║      LEVEL 3 TEST SUITE - Temporal Logic & POA Authority          ║');
    console.log('╚════════════════════════════════════════════════════════════════════╝\n');

    let passed = 0;
    let failed = 0;
    const failures = [];

    for (const test of LEVEL3_TESTS) {
        const mockReq = {
            method: 'POST',
            body: { text: test.narrative }
        };

        let responseData = null;
        const mockRes = {
            status: function (code) {
                this.statusCode = code;
                return this;
            },
            json: function (data) {
                responseData = data;
                return this;
            }
        };

        await handler(mockReq, mockRes);

        const actualCodes = [
            responseData.data?.primary,
            ...(responseData.data?.secondary?.map(c => c.code) || [])
        ].filter(Boolean);

        const actualPOA = [
            responseData.data?._debug?.codesAssigned?.[0]?.poa,
            ...(responseData.data?._debug?.codesAssigned?.slice(1)?.map(c => c.poa) || [])
        ].filter(Boolean);

        const actualDecision = responseData.data?._debug?.decisionState;

        // Check decision match (if expected decision is provided)
        let decisionMatch = true;
        if (test.expectedDecision) {
            decisionMatch = actualDecision === test.expectedDecision;
        }

        // Check codes match
        let codesMatch = true;
        if (test.expectedCodes && test.expectedCodes.length > 0) {
            codesMatch = test.expectedCodes.every(expectedCode =>
                actualCodes.some(actualCode => actualCode.startsWith(expectedCode))
            );
        } else if (test.expectedCodes && test.expectedCodes.length === 0) {
            // Expecting no codes
            codesMatch = actualCodes.length === 0;
        }

        // Check POA match (if expected POA is provided)
        let poaMatch = true;
        if (test.expectedPOA) {
            poaMatch = test.expectedPOA.every((expectedPoa, idx) =>
                actualPOA[idx] === expectedPoa
            );
        }

        const testPassed = decisionMatch && codesMatch && poaMatch;

        console.log(`\n${'='.repeat(70)}`);
        console.log(`${test.id} [${test.section}]`);
        console.log('='.repeat(70));
        console.log(`Description: ${test.description}`);
        console.log(`Narrative: ${test.narrative}`);
        console.log('');
        console.log(`Expected Codes: ${test.expectedCodes.join(' + ')}`);
        console.log(`Actual Codes:   ${actualCodes.join(' + ')}`);
        console.log('');
        if (test.expectedPOA) {
            console.log(`Expected POA: ${test.expectedPOA.join(', ')}`);
            console.log(`Actual POA:   ${actualPOA.join(', ')}`);
        }
        console.log('');
        console.log(`Result: ${testPassed ? '✅ PASS' : '❌ FAIL'}`);

        if (testPassed) {
            passed++;
        } else {
            failed++;
            failures.push({
                id: test.id,
                expected: `${test.expectedCodes.join('+')} (POA: ${test.expectedPOA?.join(',') || 'N/A'})`,
                actual: `${actualCodes.join('+')} (POA: ${actualPOA.join(',') || 'N/A'})`
            });
        }
    }

    console.log('\n' + '═'.repeat(70));
    console.log('LEVEL 3 TEST SUITE SUMMARY');
    console.log('═'.repeat(70));
    console.log(`Total Cases:    ${LEVEL3_TESTS.length}`);
    console.log(`✅ Passed:      ${passed}`);
    console.log(`❌ Failed:      ${failed}`);
    console.log(`Pass Rate:      ${((passed / LEVEL3_TESTS.length) * 100).toFixed(1)}%`);
    console.log('');

    if (failed === 0) {
        console.log('🎉 ALL LEVEL 3 TESTS PASSED - 100% ACCURACY');
        console.log('');
        console.log('✅ POA detection verified');
        console.log('✅ No temporal inference detected');
        console.log('✅ Audit-defensible POA output confirmed');
    } else {
        console.log(`⚠️  ${failed} test(s) failed - review needed`);
        console.log('');
        console.log('Failed Cases:');
        failures.forEach(f => {
            console.log(`  ${f.id}: Expected ${f.expected}, Got ${f.actual}`);
        });
    }

    console.log('═'.repeat(70));
}

runLevel3Tests().catch(console.error);
