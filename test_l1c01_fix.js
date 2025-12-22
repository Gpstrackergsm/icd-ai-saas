// Test L1-C-01 specifically
const handler = require('./api/encode.js');

async function testCase(narrative, caseName) {
    const mockReq = {
        method: 'POST',
        body: { text: narrative }
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

    console.log(`\n${'='.repeat(80)}`);
    console.log(caseName);
    console.log('='.repeat(80));
    console.log('Narrative:', narrative);
    console.log('');
    console.log('Primary:', responseData.data.primary);
    console.log('Secondary:', responseData.data.secondary?.map(c => c.code).join(', ') || 'None');
    console.log('Decision:', responseData.data._debug.decisionState);

    return responseData;
}

async function runTests() {
    console.log('TESTING L1-C-01 FIX\n');

    // L1-C-01: Should include N17.9
    await testCase(
        '75-year-old admitted with severe sepsis with acute renal failure. Provider explicitly documented "severe sepsis with acute renal failure."',
        'L1-C-01: Severe sepsis + acute renal failure'
    );

    // Regression: Should still exclude when negated
    await testCase(
        '75-year-old admitted with severe sepsis. No acute kidney injury was documented.',
        'REGRESSION: Severe sepsis, no AKI (negated)'
    );

    // Regression: LEVEL 0 should still work
    await testCase(
        '68-year-old admitted for dehydration. Creatinine elevated. No diagnosis of acute kidney injury.',
        'LEVEL 0: No diagnosis documented (should be AUTO_EXCLUDE)'
    );

    // Test different phrasings
    await testCase(
        '80-year-old with acute kidney failure documented by provider.',
        'Alternate phrasing: acute kidney failure'
    );

    console.log('\n' + '='.repeat(80));
}

runTests().catch(console.error);
