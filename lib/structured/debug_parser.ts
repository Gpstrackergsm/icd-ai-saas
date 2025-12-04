import { parseInput } from './parser';

const testCase = `Case 18:
Age: 64
Gender: Male
Diagnosis: Chronic kidney disease Stage 5
On dialysis: Yes`;

console.log('Input text:');
console.log(testCase);
console.log('\n=== Parsing ===\n');

// Add debug logging to see what's happening
const lines = testCase.split('\n');
lines.forEach(line => {
    const colonIndex = line.indexOf(':');
    if (colonIndex > 0) {
        const key = line.substring(0, colonIndex).trim().toLowerCase();
        const value = line.substring(colonIndex + 1).trim();
        console.log(`Key: "${key}" | Value: "${value}"`);
    }
});

const { context } = parseInput(testCase);

console.log('\n=== Result ===');
console.log('CKD context:', JSON.stringify(context.conditions.ckd, null, 2));
