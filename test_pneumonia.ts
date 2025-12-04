import { parseInput } from './lib/structured/parser';
import { validateContext } from './lib/structured/validator';
import { runStructuredRules } from './lib/structured/engine';

const cases = [
    // Organism-Specific (10 cases)
    { num: 1, input: "Age: 65\nGender: Male\nEncounter Type: Inpatient\nPneumonia: Streptococcus pneumoniae", expected: ["J13"] },
    { num: 2, input: "Age: 70\nGender: Female\nEncounter Type: Inpatient\nPneumonia: Haemophilus influenzae", expected: ["J14"] },
    { num: 3, input: "Age: 68\nGender: Male\nEncounter Type: Inpatient\nPneumonia: Klebsiella", expected: ["J15.0"] },
    { num: 4, input: "Age: 72\nGender: Female\nEncounter Type: Inpatient\nPneumonia: Pseudomonas", expected: ["J15.1"] },
    { num: 5, input: "Age: 75\nGender: Male\nEncounter Type: Inpatient\nPneumonia: MSSA", expected: ["J15.211"] },
    { num: 6, input: "Age: 60\nGender: Female\nEncounter Type: Inpatient\nPneumonia: MRSA", expected: ["J15.212"] },
    { num: 7, input: "Age: 55\nGender: Male\nEncounter Type: Inpatient\nPneumonia: E. coli", expected: ["J15.5"] },
    { num: 8, input: "Age: 50\nGender: Female\nEncounter Type: Outpatient\nPneumonia: Mycoplasma", expected: ["J15.7"] },
    { num: 9, input: "Age: 45\nGender: Male\nEncounter Type: Inpatient\nPneumonia: Viral", expected: ["J12.9"] },
    { num: 10, input: "Age: 62\nGender: Female\nEncounter Type: Inpatient\nPneumonia: Bacterial", expected: ["J15.9"] },

    // Special Types (3 cases)
    { num: 11, input: "Age: 80\nGender: Male\nEncounter Type: Inpatient\nPneumonia: Aspiration", expected: ["J69.0"] },
    { num: 12, input: "Age: 78\nGender: Female\nEncounter Type: Inpatient\nPneumonia: Aspiration pneumonitis", expected: ["J69.0"] },
    { num: 13, input: "Age: 70\nGender: Male\nEncounter Type: Inpatient\nPneumonia: Ventilator-associated, MRSA", expected: ["J95.851", "J15.212"] },

    // Unspecified (2 cases)
    { num: 14, input: "Age: 58\nGender: Female\nEncounter Type: Inpatient\nPneumonia: Yes", expected: ["J18.9"] },
    { num: 15, input: "Age: 65\nGender: Male\nEncounter Type: Inpatient\nPneumonia: Community-acquired", expected: ["J18.9"] },
];

let passed = 0;
let failed = 0;

console.log('🫁 PNEUMONIA MODULE TEST SUITE\n');
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
    console.log('\n🎉 100% PASS RATE - PNEUMONIA MODULE COMPLETE!');
} else {
    console.log(`\n⚠️  ${failed} tests need fixes`);
}
