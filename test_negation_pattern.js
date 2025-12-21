// Test negation pattern specifically
const testNarrative = '68-year-old admitted for dehydration and weakness. Creatinine was elevated on admission and improved after intravenous fluids. Renal function was monitored during hospitalization. There was no documented diagnosis of acute kidney injury or chronic kidney disease.';

console.log('Testing negation pattern...\n');

// Test the exact pattern from the API
const isNegated = (term) => {
    const pattern = new RegExp(`(no|without|denies|negative for|ruled out|absence of)\\s+(documented\\s+)?(diagnosis of\\s+)?${term}`, 'i');
    console.log(`Testing term: "${term}"`);
    console.log(`Pattern: ${pattern}`);
    console.log(`Result: ${pattern.test(testNarrative)}`);
    console.log('');
    return pattern.test(testNarrative);
};

console.log('Test 1: "acute kidney injury"');
is Negated('acute kidney injury');

console.log('Test 2: "chronic kidney disease"');
isNegated('chronic kidney disease');

console.log('Test 3: With escaping');
const escapedTerm = 'chronic kidney disease'.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
console.log(`Escaped term: "${escapedTerm}"`);
const pattern = new RegExp(`(no|without|denies)\\s+(documented\\s+)?(diagnosis of\\s+)?${escapedTerm}`, 'i');
console.log(`Pattern with escaping: ${pattern}`);
console.log(`Result: ${pattern.test(testNarrative)}`);
