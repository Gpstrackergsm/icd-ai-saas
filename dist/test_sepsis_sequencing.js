"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const rulesEngine_js_1 = require("./lib/rulesEngine.js");
console.log('='.repeat(80));
console.log('TEST 1: Sepsis with Septic Shock (Urosepsis)');
console.log('Expected: A41.9 → R65.21 → N39.0');
console.log('='.repeat(80));
const test1 = (0, rulesEngine_js_1.runRulesEngine)('Patient presents with urosepsis and septic shock');
console.log('\nCodes:');
test1.sequence.forEach((code, i) => {
    console.log(`${i + 1}. ${code.code} - ${code.label}`);
});
console.log('\nWarnings:', test1.warnings);
console.log('\nAudit Trail:');
test1.audit.forEach(a => console.log(`  ${a}`));
console.log('\n' + '='.repeat(80));
console.log('TEST 2: Post-Procedural Sepsis with Respiratory Failure');
console.log('Expected: T81.44XA → J95.821 → A41.9 → J18.9');
console.log('='.repeat(80));
const test2 = (0, rulesEngine_js_1.runRulesEngine)('Severe acute respiratory failure due to pneumonia following an open percutaneous transluminal coronary angioplasty (PTCA) procedure performed 3 days ago');
console.log('\nCodes:');
test2.sequence.forEach((code, i) => {
    console.log(`${i + 1}. ${code.code} - ${code.label}`);
});
console.log('\nWarnings:', test2.warnings);
console.log('\nAudit Trail:');
test2.audit.forEach(a => console.log(`  ${a}`));
console.log('\n' + '='.repeat(80));
console.log('TEST 3: Sepsis without Shock');
console.log('Expected: A41.9 → N39.0 (no R65.21)');
console.log('='.repeat(80));
const test3 = (0, rulesEngine_js_1.runRulesEngine)('Patient has sepsis due to urinary tract infection');
console.log('\nCodes:');
test3.sequence.forEach((code, i) => {
    console.log(`${i + 1}. ${code.code} - ${code.label}`);
});
console.log('\nWarnings:', test3.warnings);
console.log('\nAudit Trail:');
test3.audit.forEach(a => console.log(`  ${a}`));
console.log('\n' + '='.repeat(80));
console.log('TEST 4: E. coli Sepsis with Shock');
console.log('Expected: A41.51 → R65.21 → N39.0');
console.log('='.repeat(80));
const test4 = (0, rulesEngine_js_1.runRulesEngine)('Patient presents with E. coli sepsis, septic shock, and UTI');
console.log('\nCodes:');
test4.sequence.forEach((code, i) => {
    console.log(`${i + 1}. ${code.code} - ${code.label}`);
});
console.log('\nWarnings:', test4.warnings);
console.log('\nAudit Trail:');
test4.audit.forEach(a => console.log(`  ${a}`));
console.log('\n' + '='.repeat(80));
console.log('VALIDATION SUMMARY');
console.log('='.repeat(80));
const tests = [
    { name: 'Urosepsis with shock', result: test1, expected: ['A41.9', 'R65.21', 'N39.0'] },
    { name: 'Post-procedural sepsis', result: test2, expected: ['T81.44XA', 'J95.821', 'A41.9', 'J18.9'] },
    { name: 'Sepsis without shock', result: test3, expected: ['A41.9', 'N39.0'] },
    { name: 'E. coli sepsis with shock', result: test4, expected: ['A41.51', 'R65.21', 'N39.0'] }
];
tests.forEach(test => {
    const actualCodes = test.result.sequence.map(c => c.code);
    const matches = test.expected.every((code, i) => actualCodes[i] === code);
    const status = matches ? '✅ PASS' : '❌ FAIL';
    console.log(`${status}: ${test.name}`);
    if (!matches) {
        console.log(`  Expected: ${test.expected.join(' → ')}`);
        console.log(`  Actual:   ${actualCodes.join(' → ')}`);
    }
});
