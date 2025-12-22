// LEVEL 5 Results Runner - User-Provided Test Cases
const handler = require('./api/encode.js');

const TEST_NARRATIVES = [
    { id: 'L5-01', text: 'Admitted with sepsis due to pneumonia. Acute respiratory failure present on admission.' },
    { id: 'L5-02', text: 'Admitted for acute respiratory failure due to pneumonia.' },
    { id: 'L5-03', text: 'Admitted with pneumonia. Developed sepsis on day 2.' },
    { id: 'L5-04', text: 'Admitted with severe sepsis with acute renal failure present on admission.' },
    { id: 'L5-05', text: 'Admitted with diabetic foot ulcer. Type 2 diabetes mellitus documented. Sepsis developed during hospitalization.' },
    { id: 'L5-06', text: 'Admitted for chest pain. Acute myocardial infarction diagnosed on admission.' },
    { id: 'L5-07', text: 'Admitted with gastrointestinal bleeding. Acute blood loss anemia due to bleeding documented.' },
    { id: 'L5-08', text: 'Admitted after fall with femur fracture. Acute blood loss anemia documented.' },
    { id: 'L5-09', text: 'Sepsis documented. Timing unclear.' },
    { id: 'L5-10', text: 'Respiratory failure documented. No timing provided.' },
    { id: 'L5-11', text: 'Admitted with chronic kidney disease. Stage not specified.' },
    { id: 'L5-12', text: 'Admitted with sepsis. Blood cultures positive for MRSA.' }
];

async function runLevel5Results() {
    console.log('═══════════════════════════════════════════════════════════════════');
    console.log('           LEVEL 5 RESULTS - USER TEST CASES');
    console.log('═══════════════════════════════════════════════════════════════════\n');

    for (const test of TEST_NARRATIVES) {
        const mockReq = { method: 'POST', body: { text: test.text } };
        let responseData = null;
        const mockRes = {
            status: function (code) { this.statusCode = code; return this; },
            json: function (data) { responseData = data; return this; }
        };

        await handler(mockReq, mockRes);

        console.log(`\n${'='.repeat(70)}`);
        console.log(`${test.id}`);
        console.log('='.repeat(70));
        console.log(`Narrative: ${test.text}\n`);

        const auditPlus = responseData?.data?.auditPlus;
        const codes = responseData?.data?._debug?.codesAssigned || [];
        const pdx = responseData?.data?._debug?.principalDiagnosis;

        if (!auditPlus) {
            console.log('⚠️  No auditPlus data (likely AUTO_QUERY state)\n');
            continue;
        }

        console.log(`📊 ENCOUNTER SUMMARY:`);
        console.log(`   Risk Tier: ${auditPlus.encounterSummary.riskTier}`);
        console.log(`   Total Risk Score: ${auditPlus.encounterSummary.totalRiskScore}`);
        console.log(`   Top Denial Reasons: ${auditPlus.encounterSummary.topDenialReasons.slice(0, 2).join('; ')}\n`);

        console.log(`💊 CODES ASSIGNED (PDX: ${pdx}):`);
        auditPlus.perCodeAnalysis.forEach((analysis, idx) => {
            console.log(`\n   [${idx + 1}] ${analysis.code} - ${analysis.description}`);
            console.log(`       Role: ${analysis.role}`);
            console.log(`       Denial Risk: ${analysis.denialSimulation.riskTier} (Score: ${analysis.denialSimulation.riskScore})`);
            console.log(`       Defensibility: ${analysis.defensibility.defensibilityScore}/100 (${analysis.defensibility.anchorStrength})`);
            console.log(`       Anchors: ${analysis.defensibility.anchors.length > 0 ? analysis.defensibility.anchors[0].substring(0, 40) + '...' : 'None'}`);
            if (analysis.denialSimulation.denialReasons.length > 0) {
                console.log(`       Key Risk: ${analysis.denialSimulation.denialReasons[0]}`);
            }
        });

        console.log('');
    }

    console.log('\n' + '═'.repeat(70));
    console.log('                    END OF RESULTS');
    console.log('═'.repeat(70));
}

runLevel5Results().catch(console.error);
