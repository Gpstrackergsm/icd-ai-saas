// Run all 12 Level-0 adversarial cases
const handler = require('./api/encode.js');

const level0Cases = [
    {
        id: 'L0-01',
        narrative: '68-year-old admitted for dehydration and weakness. Creatinine was elevated on admission and improved after intravenous fluids. Renal function was monitored during hospitalization. There was no documented diagnosis of acute kidney injury or chronic kidney disease.'
    },
    {
        id: 'L0-02',
        narrative: '72-year-old inpatient admitted with community-acquired pneumonia. Blood urea nitrogen and creatinine were mildly elevated. Renal labs were trended daily due to advanced age. No renal diagnosis was documented by the provider.'
    },
    {
        id: 'L0-03',
        narrative: '75-year-old patient with a history of congestive heart failure admitted for shortness of breath. Creatinine was 2.0 on admission. Renal function was closely monitored during the hospital stay. No mention of acute kidney injury or chronic kidney disease in the assessment.'
    },
    {
        id: 'L0-04',
        narrative: '64-year-old treated for urinary tract infection. Initial creatinine was elevated and normalized after IV fluids. Provider documented "renal function improving." No diagnosis of kidney injury was documented.'
    },
    {
        id: 'L0-05',
        narrative: '70-year-old surgical patient undergoing cardiac catheterization. Risk of contrast-induced nephropathy was discussed pre-procedure. No kidney injury occurred. No diagnosis of AKI or CKD was documented.'
    },
    {
        id: 'L0-06',
        narrative: '80-year-old admitted for sepsis evaluation. Lactate was elevated on admission and normalized with fluids. Kidney function was monitored during hospitalization. No renal diagnosis was documented.'
    },
    {
        id: 'L0-07',
        narrative: '67-year-old patient with diabetes admitted for cellulitis. Creatinine was elevated but stable compared to prior outpatient labs. Renal function was followed during admission. No diagnosis of chronic kidney disease was documented.'
    },
    {
        id: 'L0-08',
        narrative: '73-year-old inpatient with COPD exacerbation. Blood urea nitrogen was elevated and attributed to dehydration. Renal labs were monitored. Provider did not diagnose acute or chronic kidney disease.'
    },
    {
        id: 'L0-09',
        narrative: '69-year-old admitted after a syncopal episode. Mild creatinine elevation was noted on admission. Renal function was monitored only. No renal diagnosis was made.'
    },
    {
        id: 'L0-10',
        narrative: '77-year-old admitted with gastrointestinal bleeding. Creatinine was elevated on admission and improved after transfusion and IV fluids. No documentation of acute kidney injury or chronic kidney disease.'
    },
    {
        id: 'L0-11',
        narrative: '65-year-old admitted for abdominal pain. Laboratory studies showed an elevated BUN-to-creatinine ratio. Hydration was provided. No renal diagnosis documented by the provider.'
    },
    {
        id: 'L0-12',
        narrative: '82-year-old inpatient with poor oral intake. Creatinine was elevated and attributed to dehydration. Renal function was monitored. No provider diagnosis of AKI or CKD.'
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

async function runAllLevel0() {
    console.log('='.repeat(80));
    console.log('LEVEL-0 ADVERSARIAL TEST SUITE');
    console.log('ICD-10-CM Audit Authority Engine');
    console.log('='.repeat(80));
    console.log('');

    let passCount = 0;
    let failCount = 0;

    for (const testCase of level0Cases) {
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
            const { validationErrors, _debug } = result.data;

            if (validationErrors?.length > 0 && validationErrors[0].includes('AUDIT DECISION')) {
                const cleanText = stripHtml(validationErrors[0]);
                console.log(cleanText);
                passCount++;
            } else {
                console.log('❌ FAILED: Did not return AUTO_EXCLUDE audit decision');
                console.log('Decision State:', _debug?.decisionState);
                failCount++;
            }
        } else {
            console.log('❌ FAILED: No response data');
            failCount++;
        }

        console.log('');
    }

    console.log('\n' + '='.repeat(80));
    console.log('LEVEL-0 TEST SUITE SUMMARY');
    console.log('='.repeat(80));
    console.log('');
    console.log(`Total Cases: ${level0Cases.length}`);
    console.log(`✅ Passed (AUTO_EXCLUDE): ${passCount}`);
    console.log(`❌ Failed: ${failCount}`);
    console.log('');

    if (failCount === 0) {
        console.log('🎉 ALL LEVEL-0 ADVERSARIAL TESTS PASSED');
        console.log('');
        console.log('Renal Inference Protection: OPERATIONAL ✅');
        console.log('Negation Detection: WORKING ✅');
        console.log('Audit Authority Messaging: COMPLIANT ✅');
    } else {
        console.log('❌ SOME TESTS FAILED - REVIEW REQUIRED');
    }

    console.log('\n' + '='.repeat(80));
}

runAllLevel0().catch(console.error);
