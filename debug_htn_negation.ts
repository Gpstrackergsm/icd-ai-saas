import { parseInput } from './lib/structured/parser';

const case7 = "70-year-old female with chronic systolic CHF and no history of hypertension admitted for acute on chronic HF.";
const case23 = "76-year-old female with chronic systolic CHF admitted for worsening dyspnea. No hypertension.";

console.log('=== DEBUGGING HYPERTENSION NEGATION ===\n');

console.log('CASE 7:');
console.log(case7);
const { context: ctx7 } = parseInput(case7);
console.log('Hypertension detected:', ctx7.conditions.cardiovascular?.hypertension);
console.log('Heart Failure:', ctx7.conditions.cardiovascular?.heartFailure);
console.log();

console.log('CASE 23:');
console.log(case23);
const { context: ctx23 } = parseInput(case23);
console.log('Hypertension detected:', ctx23.conditions.cardiovascular?.hypertension);
console.log('Heart Failure:', ctx23.conditions.cardiovascular?.heartFailure);
