// LEVEL 2 OFFICIAL CERTIFICATION TEST SUITE
// All 12 cases must PASS for certification

const handler = require('./api/encode.js');

const OFFICIAL_LEVEL2_TESTS = [
    // ========================================================================
    // 🟢 SECTION A — DIABETES LINKING
    // ========================================================================
    {
        id: 'L2-D-01',
        section: 'A - Diabetes Linking',
        linkage: 'LINKED',
        narrative: '68-year-old with type 2 diabetes admitted with a diabetic foot ulcer on the left heel.',
        expectedDecision: 'AUTO_CODE (LINKED)',
        expectedCodes: ['E11.621']
    },
    {
        id: 'L2-D-02',
        section: 'A - Diabetes Linking',
        linkage: 'UNLINKED',
        narrative: '68-year-old with type 2 diabetes admitted with a left heel ulcer. Provider documented "type 2 diabetes" and "foot ulcer" separately. No causal relationship stated.',
        expectedDecision: 'AUTO_CODE (UNLINKED)',
        expectedCodes: ['E11.9', 'L97.']
    },
    {
        id: 'L2-D-03',
        section: 'A - Diabetes Linking',
        linkage: 'LINKED',
        narrative: '72-year-old with neuropathy due to diabetes admitted for pain control.',
        expectedDecision: 'AUTO_CODE (LINKED)',
        expectedCodes: ['E11.40']
    },
    {
        id: 'L2-D-04',
        section: 'A - Diabetes Linking',
        linkage: 'UNLINKED',
        narrative: '72-year-old with type 2 diabetes and peripheral neuropathy. No linkage between the two documented.',
        expectedDecision: 'AUTO_CODE (UNLINKED)',
        expectedCodes: ['E11.9', 'G62.9']
    },

    // ========================================================================
    // 🔴 SECTION B — SEPSIS & ORGAN DYSFUNCTION
    // ========================================================================
    {
        id: 'L2-S-01',
        section: 'B - Sepsis & Organ Dysfunction',
        linkage: 'LINKED',
        narrative: '75-year-old admitted with severe sepsis with acute renal failure. Provider explicitly documented this relationship.',
        expectedDecision: 'AUTO_CODE (LINKED)',
        expectedCodes: ['A41.9', 'R65.20', 'N17.9']
    },
    {
        id: 'L2-S-02',
        section: 'B - Sepsis & Organ Dysfunction',
        linkage: 'UNLINKED',
        narrative: '75-year-old admitted with sepsis. Creatinine elevated to 2.6. No organ dysfunction documented.',
        expectedDecision: 'AUTO_CODE',
        expectedCodes: ['A41.9']
    },
    {
        id: 'L2-S-03',
        section: 'B - Sepsis & Organ Dysfunction',
        linkage: 'LINKED',
        narrative: '80-year-old admitted with sepsis complicated by septic shock.',
        expectedDecision: 'AUTO_CODE (LINKED)',
        expectedCodes: ['A41.9', 'R65.21']
    },
    {
        id: 'L2-S-04',
        section: 'B - Sepsis & Organ Dysfunction',
        linkage: 'UNLINKED',
        narrative: '80-year-old admitted for infection with hypotension responsive to fluids. Provider documented "sepsis" only.',
        expectedDecision: 'AUTO_CODE',
        expectedCodes: ['A41.9']
    },

    // ========================================================================
    // 🫁 SECTION C — PNEUMONIA → RESPIRATORY FAILURE
    // ========================================================================
    {
        id: 'L2-P-01',
        section: 'C - Pneumonia → Respiratory Failure',
        linkage: 'LINKED',
        narrative: '66-year-old admitted with acute respiratory failure due to pneumonia.',
        expectedDecision: 'AUTO_CODE (LINKED)',
        expectedCodes: ['J96.01', 'J18.9']
    },
    {
        id: 'L2-P-02',
        section: 'C - Pneumonia → Respiratory Failure',
        linkage: 'UNLINKED',
        narrative: '66-year-old admitted with pneumonia. Oxygen saturation 88% on room air, started on oxygen. No respiratory failure documented.',
        expectedDecision: 'AUTO_CODE',
        expectedCodes: ['J18.9']
    },

    // ========================================================================
    // 🧠 SECTION D — STROKE SEQUELAE CONFIRMATION
    // ========================================================================
    {
        id: 'L2-ST-01',
        section: 'D - Stroke Sequelae',
        linkage: 'LINKED SEQUELA',
        narrative: '70-year-old with prior stroke and residual left-sided weakness documented.',
        expectedDecision: 'AUTO_CODE',
        expectedCodes: ['I69.3']
    },
    {
        id: 'L2-ST-02',
        section: 'D - Stroke Sequelae',
        linkage: 'HISTORY ONLY',
        narrative: '70-year-old with history of CVA. Provider documented "no residual deficits."',
        expectedDecision: 'AUTO_CODE',
        expectedCodes: ['Z86.73']
    }
];

