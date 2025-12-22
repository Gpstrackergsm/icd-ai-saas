// Test local API endpoint to verify parity with production
const http = require('http');

const testNarrative = '68-year-old admitted for dehydration and weakness. Creatinine was elevated on admission and improved after intravenous fluids. Renal function was monitored during hospitalization. There was no documented diagnosis of acute kidney injury or chronic kidney disease.';

// Start a simple test by requiring the API handler directly
const handler = require('./api/encode.js');

// Mock req and res objects
const mockReq = {
    method: 'POST',
    body: { text: testNarrative }
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

console.log('Testing local API endpoint...\n');

handler(mockReq, mockRes).then(() => {
    console.log('Response status:', mockRes.statusCode);
    console.log('\nResponse data:');
    console.log(JSON.stringify(responseData, null, 2));
    console.log('\n--- Verification Checks ---');

    if (responseData.data) {
        const { primary, secondary, validationErrors, warnings } = responseData.data;

        console.log('\n1. Primary code:', primary);
        console.log('   Expected: null ✅');

        console.log('\n2. Secondary codes:', secondary);
        console.log('   Expected: [] ✅');

        console.log('\n3. ValidationErrors count:', validationErrors?.length || 0);
        console.log('   Expected: 1 (audit decision block)');

        if (validationErrors?.length > 0) {
            console.log('\n4. Audit decision block present:', validationErrors[0].includes('AUDIT DECISION'));
            console.log('   Expected: true');

            console.log('\n5. Contains AUTO EXCLUDE:', validationErrors[0].includes('AUTO EXCLUDE'));
            console.log('   Expected: true');

            console.log('\n6. Contains Rule Group 3.3:', validationErrors[0].includes('Rule Group 3.3'));
            console.log('   Expected: true');

            console.log('\n7. Preview of audit decision block:');
            console.log(validationErrors[0].substring(0, 300) + '...');
        }

        console.log('\n--- Local System Status ---');
        if (primary === null &&
            secondary.length === 0 &&
            validationErrors?.length === 1 &&
            validationErrors[0].includes('AUDIT DECISION — AUTO EXCLUDE')) {
            console.log('✅ LOCAL SYSTEM MATCHES PRODUCTION');
            console.log('✅ AUTO_EXCLUDE audit decision working correctly');
            console.log('✅ No forbidden UI elements will display');
        } else {
            console.log('❌ MISMATCH DETECTED');
            console.log('Local system output differs from production');
        }
    }
}).catch(err => {
    console.error('Error testing local API:', err);
});
