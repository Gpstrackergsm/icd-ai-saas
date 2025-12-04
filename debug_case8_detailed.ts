import { parseInput } from './lib/structured/parser';

const test8 = "Age: 48\nGender: Female\nEncounter Type: Outpatient\nDiabetes Type: Type 2\nComplications: Nephropathy";

console.log('Parsing:', test8);
console.log('\n');

// Add instrumentation to parser
const { context, errors } = parseInput(test8);

console.log('Final diabetes complications:', context.conditions.diabetes?.complications);
console.log('Expected: [\"nephropathy\"] only');
console.log('Got:', context.conditions.diabetes?.complications);
console.log('\nIssue: Both ckd and nephropathy are in the array');
