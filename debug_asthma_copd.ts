import { parseInput } from './lib/structured/parser';

// Test case 14: Acute severe asthma
const input14 = "Age: 52\nGender: Female\nEncounter Type: Inpatient\nCondition: Acute severe asthma";
const { context: ctx14 } = parseInput(input14);
console.log('Case 14 - Acute severe asthma:');
console.log('Asthma:', JSON.stringify(ctx14.conditions.respiratory?.asthma, null, 2));
console.log('Expected: J45.901 (unspecified with exacerbation)');
console.log('Current logic would give: J45.51 (severe persistent with exacerbation)');

// Test case 15: COPD with acute lower respiratory infection
const input15 = "Age: 67\nGender: Male\nEncounter Type: Inpatient\nCondition: COPD with acute lower respiratory infection";
const { context: ctx15 } = parseInput(input15);
console.log('\nCase 15 - COPD with infection:');
console.log('COPD:', JSON.stringify(ctx14.conditions.respiratory?.copd, null, 2));
console.log('Expected: J44.0 + J22');
console.log('Need to add J22 for acute lower respiratory infection');
