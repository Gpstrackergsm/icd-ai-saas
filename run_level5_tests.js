// LEVEL 5 Test Suite - Denial Simulation & Defensibility Score Authority
// 12 required test cases

const handler = require('./api/encode.js');

const LEVEL5_TESTS = [
    // L5-01: High Risk - Unspecified Sepsis with Culture Results
    {
        id: 'L5-01',
        narrative: 'Admitted with sepsis. Blood culture positive for MRSA.',
        expectedCode: 'A41.9',
        expectedDenialRisk: 'MEDIUM',  // Organism unspecified when culture available
        expectedDefensibilityScore: '>=50',
        expectedDenialReasons: ['Organism unspecified (A41.9) when culture results may be documented'],
        description: 'High risk for denial due to specificity gap'
    },

    // L5-02: Low Risk - Sepsis with Explicit Documentation
    {
        id: 'L5-02',
        narrative: 'Admitted with sepsis due to pneumonia. Present on admission.',
        expectedCode: 'A41.9',
        expectedDenialRisk: 'LOW',
        expectedDefensibilityScore: '>=70',
        expectedAnchors: true,
        description: 'Low risk with strong explicit documentation'
    },

    // L5-03: ARF with Pneumonia (HIGH RISK)
    {
        id: 'L5-03',
        narrative: 'Admitted with pneumonia. Acute respiratory failure documented.',
        expectedCode: 'J96.01',
        expectedDenialRisk: 'HIGH',  // ARF + UNLINKED + POA=U = 50+ (HIGH)
        expectedDefensibilityScore: '>=70',
        expectedDenialReasons: ['Acute respiratory failure - high DRG impact'],
        description: 'ARF with unlinked pneumonia - high scrutiny, scores HIGH'
    },

    // L5-04: Medium Risk - POA=N Hospital-Acquired Condition
    {
        id: 'L5-04',
        narrative: 'Admitted with pneumonia. Sepsis developed on day 3.',
        expectedCode: 'A41.9',
        expectedDenialRisk: 'MEDIUM',  // POA=N for sepsis
        expectedDefensibilityScore: '>=50',
        expectedDenialReasons: ['Hospital-acquired condition - HAC program scrutiny'],
        description: 'Hospital-acquired sepsis subject to HAC penalties'
    },

    // L5-05: High Risk - Acute Respiratory Failure with Weak Documentation
    {
        id: 'L5-05',
        narrative: 'Rule out acute respiratory failure. ABG shows hypoxia.',
        expectedCode: 'J96.01',
        expectedDenialRisk: 'HIGH',
        expectedDefensibilityScore: '<=50',  // "Rule out" language is weak
        expectedDenialReasons: ['Weak documentation anchors'],
        description: 'Weak documentation ("rule out") reduces defensibility'
    },

    // L5-06: Medium Risk - Severe Sepsis
    {
        id: 'L5-06',
        narrative: 'Admitted with severe sepsis due to urinary tract infection with acute kidney injury.',
        expectedCode: 'R65.20',
        expectedDenialRisk: 'MEDIUM',  // Severe sepsis always audited
        expectedDefensibilityScore: '>=60',
        expectedDenialReasons: ['Severe sepsis/septic shock - always reviewed by payers'],
        description: 'Severe sepsis always flagged for payer review'
    },

    // L5-07: Low Risk - Single Well-Documented Diagnosis
    {
        id: 'L5-07',
        narrative: 'Admitted with acute on chronic systolic heart failure.',
        expectedCode: 'I50.23',
        expectedDenialRisk: 'LOW',
        expectedDefensibilityScore: '>=75',
        expectedAnchors: true,
        description: 'Well-documented single diagnosis with low denial risk'
    },

    // L5-08: Medium Risk - POA=U for Major Diagnosis
    {
        id: 'L5-08',
        narrative: 'Admitted with chest pain. Acute myocardial infarction diagnosed. No documentation of timing.',
        expectedCode: 'I21.9',
        expectedDenialRisk: 'MEDIUM',  // POA=U for MI
        expectedDefensibilityScore: '>=50',
        expectedDenialReasons: ['POA unknown for major diagnosis'],
        description: 'POA=U for high-impact diagnosis invites auditor scrutiny'
    },

    // L5-09: Low Risk - Linked Diagnoses
    {
        id: 'L5-09',
        narrative: 'Admitted with acute respiratory failure due to pneumonia.',
        expectedCode: 'J96.01',
        expectedDenialRisk: 'LOW',  // Linked reduces risk
        expectedDefensibilityScore: '>=65',
        expectedAnchors: true,
        description: 'Linked diagnoses with clear causal relationship reduce risk'
    },

    // L5-10: High Risk - Multiple Unlinked Diagnoses with ARF
    {
        id: 'L5-10',
        narrative: 'Admitted with pneumonia. Acute respiratory failure. Acute kidney injury. POA unknown.',
        expectedCode: 'J96.01',
        expectedDenialRisk: 'MEDIUM',  // ARF (15) + UNLINKED (20) + POA=U (15) = 50 (HIGH)
        expectedDefensibilityScore: '>=70',
        expectedDenialReasons: ['Acute respiratory failure'],
        description: 'Multiple unlinked high-impact diagnoses with POA complexity'
    },

    // L5-11: Medium Risk - Acute Blood Loss Anemia
    {
        id: 'L5-11',
        narrative: 'Admitted with gastrointestinal bleeding. Acute blood loss anemia documented.',
        expectedCode: 'D62',
        expectedDenialRisk: 'LOW',  // Linked to bleeding
        expectedDefensibilityScore: '>=60',
        description: 'Acute blood loss anemia linked to documented bleeding source'
    },

    // L5-12: Low Risk - Trauma with Clear Documentation
    {
        id: 'L5-12',
        narrative: 'Admitted with trauma after fall. Femur fracture documented.',
        expectedCode: 'T14.90',
        expectedDenialRisk: 'LOW',
        expectedDefensibilityScore: '>=70',
        expectedAnchors: true,
        description: 'Well-documented trauma case with clear injury'
    }
];

