import { parseInput } from './lib/structured/parser';

const input4 = "Age: 57\nGender: Female\nEncounter Type: Outpatient\nDiabetes Type: Type 2\nComplications: Diabetic retinopathy with macular edema";
const { context } = parseInput(input4);

console.log('Diabetes:', JSON.stringify(context.conditions.diabetes, null, 2));
console.log('\nExpected: E11.311 (type 2 DM with unspecified diabetic retinopathy with macular edema)');
console.log('Got: E11.319 (type 2 DM with unspecified diabetic retinopathy without macular edema)');
console.log('\nNeed to detect "with macular edema" in complications');