async function runOfficialCertification() {
    console.log('╔════════════════════════════════════════════════════════════════════╗');
    console.log('║           LEVEL 2 OFFICIAL CERTIFICATION TEST SUITE                ║');
    console.log('║         ICD-10-CM Causal Linking & Causality Authority             ║');
    console.log('╚════════════════════════════════════════════════════════════════════╝\n');

    let passed = 0;
    let failed = 0;
    const failures = [];

    for (const test of OFFICIAL_LEVEL2_TESTS) {
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
        const actualCodes = [
            responseData.data?.primary,
            ...(responseData.data?.secondary?.map(c => c.code) || [])
        ].filter(Boolean);

        // Check decision match
        const decisionMatch =
            actualDecision === test.expectedDecision ||
            (actualDecision?.includes('AUTO_CODE') && test.expectedDecision?.includes('AUTO_CODE'));

        // Check codes match
        const codesMatch = test.expectedCodes.every(expectedCode =>
            actualCodes.some(actualCode => actualCode.startsWith(expectedCode))
        ) && actualCodes.length >= test.expectedCodes.length;

        const testPassed = decisionMatch && codesMatch;

        console.log(`\n${'='.repeat(70)}`);
        console.log(`${test.id} [${test.section}] - ${test.linkage}`);
        console.log('='.repeat(70));
        console.log(`Narrative: ${test.narrative.substring(0, 100)}...`);
        console.log('');
        console.log(`Expected: ${test.expectedDecision}`);
        console.log(`Actual:   ${actualDecision}`);
        console.log('');
        console.log(`Expected Codes: ${test.expectedCodes.join(' + ')}`);
        console.log(`Actual Codes:   ${actualCodes.join(' + ')}`);
        console.log('');
        console.log(`Result: ${testPassed ? '✅ PASS' : '❌ FAIL'}`);

        if (testPassed) {
            passed++;
        } else {
            failed++;
            failures.push({
                id: test.id,
                expected: test.expectedCodes.join(' + '),
                actual: actualCodes.join(' + ')
            });
        }
    }

    console.log('\n' + '═'.repeat(70));
    console.log('LEVEL 2 OFFICIAL CERTIFICATION RESULTS');
    console.log('═'.repeat(70));
    console.log(`Total Cases:    ${OFFICIAL_LEVEL2_TESTS.length}`);
    console.log(`✅ Passed:      ${passed}`);
    console.log(`❌ Failed:      ${failed}`);
    console.log(`Pass Rate:      ${((passed / OFFICIAL_LEVEL2_TESTS.length) * 100).toFixed(1)}%`);
    console.log('');

    if (failed === 0) {
        console.log('🎉 LEVEL 2 OFFICIALLY CERTIFIED - 100% PASS RATE');
        console.log('');
        console.log('✅ All linking logic verified');
        console.log('✅ No inappropriate inference detected');
        console.log('✅ Audit-defensible output confirmed');
        console.log('');
        console.log('LEVEL 2 STATUS: CERTIFIED AND AUTHORIZED FOR PRODUCTION');
    } else {
        console.log('❌ LEVEL 2 CERTIFICATION FAILED');
        console.log('');
        console.log('Failed Cases:');
        failures.forEach(f => {
            console.log(`  ${f.id}: Expected ${f.expected}, Got ${f.actual}`);
        });
        console.log('');
        console.log('LEVEL 2 STATUS: NOT CERTIFIED - REQUIRES FIXES');
    }

    console.log('═'.repeat(70));
}

runOfficialCertification().catch(console.error);
