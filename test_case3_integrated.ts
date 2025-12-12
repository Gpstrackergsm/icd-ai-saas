import { runRulesEngine } from './lib/rulesEngineCore';

const text = "80-year-old male with HTN, CKD stage 5 on dialysis, and chronic systolic CHF, admitted for worsening shortness of breath due to acute on chronic HF.";

console.log('Testing Case 3 through integrated engine...\n');
console.log('Input:', text);
console.log('\n');

const result = runRulesEngine(text);

console.log('Generated Codes:');
result.sequence.forEach(c => {
    console.log(`  ${c.code} - ${c.label}`);
});

console.log('\nErrors:', result.errors.length > 0 ? result.errors : 'None');
console.log('Warnings:', result.warnings.length > 0 ? result.warnings.length : 'None');

// Check for expected codes
const codes = result.sequence.map(c => c.code);
const expected = ['I13.2', 'I50.23', 'N18.6'];
const missing = expected.filter(e => !codes.includes(e));

console.log('\n--- Validation ---');
if (missing.length === 0) {
    console.log('✅ SUCCESS: All expected codes present!');
    process.exit(0);
} else {
    console.log(`❌ FAIL: Missing codes: ${missing.join(', ')}`);
    process.exit(1);
}
