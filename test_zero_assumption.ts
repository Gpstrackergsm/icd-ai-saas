import { parseInput } from './lib/structured/parser';
import { validateContext } from './lib/structured/validator';
import { runStructuredRules } from './lib/structured/engine';

console.log('=== ZERO-ASSUMPTION ENGINE TEST SUITE ===\n');

// TEST 1: HARD STOP - CKD without stage
console.log('--- TEST 1: CKD without stage (SHOULD FAIL) ---');
const test1Input = `
Age: 65
Gender: Female
CKD Present: Yes
`;
const test1 = parseInput(test1Input);
const test1Validation = validateContext(test1.context);
console.log('Expected: HARD STOP error');
console.log('Result:', test1Validation.valid ? '❌ FAILED - No error' : '✅ PASSED');
console.log('Errors:', test1Validation.errors);
console.log('');

// TEST 2: HARD STOP - ESRD without dialysis
console.log('--- TEST 2: ESRD without dialysis status (SHOULD FAIL) ---');
const test2Input = `
Age: 65
Gender: Female
CKD Stage: ESRD
`;
const test2 = parseInput(test2Input);
const test2Validation = validateContext(test2.context);
console.log('Expected: HARD STOP error');
console.log('Result:', test2Validation.valid ? '❌ FAILED - No error' : '✅ PASSED');
console.log('Errors:', test2Validation.errors);
console.log('');

// TEST 3: HARD STOP - Foot ulcer without site/severity
console.log('--- TEST 3: Foot ulcer without site/severity (SHOULD FAIL) ---');
const test3Input = `
Age: 65
Gender: Female
Diabetes Type: Type 2
Complications: Foot Ulcer
`;
const test3 = parseInput(test3Input);
const test3Validation = validateContext(test3.context);
console.log('Expected: HARD STOP errors for missing site and severity');
console.log('Result:', test3Validation.valid ? '❌ FAILED - No error' : '✅ PASSED');
console.log('Errors:', test3Validation.errors);
console.log('');

// TEST 4: DIALYSIS LOGIC - Temporary dialysis should NOT generate Z99.2
console.log('--- TEST 4: Temporary dialysis (NO Z99.2) ---');
const test4Input = `
Age: 65
Gender: Female
CKD Stage: ESRD
Dialysis: Temporary
`;
const test4 = parseInput(test4Input);
const test4Validation = validateContext(test4.context);
const test4Result = runStructuredRules(test4.context);
const hasZ992 = test4Result.secondary.some(c => c.code === 'Z99.2');
console.log('Expected: NO Z99.2 code');
console.log('Result:', hasZ992 ? '❌ FAILED - Z99.2 generated' : '✅ PASSED');
console.log('Codes:', test4Result.secondary.map(c => c.code).join(', '));
console.log('');

// TEST 5: DIALYSIS LOGIC - Chronic dialysis SHOULD generate Z99.2
console.log('--- TEST 5: Chronic dialysis (SHOULD have Z99.2) ---');
const test5Input = `
Age: 65
Gender: Female
CKD Stage: ESRD
Dialysis: Chronic
`;
const test5 = parseInput(test5Input);
const test5Validation = validateContext(test5.context);
const test5Result = runStructuredRules(test5.context);
const hasZ992_test5 = test5Result.secondary.some(c => c.code === 'Z99.2');
console.log('Expected: Z99.2 code present');
console.log('Result:', hasZ992_test5 ? '✅ PASSED' : '❌ FAILED - Z99.2 not generated');
console.log('Codes:', test5Result.secondary.map(c => c.code).join(', '));
console.log('');

// TEST 6: MULTIPLE COMPLICATIONS - Both E11.621 and E11.22
console.log('--- TEST 6: Multiple diabetes complications ---');
const test6Input = `
Age: 65
Gender: Female
Diabetes Type: Type 2
Complications: Foot Ulcer, Nephropathy/CKD
Ulcer Site: Right Foot
Ulcer Depth: Muscle exposed
CKD Stage: 4
`;
const test6 = parseInput(test6Input);
const test6Validation = validateContext(test6.context);
const test6Result = runStructuredRules(test6.context);
const hasE11621 = test6Result.primary?.code === 'E11.621' || test6Result.secondary.some(c => c.code === 'E11.621');
const hasE1122 = test6Result.secondary.some(c => c.code === 'E11.22');
console.log('Expected: E11.621 (foot ulcer) AND E11.22 (CKD)');
console.log('Result:', (hasE11621 && hasE1122) ? '✅ PASSED' : '❌ FAILED');
console.log('Primary:', test6Result.primary?.code);
console.log('Secondary:', test6Result.secondary.map(c => c.code).join(', '));
console.log('');

// TEST 7: SPECIFIC BEATS UNSPECIFIED - L97.513 not L97.9
console.log('--- TEST 7: Specific ulcer code (not unspecified) ---');
const test7Input = `
Age: 65
Gender: Female
Diabetes Type: Type 2
Complications: Foot Ulcer
Ulcer Site: Right Foot
Ulcer Depth: Muscle exposed
`;
const test7 = parseInput(test7Input);
const test7Validation = validateContext(test7.context);
const test7Result = runStructuredRules(test7.context);
const hasL97513 = test7Result.secondary.some(c => c.code === 'L97.513');
const hasL979 = test7Result.secondary.some(c => c.code === 'L97.9');
console.log('Expected: L97.513 (specific), NOT L97.9 (unspecified)');
console.log('Result:', (hasL97513 && !hasL979) ? '✅ PASSED' : '❌ FAILED');
console.log('Ulcer codes:', test7Result.secondary.filter(c => c.code.startsWith('L97')).map(c => c.code).join(', '));
console.log('');

console.log('=== TEST SUITE COMPLETE ===');
