import { parseInput } from './lib/structured/parser';
import { runStructuredRules } from './lib/structured/engine';

// Case 6 from cardiology test suite - should now generate Z49.31 as primary
const testCase = "82-year-old male with ESRD on dialysis, hypertension, and chronic systolic heart failure admitted for routine dialysis, no HF exacerbation.";

console.log('=== TESTING DIALYSIS ENCOUNTER FIX ===\n');
console.log('Clinical Scenario:');
console.log(testCase);
console.log('\n--- Parsing ---');

const { context } = parseInput(testCase);
console.log('Encounter reason:', context.encounter?.reasonForAdmission);
console.log('CKD stage:', context.conditions.ckd?.stage);
console.log('On dialysis:', context.conditions.ckd?.onDialysis);
console.log('Dialysis type:', context.conditions.ckd?.dialysisType);

console.log('\n--- Running Engine ---');
const result = runStructuredRules(context);

console.log('\nGenerated Codes:');
const allCodes = [
    result.primary,
    ...result.secondary
].filter(Boolean);

allCodes.forEach((code, idx) => {
    const position = idx === 0 ? 'PRIMARY  ' : 'SECONDARY';
    console.log(`  ${idx + 1}. [${position}] ${code!.code}    ${code!.label}`);
});

// Verify Z49.31 is primary
if (result.primary?.code === 'Z49.31') {
    console.log('\n✅ SUCCESS: Z49.31 is correctly sequenced as primary diagnosis');
} else {
    console.log(`\n❌ FAILURE: Expected Z49.31 as primary, got ${result.primary?.code}`);
}
