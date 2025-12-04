"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const parser_1 = require("./lib/structured/parser");
const validator_1 = require("./lib/structured/validator");
const engine_1 = require("./lib/structured/engine");
const cases = [
    // Diabetes Cases (5)
    { num: 1, input: "Age: 52\nGender: Male\nEncounter Type: Outpatient\nDiabetes Type: Type 2\nComplications: None", expected: { primary: "E11.9", secondary: [] } },
    { num: 2, input: "Age: 61\nGender: Female\nEncounter Type: Inpatient\nDiabetes Type: Type 2\nComplications: Neuropathy", expected: { primary: "E11.40", secondary: [] } },
    { num: 3, input: "Age: 68\nGender: Male\nEncounter Type: Inpatient\nDiabetes Type: Type 2\nComplications: Chronic Kidney Disease", expected: { primary: "E11.22", secondary: [] } },
    { num: 4, input: "Age: 57\nGender: Female\nEncounter Type: Outpatient\nDiabetes Type: Type 2\nComplications: Diabetic retinopathy with macular edema", expected: { primary: "E11.311", secondary: [] } },
    { num: 5, input: "Age: 72\nGender: Male\nEncounter Type: Inpatient\nDiabetes Type: Type 2\nComplications: Foot ulcer\nUlcer Site: Right foot\nUlcer Depth: Fat exposed", expected: { primary: "E11.621", secondary: ["L97.513"] } },
    // Hypertension Cases (5)
    { num: 6, input: "Age: 45\nGender: Male\nEncounter Type: Outpatient\nCondition: Primary Hypertension", expected: { primary: "I10", secondary: [] } },
    { num: 7, input: "Age: 62\nGender: Female\nEncounter Type: Inpatient\nCondition: Hypertension with Chronic Kidney Disease Stage 3", expected: { primary: "I12.9", secondary: ["N18.3"] } },
    { num: 8, input: "Age: 70\nGender: Male\nEncounter Type: Outpatient\nCondition: Hypertensive Heart Disease", expected: { primary: "I11.9", secondary: [] } },
    { num: 9, input: "Age: 66\nGender: Female\nEncounter Type: Inpatient\nCondition: Hypertensive Heart and Chronic Kidney Disease\nCKD Stage: 4", expected: { primary: "I13.10", secondary: ["N18.4"] } },
    { num: 10, input: "Age: 59\nGender: Male\nEncounter Type: Outpatient\nCondition: Secondary Hypertension due to renal disease", expected: { primary: "I15.1", secondary: [] } },
    // COPD/Asthma Cases (5)
    { num: 11, input: "Age: 64\nGender: Male\nEncounter Type: Outpatient\nCondition: COPD", expected: { primary: "J44.9", secondary: [] } },
    { num: 12, input: "Age: 58\nGender: Female\nEncounter Type: Inpatient\nCondition: COPD with exacerbation", expected: { primary: "J44.1", secondary: [] } },
    { num: 13, input: "Age: 39\nGender: Male\nEncounter Type: Outpatient\nCondition: Mild persistent asthma", expected: { primary: "J45.30", secondary: [] } },
    { num: 14, input: "Age: 52\nGender: Female\nEncounter Type: Inpatient\nCondition: Acute severe asthma", expected: { primary: "J45.901", secondary: [] } },
    { num: 15, input: "Age: 67\nGender: Male\nEncounter Type: Inpatient\nCondition: COPD with acute lower respiratory infection", expected: { primary: "J44.0", secondary: ["J22"] } },
    // Pneumonia Cases (5)
    { num: 16, input: "Age: 71\nGender: Female\nEncounter Type: Inpatient\nCondition: Bacterial pneumonia", expected: { primary: "J15.9", secondary: [] } },
    { num: 17, input: "Age: 48\nGender: Male\nEncounter Type: Outpatient\nCondition: Viral pneumonia", expected: { primary: "J12.9", secondary: [] } },
    { num: 18, input: "Age: 65\nGender: Female\nEncounter Type: Inpatient\nCondition: Aspiration pneumonia", expected: { primary: "J69.0", secondary: [] } },
    { num: 19, input: "Age: 82\nGender: Male\nEncounter Type: Inpatient\nCondition: Pneumonia due to COVID-19", expected: { primary: "U07.1", secondary: ["J12.82"] } },
    { num: 20, input: "Age: 60\nGender: Female\nEncounter Type: Inpatient\nCondition: Pneumonia with sepsis\nOrganism: Streptococcus", expected: { primary: "A40.9", secondary: ["J15.4"] } },
];
let passed = 0;
let failed = 0;
const failures = [];
console.log('🏥 COMPREHENSIVE ICD-10-CM ENCODER TEST\n');
console.log('='.repeat(80));
cases.forEach(testCase => {
    var _a;
    const { context, errors: parseErrors } = (0, parser_1.parseInput)(testCase.input);
    const validation = (0, validator_1.validateContext)(context);
    if (!validation.valid) {
        console.log(`❌ CASE ${testCase.num}: VALIDATION FAILED`);
        console.log(`   Errors: ${validation.errors.join(', ')}`);
        failed++;
        failures.push({ case: testCase.num, reason: 'Validation failed', errors: validation.errors });
        return;
    }
    const result = (0, engine_1.runStructuredRules)(context);
    const primaryCode = ((_a = result.primary) === null || _a === void 0 ? void 0 : _a.code) || '';
    const secondaryCodes = result.secondary
        .filter((c) => c !== null && c !== undefined)
        .map(c => c.code);
    const primaryMatch = primaryCode === testCase.expected.primary;
    const secondaryMatch = testCase.expected.secondary.every(exp => secondaryCodes.includes(exp)) &&
        secondaryCodes.length === testCase.expected.secondary.length;
    if (primaryMatch && secondaryMatch) {
        console.log(`✅ CASE ${testCase.num}: PASS`);
        console.log(`   Primary: ${primaryCode}${secondaryCodes.length > 0 ? ', Secondary: ' + secondaryCodes.join(', ') : ''}`);
        passed++;
    }
    else {
        console.log(`❌ CASE ${testCase.num}: FAIL`);
        console.log(`   Expected Primary: ${testCase.expected.primary}, Got: ${primaryCode}`);
        if (testCase.expected.secondary.length > 0 || secondaryCodes.length > 0) {
            console.log(`   Expected Secondary: ${testCase.expected.secondary.join(', ') || 'none'}`);
            console.log(`   Got Secondary: ${secondaryCodes.join(', ') || 'none'}`);
        }
        failed++;
        failures.push({
            case: testCase.num,
            expectedPrimary: testCase.expected.primary,
            gotPrimary: primaryCode,
            expectedSecondary: testCase.expected.secondary,
            gotSecondary: secondaryCodes
        });
    }
});
console.log('\n' + '='.repeat(80));
console.log(`📊 RESULTS: ${passed} passed, ${failed} failed out of ${cases.length} cases`);
console.log(`📈 Success rate: ${Math.round(passed / cases.length * 100)}%`);
if (failures.length > 0) {
    console.log('\n❌ FAILED CASES:');
    failures.forEach(f => {
        var _a, _b;
        console.log(`   Case ${f.case}: ${f.reason || 'Code mismatch'}`);
        if (f.expectedPrimary) {
            console.log(`      Expected: ${f.expectedPrimary} ${((_a = f.expectedSecondary) === null || _a === void 0 ? void 0 : _a.length) > 0 ? '+ ' + f.expectedSecondary.join(', ') : ''}`);
            console.log(`      Got: ${f.gotPrimary} ${((_b = f.gotSecondary) === null || _b === void 0 ? void 0 : _b.length) > 0 ? '+ ' + f.gotSecondary.join(', ') : ''}`);
        }
    });
}
if (passed === cases.length) {
    console.log('\n🎉 100% PASS RATE - ALL CASES PASSED!');
}
