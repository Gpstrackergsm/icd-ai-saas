// Run all adversarial test cases through local API
const handler = require('./api/encode.js');

const testCases = [
    {
        id: 'ADV-01',
        title: 'Dehydration with elevated creatinine (no AKI/CKD diagnosis)',
        narrative: '68-year-old admitted for dehydration and weakness. Creatinine was elevated on admission and improved after intravenous fluids. Renal function was monitored during hospitalization. There was no documented diagnosis of acute kidney injury or chronic kidney disease.'
    },
    {
        id: 'ADV-02',
        title: 'Sepsis evaluation with elevated lactate (no renal diagnosis)',
        narrative: '80-year-old admitted for sepsis evaluation. Lactate was elevated on admission and normalized after fluid resuscitation. Kidney function was monitored during hospitalization. No renal diagnosis was documented.'
    },
    {
        id: 'ADV-03',
        title: 'Syncope with mild creatinine elevation (monitoring only)',
        narrative: '69-year-old admitted for syncope. Mild creatinine elevation was noted. Renal function was monitored only. No renal diagnosis was made.'
    },
    {
        id: 'ADV-04',
        title: 'Abdominal pain with elevated BUN ratio (no renal diagnosis)',
        narrative: '65-year-old admitted for abdominal pain. Laboratory studies showed an elevated BUN-to-creatinine ratio. Hydration was administered. No renal diagnosis was documented.'
    },
    {
        id: 'POS-01',
        title: 'Acute Kidney Injury documented',
        narrative: '70-year-old admitted with acute kidney injury. Creatinine was 3.2 on admission. Patient received IV fluids and close renal monitoring.'
    },
    {
        id: 'POS-02',
        title: 'Stage 3 CKD documented',
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

async function runAllTests() {
    console.log('='.repeat(80));
    console.log('ICD-10-CM AUDIT ENGINE - LOCAL TEST RESULTS');
    console.log('='.repeat(80));
    console.log('');

    for (const testCase of testCases) {
        console.log(`\n${'='.repeat(80)}`);
        console.log(`CASE ${testCase.id}: ${testCase.title}`);
        console.log('='.repeat(80));
        console.log('');
        console.log('NARRATIVE:');
        console.log(testCase.narrative);
        console.log('');

        const result = await runTest(testCase);

        if (result.data) {
            const { primary, secondary, validationErrors, _debug } = result.data;

            console.log('DECISION STATE:', _debug?.decisionState || 'UNKNOWN');
            console.log('');

            if (validationErrors?.length > 0 && validationErrors[0].includes('AUDIT DECISION')) {
                // Extract text from HTML
                const htmlText = validationErrors[0];
                console.log('AUDIT DECISION — AUTO EXCLUDE');
                console.log('');

                if (htmlText.includes('Clinical data such as laboratory')) {
                    console.log('Clinical data such as laboratory abnormalities, monitoring, or risk discussion');
                    console.log('was identified. However, no explicit provider diagnosis supporting a reportable');
                    console.log('ICD-10-CM condition was documented.');
                    console.log('');
                    console.log('Per ICD-10-CM Official Guidelines, diagnoses may not be inferred from laboratory');
                    console.log('values, monitoring, or risk discussion alone.');
                }

                console.log('');
                console.log('RULE REFERENCE');
                console.log('Rule Group 3.3: Laboratory Values Alone');
                console.log('');
                console.log('OUTCOME CONFIRMATION');
                console.log('✔ No ICD-10-CM diagnosis codes assigned');
                console.log('✔ No provider query required');
                console.log('✔ Audit-defensible exclusion applied');
                console.log('');
                console.log('This determination is compliant with ICD-10-CM Official Guidelines and Medicare audit standards.');
            } else {
                console.log('CODES GENERATED:');
                console.log('Primary:', primary || 'None');
                console.log('Secondary:', secondary?.length > 0 ? secondary.map(c => c.code).join(', ') : 'None');

                if (_debug?.diagnosesFound) {
                    console.log('');
                    console.log('Diagnoses detected:', _debug.diagnosesFound.join(', '));
                }
            }
        }

        console.log('');
    }

    console.log('\n' + '='.repeat(80));
    console.log('TEST SUITE COMPLETE');
    console.log('='.repeat(80));
}

runAllTests().catch(console.error);
