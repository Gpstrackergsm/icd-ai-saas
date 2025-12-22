// Complete LEVEL 1 test with detailed output
const handler = require('./api/encode.js');

const level1Cases = [
    // Section A: Basic Correct Coding
    {
        id: 'L1-A-01',
        section: 'A - Basic Coding',
        narrative: '55-year-old admitted with acute kidney injury due to dehydration. Provider documented "acute kidney injury." Creatinine increased from baseline and improved with IV fluids.',
        expected: 'N17.9'
    },
    {
        id: 'L1-A-02',
        section: 'A - Basic Coding',
        narrative: '70-year-old admitted with chronic kidney disease stage 3. Provider documented "CKD stage 3."',
        expected: 'N18.30'
    },
    {
        id: 'L1-A-03',
        section: 'A - Basic Coding',
        narrative: '66-year-old admitted with acute respiratory failure with hypoxia. Provider explicitly documented "acute respiratory failure."',
        expected: 'J96.01'
    },
    {
        id: 'L1-A-04',
        section: 'A - Basic Coding',
        narrative: '72-year-old admitted with sepsis due to pneumonia. Provider documented "sepsis due to pneumonia."',
        expected: 'A41.9 + J18.9'
    },
    // Section B: Linking
    {
        id: 'L1-B-01',
        section: 'B - Linking',
        narrative: '68-year-old with type 2 diabetes admitted with left heel ulcer. Provider documented "diabetic foot ulcer."',
        expected: 'E11.621'
    },
    {
        id: 'L1-B-02',
        section: 'B - Linking',
        narrative: '68-year-old with type 2 diabetes admitted with left heel ulcer. Provider documented "foot ulcer" and "type 2 diabetes" separately. No linkage stated.',
        expected: 'E11.9 + L97.x'
    },
    // Section C: Severity
    {
        id: 'L1-C-01',
        section: 'C - Severity',
        narrative: '75-year-old admitted with severe sepsis with acute renal failure. Provider explicitly documented "severe sepsis with acute renal failure."',
        expected: 'A41.x + R65.20 + N17.x'
    },
    {
        id: 'L1-C-02',
        section: 'C - Severity',
        narrative: '75-year-old admitted with sepsis. Lactate elevated, hypotension present. Provider documented "sepsis" only.',
        expected: 'A41.9 (no R65.20)'
    },
    // Section D: Specificity
    {
        id: 'L1-D-01',
        section: 'D - Specificity',
        narrative: '80-year-old admitted with heart failure exacerbation. Provider documented "acute on chronic systolic heart failure."',
        expected: 'I50.23'
    },
    {
        id: 'L1-D-02',
        section: 'D - Specificity',
        narrative: '80-year-old admitted with heart failure. Provider did NOT specify acute vs chronic or systolic vs diastolic.',
        expected: 'AUTO_QUERY'
    },
    // Section E: Stroke
    {
        id: 'L1-E-01',
        section: 'E - Stroke',
        narrative: '70-year-old with history of stroke. Provider documented "residual left-sided weakness from prior CVA."',
        expected: 'I69.3xx'
    },
    {
        id: 'L1-E-02',
        section: 'E - Stroke',
        narrative: '70-year-old with history of stroke. Provider documented "history of CVA, no residual deficits."',
        expected: 'Z86.73'
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
    return html
        .replace(/<[^>]*>/g, '\n')
        .replace(/\n\s*\n/g, '\n')
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0)
        .join('\n');
}

async function runAllLevel1() {
    console.log('='.repeat(80));
    console.log('LEVEL 1 COMPLETE TEST SUITE - ALL CASES WITH OUTPUT');
    console.log('ICD-10-CM Audit Authority Engine v1.1');
    console.log('='.repeat(80));
    console.log('');

    for (const testCase of level1Cases) {
        console.log('\n' + '='.repeat(80));
        console.log(`CASE ${testCase.id} [${testCase.section}]`);
        console.log('='.repeat(80));
        console.log('');
        console.log('NARRATIVE:');
        console.log(testCase.narrative);
        console.log('');
        console.log('EXPECTED:', testCase.expected);
        console.log('');
        console.log('-'.repeat(80));
        console.log('SYSTEM OUTPUT:');
        console.log('-'.repeat(80));
        console.log('');

        const result = await runTest(testCase);

        if (result.data) {
            const { primary, secondary, validationErrors, _debug } = result.data;

            console.log('DECISION STATE:', _debug.decisionState);
            console.log('');

            if (_debug.decisionState === 'AUTO_CODE') {
                console.log('PRIMARY CODE:', primary);
                if (secondary && secondary.length > 0) {
                    console.log('SECONDARY CODES:', secondary.map(c => c.code).join(', '));
                }
                console.log('');
                if (validationErrors?.length > 0) {
                    const cleanText = stripHtml(validationErrors[0]);
                    console.log(cleanText);
                }
            } else if (_debug.decisionState === 'AUTO_QUERY') {
                console.log('QUERY REQUIRED');
                if (_debug.queriesGenerated) {
                    console.log('');
                    _debug.queriesGenerated.forEach(q => {
                        console.log(`Diagnosis: ${q.diagnosis}`);
                        console.log(`Query: ${q.query}`);
                    });
                }
                console.log('');
                if (validationErrors?.length > 0) {
                    const cleanText = stripHtml(validationErrors[0]);
                    console.log(cleanText);
                }
            } else if (_debug.decisionState === 'AUTO_EXCLUDE') {
                console.log('NO DIAGNOSIS DOCUMENTED');
                console.log('');
                if (validationErrors?.length > 0) {
                    const cleanText = stripHtml(validationErrors[0]);
                    console.log(cleanText);
                }
            }
        }

        console.log('');
    }

    console.log('\n' + '='.repeat(80));
    console.log('LEVEL 1 TEST SUITE COMPLETE');
    console.log('='.repeat(80));
}

runAllLevel1().catch(console.error);
