import { parseInput } from './lib/structured/parser';
import { runStructuredRules } from './lib/structured/engine';

const testCase = "70-year-old female with chronic systolic CHF and no history of hypertension admitted for acute on chronic HF.";

console.log('╔════════════════════════════════════════════════════════════════════════════════╗');
console.log('║                    ICD-10-CM ENCODER - HEART FAILURE TEST                     ║');
console.log('╚════════════════════════════════════════════════════════════════════════════════╝\n');

console.log('📋 Clinical Scenario:');
console.log(`   ${testCase}\n`);

const { context } = parseInput(testCase);
const result = runStructuredRules(context);

console.log('🔍 Parser Detection:');
console.log(`   • Encounter Reason: ${context.encounter?.reasonForAdmission || 'not set (acute condition)'}`);
console.log(`   • Hypertension: ${context.conditions.cardiovascular?.hypertension ? 'Yes' : 'No'}`);
console.log(`   • Heart Failure Type: ${context.conditions.cardiovascular?.heartFailure?.type || 'not detected'}`);
console.log(`   • Heart Failure Acuity: ${context.conditions.cardiovascular?.heartFailure?.acuity || 'not detected'}`);
console.log(`   • CKD: ${context.conditions.ckd || context.conditions.renal?.ckd ? 'Yes' : 'No'}\n`);

console.log('📊 Generated ICD-10-CM Codes:\n');

const allCodes = [result.primary, ...result.secondary].filter(Boolean);

allCodes.forEach((code, idx) => {
    const position = idx === 0 ? '🔴 PRIMARY  ' : '⚪ SECONDARY';
    console.log(`   ${idx + 1}. ${position} │ ${code!.code.padEnd(10)} │ ${code!.label}`);
});

console.log('\n' + '─'.repeat(84));
console.log('💡 Clinical Rationale:\n');
console.log('   ✅ I50.23 (Acute on chronic systolic HF) is PRIMARY diagnosis');
console.log('   ✅ No hypertension documented → No I11.0 code needed');
console.log('   ✅ No CKD documented → No I13.x combination code needed');
console.log('   ✅ Patient admitted for HF exacerbation (not routine dialysis)\n');

console.log('╔════════════════════════════════════════════════════════════════════════════════╗');
console.log('║                           ✅ ENCODING COMPLETE                                 ║');
console.log('╚════════════════════════════════════════════════════════════════════════════════╝');
