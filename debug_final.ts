import { parseInput } from './lib/structured/parser';

const test6 = "Age: 65\nGender: Female\nEncounter Type: Inpatient\nDiabetes Type: Type 2\nComplications: Nephropathy/CKD";
const test12 = "Age: 59\nGender: Male\nEncounter Type: Inpatient\nDiabetes Type: Type 2\nComplications: Neuropathy, Foot Ulcer\nUlcer Site: Left Foot\nUlcer Severity: Fat layer exposed";

console.log('Test 6 (Nephropathy/CKD):');
const { context: ctx6 } = parseInput(test6);
console.log('Diabetes complications:', ctx6.conditions.diabetes?.complications);
console.log('CKD:', ctx6.conditions.ckd);

console.log('\nTest 12 (Left foot ulcer):');
const { context: ctx12 } = parseInput(test12);
console.log('Ulcer site:', ctx12.conditions.diabetes?.ulcerSite);
console.log('Ulcer severity:', ctx12.conditions.diabetes?.ulcerSeverity);
console.log('Expected: L97.522 (left foot, fat layer)');
