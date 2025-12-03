import { parseInput } from './lib/structured/parser';
import { validateContext } from './lib/structured/validator';
import { runStructuredRules } from './lib/structured/engine';

const input = `
Age: 42
Gender: Male
Encounter Type: Inpatient
Complications: Nephropathy/CKD, Foot Ulcer, Retinopathy
Diabetes Type: Type 2
Insulin Use: Yes
Ulcer Site: Right Foot
Ulcer Severity: Muscle exposed
`;

console.log('=== COMPREHENSIVE DIABETES TEST ===\n');
console.log('Input:');
console.log(input);

console.log('\n--- 1. PARSING ---');
const { context, errors: parseErrors } = parseInput(input);
if (parseErrors.length > 0) {
    console.error('❌ Parsing Errors:', parseErrors);
} else {
    console.log('✅ Parsed successfully');
    console.log('Context:', JSON.stringify(context, null, 2));
}

console.log('\n--- 2. VALIDATION ---');
const validation = validateContext(context);
if (!validation.valid) {
    console.error('❌ Validation Errors:', validation.errors);
} else {
    console.log('✅ Validation: PASSED');
}
if (validation.warnings.length > 0) {
    console.log('⚠️  Warnings:', validation.warnings);
}

console.log('\n--- 3. CODE GENERATION ---');
const result = runStructuredRules(context);

if (result.primary) {
    console.log('\n🎯 PRIMARY DIAGNOSIS:');
    console.log(`  Code: ${result.primary.code}`);
    console.log(`  Label: ${result.primary.label}`);
    console.log(`  Trigger: ${result.primary.trigger}`);
    console.log(`  Rule: ${result.primary.rule}`);
    console.log(`  Rationale: ${result.primary.rationale}`);
    console.log(`  Guideline: ${result.primary.guideline}`);
}

if (result.secondary.length > 0) {
    console.log('\n📋 SECONDARY DIAGNOSES:');
    result.secondary.forEach((code, i) => {
        console.log(`\n  ${i + 1}. ${code.code} - ${code.label}`);
        console.log(`     Trigger: ${code.trigger}`);
        console.log(`     Rule: ${code.rule}`);
        console.log(`     Rationale: ${code.rationale}`);
        console.log(`     Guideline: ${code.guideline}`);
    });
}

if (result.validationErrors.length > 0) {
    console.log('\n❌ VALIDATION ERRORS:', result.validationErrors);
}

if (result.warnings.length > 0) {
    console.log('\n⚠️  WARNINGS:', result.warnings);
}

console.log('\n--- EXPECTED CODES ---');
console.log('✅ E11.621 (Type 2 DM with foot ulcer)');
console.log('✅ L97.513 (Right foot ulcer, muscle depth)');
console.log('✅ E11.22 (Type 2 DM with CKD) - because Nephropathy/CKD selected');
console.log('✅ E11.311 (Type 2 DM with retinopathy)');
console.log('Note: CKD stage not specified, so NO N18.x code should be generated');

console.log('\n=== TEST COMPLETE ===');
