import { runStructuredRules } from './lib/structured/engine';
import { parseInput } from './lib/structured/parser';
import { respiratoryCases } from './test_respiratory_40_cases';

let passed = 0;
let failed = 0;

console.log('=== RESPIRATORY CORRECTOR TEST SUITE ===\n');

respiratoryCases.forEach((testCase) => {
    const { context } = parseInput(testCase.text);
    const result = runStructuredRules(context);

    const actualPrimary = result.primary?.code || 'NONE';
    const actualSecondary = result.secondary.map(c => c.code);

    const primaryMatch = actualPrimary === testCase.expectedPrimary;
    const secondaryMatch = JSON.stringify(actualSecondary.sort()) === JSON.stringify(testCase.expectedSecondary.sort());

    const pass = primaryMatch && secondaryMatch;

    if (pass) {
        passed++;
        console.log(`✅ Case ${testCase.num}: PASS`);
    } else {
        failed++;
        console.log(`❌ Case ${testCase.num}: FAIL`);
        console.log(`   Expected: ${testCase.expectedPrimary} | [${testCase.expectedSecondary.join(', ')}]`);
        console.log(`   Actual:   ${actualPrimary} | [${actualSecondary.join(', ')}]`);
        console.log(`   Rationale: ${testCase.rationale}`);
        console.log('');
    }
});

console.log(`\n=== RESULTS ===`);
console.log(`Total: ${respiratoryCases.length}`);
console.log(`Passed: ${passed} (${Math.round(passed / respiratoryCases.length * 100)}%)`);
console.log(`Failed: ${failed} (${Math.round(failed / respiratoryCases.length * 100)}%)`);
