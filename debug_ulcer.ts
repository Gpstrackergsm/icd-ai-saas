import { parseInput } from './lib/structured/parser';
import { validateContext } from './lib/structured/validator';

const test7 = `Age: 70
Gender: Male
Encounter Type: Inpatient
Diabetes Type: Type 2
Complications: Foot Ulcer
Ulcer Site: Right Foot
Ulcer Severity: Fat layer exposed`;

console.log('Test 7 (Ulcer depth):');
const { context } = parseInput(test7);
console.log('Ulcer severity:', context.conditions.diabetes?.ulcerSeverity);
console.log('Expected: muscle (for L97.513)');
console.log('Got:', context.conditions.diabetes?.ulcerSeverity);