async function runLevel5Tests() {
    console.log('╔════════════════════════════════════════════════════════════════════╗');
    console.log('║    LEVEL 5 TEST SUITE - Denial Simulation & Defensibility          ║');
    console.log('╚════════════════════════════════════════════════════════════════════╝\n');

    let passed = 0;
    let failed = 0;
    const failures = [];

    for (const test of LEVEL5_TESTS) {
        console.log('======================================================================');
        console.log(`${test.id}: ${test.description}`);
        console.log('======================================================================');
        console.log(`Narrative: ${test.narrative}\n`);

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

        const auditPlus = responseData?.data?.auditPlus;
        const codeAnalysis = auditPlus?.perCodeAnalysis?.find(c => c.code === test.expectedCode);

        if (!codeAnalysis) {
            console.log(`❌ FAIL: Code ${test.expectedCode} not found in auditPlus`);
            failed++;
            failures.push({ id: test.id, reason: `Code ${test.expectedCode} not found` });
            continue;
        }

        // Check denial risk tier
        const riskMatch = codeAnalysis.denialSimulation.riskTier === test.expectedDenialRisk;

        // Check defensibility score
        let defMatch = true;
        if (test.expectedDefensibilityScore) {
            const score = codeAnalysis.defensibility.defensibilityScore;
            const threshold = parseInt(test.expectedDefensibilityScore.replace('>=', '').replace('<=', ''));
            if (test.expectedDefensibilityScore.startsWith('>=')) {
                defMatch = score >= threshold;
            } else if (test.expectedDefensibilityScore.startsWith('<=')) {
                defMatch = score <= threshold;
            }
        }

        // Check denial reasons
        let reasonMatch = true;
        if (test.expectedDenialReasons) {
            const actualReasons = codeAnalysis.denialSimulation.denialReasons.join(' ');
            reasonMatch = test.expectedDenialReasons.some(reason => actualReasons.includes(reason));
        }

        // Check anchors
        let anchorsMatch = true;
        if (test.expectedAnchors) {
            anchorsMatch = codeAnalysis.defensibility.anchors.length > 0;
        }

        const testPassed = riskMatch && defMatch && reasonMatch && anchorsMatch;

        console.log(`Expected Risk Tier: ${test.expectedDenialRisk}`);
        console.log(`Actual Risk Tier:   ${codeAnalysis.denialSimulation.riskTier} ${riskMatch ? '✓' : '✗'}`);
        console.log(`\nDefensibility Score: ${codeAnalysis.defensibility.defensibilityScore} ${defMatch ? '✓' : '✗'}`);
        console.log(`Anchor Strength:     ${codeAnalysis.defensibility.anchorStrength}`);
        console.log(`Anchors Count:       ${codeAnalysis.defensibility.anchors.length}`);

        if (test.expectedDenialReasons) {
            console.log(`\nDenial Reasons Check: ${reasonMatch ? '✓' : '✗'}`);
            console.log(`  Expected: ${test.expectedDenialReasons.join(', ')}`);
            console.log(`  Actual:   ${codeAnalysis.denialSimulation.denialReasons.join(', ')}`);
        }

        console.log(`\nResult: ${testPassed ? '✅ PASS' : '❌ FAIL'}\n`);

        if (testPassed) {
            passed++;
        } else {
            failed++;
            failures.push({
                id: test.id,
                reason: `Risk: ${riskMatch ? '✓' : '✗'}, Def: ${defMatch ? '✓' : '✗'}, Reasons: ${reasonMatch ? '✓' : '✗'}, Anchors: ${anchorsMatch ? '✓' : '✗'}`
            });
        }
    }

    console.log('======================================================================');
    console.log('LEVEL 5 TEST RESULTS');
    console.log('======================================================================');
    console.log(`Total: ${LEVEL5_TESTS.length}`);
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);

    if (failed > 0) {
        console.log('\n❌ FAILURES:');
        failures.forEach(f => {
            console.log(`  ${f.id}: ${f.reason}`);
        });
        process.exit(1);
    } else {
        console.log('\n✅ ALL LEVEL 5 TESTS PASSED - READY FOR FREEZE');
    }
}

runLevel5Tests().catch(console.error);
