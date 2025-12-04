import { parseInput } from './parser';
import { runStructuredRules } from './engine';

const testCase = `Case 18:
Age: 64
Gender: Male
Diagnosis: Chronic kidney disease Stage 5
On dialysis: Yes`;

console.log('=== DEBUG: Case 18 ===\n');
const { context, errors } = parseInput(testCase);

console.log('Parsed CKD context:');
console.log(JSON.stringify(context.conditions.ckd, null, 2));

const result = runStructuredRules(context);
const codes = [result.primary, ...result.secondary].filter(c => c);

console.log('\nGenerated codes:');
codes.forEach(c => console.log(`  ${c?.code}: ${c?.label}`));
