import { parseInput } from './lib/structured/parser';
import { validateContext } from './lib/structured/validator';
import { runStructuredRules } from './lib/structured/engine';

const cases = [
    // Essential Hypertension (5 tests)
    { num: 1, input: "Age: 55\nGender: Male\nEncounter Type: Outpatient\nHypertension: Yes", expected: ["I10"] },
    { num: 2, input: "Age: 60\nGender: Female\nEncounter Type: Outpatient\nHypertension: Yes", expected: ["I10"] },
    { num: 3, input: "Age: 50\nGender: Male\nEncounter Type: Outpatient\nHypertension: Yes", expected: ["I10"] },
    { num: 4, input: "Age: 65\nGender: Female\nEncounter Type: ED\nHypertension: Yes", expected: ["I10"] },
    { num: 5, input: "Age: 70\nGender: Male\nEncounter Type: ED\nHypertension: Yes", expected: ["I10"] },

    // HTN + Heart Failure (6 tests)
    { num: 6, input: "Age: 68\nGender: Male\nEncounter Type: Inpatient\nHypertension: Yes\nHeart Failure: Systolic, Acute", expected: ["I11.0", "I50.21"] },
    { num: 7, input: "Age: 72\nGender: Female\nEncounter Type: Inpatient\nHypertension: Yes\nHeart Failure: Diastolic, Chronic", expected: ["I11.0", "I50.32"] },
    { num: 8, input: "Age: 75\nGender: Male\nEncounter Type: Inpatient\nHypertension: Yes\nHeart Failure: Combined, Acute on chronic", expected: ["I11.0", "I50.43"] },
    { num: 9, input: "Age: 65\nGender: Female\nEncounter Type: Outpatient\nHypertension: Yes\nHeart Failure: Yes", expected: ["I11.0", "I50.9"] },
    { num: 10, input: "Age: 60\nGender: Male\nEncounter Type: Outpatient\nHypertension: Yes", expected: ["I10"] },
    { num: 11, input: "Age: 70\nGender: Female\nEncounter Type: Inpatient\nHypertension: Yes\nHeart Failure: Systolic, Acute", expected: ["I11.0", "I50.21"] },

    // HTN + CKD (6 tests)
    { num: 12, input: "Age: 62\nGender: Male\nEncounter Type: Outpatient\nHypertension: Yes\nCKD Stage: 1", expected: ["I12.9", "N18.1"] },
    { num: 13, input: "Age: 65\nGender: Female\nEncounter Type: Outpatient\nHypertension: Yes\nCKD Stage: 2", expected: ["I12.9", "N18.2"] },
    { num: 14, input: "Age: 68\nGender: Male\nEncounter Type: Outpatient\nHypertension: Yes\nCKD Stage: 3", expected: ["I12.9", "N18.30"] },
    { num: 15, input: "Age: 70\nGender: Female\nEncounter Type: Outpatient\nHypertension: Yes\nCKD Stage: 4", expected: ["I12.9", "N18.4"] },
    { num: 16, input: "Age: 72\nGender: Male\nEncounter Type: Inpatient\nHypertension: Yes\nCKD Stage: 5", expected: ["I12.0", "N18.5"] },
    { num: 17, input: "Age: 75\nGender: Female\nEncounter Type: Inpatient\nHypertension: Yes\nCKD Stage: ESRD", expected: ["I12.0", "N18.6"] },

    // HTN + HF + CKD (8 tests)
    { num: 18, input: "Age: 70\nGender: Male\nEncounter Type: Inpatient\nHypertension: Yes\nHeart Failure: Systolic, Chronic\nCKD Stage: 3", expected: ["I13.0", "I50.22", "N18.30"] },
    { num: 19, input: "Age: 72\nGender: Female\nEncounter Type: Inpatient\nHypertension: Yes\nHeart Failure: Diastolic, Acute\nCKD Stage: 5", expected: ["I13.2", "I50.31", "N18.5"] },
    { num: 20, input: "Age: 75\nGender: Male\nEncounter Type: Inpatient\nHypertension: Yes\nHeart Failure: Combined, Acute on chronic\nCKD Stage: ESRD", expected: ["I13.2", "I50.43", "N18.6"] },
    { num: 21, input: "Age: 68\nGender: Female\nEncounter Type: Outpatient\nHypertension: Yes\nCKD Stage: 3", expected: ["I12.9", "N18.30"] },
    { num: 22, input: "Age: 70\nGender: Male\nEncounter Type: Outpatient\nHypertension: Yes\nCKD Stage: 5", expected: ["I12.0", "N18.5"] },
    { num: 23, input: "Age: 72\nGender: Female\nEncounter Type: Outpatient\nHypertension: Yes\nCKD Stage: ESRD", expected: ["I12.0", "N18.6"] },
    { num: 24, input: "Age: 65\nGender: Male\nEncounter Type: Inpatient\nHypertension: Yes\nHeart Failure: Systolic, Acute\nCKD Stage: 4", expected: ["I13.0", "I50.21", "N18.4"] },
    { num: 25, input: "Age: 73\nGender: Female\nEncounter Type: Inpatient\nHypertension: Yes\nHeart Failure: Diastolic, Chronic\nCKD Stage: ESRD", expected: ["I13.2", "I50.32", "N18.6"] },
];

let passed = 0;
let failed = 0;

console.log('🏥 HYPERTENSION MODULE TEST SUITE\n');
console.log('='.repeat(70));

cases.forEach(testCase => {
    const { context, errors: parseErrors } = parseInput(testCase.input);
    const validation = validateContext(context);

    if (!validation.valid) {
        console.log(`❌ CASE ${testCase.num}: VALIDATION FAILED`);
        console.log(`   Errors: ${validation.errors.join(', ')}`);
        failed++;
        return;
    }

    const result = runStructuredRules(context);
    const codes = [result.primary, ...result.secondary]
        .filter((c): c is NonNullable<typeof c> => c !== null && c !== undefined)
        .map(c => c.code);

    const match = testCase.expected.every(exp => codes.includes(exp)) &&
        codes.length === testCase.expected.length;

    if (match) {
        console.log(`✅ CASE ${testCase.num}: PASS - ${codes.join(', ')}`);
        passed++;
    } else {
        console.log(`❌ CASE ${testCase.num}: FAIL`);
        console.log(`   Expected: ${testCase.expected.join(', ')}`);
        console.log(`   Got:      ${codes.join(', ')}`);
        failed++;
    }
});

console.log('\n' + '='.repeat(70));
console.log(`📊 Results: ${passed} passed, ${failed} failed out of ${cases.length} cases`);
console.log(`📈 Success rate: ${Math.round(passed / cases.length * 100)}%`);

if (passed === cases.length) {
    console.log('\n🎉 100% PASS RATE - HYPERTENSION MODULE COMPLETE!');
} else {
    console.log(`\n⚠️  ${failed} tests need fixes`);
}
