import { parseInput } from './lib/structured/parser';

const test12 = "Age: 78\nGender: Female\nEncounter Type: Inpatient\nAspiration pneumonitis";
const test13 = "Age: 70\nGender: Male\nEncounter Type: Inpatient\nVentilator-associated pneumonia: MRSA";
const test15 = "Age: 65\nGender: Male\nEncounter Type: Inpatient\nCommunity-acquired pneumonia";

console.log('Test 12 (Aspiration pneumonitis):');
const { context: ctx12 } = parseInput(test12);
console.log('Pneumonia:', JSON.stringify(ctx12.conditions.respiratory?.pneumonia, null, 2));
console.log('Expected: J69.0');

console.log('\nTest 13 (VAP with MRSA):');
const { context: ctx13 } = parseInput(test13);
console.log('Pneumonia:', JSON.stringify(ctx13.conditions.respiratory?.pneumonia, null, 2));
console.log('Expected: J95.851, J15.212');

console.log('\nTest 15 (Community-acquired pneumonia):');
const { context: ctx15 } = parseInput(test15);
console.log('Pneumonia:', JSON.stringify(ctx15.conditions.respiratory?.pneumonia, null, 2));
console.log('Expected: J18.9');
