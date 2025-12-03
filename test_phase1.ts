import { parseInput } from './lib/structured/parser';
import { validateContext } from './lib/structured/validator';
import { runStructuredRules } from './lib/structured/engine';

console.log('=== PHASE 1 TEST SUITE: INFECTIONS, WOUNDS, INJURIES ===\n');

// ========== TEST 1: SEPTIC SHOCK ==========
console.log('--- TEST 1: Septic Shock with E. coli ---');
const test1Input = `
Age: 65
Gender: Female
Infection Site: Blood
Organism: E. coli
Sepsis: Yes
Septic Shock: Yes
`;
const test1 = parseInput(test1Input);
const test1Validation = validateContext(test1.context);
const test1Result = runStructuredRules(test1.context);

console.log('Validation:', test1Validation.valid ? '✅ PASSED' : '❌ FAILED');
if (!test1Validation.valid) console.log('Errors:', test1Validation.errors);

console.log('\nExpected Codes:');
console.log('  - R65.21 (Septic shock)');
console.log('  - A41.51 (Sepsis due to E. coli)');
console.log('  - B96.20 (E. coli organism code)');

console.log('\nActual Codes:');
if (test1Result.primary) console.log(`  PRIMARY: ${test1Result.primary.code} - ${test1Result.primary.label}`);
test1Result.secondary.forEach(c => console.log(`  SECONDARY: ${c.code} - ${c.label}`));

const hasR6521 = test1Result.primary?.code === 'R65.21' || test1Result.secondary.some(c => c.code === 'R65.21');
const hasA4151 = test1Result.secondary.some(c => c.code === 'A41.51');
const hasB9620 = test1Result.secondary.some(c => c.code === 'B96.20');
console.log('\nResult:', (hasR6521 && hasA4151 && hasB9620) ? '✅ PASSED' : '❌ FAILED');
console.log('');

// ========== TEST 2: PRESSURE ULCER ==========
console.log('--- TEST 2: Pressure Ulcer Sacral Stage 3 ---');
const test2Input = `
Age: 78
Gender: Male
Ulcer Present: Yes
Ulcer Type: Pressure
Ulcer Location: Sacral
Ulcer Stage: Stage 3
`;
const test2 = parseInput(test2Input);
const test2Validation = validateContext(test2.context);
const test2Result = runStructuredRules(test2.context);

console.log('Validation:', test2Validation.valid ? '✅ PASSED' : '❌ FAILED');
if (!test2Validation.valid) console.log('Errors:', test2Validation.errors);

console.log('\nExpected Codes:');
console.log('  - L89.153 (Pressure ulcer of sacral region, stage 3)');

console.log('\nActual Codes:');
if (test2Result.primary) console.log(`  PRIMARY: ${test2Result.primary.code} - ${test2Result.primary.label}`);
test2Result.secondary.forEach(c => console.log(`  SECONDARY: ${c.code} - ${c.label}`));

const hasL89153 = test2Result.primary?.code === 'L89.153' || test2Result.secondary.some(c => c.code === 'L89.153');
console.log('\nResult:', hasL89153 ? '✅ PASSED' : '❌ FAILED');
console.log('');

// ========== TEST 3: FRACTURE WITH EXTERNAL CAUSE ==========
console.log('--- TEST 3: Right Femur Fracture from Fall ---');
const test3Input = `
Age: 45
Gender: Female
Injury Present: Yes
Injury Type: Fracture
Body Region: Right femur
Laterality: Right
Injury Encounter Type: Initial
External Cause: Fall
`;
const test3 = parseInput(test3Input);
const test3Validation = validateContext(test3.context);
const test3Result = runStructuredRules(test3.context);

console.log('Validation:', test3Validation.valid ? '✅ PASSED' : '❌ FAILED');
if (!test3Validation.valid) console.log('Errors:', test3Validation.errors);

console.log('\nExpected Codes:');
console.log('  - S72.301A (Fracture of right femur, initial encounter)');
console.log('  - W19.XXXA (Fall, initial encounter)');

console.log('\nActual Codes:');
if (test3Result.primary) console.log(`  PRIMARY: ${test3Result.primary.code} - ${test3Result.primary.label}`);
test3Result.secondary.forEach(c => console.log(`  SECONDARY: ${c.code} - ${c.label}`));

const hasS72301A = test3Result.primary?.code === 'S72.301A' || test3Result.secondary.some(c => c.code === 'S72.301A');
const hasW19XXXA = test3Result.secondary.some(c => c.code === 'W19.XXXA');
console.log('\nResult:', (hasS72301A && hasW19XXXA) ? '✅ PASSED' : '❌ FAILED');
console.log('');

// ========== TEST 4: VALIDATION - SEPSIS WITHOUT SITE ==========
console.log('--- TEST 4: HARD STOP - Sepsis without infection site ---');
const test4Input = `
Age: 60
Gender: Male
Sepsis: Yes
`;
const test4 = parseInput(test4Input);
const test4Validation = validateContext(test4.context);

console.log('Expected: HARD STOP error');
console.log('Result:', !test4Validation.valid ? '✅ PASSED' : '❌ FAILED');
console.log('Errors:', test4Validation.errors);
console.log('');

// ========== TEST 5: VALIDATION - INJURY WITHOUT ENCOUNTER TYPE ==========
console.log('--- TEST 5: HARD STOP - Injury without encounter type ---');
const test5Input = `
Age: 35
Gender: Female
Injury Present: Yes
Injury Type: Fracture
Body Region: Left tibia
`;
const test5 = parseInput(test5Input);
const test5Validation = validateContext(test5.context);

console.log('Expected: HARD STOP error');
console.log('Result:', !test5Validation.valid ? '✅ PASSED' : '❌ FAILED');
console.log('Errors:', test5Validation.errors);
console.log('');

// ========== SUMMARY ==========
console.log('=== TEST SUMMARY ===');
const allPassed = hasR6521 && hasA4151 && hasB9620 && hasL89153 && hasS72301A && hasW19XXXA && !test4Validation.valid && !test5Validation.valid;
console.log(allPassed ? '✅ ALL TESTS PASSED!' : '❌ SOME TESTS FAILED');
