
import { parseInput } from './lib/structured/parser';
import { runStructuredRules } from './lib/structured/engine';
import { DIABETES_TEST_CASES } from './test_diabetes_40_cases';

console.log('='.repeat(80));
console.log('DETAILED DIABETES TEST RESULTS (GENERATED CODES)');
console.log('='.repeat(80));

DIABETES_TEST_CASES.forEach(testCase => {
    const { context } = parseInput(testCase.narrative);
    const result = runStructuredRules(context);

    const generatedPrimary = result.primary ? result.primary.code : null;
    const generatedSecondary = result.secondary.map(c => c.code);
    const allGenerated = [generatedPrimary, ...generatedSecondary].filter(c => c !== null) as string[];

    console.log(`\nCase ${testCase.id}:`);
    console.log(`  Input:    "${testCase.narrative}"`);
    console.log(`  Expected: [${testCase.expected.join(', ')}]`);
    console.log(`  Result:   [${allGenerated.join(', ')}]`);
});
console.log('\n' + '='.repeat(80));
