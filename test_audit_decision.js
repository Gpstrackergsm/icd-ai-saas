// Quick test to verify audit decision block is generated correctly

const testNarrative = '68-year-old admitted for dehydration and weakness. Creatinine was elevated on admission and improved after intravenous fluids. Renal function was monitored during hospitalization. There was no documented diagnosis of acute kidney injury or chronic kidney disease.';

console.log('Testing audit decision block generation...\n');

// Simulate what production API does
const lower = testNarrative.toLowerCase();
const diagnoses = [];

// Extract renal diagnoses
if (lower.includes('acute kidney injury') || lower.match(/\baki\b/)) {
    diagnoses.push('acute kidney injury');
}
if (lower.match(/chronic kidney disease|ckd/)) {
    const stageMatch = testNarrative.match(/(?:ckd|chronic kidney disease)\s*stage\s*([1-5]|[iv]+)/i);
    if (stageMatch) {
        diagnoses.push(`CKD stage ${stageMatch[1]}`);
    } else {
        diagnoses.push('chronic kidney disease');
    }
}

console.log('Parsed diagnoses:', diagnoses);
console.log('Expected: [] (empty - no diagnosis documented)');
console.log('');

// Check if audit decision block would be created
if (diagnoses.length === 0) {
    console.log('✅ Correct: No provider diagnosis found');
    console.log('✅ Should trigger AUTO_EXCLUDE');
    console.log('✅ Should display formal audit decision block');
} else {
    console.log('❌ Error: Found diagnoses when none should exist');
}

console.log('\nTo test live API, run:');
console.log('curl -X POST https://www.icd-10-cm.online/api/encode \\');
console.log('  -H "Content-Type: application/json" \\');
console.log(`  -d '{"text":"${testNarrative}"}'`);
