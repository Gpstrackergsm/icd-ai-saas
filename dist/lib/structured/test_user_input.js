"use strict";
var _a, _b;
Object.defineProperty(exports, "__esModule", { value: true });
const parser_1 = require("./parser");
const validator_1 = require("./validator");
const engine_1 = require("./engine");
const userInput = `Age: 74
Gender: Male
Encounter Type: Inpatient
Diabetes Type: Type 2
Complications: Neuropathy, Nephropathy, Foot Ulcer
Insulin Use: Yes
Ulcer Site: Left Foot
Ulcer Severity: Bone
CKD Present: Yes
CKD Stage: 4
Dialysis: None
AKI: Yes
Hypertension: Yes
Heart Failure: Yes
Heart Failure Type: Diastolic
Heart Failure Acuity: Acute on Chronic
Pneumonia: Yes
Pneumonia Organism: MRSA
Infection Present: Yes
Infection Site: Lung
Organism: MRSA
Sepsis: Yes
Severe Sepsis: Yes
Septic Shock: No
Ulcer Present: Yes
Ulcer Type: Diabetic
Ulcer Location: Left Foot
Ulcer Stage: 4
Altered Mental Status: Yes
Encephalopathy: Yes
Encephalopathy Type: Metabolic
Anemia: Yes
Anemia Type: Chronic Disease`;
console.log('='.repeat(80));
console.log('TESTING USER INPUT FROM WEBSITE');
console.log('='.repeat(80));
// Step 1: Parse
const { context, errors: parseErrors } = (0, parser_1.parseInput)(userInput);
console.log('\n--- STEP 1: PARSING ---');
if (parseErrors.length > 0) {
    console.log('❌ Parse Errors:', parseErrors);
}
else {
    console.log('✅ Parsing successful');
}
// Step 2: Validate
const validation = (0, validator_1.validateContext)(context);
console.log('\n--- STEP 2: VALIDATION ---');
console.log(`Valid: ${validation.valid}`);
if (validation.errors.length > 0) {
    console.log('\n❌ VALIDATION ERRORS (HARD STOPS):');
    validation.errors.forEach((err, i) => console.log(`   ${i + 1}. ${err}`));
}
if (validation.warnings.length > 0) {
    console.log('\n⚠️  WARNINGS:');
    validation.warnings.forEach((warn, i) => console.log(`   ${i + 1}. ${warn}`));
}
// Step 3: Run engine (if valid)
if (validation.valid) {
    console.log('\n--- STEP 3: CODE GENERATION ---');
    const result = (0, engine_1.runStructuredRules)(context);
    const allCodes = [result.primary, ...result.secondary].filter(c => c);
    console.log(`✅ Generated ${allCodes.length} codes`);
    console.log(`Primary: ${(_a = result.primary) === null || _a === void 0 ? void 0 : _a.code} - ${(_b = result.primary) === null || _b === void 0 ? void 0 : _b.label}`);
}
else {
    console.log('\n--- STEP 3: CODE GENERATION ---');
    console.log('❌ SKIPPED due to validation errors');
}
console.log('\n' + '='.repeat(80));
