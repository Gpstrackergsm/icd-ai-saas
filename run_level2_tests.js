// LEVEL 2 Test Suite - Causal Linking & Causality Authority
// 12 required test cases

const handler = require('./api/encode.js');

const LEVEL2_TESTS = [
    // ========================================================================
    // DIABETES LINKING (4 cases)
    // ========================================================================
    {
        id: 'L2-D-01',
        category: 'Diabetes Linking',
        narrative: 'Patient with diabetic foot ulcer on left heel.',
        expectedDecision: 'AUTO_CODE (LINKED)',
        expectedCodes: ['E11.621'],
        description: 'Explicit linking - diabetic foot ulcer'
    },
    {
        id: 'L2-D-02',
        category: 'Diabetes Linking',
        narrative: 'Type 2 diabetes. Foot ulcer left heel.',
        expectedDecision: 'AUTO_CODE',
        expectedCodes: ['E11.9', 'L97.'],
        description: 'No linking - separate conditions'
    },
    {
        id: 'L2-D-03',
        category: 'Diabetes Linking',
        narrative: 'Patient has diabetic neuropathy affecting both feet.',
        expectedDecision: 'AUTO_CODE (LINKED)',
        expectedCodes: ['E11.40'],
        description: 'Explicit linking - diabetic neuropathy'
    },
    {
        id: 'L2-D-04',
        category: 'Diabetes Linking',
        narrative: 'Type 2 diabetes. Peripheral neuropathy noted.',
        expectedDecision: 'AUTO_CODE',
        expectedCodes: ['E11.9', 'G62.9'],
        description: 'No linking - separate conditions'
    },

    // ========================================================================
    // SEPSIS + ORGAN DYSFUNCTION (4 cases)
    // ========================================================================
    {
        id: 'L2-S-01',
        category: 'Sepsis + Organ Dysfunction',
        narrative: '75-year-old admitted with severe sepsis with acute renal failure.',
        expectedDecision: 'AUTO_CODE (LINKED)',
        expectedCodes: ['A41.9', 'R65.20', 'N17.9'],
        description: 'Linked - severe sepsis with organ dysfunction'
    },
    {
        id: 'L2-S-02',
        category: 'Sepsis + Organ Dysfunction',
        narrative: 'Sepsis. Creatinine elevated at 2.5.',
        expectedDecision: 'AUTO_CODE',
        expectedCodes: ['A41.9'],
        description: 'No linkage from labs - sepsis only'
    },
    {
        id: 'L2-S-03',
        category: 'Sepsis + Organ Dysfunction',
        narrative: 'Patient diagnosed with severe sepsis.',
        expectedDecision: 'AUTO_CODE (LINKED)',
        expectedCodes: ['A41.9', 'R65.20'],
        description: 'Linked - severe sepsis (severity is linking)'
    },
    {
        id: 'L2-S-04',
        category: 'Sepsis + Organ Dysfunction',
        narrative: 'Sepsis complicated by septic shock.',
        expectedDecision: 'AUTO_CODE (LINKED)',
        expectedCodes: ['A41.9', 'R65.21'],
        description: 'Explicit linking - sepsis complicated by shock'
    },

    // ========================================================================
    // PNEUMONIA → RESPIRATORY FAILURE (2 cases)
    // ========================================================================
    {
        id: 'L2-P-01',
        category: 'Pneumonia → Respiratory Failure',
        narrative: 'Acute respiratory failure due to pneumonia.',
        expectedDecision: 'AUTO_CODE (LINKED)',
        expectedCodes: ['J96.01', 'J18.9'],
        description: 'Explicit linking - resp failure due to pneumonia'
    },
    {
        id: 'L2-P-02',
        category: 'Pneumonia → Respiratory Failure',
        narrative: 'Pneumonia. O2 sat 88%, started on oxygen.',
        expectedDecision: 'AUTO_CODE',
        expectedCodes: ['J18.9'],
        description: 'No linkage from labs/treatment - pneumonia only'
    },

    // ========================================================================
    // STROKE SEQUELAE (2 cases - verification)
    // ========================================================================
    {
        id: 'L2-ST-01',
        category: 'Stroke Sequelae',
        narrative: 'Residual left-sided weakness from prior CVA.',
        expectedDecision: 'AUTO_CODE',
        expectedCodes: ['I69.3'],
        description: 'Stroke sequela (already working from LEVEL 1)'
    },
    {
        id: 'L2-ST-02',
        category: 'Stroke Sequelae',
        narrative: 'History of CVA, no residual deficits.',
        expectedDecision: 'AUTO_CODE',
        expectedCodes: ['Z86.73'],
        description: 'Stroke history (already working from LEVEL 1)'
    }
];

async function runLevel2Tests() {
    console.log('╔════════════════════════════════════════════════════════════════════╗');
    console.log('║      LEVEL 2 TEST SUITE - Causal Linking & Causality Authority    ║');
    console.log('╚════════════════════════════════════════════════════════════════════╝\n');

    let passed = 0;
    let failed = 0;

    for (const test of LEVEL2_TESTS) {
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

        const actualDecision = responseData.data?._debug?.decisionState;
        const actualCodes = [responseData.data?.primary, ...(responseData.data?.secondary?.map(c => c.code) || [])].filter(Boolean);

        const decisionMatch = actualDecision === test.expectedDecision ||
            (actualDecision?.startsWith('AUTO_CODE') && test.expectedDecision?.startsWith('AUTO_CODE'));
        const codesMatch = test.expectedCodes.every(expectedCode =>
            actualCodes.some(actualCode => actualCode.startsWith(expectedCode))
        );

        const testPassed = decisionMatch && codesMatch;

        console.log(`\n${'='.repeat(70)}`);
        console.log(`${test.id} [${test.category}]`);
        console.log('='.repeat(70));
        console.log(`Description: ${test.description}`);
        console.log(`Narrative: ${test.narrative}`);
        console.log('');
        console.log(`Expected Decision: ${test.expectedDecision}`);
        console.log(`Actual Decision:   ${actualDecision}`);
        console.log('');
        console.log(`Expected Codes: ${test.expectedCodes.join(', ')}`);
        console.log(`Actual Codes:   ${actualCodes.join(', ')}`);
        console.log('');
        console.log(`Result: ${testPassed ? '✅ PASS' : '❌ FAIL'}`);

        if (testPassed) {
            passed++;
        } else {
            failed++;
        }
    }

    console.log('\n' + '='.repeat(70));
    console.log('LEVEL 2 TEST SUITE SUMMARY');
    console.log('='.repeat(70));
    console.log(`Total Cases: ${LEVEL2_TESTS.length}`);
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log('');

    if (failed === 0) {
        console.log('🎉 ALL LEVEL 2 TESTS PASSED - 100% ACCURACY');
    } else {
        console.log(`⚠️  ${failed} test(s) failed - review needed`);
    }

    console.log('='.repeat(70));
}

runLevel2Tests().catch(console.error);
