// Show actual system outputs for LEVEL 2 certification cases
const handler = require('./api/encode.js');

const DEMO_CASES = [
    {
        id: 'L2-D-01',
        title: 'Diabetes - LINKED',
        narrative: '68-year-old with type 2 diabetes admitted with a diabetic foot ulcer on the left heel.'
    },
    {
        id: 'L2-D-02',
        title: 'Diabetes - UNLINKED',
        narrative: '68-year-old with type 2 diabetes admitted with a left heel ulcer. Provider documented "type 2 diabetes" and "foot ulcer" separately. No causal relationship stated.'
    },
    {
        id: 'L2-S-01',
        title: 'Sepsis - LINKED',
        narrative: '75-year-old admitted with severe sepsis with acute renal failure. Provider explicitly documented this relationship.'
    },
    {
        id: 'L2-S-02',
        title: 'Sepsis - UNLINKED (no organ dysfunction)',
        narrative: '75-year-old admitted with sepsis. Creatinine elevated to 2.6. No organ dysfunction documented.'
    },
    {
        id: 'L2-P-01',
        title: 'Pneumonia - LINKED',
        narrative: '66-year-old admitted with acute respiratory failure due to pneumonia.'
    },
    {
        id: 'L2-P-02',
        title: 'Pneumonia - UNLINKED (no resp failure)',
        narrative: '66-year-old admitted with pneumonia. Oxygen saturation 88% on room air, started on oxygen. No respiratory failure documented.'
    }
];

async function showSystemOutputs() {
    console.log('╔════════════════════════════════════════════════════════════════════╗');
    console.log('║              LEVEL 2 SYSTEM OUTPUT EXAMPLES                        ║');
    console.log('║         Actual Audit Decision Blocks Generated                    ║');
    console.log('╚════════════════════════════════════════════════════════════════════╝\n');

    for (const testCase of DEMO_CASES) {
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

        console.log('\n' + '═'.repeat(70));
        console.log(`${testCase.id}: ${testCase.title}`);
        console.log('═'.repeat(70));
        console.log(`\nNarrative:\n${testCase.narrative}\n`);

        console.log('─'.repeat(70));
        console.log('SYSTEM OUTPUT:');
        console.log('─'.repeat(70));

        const decisionState = responseData.data?._debug?.decisionState;
        const linkageStatus = responseData.data?._debug?.linkageStatus;
        const codes = [
            responseData.data?.primary,
            ...(responseData.data?.secondary?.map(c => c.code) || [])
        ].filter(Boolean);

        console.log(`\nDecision State: ${decisionState}`);
        console.log(`Linkage Status: ${linkageStatus}`);
        console.log(`Codes: ${codes.join(' + ')}\n`);

        // Show the audit decision block (removing HTML tags for readability)
        const auditBlock = responseData.data?.validationErrors?.[0] || '';
        const cleanText = auditBlock
            .replace(/<[^>]*>/g, '\n')
            .replace(/\n\n+/g, '\n')
            .replace(/^\n+|\n+$/g, '')
            .split('\n')
            .filter(line => line.trim())
            .join('\n');

        console.log('Audit Decision Block:');
        console.log('┌' + '─'.repeat(68) + '┐');
        cleanText.split('\n').forEach(line => {
            console.log('│ ' + line.trim().padEnd(67) + '│');
        });
        console.log('└' + '─'.repeat(68) + '┘');
    }

    console.log('\n' + '═'.repeat(70));
    console.log('END OF SYSTEM OUTPUTS');
    console.log('═'.repeat(70) + '\n');
}

showSystemOutputs().catch(console.error);
