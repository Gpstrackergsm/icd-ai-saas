import { parseInput } from './lib/structured/parser';
import { runStructuredRules } from './lib/structured/engine';

const input1 = "Age: 52\nGender: Male\nEncounter: Outpatient\nDiabetes Type: Type 2\nComplications: None";
const { context } = parseInput(input1);
console.log('Case 1 - Simple Type 2 Diabetes');
console.log('Diabetes:', JSON.stringify(context.conditions.diabetes, null, 2));

const result = runStructuredRules(context);
console.log('\nResult:');
console.log('  Primary:', result.primary?.code);
console.log('  Secondary:', result.secondary.map(c => c?.code));
console.log('\nExpected: E11.9');
