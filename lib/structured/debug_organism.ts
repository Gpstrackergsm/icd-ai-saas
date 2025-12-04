import { parseInput } from './parser';

const test6 = `Case 6:
Age: 70
Gender: Female
Diagnosis: Pneumonia due to MRSA
Complications: Severe sepsis, Acute respiratory failure`;

const test10 = `Case 10:
Age: 61
Gender: Female
Diagnosis: Septic shock
Source: Urinary tract infection
Complications: Acute respiratory failure, Acute kidney failure`;

console.log('=== TEST 6 (MRSA) ===');
const { context: ctx6 } = parseInput(test6);
console.log('Infection context:', JSON.stringify(ctx6.conditions.infection, null, 2));

console.log('\n=== TEST 10 (UTI) ===');
const { context: ctx10 } = parseInput(test10);
console.log('Infection context:', JSON.stringify(ctx10.conditions.infection, null, 2));
