// Show detailed output for all test cases with full audit decision text
const handler = require('./api/encode.js');

const testCases = [
    {
        id: 'ADV-01',
        narrative: '68-year-old admitted for dehydration and weakness. Creatinine was elevated on admission and improved after intravenous fluids. Renal function was monitored during hospitalization. There was no documented diagnosis of acute kidney injury or chronic kidney disease.'
    },
    {
        id: 'ADV-02',
        narrative: '80-year-old admitted for sepsis evaluation. Lactate was elevated on admission and normalized after fluid resuscitation. Kidney function was monitored during hospitalization. No renal diagnosis was documented.'
    },
    {
        id: 'ADV-03',
        narrative: '69-year-old admitted for syncope. Mild creatinine elevation was noted. Renal function was monitored only. No renal diagnosis was made.'
    },
    {
        id: 'ADV-04',
        narrative: '65-year-old admitted for abdominal pain. Laboratory studies showed an elevated BUN-to-creatinine ratio. Hydration was administered. No renal diagnosis was documented.'
    },
    {
        id: 'POS-01',
        narrative: '70-year-old admitted with acute kidney injury. Creatinine was 3.2 on admission. Patient received IV fluids and close renal monitoring.'
    },
    {
        id: 'POS-02',
        narrative: '75-year-old with chronic kidney disease stage 3. Baseline creatinine 1.8. Patient monitored for fluid status.'
    }
];

async function runTest(testCase) {
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
    return responseData;
}

function stripHtml(html) {
    // Remove HTML tags and extract text
    return html
        .replace(/<[^>]*>/g, '\n')
        .replace(/\n\s*\n/g, '\n')
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0)
        .join('\n');
}

async function showAllResults() {
    for (const testCase of testCases) {
        console.log('\n' + '='.repeat(80));
        console.log(`CASE ${testCase.id}`);
        console.log('='.repeat(80));
        console.log('');
        console.log('NARRATIVE:');
        console.log(testCase.narrative);
        console.log('');
        console.log('-'.repeat(80));
        console.log('OUTPUT:');
        console.log('-'.repeat(80));
        console.log('');

        const result = await runTest(testCase);

        if (result.data) {
            const { validationErrors, primary, secondary, _debug } = result.data;

            if (validationErrors?.length > 0 && validationErrors[0].includes('AUDIT DECISION')) {
                // Extract and display the audit decision text
                const cleanText = stripHtml(validationErrors[0]);
                console.log(cleanText);
            } else {
                console.log('DECISION STATE:', _debug?.decisionState || 'UNKNOWN');
                console.log('');
                console.log('PRIMARY CODE:', primary || 'None');
                console.log('SECONDARY CODES:', secondary?.length > 0 ? secondary.map(c => c.code).join(', ') : 'None');

                if (_debug?.diagnosesFound) {
                    console.log('');
                    console.log('DIAGNOSES DETECTED:', _debug.diagnosesFound.join(', '));
                    console.log('');
                    console.log('NOTE: Code mapping not yet implemented for positive cases.');
                    console.log('The system correctly detected the diagnosis but needs ICD-10-CM code mapping.');
                }
            }
        }

        console.log('');
    }

    console.log('\n' + '='.repeat(80));
    console.log('ALL CASES COMPLETE');
    console.log('='.repeat(80));
}

showAllResults().catch(console.error);
