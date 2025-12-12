const https = require('https');

function callLiveAPI(text) {
    return new Promise((resolve, reject) => {
        const postData = JSON.stringify({ text });

        const options = {
            hostname: 'www.icd-10-cm.online',
            path: '/api/encode-structured',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(postData)
            }
        };

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => { data += chunk; });
            res.on('end', () => {
                console.log('\n=== RAW API RESPONSE ===');
                console.log('Status:', res.statusCode);
                console.log('Response:', data);
                try {
                    const parsed = JSON.parse(data);
                    console.log('\n=== PARSED RESPONSE ===');
                    console.log(JSON.stringify(parsed, null, 2));
                    resolve(parsed);
                } catch (e) {
                    reject(new Error('Failed to parse response: ' + data));
                }
            });
        });

        req.on('error', reject);
        req.write(postData);
        req.end();
    });
}

// Test Case 1
const text = "80-year-old male with long-standing hypertension, ESRD on chronic hemodialysis, and chronic systolic CHF admitted for worsening shortness of breath due to acute on chronic heart failure.";
console.log('Testing Case 1:');
console.log('Input:', text);

callLiveAPI(text).catch(console.error);
