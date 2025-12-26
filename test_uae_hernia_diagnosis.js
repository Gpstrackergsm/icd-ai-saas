/**
 * Test: UAE Hernia Encoding - Symptom-based Diagnosis
 * Tests if the system can encode hernia from clinical presentation alone
 */

const uaeRules = require('./lib/uae-market-rules.js');

// Test Case: Strangulated Inguinal Hernia (Symptom-based)
const testNarrative = "Patient presented with irreducible right inguinal swelling, associated with severe tenderness and vomiting";

console.log('='.repeat(80));
console.log('UAE HERNIA ENCODING TEST');
console.log('='.repeat(80));
console.log('\nNarrative:', testNarrative);
console.log('\nMarket Profile: UAE');

const result = uaeRules.checkUAEOverride(testNarrative, 'UAE');

console.log('\n--- UAE Override Result ---');
console.log('Should Override:', result.shouldOverride);
console.log('Diagnoses:', JSON.stringify(result.diagnoses, null, 2));
console.log('Reasons:', result.reasons);
console.log('Metadata:', JSON.stringify(result.metadata, null, 2));
console.log('\n--- Debug Info ---');
console.log(JSON.stringify(result._debug, null, 2));
console.log('='.repeat(80));

// Expected: Should auto-code K40.30 (Strangulated inguinal hernia)
// Actual: Likely returns shouldOverride: false
