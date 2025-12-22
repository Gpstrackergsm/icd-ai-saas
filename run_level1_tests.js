// LEVEL 1 Test Suite - Basic Correct Coding
const handler = require('./api/encode.js');

const level1Cases = [
    // Section A: Basic Correct Coding
    {
        id: 'L1-A-01',
        section: 'A - Basic Coding',
        narrative: '55-year-old admitted with acute kidney injury due to dehydration. Provider documented "acute kidney injury." Creatinine increased from baseline and improved with IV fluids.',
        expected: { codes: ['N17.9'], forbidden: ['N18.*', 'query'] }
    },
    {
        id: 'L1-A-02',
        section: 'A - Basic Coding',
        narrative: '70-year-old admitted with chronic kidney disease stage 3. Provider documented "CKD stage 3."',
        expected: { codes: ['N18.30'], forbidden: ['N17.*', 'query'] }
    },
    {
        id: 'L1-A-03',
        section: 'A - Basic Coding',
        narrative: '66-year-old admitted with acute respiratory failure with hypoxia. Provider explicitly documented "acute respiratory failure."',
        expected: { codes: ['J96.01'], forbidden: ['J18.*'] }
    },
    {
        id: 'L1-A-04',
        section: 'A - Basic Coding',
        narrative: '72-year-old admitted with sepsis due to pneumonia. Provider documented "sepsis due to pneumonia."',
        expected: { codes: ['A41.9', 'J18.9'], forbidden: ['R65.20_unless_documented'] }
    },
    // Section B: Linking Must Be Explicit
    {
        id: 'L1-B-01',
        section: 'B - Linking',
        narrative: '68-year-old with type 2 diabetes admitted with left heel ulcer. Provider documented "diabetic foot ulcer."',
        expected: { codes: ['E11.621'], forbidden: ['L97.*_separate', 'query'] }
    },
    {
        id: 'L1-B-02',
        section: 'B - Linking',
        narrative: '68-year-old with type 2 diabetes admitted with left heel ulcer. Provider documented "foot ulcer" and "type 2 diabetes" separately. No linkage stated.',
        expected: { codes: ['L97.*', 'E11.9'], forbidden: ['E11.621', 'query'] }
    },
    // Section C: Severity & Escalation Control
    {
        id: 'L1-C-01',
        section: 'C - Severity',
        narrative: '75-year-old admitted with severe sepsis with acute renal failure. Provider explicitly documented "severe sepsis with acute renal failure."',
        expected: { codes: ['A41.*', 'R65.20', 'N17.*'], forbidden: ['R65.21_unless_shock'] }
    },
    {
        id: 'L1-C-02',
        section: 'C - Severity',
        narrative: '75-year-old admitted with sepsis. Lactate elevated, hypotension present. Provider documented "sepsis" only.',
        expected: { codes: ['A41.*'], forbidden: ['R65.20', 'R65.21'] }
    },
    // Section D: Specificity Enforcement
    {
        id: 'L1-D-01',
        section: 'D - Specificity',
        narrative: '80-year-old admitted with heart failure exacerbation. Provider documented "acute on chronic systolic heart failure."',
        expected: { codes: ['I50.23'], forbidden: ['query'] }
    },
    {
        id: 'L1-D-02',
        section: 'D - Specificity',
        narrative: '80-year-old admitted with heart failure. Provider did NOT specify acute vs chronic or systolic vs diastolic.',
        expected: { codes: [], query: 'required for specificity' }
    },
    // Section E: Stroke History vs Sequela
    {
        id: 'L1-E-01',
        section: 'E - Stroke',
        narrative: '70-year-old with history of stroke. Provider documented "residual left-sided weakness from prior CVA."',
        expected: { codes: ['I69.3*'], forbidden: ['Z86.73'] }
    },
    {
        id: 'L1-E-02',
        section: 'E - Stroke',
        narrative: '70-year-old with history of stroke. Provider documented "history of CVA, no residual deficits."',
        expected: { codes: ['Z86.73'], forbidden: ['I69.*'] }
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

async function runLevel1Tests() {
    console.log('='.repeat(80));
    console.log('LEVEL 1 TEST SUITE - BASIC CORRECT CODING');
    console.log('ICD-10-CM Audit Authority Engine');
    console.log('='.repeat(80));
    console.log('');
    console.log('⚠️  NOTE: LEVEL 1 CODE MAPPING NOT YET IMPLEMENTED');
    console.log('    Current system has LEVEL 0 (AUTO_EXCLUDE) only');
    console.log('    These tests will show current behavior vs expected behavior');
    console.log('');

    for (const testCase of level1Cases) {
        console.log('\n' + '='.repeat(80));
        console.log(`CASE ${testCase.id} [${testCase.section}]`);
        console.log('='.repeat(80));
        console.log('');
        console.log('NARRATIVE:');
        console.log(testCase.narrative);
        console.log('');
        console.log('EXPECTED:');
        console.log('  Codes:', testCase.expected.codes.join(', ') || 'None');
        if (testCase.expected.query) {
            console.log('  Query:', testCase.expected.query);
        }
        if (testCase.expected.forbidden) {
            console.log('  Forbidden:', testCase.expected.forbidden.join(', '));
        }
        console.log('');
        console.log('-'.repeat(80));
        console.log('CURRENT BEHAVIOR:');
        console.log('-'.repeat(80));
        console.log('');

        const result = await runTest(testCase);

        if (result.data) {
            const { primary, secondary, validationErrors, warnings, _debug } = result.data;

            console.log('Primary:', primary || 'None');
            console.log('Secondary:', secondary?.length > 0 ? secondary.map(c => c.code || c).join(', ') : 'None');

            if (warnings?.length > 0) {
                console.log('Warnings:', warnings.join('; '));
            }

            if (validationErrors?.length > 0 && validationErrors[0].includes('AUDIT DECISION')) {
                console.log('Decision: AUTO_EXCLUDE (LEVEL 0)');
            }

            if (_debug?.diagnosesFound) {
                console.log('Diagnoses Detected:', _debug.diagnosesFound.join(', '));
            }

            console.log('');
            console.log('STATUS: ⏳ LEVEL 1 CODE MAPPING NEEDED');
        }

        console.log('');
    }

    console.log('\n' + '='.repeat(80));
    console.log('LEVEL 1 IMPLEMENTATION REQUIRED');
    console.log('='.repeat(80));
    console.log('');
    console.log('Current Status:');
    console.log('  ✅ LEVEL 0: Certified and Frozen');
    console.log('  ⏳ LEVEL 1: Needs implementation');
    console.log('');
    console.log('To implement LEVEL 1, we need to add:');
    console.log('  1. ICD-10-CM code mapping for documented diagnoses');
    console.log('  2. Diagnosis-to-code dictionary');
    console.log('  3. Linking logic (e.g., diabetic complications)');
    console.log('  4. Severity detection (documented only)');
    console.log('  5. Specificity requirements');
    console.log('  6. Query generation logic');
    console.log('');
    console.log('='.repeat(80));
}

runLevel1Tests().catch(console.error);
