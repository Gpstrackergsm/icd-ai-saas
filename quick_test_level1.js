// Quick test to check actual API response for LEVEL 1
const handler = require('./api/encode.js');

async function testCase(narrative) {
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
    return responseData;
}

async function test() {
    console.log('='.repeat(80));
    console.log('LEVEL 1 QUICK TEST');
    console.log('='.repeat(80));
    console.log('');

    // Test 1: AKI
    console.log('TEST 1: Acute Kidney Injury');
    const result1 = await testCase('55-year-old admitted with acute kidney injury due to dehydration. Provider documented "acute kidney injury." Creatinine increased from baseline and improved with IV fluids.');
    console.log('Primary:', result1.data.primary);
    console.log('Secondary:', result1.data.secondary);
    console.log('Decision State:', result1.data._debug.decisionState);
    console.log('');

    // Test 2: CKD stage 3
    console.log('TEST 2: CKD Stage 3');
    const result2 = await testCase('70-year-old admitted with chronic kidney disease stage 3. Provider documented "CKD stage 3."');
    console.log('Primary:', result2.data.primary);
    console.log('Secondary:', result2.data.secondary);
    console.log('Decision State:', result2.data._debug.decisionState);
    console.log('');

    // Test 3: Respiratory Failure
    console.log('TEST 3: Acute Respiratory Failure');
    const result3 = await testCase('66-year-old admitted with acute respiratory failure with hypoxia. Provider explicitly documented "acute respiratory failure."');
    console.log('Primary:', result3.data.primary);
    console.log('Secondary:', result3.data.secondary);
    console.log('Decision State:', result3.data._debug.decisionState);
    console.log('');

    // Test 4: Sepsis + Pneumonia
    console.log('TEST 4: Sepsis + Pneumonia');
    const result4 = await testCase('72-year-old admitted with sepsis due to pneumonia. Provider documented "sepsis due to pneumonia."');
    console.log('Primary:', result4.data.primary);
    console.log('Secondary:', result4.data.secondary);
    console.log('Decision State:', result4.data._debug.decisionState);
    console.log('');

    // Test 5: Heart Failure (needs query)
    console.log('TEST 5: Heart Failure (no specifics)');
    const result5 = await testCase('80-year-old admitted with heart failure. Provider did NOT specify acute vs chronic or systolic vs diastolic.');
    console.log('Primary:', result5.data.primary);
    console.log('Secondary:', result5.data.secondary);
    console.log('Decision State:', result5.data._debug.decisionState);
    if (result5.data._debug.queriesGenerated) {
        console.log('Queries:', result5.data._debug.queriesGenerated);
    }
    console.log('');

    // Test 6: LEVEL 0 (should still work)
    console.log('TEST 6: LEVEL 0 - No Diagnosis');
    const result6 = await testCase('68-year-old admitted for dehydration and weakness. Creatinine was elevated on admission and improved after intravenous fluids. Renal function was monitored during hospitalization. There was no documented diagnosis of acute kidney injury or chronic kidney disease.');
    console.log('Primary:', result6.data.primary);
    console.log('Secondary:', result6.data.secondary);
    console.log('Decision State:', result6.data._debug.decisionState);
    console.log('');

    console.log('='.repeat(80));
}

test().catch(console.error);
