import { parseInput } from './parser';
import { runStructuredRules } from './engine';

const test10 = `Case 10:
Age: 61
Gender: Female
Diagnosis: Septic shock
Source: Urinary tract infection
Complications: Acute respiratory failure, Acute kidney failure`;

console.log('=== TEST 10 (Septic shock from UTI) ===\n');
const { context } = parseInput(test10);

console.log('Context:');
console.log('- Infection:', JSON.stringify(context.conditions.infection, null, 2));
console.log('- All conditions:', Object.keys(context.conditions));

const result = runStructuredRules(context);
const codes = [result.primary, ...result.secondary].filter(c => c);

console.log('\nGenerated codes:');
codes.forEach(c => console.log(`  ${c?.code}: ${c?.label}`));

console.log('\nExpected: A41.9, R65.21, N17.9, J96.00, N39.0');
