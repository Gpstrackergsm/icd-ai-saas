import { parseInput } from './lib/structured/parser';

const test8 = "Age: 30\nGender: Male\nEncounter Type: ED\nAsthma: Mild intermittent\nStatus: Exacerbation";

console.log('Parsing test 8 line by line:');
const lines = test8.split('\n');
lines.forEach((line, i) => {
    console.log(`Line ${i + 1}: "${line}"`);
    const [key, ...valueParts] = line.split(':');
    const value = valueParts.join(':').trim();
    console.log(`  Key: "${key}", Value: "${value}"`);
    console.log(`  key.toLowerCase(): "${key.toLowerCase()}"`);
    console.log(`  value.toLowerCase().includes('copd'): ${value.toLowerCase().includes('copd')}`);
    console.log(`  value.toLowerCase().includes('exacerbation'): ${value.toLowerCase().includes('exacerbation')}`);
});

console.log('\nFinal parsed context:');
const { context } = parseInput(test8);
console.log('Respiratory:', JSON.stringify(context.conditions.respiratory, null, 2));
