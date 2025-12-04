import { parseInput } from './lib/structured/parser';

const test4 = "Age: 52\nGender: Female\nEncounter Type: Outpatient\nDiabetes Type: Type 2\nComplications: Retinopathy";
const test15 = "Age: 66\nGender: Female\nEncounter Type: Inpatient\nDiabetes Type: Type 2\nComplications: Hypoglycemia";

console.log('Test 4 (Retinopathy):');
const { context: ctx4 } = parseInput(test4);
console.log(JSON.stringify(ctx4.conditions.diabetes, null, 2));

console.log('\nTest 15 (Hypoglycemia):');
const { context: ctx15 } = parseInput(test15);
console.log(JSON.stringify(ctx15.conditions.diabetes, null, 2));
