// Test to understand the negation pattern issue
const testText = 'There was no documented diagnosis of acute kidney injury or chronic kidney disease.';

console.log('Testing negation pattern issue...\n');
console.log('Text:', testText);
console.log('');

// Current pattern (doesn't work for CKD in list)
const currentPattern = (term) => {
    const pattern = new RegExp(`(no|without|denies|negative for|ruled out|absence of)\\s+(documented\\s+)?(diagnosis of\\s+)?${term}`, 'i');
    return pattern.test(testText);
};

console.log('Current pattern:');
console.log('- AKI:', currentPattern('acute kidney injury')); // true
console.log('- CKD:', currentPattern('chronic kidney disease')); // false - PROBLEM!
console.log('');

// Better pattern: check if term appears after a negation phrase in same sentence
const betterPattern = (term) => {
    // Find if there's a negation phrase followed (eventually) by the term
    const pattern = new RegExp(`(no|without|denies|negative for|ruled out|absence of)\\s+(documented\\s+)?(diagnosis of\\s+)?[^.]*?${term}`, 'i');
    return pattern.test(testText);
};

console.log('Better pattern (with .*? to allow intervening text):');
console.log('- AKI:', betterPattern('acute kidney injury')); // should be true
console.log('- CKD:', betterPattern('chronic kidney disease')); // should be true
console.log('');

// Even better: check if the sentence contains negation AND the term
const bestPattern = (term) => {
    const sentence = testText.toLowerCase();
    const hasNegation = /(no|without|denies|negative for|ruled out|absence of)\s+(documented\s+)?(diagnosis)/.test(sentence);
    const hasTerm = sentence.includes(term.toLowerCase());

    // If both exist in same sentence, consider it negated
    return hasNegation && hasTerm;
};

console.log('Best pattern (check if negation + term in same sentence):');
console.log('- AKI:', bestPattern('acute kidney injury')); // should be true  
console.log('- CKD:', bestPattern('chronic kidney disease')); // should be true
