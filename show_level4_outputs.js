// LEVEL 4 - Display actual system outputs for 12 complex test cases
const handler = require('./api/encode.js');

const LEVEL4_DEMO_CASES = [
    { id: 'L4-01', narrative: 'Admitted with sepsis due to pneumonia. Acute respiratory failure present on admission.' },
    { id: 'L4-02', narrative: 'Admitted for acute respiratory failure due to pneumonia.' },
    { id: 'L4-03', narrative: 'Admitted with pneumonia. Developed sepsis on day 2.' },
    { id: 'L4-04', narrative: 'Admitted with severe sepsis due to urinary tract infection with acute kidney injury present on admission.' },
    { id: 'L4-05', narrative: 'Admitted with diabetic foot ulcer and type 2 diabetes mellitus. Sepsis developed during hospitalization.' },
    { id: 'L4-06', narrative: 'Admitted for chest pain. Acute myocardial infarction diagnosed on admission.' },
    { id: 'L4-07', narrative: 'Admitted with acute on chronic systolic heart failure and pulmonary edema.' },
    { id: 'L4-08', narrative: 'Admitted for COPD exacerbation with acute respiratory failure documented on admission.' },
    { id: 'L4-09', narrative: 'Admitted with gastrointestinal bleeding. Acute blood loss anemia documented as due to bleeding.' },
    { id: 'L4-10', narrative: 'Admitted with stroke. Residual left-sided weakness from prior CVA documented.' },
    { id: 'L4-11', narrative: 'Admitted with trauma after fall. Femur fracture documented. Acute blood loss anemia documented.' },
    { id: 'L4-12', narrative: 'Admitted with sepsis due to pneumonia. Septic shock developed after admission.' }
];

async function showLevel4Outputs() {
    console.log('╔════════════════════════════════════════════════════════════════════╗');
    console.log('║         LEVEL 4 SYSTEM OUTPUTS - PDX & Sequencing                 ║');
    console.log('╚════════════════════════════════════════════════════════════════════╝\n');

    for (const testCase of LEVEL4_DEMO_CASES) {
        const mockReq = {
            method: 'POST',
            body: { text: testCase.narrative }
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

        const codes = responseData.data?._debug?.codesAssigned || [];
        const decisionState = responseData.data?._debug?.decisionState;
        const pdx = responseData.data?._debug?.principalDiagnosis;
        const justification = responseData.data?._debug?.sequencingJustification;

        console.log('═'.repeat(70));
        console.log(`${testCase.id}`);
        console.log('═'.repeat(70));
        console.log(`\nInput:\n${testCase.narrative}\n`);
        console.log('─'.repeat(70));
        console.log('System Output:');
        console.log('─'.repeat(70));
        console.log(`Decision: ${decisionState}`);
        console.log(`API Version: ${responseData.data?._debug?.apiVersion}`);
        console.log(`PDX: ${pdx || 'N/A'}`);
        if (justification) {
            console.log(`Justification: ${justification}`);
        }
        console.log('');

        if (codes.length > 0) {
            console.log('Codes with Sequencing:');
            codes.forEach((c, idx) => {
                const roleSymbol = c.role === 'PRIMARY' ? '🔵 PRIMARY' : '⚪ SECONDARY';
                const poaSymbol = c.poa === 'Y' ? '🟢 Y' : c.poa === 'N' ? '🔴 N' : '⚫ U';
                console.log(`  ${idx + 1}. ${c.code} — ${c.description}`);
                console.log(`     Role: ${roleSymbol} | POA: ${poaSymbol}`);
            });
        } else {
            console.log('No codes assigned');
        }

        console.log('\n');
    }

    console.log('═'.repeat(70));
    console.log('END OF LEVEL 4 OUTPUTS');
    console.log('═'.repeat(70));
}

showLevel4Outputs().catch(console.error);
