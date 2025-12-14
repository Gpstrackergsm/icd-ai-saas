import { parseInput } from './lib/structured/parser';
import { runStructuredRules } from './lib/structured/engine';
import { DIABETES_TEST_CASES } from './test_diabetes_40_cases';

console.log('='.repeat(80));
console.log('DIABETES & ENDOCRINE MODULE - 40 CASE COMPREHENSIVE TEST');
console.log('='.repeat(80));

let passed = 0;
let failed = 0;
const failures: any[] = [];

DIABETES_TEST_CASES.forEach(testCase => {
    const { context } = parseInput(testCase.narrative);
    const result = runStructuredRules(context);

    const generatedPrimary = result.primary ? result.primary.code : null;
    const generatedSecondary = result.secondary.map(c => c.code);
    const allGenerated = [generatedPrimary, ...generatedSecondary].filter(c => c !== null) as string[];

    // Strict matching: Check if ALL expected codes are present
    const missing = testCase.expected.filter(e => !allGenerated.includes(e));
    // Optional: We can check for extras but mostly we care about missing required codes first.
    // For strict 100% match we should also check extras or at least primary alignment.

    // Let's enforce that ALL expected codes must be present.
    const isPass = missing.length === 0;

    if (isPass) {
        console.log(`✅ Case ${testCase.id}: PASS`);
        passed++;
    } else {
        console.log(`❌ Case ${testCase.id}: FAIL`);
        failures.push({
            id: testCase.id,
            narrative: testCase.narrative,
            expected: testCase.expected,
            generated: allGenerated,
            missing
        });
        failed++;
    }
});

console.log('='.repeat(80));
console.log(`Total: ${DIABETES_TEST_CASES.length}`);
console.log(`Passed: ${passed} (${(passed / DIABETES_TEST_CASES.length * 100).toFixed(1)}%)`);
console.log(`Failed: ${failed}`);
console.log('='.repeat(80));

if (failures.length > 0) {
    console.log('\nFAILURE DETAILS:\n');
    failures.forEach(f => {
        console.log(`Case ${f.id}:`);
        console.log(`  Input: "${f.narrative}"`);
        console.log(`  Expected: [${f.expected.join(', ')}]`);
        console.log(`  Got:      [${f.generated.join(', ')}]`);
        console.log(`  Missing:  ${f.missing.join(', ')}`);
        console.log('');
    });
    process.exit(1);
} else {
    console.log('\n🎉 ALL DIABETES TESTS PASSED!');
    process.exit(0);
}
