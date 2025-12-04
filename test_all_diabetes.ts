import { parseInput } from './lib/structured/parser';
import { validateContext } from './lib/structured/validator';
import { runStructuredRules } from './lib/structured/engine';

const cases = [
    { num: 1, input: "Age: 50\nGender: Male\nEncounter Type: Outpatient\nDiabetes Type: Type 2\nComplications: None", expected: ["E11.9"] },
    { num: 2, input: "Age: 44\nGender: Female\nEncounter Type: Outpatient\nDiabetes Type: Type 2\nInsulin Use: Yes\nComplications: None", expected: ["E11.9"] },
    { num: 3, input: "Age: 60\nGender: Male\nEncounter Type: Inpatient\nDiabetes Type: Type 2\nComplications: Foot Ulcer", expected: ["E11.621"] },
    { num: 4, input: "Age: 52\nGender: Female\nEncounter Type: Outpatient\nDiabetes Type: Type 2\nComplications: Retinopathy", expected: ["E11.319"] },
    { num: 5, input: "Age: 58\nGender: Male\nEncounter Type: Outpatient\nDiabetes Type: Type 2\nComplications: Neuropathy", expected: ["E11.40"] },
    { num: 6, input: "Age: 65\nGender: Female\nEncounter Type: Inpatient\nDiabetes Type: Type 2\nComplications: Nephropathy/CKD", expected: ["E11.22"] },
    { num: 7, input: "Age: 70\nGender: Male\nEncounter Type: Inpatient\nDiabetes Type: Type 2\nComplications: Foot Ulcer\nUlcer Site: Right Foot\nUlcer Severity: Fat layer exposed", expected: ["E11.621", "L97.513"] },
    { num: 8, input: "Age: 48\nGender: Female\nEncounter Type: Outpatient\nDiabetes Type: Type 2\nComplications: Nephropathy/CKD", expected: ["E11.21"] },
    { num: 11, input: "Age: 55\nGender: Female\nEncounter Type: Outpatient\nDiabetes Type: Type 2\nComplications: Nephropathy/CKD, Retinopathy", expected: ["E11.22", "E11.319"] },
    { num: 12, input: "Age: 59\nGender: Male\nEncounter Type: Inpatient\nDiabetes Type: Type 2\nComplications: Neuropathy, Foot Ulcer\nUlcer Site: Left Foot\nUlcer Severity: Fat layer exposed", expected: ["E11.621", "E11.40", "L97.522"] },
    { num: 15, input: "Age: 66\nGender: Female\nEncounter Type: Inpatient\nDiabetes Type: Type 2\nComplications: Hypoglycemia", expected: ["E11.649"] },
    { num: 20, input: "Age: 69\nGender: Male\nEncounter Type: Inpatient\nDiabetes Type: Type 2\nComplications: Ketoacidosis", expected: ["E11.10"] },
];

let passed = 0;
let failed = 0;

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

    const match = testCase.expected.every(exp => codes.includes(exp));

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

console.log(`\n${'='.repeat(60)}`);
console.log(`Results: ${passed} passed, ${failed} failed out of ${cases.length} cases`);
console.log(`Success rate: ${Math.round(passed / cases.length * 100)}%`);
