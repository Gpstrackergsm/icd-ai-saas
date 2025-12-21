// Test audit decision with FIXED negation pattern
const testNarrative = '68-year-old admitted for dehydration and weakness. Creatinine was elevated on admission and improved after intravenous fluids. Renal function was monitored during hospitalization. There was no documented diagnosis of acute kidney injury or chronic kidney disease.';

console.log('Testing FIXED negation detection...\n');

// FIXED pattern (with [^.]*? to allow intervening text)
const lower = testNarrative.toLowerCase();
const diagnoses = [];

const isNegated = (term) => {
    const pattern = new RegExp(`(no|without|denies|negative for|ruled out|absence of)\\s+(documented\\s+)?(diagnosis of\\s+)?[^.]*?${term}`, 'i');
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
console.log('Expected: [] (empty)\n');

console.log('Negation checks:');
console.log('- isNegated("acute kidney injury"):', isNegated('acute kidney injury'));
console.log('- isNegated("chronic kidney disease"):', isNegated('chronic kidney disease'));
console.log('');

if (diagnoses.length === 0) {
    console.log('✅ SUCCESS: No diagnoses found');
    console.log('✅ AUTO_EXCLUDE will trigger');
    console.log('✅ Formal audit decision block will display');
} else {
    console.log('❌ FAILED: Found', diagnoses);
}
