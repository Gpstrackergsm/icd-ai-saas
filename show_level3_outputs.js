// LEVEL 3 - Display actual system outputs for all test cases
const handler = require('./api/encode.js');

const LEVEL3_DEMO_CASES = [
    // SECTION A — Present on Admission (POA = Y)
    { id: 'L3-01', section: 'A', narrative: 'Patient admitted with acute respiratory failure with hypoxia.' },
    { id: 'L3-02', section: 'A', narrative: 'Admitted with sepsis due to pneumonia.' },
    { id: 'L3-03', section: 'A', narrative: 'Patient arrived with severe sepsis and known acute renal failure.' },

    // SECTION B — Hospital-Acquired (POA = N)
    { id: 'L3-04', section: 'B', narrative: 'Admitted for pneumonia. Developed acute respiratory failure on day 3.' },
    { id: 'L3-05', section: 'B', narrative: 'Patient admitted for urinary tract infection. Acute kidney injury developed during hospitalization.' },
    { id: 'L3-06', section: 'B', narrative: 'Sepsis complicated by septic shock occurred after admission.' },

    // SECTION C — POA Unknown (POA = U)
    { id: 'L3-07', section: 'C', narrative: 'Acute kidney injury documented. Timing not specified.' },
    { id: 'L3-08', section: 'C', narrative: 'Respiratory failure noted in chart. No timing provided.' },
    { id: 'L3-09', section: 'C', narrative: 'Sepsis documented. Timing unclear.' },

    // SECTION D — Mixed POA
    { id: 'L3-10', section: 'D', narrative: 'Admitted for pneumonia. Acute kidney injury developed later.' },
    { id: 'L3-11', section: 'D', narrative: 'Sepsis present on admission. Acute respiratory failure developed on day 2.' },

    // SECTION E — POA + Causality
    { id: 'L3-12', section: 'E', narrative: 'Admitted with diabetic foot ulcer. Type 2 diabetes mellitus documented.' }
];

async function showLevel3Outputs() {
    console.log('╔════════════════════════════════════════════════════════════════════╗');
    console.log('║         LEVEL 3 SYSTEM OUTPUTS - Temporal Logic & POA             ║');
    console.log('╚════════════════════════════════════════════════════════════════════╝\n');

    for (const testCase of LEVEL3_DEMO_CASES) {
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
        const poaStatus = responseData.data?._debug?.poaStatus;

        console.log('═'.repeat(70));
        console.log(`${testCase.id} [Section ${testCase.section}]`);
        console.log('═'.repeat(70));
        console.log(`\nInput:\n${testCase.narrative}\n`);
        console.log('─'.repeat(70));
        console.log('System Output:');
        console.log('─'.repeat(70));
        console.log(`Decision State: ${decisionState}`);
        console.log(`API Version: ${responseData.data?._debug?.apiVersion}\n`);

        if (codes.length > 0) {
            console.log('Codes Assigned:');
            codes.forEach((c, idx) => {
                const poaLabel = c.poa === 'Y' ? '🟢 POA=Y (Present on Admission)' :
                    c.poa === 'N' ? '🔴 POA=N (Hospital-Acquired)' :
                        '⚪ POA=U (Unknown)';
                console.log(`  ${idx + 1}. ${c.code} — ${c.description}`);
                console.log(`     ${poaLabel}`);
                if (c.poaJustification) {
                    console.log(`     Justification: "${c.poaJustification}"`);
                }
            });

            console.log(`\nPOA Summary:`);
            console.log(`  All Y: ${poaStatus?.allY ? 'Yes' : 'No'}`);
            console.log(`  All N: ${poaStatus?.allN ? 'Yes' : 'No'}`);
            console.log(`  All U: ${poaStatus?.allU ? 'Yes' : 'No'}`);
            console.log(`  Mixed: ${poaStatus?.mixed ? 'Yes' : 'No'}`);
        } else {
            console.log('No codes assigned (query or exclusion state)');
        }

        console.log('\n');
    }

    console.log('═'.repeat(70));
    console.log('END OF LEVEL 3 OUTPUTS');
    console.log('═'.repeat(70));
}

showLevel3Outputs().catch(console.error);
