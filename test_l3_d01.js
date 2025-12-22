const handler = require('./api/encode.js');

async function testSpecific() {
    const mockReq = {
        method: 'POST',
        body: { text: 'Admitted for congestive heart failure. Acute kidney injury documented.' }
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

    console.log('Response:', JSON.stringify(responseData, null, 2));
}

testSpecific().catch(console.error);
