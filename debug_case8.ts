import { parseInput } from './lib/structured/parser';
import { runStructuredRules } from './lib/structured/engine';

const test8 = "Age: 48\nGender: Female\nEncounter Type: Outpatient\nDiabetes Type: Type 2\nComplications: Nephropathy";

console.log('Test 8 (Nephropathy only):');
const { context } = parseInput(test8);
console.log('Diabetes complications:', context.conditions.diabetes?.complications);
console.log('CKD object:', context.conditions.ckd);

const result = runStructuredRules(context);
const codes = [result.primary, ...result.secondary]
    .filter((c): c is NonNullable<typeof c> => c !== null && c !== undefined)
    .map(c => c.code);
console.log('Generated codes:', codes);
console.log('Expected: E11.21 only');
