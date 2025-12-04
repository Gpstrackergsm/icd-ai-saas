"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const parser_1 = require("./lib/structured/parser");
const validator_1 = require("./lib/structured/validator");
const engine_1 = require("./lib/structured/engine");
const cases = [
    // COPD Tests (6 cases)
    { num: 1, input: "Age: 65\nGender: Male\nEncounter Type: Inpatient\nCOPD: Yes", expected: ["J44.9"] },
    { num: 2, input: "Age: 70\nGender: Female\nEncounter Type: Inpatient\nCOPD: With exacerbation", expected: ["J44.1"] },
    { num: 3, input: "Age: 68\nGender: Male\nEncounter Type: Inpatient\nCOPD: With acute exacerbation", expected: ["J44.1"] },
    { num: 4, input: "Age: 72\nGender: Female\nEncounter Type: Inpatient\nCOPD: With acute bronchitis", expected: ["J44.0"] },
    { num: 5, input: "Age: 75\nGender: Male\nEncounter Type: Inpatient\nCOPD: With pneumonia", expected: ["J44.0"] },
    { num: 6, input: "Age: 60\nGender: Female\nEncounter Type: Outpatient\nCOPD: Stable", expected: ["J44.9"] },
    // Asthma - Mild Intermittent (3 cases)
    { num: 7, input: "Age: 25\nGender: Female\nEncounter Type: Outpatient\nAsthma: Mild intermittent", expected: ["J45.20"] },
    { num: 8, input: "Age: 30\nGender: Male\nEncounter Type: ED\nAsthma: Mild intermittent\nStatus: Exacerbation", expected: ["J45.21"] },
    { num: 9, input: "Age: 28\nGender: Female\nEncounter Type: ED\nAsthma: Mild intermittent\nStatus: Status asthmaticus", expected: ["J45.22"] },
    // Asthma - Mild Persistent (3 cases)
    { num: 10, input: "Age: 35\nGender: Male\nEncounter Type: Outpatient\nAsthma: Mild persistent", expected: ["J45.30"] },
    { num: 11, input: "Age: 32\nGender: Female\nEncounter Type: ED\nAsthma: Mild persistent\nStatus: Exacerbation", expected: ["J45.31"] },
    { num: 12, input: "Age: 38\nGender: Male\nEncounter Type: ED\nAsthma: Mild persistent\nStatus: Status asthmaticus", expected: ["J45.32"] },
    // Asthma - Moderate Persistent (3 cases)
    { num: 13, input: "Age: 40\nGender: Female\nEncounter Type: Outpatient\nAsthma: Moderate persistent", expected: ["J45.40"] },
    { num: 14, input: "Age: 42\nGender: Male\nEncounter Type: ED\nAsthma: Moderate persistent\nStatus: Exacerbation", expected: ["J45.41"] },
    { num: 15, input: "Age: 45\nGender: Female\nEncounter Type: ED\nAsthma: Moderate persistent\nStatus: Status asthmaticus", expected: ["J45.42"] },
    // Asthma - Severe Persistent (3 cases)
    { num: 16, input: "Age: 50\nGender: Male\nEncounter Type: Outpatient\nAsthma: Severe persistent", expected: ["J45.50"] },
    { num: 17, input: "Age: 48\nGender: Female\nEncounter Type: ED\nAsthma: Severe persistent\nStatus: Exacerbation", expected: ["J45.51"] },
    { num: 18, input: "Age: 52\nGender: Male\nEncounter Type: ED\nAsthma: Severe persistent\nStatus: Status asthmaticus", expected: ["J45.52"] },
    // Asthma - Unspecified (2 cases)
    { num: 19, input: "Age: 30\nGender: Female\nEncounter Type: Outpatient\nAsthma: Yes", expected: ["J45.909"] },
    { num: 20, input: "Age: 35\nGender: Male\nEncounter Type: ED\nAsthma: Yes\nStatus: Exacerbation", expected: ["J45.901"] },
];
let passed = 0;
let failed = 0;
console.log('🫁 COPD/ASTHMA MODULE TEST SUITE\n');
console.log('='.repeat(70));
cases.forEach(testCase => {
    const { context, errors: parseErrors } = (0, parser_1.parseInput)(testCase.input);
    const validation = (0, validator_1.validateContext)(context);
    if (!validation.valid) {
        console.log(`❌ CASE ${testCase.num}: VALIDATION FAILED`);
        console.log(`   Errors: ${validation.errors.join(', ')}`);
        failed++;
        return;
    }
    const result = (0, engine_1.runStructuredRules)(context);
    const codes = [result.primary, ...result.secondary]
        .filter((c) => c !== null && c !== undefined)
        .map(c => c.code);
    const match = testCase.expected.every(exp => codes.includes(exp)) &&
        codes.length === testCase.expected.length;
    if (match) {
        console.log(`✅ CASE ${testCase.num}: PASS - ${codes.join(', ')}`);
        passed++;
    }
    else {
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
    console.log('\n🎉 100% PASS RATE - COPD/ASTHMA MODULE COMPLETE!');
}
else {
    console.log(`\n⚠️  ${failed} tests need fixes`);
}
