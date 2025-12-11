import { parseCardiology, resolveCardiologyCodes } from './lib/domains/cardiology/module';

// SELF-TEST: Sequencing Patch Validation
const text = "80-year-old male with HTN, CKD stage 5 on dialysis, and chronic systolic CHF, admitted for worsening shortness of breath due to acute on chronic HF.";

console.log('='.repeat(60));
console.log('SEQUENCING PATCH v3.3 - SELF-TEST');
console.log('='.repeat(60));
console.log('\nInput:', text);

const attrs = parseCardiology(text);
console.log('\nParsed Attributes:');
console.log('  hypertension:', attrs.hypertension);
console.log('  heart_failure:', attrs.heart_failure);
console.log('  hf_type:', attrs.hf_type);
console.log('  hf_acuity:', attrs.hf_acuity);
console.log('  ckd_stage:', attrs.ckd_stage);

const codes = resolveCardiologyCodes(attrs);

console.log('\n' + '='.repeat(60));
console.log('GENERATED CODES (in sequence):');
console.log('='.repeat(60));

codes.forEach((c, i) => {
    const position = i === 0 ? 'PRIMARY' : 'SECONDARY';
    console.log(`${i + 1}. [${position}] ${c.code} - ${c.label}`);
});

console.log('\n' + '='.repeat(60));
console.log('VALIDATION CHECKS:');
console.log('='.repeat(60));

const codelist = codes.map(c => c.code);

// Expected codes
const expected = {
    primary: 'I13.2',
    secondary: ['I50.23', 'N18.6']
};

// Forbidden
const hasForbiddenN185 = codelist.includes('N18.5');

console.log(`✓ Expected PRIMARY (I13.2): ${codes[0]?.code === expected.primary ? '✅ PASS' : '❌ FAIL'}`);
console.log(`✓ Expected I50.23 present: ${codelist.includes('I50.23') ? '✅ PASS' : '❌ FAIL'}`);
console.log(`✓ Expected N18.6 present: ${codelist.includes('N18.6') ? '✅ PASS' : '❌ FAIL'}`);
console.log(`✓ Forbidden N18.5 absent: ${!hasForbiddenN185 ? '✅ PASS' : '❌ FAIL (N18.5 still present!)'}`);
console.log(`✓ Correct sequence order: ${codes[0]?.code === 'I13.2' && codes[1]?.code === 'I50.23' && codes[2]?.code === 'N18.6' ? '✅ PASS' : '❌ FAIL'}`);

const allPass = codes[0]?.code === 'I13.2' &&
    codelist.includes('I50.23') &&
    codelist.includes('N18.6') &&
    !hasForbiddenN185 &&
    codes.length === 3;

console.log('\n' + '='.repeat(60));
if (allPass) {
    console.log('✅ SEQUENCING PATCH: ALL TESTS PASSED');
    process.exit(0);
} else {
    console.log('❌ SEQUENCING PATCH: FAILED - See issues above');
    process.exit(1);
}
