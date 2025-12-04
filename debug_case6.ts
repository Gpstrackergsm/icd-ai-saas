import { parseInput } from './lib/structured/parser';
import { validateContext } from './lib/structured/validator';

const test6 = "Age: 65\nGender: Female\nEncounter Type: Inpatient\nDiabetes Type: Type 2\nComplications: Chronic Kidney Disease";

console.log('Test 6:');
const { context } = parseInput(test6);
console.log('Diabetes complications:', context.conditions.diabetes?.complications);
console.log('CKD object:', context.conditions.ckd);

const validation = validateContext(context);
console.log('\nValidation:', validation);
