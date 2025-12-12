import { parseCardiology, resolveCardiologyCodes } from './lib/domains/cardiology/module';

const text = "80-year-old male with long-standing hypertension, ESRD on chronic hemodialysis, and chronic systolic CHF admitted for worsening shortness of breath due to acute on chronic heart failure.";

console.log('='.repeat(70));
console.log('TEST CASE: ESRD with Hemodialysis Variant');
console.log('='.repeat(70));
console.log('\nInput:', text);

const attrs = parseCardiology(text);

console.log('\nParsed Attributes:');
console.log('  hypertension:', attrs.hypertension);
console.log('  heart_failure:', attrs.heart_failure);
console.log('  hf_type:', attrs.hf_type);
console.log('  hf_acuity:', attrs.hf_acuity);
console.log('  ckd_stage:', attrs.ckd_stage);

const codes = resolveCardiologyCodes(attrs);

console.log('\n' + '='.repeat(70));
console.log('GENERATED CODES (in sequence):');
console.log('='.repeat(70));

if (codes.length === 0) {
    console.log('❌ NO CODES GENERATED!');
    process.exit(1);
}

codes.forEach((c, i) => {
    const position = i === 0 ? 'PRIMARY  ' : 'SECONDARY';
    console.log(`${i + 1}. [${position}] ${c.code} - ${c.label}`);
});

console.log('\n' + '='.repeat(70));
console.log('VALIDATION:');
console.log('='.repeat(70));

const codelist = codes.map(c => c.code);

const checks = {
    'I13.2 is PRIMARY': codes[0]?.code === 'I13.2',
    'I50.23 present': codelist.includes('I50.23'),
    'N18.6 present': codelist.includes('N18.6'),
    'N18.5 absent (ESRD suppression)': !codelist.includes('N18.5'),
    'Hemodialysis code (Z99.2) might be present': codelist.includes('Z99.2') || true // Optional
};

Object.entries(checks).forEach(([check, pass]) => {
    console.log(`${pass ? '✅' : '❌'} ${check}`);
});

const allCriticalPass = checks['I13.2 is PRIMARY'] &&
    checks['I50.23 present'] &&
    checks['N18.6 present'] &&
    checks['N18.5 absent (ESRD suppression)'];

console.log('\n' + '='.repeat(70));
if (allCriticalPass) {
    console.log('✅ TEST PASSED - All critical checks passed');
    console.log('\nExpected live result:');
    console.log('  PRIMARY:   I13.2');
    console.log('  SECONDARY: I50.23, N18.6');
    process.exit(0);
} else {
    console.log('❌ TEST FAILED - See issues above');
    process.exit(1);
}
