// Quick test to verify negation detection works correctly

const testNarrative = '68-year-old admitted for dehydration and weakness. Creatinine was elevated on admission and improved after intravenous fluids. Renal function was monitored during hospitalization. There was no documented diagnosis of acute kidney injury or chronic kidney disease.';

console.log('Testing audit decision block generation with negation detection...\n');

// Simulate what production API does (WITH NEGATION DETECTION)
const lower = testNarrative.toLowerCase();
const diagnoses = [];

// Helper to check if a term is negated in the text
const isNegated = (term) => {
    const pattern = new RegExp(`(no|without|denies|negative for|ruled out|absence of)\\s+(documented\\s+)?(diagnosis of\\s+)?${term}`, 'i');
    return pattern.test(testNarrative);
};

// Extract renal diagnoses (only if NOT negated)
if ((lower.includes('acute kidney injury') || lower.match(/\baki\b/)) && !isNegated('acute kidney injury') && !isNegated('aki')) {
    diagnoses.push('acute kidney injury');
}
if (lower.match(/chronic kidney disease|ckd/)) {
    if (!isNegated('chronic kidney disease') && !isNegated('ckd')) {
        const stageMatch = testNarrative.match(/(?:ckd|chronic kidney disease)\s*stage\s*([1-5]|[iv]+)/i);
        if (stageMatch) {
            diagnoses.push(`CKD stage ${stageMatch[1]}`);
        } else {
            diagnoses.push('chronic kidney disease');
        }
    }
}

console.log('Parsed diagnoses:', diagnoses);
console.log('Expected: [] (empty - no diagnosis documented)');
console.log('');

// Check negation detection
console.log('Negation checks:');
console.log('- isNegated("acute kidney injury"):', isNegated('acute kidney injury'));
console.log('- isNegated("chronic kidney disease"):', isNegated('chronic kidney disease'));
console.log('');

// Check if audit decision block would be created
if (diagnoses.length === 0) {
    console.log('✅ Correct: No provider diagnosis found');
    console.log('✅ Should trigger AUTO_EXCLUDE');
    console.log('✅ Should display formal audit decision block');
} else {
    console.log('❌ Error: Found diagnoses when none should exist');
    console.log('   This means negation detection is not working!');
}
