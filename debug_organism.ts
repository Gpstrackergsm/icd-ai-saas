import { parseInput } from './lib/structured/parser';

const input = "Age: 60\nGender: Female\nEncounter Type: Inpatient\nCondition: Pneumonia with sepsis\nOrganism: Streptococcus";
const { context } = parseInput(input);

console.log('Infection:', JSON.stringify(context.conditions.infection, null, 2));
console.log('Respiratory:', JSON.stringify(context.conditions.respiratory, null, 2));
console.log('\nExpected organism: strep or strep_pneumoniae');
console.log('Expected pneumonia code: J15.4 (other streptococci)');
