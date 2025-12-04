import { parseInput } from './lib/structured/parser';

const test2 = "Age: 60\nGender: Female\nEncounter Type: Outpatient\nHigh blood pressure";
const test6 = "Age: 68\nGender: Male\nEncounter Type: Inpatient\nHypertension: Yes\nHeart Failure: Systolic, Acute";

console.log('Test 2 (High blood pressure):');
const { context: ctx2 } = parseInput(test2);
console.log('Cardiovascular:', ctx2.conditions.cardiovascular);

console.log('\nTest 6 (HTN + HF):');
const { context: ctx6 } = parseInput(test6);
console.log('Cardiovascular:', ctx6.conditions.cardiovascular);
