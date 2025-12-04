import { parseInput } from './lib/structured/parser';
import { validateContext } from './lib/structured/validator';

// Case 20: Pneumonia with sepsis
const input20 = "Age: 60\nGender: Female\nEncounter Type: Inpatient\nCondition: Pneumonia with sepsis\nOrganism: Streptococcus";
const { context } = parseInput(input20);

console.log('Case 20 - Pneumonia with sepsis:');
console.log('Infection:', JSON.stringify(context.conditions.infection, null, 2));
console.log('Respiratory:', JSON.stringify(context.conditions.respiratory, null, 2));

const validation = validateContext(context);
console.log('\nValidation:', validation);
console.log('\nExpected: A40.9 (primary), J15.4 (secondary)');
console.log('Issue: Sepsis validation requires infection source/site');
