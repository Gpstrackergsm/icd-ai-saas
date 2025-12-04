import { parseInput } from './parser';
import { runStructuredRules } from './engine';

const testCase = `Case 17:
Age: 36
Gender: Female
Diagnosis: Iron deficiency anemia
Cause: Chronic blood loss`;

console.log('=== DEBUG: Case 17 ===\n');
const { context } = parseInput(testCase);

console.log('Hematology context:');
console.log(JSON.stringify(context.conditions.hematology, null, 2));

const result = runStructuredRules(context);
const codes = [result.primary, ...result.secondary].filter(c => c);

console.log('\nGenerated codes:');
codes.forEach(c => {
    console.log(`\nCode: ${c?.code}`);
    console.log(`Label: ${c?.label}`);
    console.log(`Trigger: ${c?.trigger}`);
    console.log(`Rationale: ${c?.rationale}`);
});
