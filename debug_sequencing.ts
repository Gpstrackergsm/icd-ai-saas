import { parseInput } from './lib/structured/parser';
import { runStructuredRules } from './lib/structured/engine';

console.log('Case 7: HTN + CKD Stage 3');
const input7 = "Age: 62\nGender: Female\nEncounter Type: Inpatient\nCondition: Hypertension with Chronic Kidney Disease Stage 3";
const { context } = parseInput(input7);
console.log('Context conditions:');
console.log('  HTN:', context.conditions.cardiovascular?.hypertension);
console.log('  Renal CKD:', JSON.stringify(context.conditions.renal?.ckd));
console.log('  Old CKD:', JSON.stringify(context.conditions.ckd));

const result = runStructuredRules(context);
const allCodes = [result.primary, ...result.secondary].filter(c => c).map(c => c?.code);
console.log('\nCodes generated (in order):', allCodes);
console.log('Expected: [I12.9, N18.3]');
console.log('Got:', allCodes);

console.log('\n---\nCase 8: HTN + HF');
const input8 = "Age: 70\nGender: Male\nEncounter Type: Outpatient\nCondition: Hypertensive Heart Disease";
const { context: ctx8 } = parseInput(input8);
console.log('Context conditions:');
console.log('  HTN:', ctx8.conditions.cardiovascular?.hypertension);
console.log('  HF:', JSON.stringify(ctx8.conditions.cardiovascular?.heartFailure));

const result8 = runStructuredRules(ctx8);
const allCodes8 = [result8.primary, ...result8.secondary].filter(c => c).map(c => c?.code);
console.log('\nCodes generated (in order):', allCodes8);
console.log('Expected: [I11.9]');
console.log('Got:', allCodes8);
console.log('Issue: I11.9 expected (without HF), but condition says "Hypertensive Heart Disease" which implies HF');
