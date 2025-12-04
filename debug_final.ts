import { parseInput } from './lib/structured/parser';

const test4 = "Age: 72\nGender: Female\nEncounter Type: Inpatient\nCOPD: With acute bronchitis";
const test19 = "Age: 30\nGender: Female\nEncounter Type: Outpatient\nAsthma: Yes";

console.log('Test 4 (COPD with acute bronchitis):');
const { context: ctx4 } = parseInput(test4);
console.log('COPD:', JSON.stringify(ctx4.conditions.respiratory?.copd, null, 2));
console.log('Expected: J44.0 only (not J44.9 + J44.0)');

console.log('\nTest 19 (Unspecified asthma):');
const { context: ctx19 } = parseInput(test19);
console.log('Asthma:', JSON.stringify(ctx19.conditions.respiratory?.asthma, null, 2));
console.log('Expected: J45.909 (not J45.900)');
