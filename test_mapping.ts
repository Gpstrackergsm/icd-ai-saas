import { parseInput } from './lib/structured/parser';
import { runStructuredRules } from './lib/structured/engine';
import { validateCodeSet } from './lib/structured/validator-post';

// Test Case 1: Diabetes with CKD
const test1 = `Age: 65
Gender: Female
Encounter Type: Outpatient
Diabetes Type: Type 2
Complications: Nephropathy/CKD
CKD Stage: 3b
Insulin Use: No`;

console.log('TEST 1: Diabetes + CKD Stage 3b');
console.log('Expected: E11.22, N18.32\n');

const { context: ctx1 } = parseInput(test1);
const result1 = runStructuredRules(ctx1);
const validated1 = validateCodeSet(result1.primary, result1.secondary, ctx1);
console.log('Generated:', validated1.codes.map(c => c.code).join(', '));
console.log('\n' + '='.repeat(80) + '\n');

// Test Case 4: COPD with exacerbation
const test4 = `Age: 18
Gender: Male
Encounter Type: Outpatient
COPD: With exacerbation
Tobacco Use: Yes`;

console.log('TEST 4: ACUTEexacerbation of COPD');
console.log('Expected: J44.1, F17.210\n');

const { context: ctx4 } = parseInput(test4);
const result4 = runStructuredRules(ctx4);
const validated4 = validateCodeSet(result4.primary, result4.secondary, ctx4);
console.log('Generated:', validated4.codes.map(c => c.code).join(', '));
