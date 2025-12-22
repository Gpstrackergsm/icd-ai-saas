// Debug L0-08 COPD case
const handler = require('./api/encode.js');

const testCase = {
    id: 'L0-08',
    narrative: '73-year-old inpatient with COPD exacerbation. Blood urea nitrogen was elevated and attributed to dehydration. Renal labs were monitored. Provider did not diagnose acute or chronic kidney disease.'
};

async function debugCase() {
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

    console.log('L0-08 DEBUG');
    console.log('='.repeat(80));
    console.log('Narrative:', testCase.narrative);
    console.log('');
    console.log('Full Response:');
    console.log(JSON.stringify(responseData, null, 2));
}

debugCase().catch(console.error);
