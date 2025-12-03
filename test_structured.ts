import { parseInput } from './lib/structured/parser';
import { validateContext } from './lib/structured/validator';
import { runStructuredRules } from './lib/structured/engine';

const input = `
Age: 65
Gender: Female
Diabetes Type: Type 2
Complications: Foot Ulcer, Nephropathy/CKD
Ulcer Site: Right Foot
Ulcer Depth: Muscle exposed
CKD Stage: 4
Dialysis: No
Acute Kidney Injury: No
`;

console.log('=== PRODUCTION DIABETES/CKD ENGINE TEST ===\n');

console.log('--- 1. PARSING INPUT ---');
const { context, errors: parseErrors } = parseInput(input);
if (parseErrors.length > 0) {
    console.error('❌ Parsing Errors:', parseErrors);
} else {
    console.log('✅ Context:', JSON.stringify(context, null, 2));
}

console.log('\n--- 2. VALIDATING CONTEXT ---');
const validation = validateContext(context);
if (!validation.valid) {
    console.error('❌ Validation Errors:', validation.errors);
} else {
    console.log('✅ Validation: PASSED');
}
if (validation.warnings.length > 0) {
    console.log('⚠️  Warnings:', validation.warnings);
}

console.log('\n--- 3. RUNNING PRODUCTION RULES ENGINE ---');
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

console.log('\n--- EXPECTED OUTPUT ---');
console.log('Primary: E11.621 (Type 2 diabetes with foot ulcer)');
console.log('Secondary:');
console.log('  1. L97.513 (Right foot ulcer, muscle depth)');
console.log('  2. E11.22 (Type 2 diabetes with CKD) - because Nephropathy/CKD selected');
console.log('  3. N18.4 (CKD Stage 4)');
console.log('\n=== TEST COMPLETE ===');
