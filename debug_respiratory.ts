import { parseInput } from './lib/structured/parser';

const test8 = "Age: 30\nGender: Male\nEncounter Type: ED\nAsthma: Mild intermittent\nStatus: Exacerbation";

console.log('Test 8 (Mild intermittent asthma with exacerbation):');
const { context } = parseInput(test8);
console.log('Respiratory:', JSON.stringify(context.conditions.respiratory, null, 2));
console.log('\nExpected: asthma severity=mild_intermittent, status=exacerbation');
console.log('Should generate: J45.21');
