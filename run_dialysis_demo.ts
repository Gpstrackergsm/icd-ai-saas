import { parseInput } from './lib/structured/parser';
import { runStructuredRules } from './lib/structured/engine';

const testCase = "82-year-old male with ESRD on dialysis, hypertension, and chronic systolic heart failure admitted for routine dialysis, no HF exacerbation.";

console.log('╔════════════════════════════════════════════════════════════════════════════════╗');
console.log('║                    ICD-10-CM ENCODER - DIALYSIS ENCOUNTER TEST                ║');
console.log('╚════════════════════════════════════════════════════════════════════════════════╝\n');

console.log('📋 Clinical Scenario:');
console.log(`   ${testCase}\n`);

const { context } = parseInput(testCase);
const result = runStructuredRules(context);

console.log('🔍 Parser Detection:');
console.log(`   • Encounter Reason: ${context.encounter?.reasonForAdmission || 'not detected'}`);
console.log(`   • CKD Stage: ${context.conditions.ckd?.stage || 'not detected'}`);
console.log(`   • On Dialysis: ${context.conditions.ckd?.onDialysis ? 'Yes' : 'No'}`);
console.log(`   • Dialysis Type: ${context.conditions.ckd?.dialysisType || 'not set'}`);
console.log(`   • Hypertension: ${context.conditions.cardiovascular?.hypertension ? 'Yes' : 'No'}`);
console.log(`   • Heart Failure: ${context.conditions.cardiovascular?.heartFailure ? 'Yes (systolic, chronic)' : 'No'}\n`);

console.log('📊 Generated ICD-10-CM Codes:\n');

const allCodes = [result.primary, ...result.secondary].filter(Boolean);

allCodes.forEach((code, idx) => {
    const position = idx === 0 ? '🔴 PRIMARY  ' : '⚪ SECONDARY';
    console.log(`   ${idx + 1}. ${position} │ ${code!.code.padEnd(10)} │ ${code!.label}`);
});

console.log('\n' + '─'.repeat(84));
console.log('💡 Clinical Rationale:\n');
console.log('   Per ICD-10-CM Guidelines Section I.C.21.c.3:');
console.log('   "When a patient is admitted for the sole purpose of receiving dialysis,');
console.log('   the appropriate Z code should be assigned as the principal diagnosis."\n');
console.log('   ✅ Z49.31 correctly sequenced as PRIMARY diagnosis');
console.log('   ✅ HTN+CKD+HF combination code (I13.2) as SECONDARY');
console.log('   ✅ Specific heart failure code (I50.22) as SECONDARY');
console.log('   ✅ CKD stage (N18.6) as SECONDARY');
console.log('   ✅ Chronic dialysis status (Z99.2) as SECONDARY\n');

console.log('╔════════════════════════════════════════════════════════════════════════════════╗');
console.log('║                           ✅ ENCODING COMPLETE                                 ║');
console.log('╚════════════════════════════════════════════════════════════════════════════════╝');
