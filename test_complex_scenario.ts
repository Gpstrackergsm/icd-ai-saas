import { runRulesEngine } from './lib/rulesEngine';

const complexScenario = `67-year-old female patient admitted with acute exacerbation of congestive heart failure and acute kidney injury. Patient has a history of type 2 diabetes mellitus with diabetic nephropathy and stage 4 chronic kidney disease. She also has longstanding hypertensive heart and chronic kidney disease. During hospitalization, patient developed hospital-acquired pneumonia due to Pseudomonas aeruginosa. Patient is currently on hemodialysis three times per week. She also has a non-healing diabetic ulcer on the plantar surface of her left foot with exposed muscle. Initial encounter for the foot ulcer.`;

console.log('Testing Complex Clinical Scenario\n');
console.log('='.repeat(80));
console.log('INPUT:', complexScenario);
console.log('='.repeat(80));

const result = runRulesEngine(complexScenario);

console.log('\n📋 CODES ASSIGNED:');
result.sequence.forEach((code, idx) => {
    console.log(`${idx + 1}. ${code.code} - ${code.label}`);
    console.log(`   Triggered by: ${code.triggeredBy}`);
    console.log(`   HCC: ${code.hcc ? 'Yes' : 'No'}`);
});

console.log('\n⚠️  WARNINGS:');
result.warnings.forEach(w => console.log(`   - ${w}`));

console.log('\n💡 RATIONALE:');
result.rationale.forEach(r => {
    console.log(`\n${r.code}: ${r.label}`);
    console.log(`   Clinical: ${r.clinicalJustification}`);
    if (r.guidelineReference) {
        console.log(`   Guideline: ${r.guidelineReference.section} - ${r.guidelineReference.title}`);
    }
    if (r.sequencingReason) {
        console.log(`   Sequencing: ${r.sequencingReason}`);
    }
});

console.log(`\n📊 CONFIDENCE: ${result.confidence.overallConfidence}%`);
console.log(`   ${result.confidence.explanation}`);

console.log('\n🔍 AUDIT TRAIL:');
result.audit.forEach(a => console.log(`   ${a}`));

console.log('\n' + '='.repeat(80));
console.log('ANALYSIS:');
console.log('='.repeat(80));

// Check for expected codes
const codes = result.sequence.map(c => c.code);
const expectedCodes = {
    'I13.0': 'Hypertensive heart and CKD',
    'I50.9': 'Heart failure',
    'N18.4': 'CKD Stage 4',
    'N17.9': 'Acute kidney injury',
    'E11.22': 'Diabetes with CKD',
    'E11.621': 'Diabetes with foot ulcer',
    'L97.5': 'Foot ulcer (plantar)',
    'J18.9': 'Pneumonia',
    'B96.5': 'Pseudomonas aeruginosa',
    'Z99.2': 'Hemodialysis'
};

console.log('\n✓ FOUND:');
Object.entries(expectedCodes).forEach(([code, desc]) => {
    const found = codes.some(c => c.startsWith(code));
    if (found) {
        const actualCode = codes.find(c => c.startsWith(code));
        console.log(`   ✅ ${actualCode} - ${desc}`);
    }
});

console.log('\n✗ MISSING:');
Object.entries(expectedCodes).forEach(([code, desc]) => {
    const found = codes.some(c => c.startsWith(code));
    if (!found) {
        console.log(`   ❌ ${code} - ${desc}`);
    }
});

console.log('\n🔧 ISSUES DETECTED:');
result.sequence.forEach(code => {
    // Check for incorrect 7th characters on non-injury codes
    if (!code.code.startsWith('S') && !code.code.startsWith('T') && !code.code.startsWith('O') && code.code.match(/[A-Z]$/)) {
        console.log(`   ⚠️  ${code.code} has 7th character but shouldn't (not an injury/trauma/OB code)`);
    }
});
