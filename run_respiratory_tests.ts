import { parseInput } from './lib/structured/parser';
import { runStructuredRules } from './lib/structured/engine';
import { respiratoryCases } from './test_respiratory_40_cases';

interface TestResult {
    num: number;
    passed: boolean;
    actualPrimary: string;
    expectedPrimary: string;
    actualSecondary: string[];
    expectedSecondary: string[];
    errors: string[];
}

function codesMatch(actual: string[], expected: string[]): boolean {
    if (actual.length !== expected.length) return false;
    // STRICT ORDER MATCHING - No sorting
    // But for initial baseline, let's start with loose matching?
    // No, let's keep it strict to identify issues early, but we can relax if needed.
    // Actually, for respiratory, order matters (e.g. Failure vs COPD).
    // Let's use strict ordering from the start.
    return actual.every((code, idx) => code === expected[idx]);
}

async function runRespiratoryTests() {
    const results: TestResult[] = [];
    let passCount = 0;

    console.log('\n╔════════════════════════════════════════════════════════════════╗');
    console.log('║      RESPIRATORY MODULE - RUNNING 40 TEST CASES             ║');
    console.log('╚════════════════════════════════════════════════════════════════╝\n');

    // Filter for specific test cases if needed (debugging)
    const casesToRun = respiratoryCases; // Run all cases

    for (const testCase of casesToRun) {
        const errors: string[] = [];

        try {
            // Parse the input
            const parseResult = parseInput(testCase.text);

            // Run engine
            const output = runStructuredRules(parseResult.context);

            // Extract primary and secondary
            const actualPrimary = output.primary ? output.primary.code : 'NONE';
            const actualSecondary = output.secondary.map(c => c.code);

            // Check if matches
            const primaryMatch = actualPrimary === testCase.expectedPrimary;
            const secondaryMatch = codesMatch(actualSecondary, testCase.expectedSecondary);

            const passed = primaryMatch && secondaryMatch;

            if (!primaryMatch) {
                errors.push(`Primary mismatch: got ${actualPrimary}, expected ${testCase.expectedPrimary}`);
            }
            if (!secondaryMatch) {
                errors.push(`Secondary mismatch: got [${actualSecondary.join(', ')}], expected [${testCase.expectedSecondary.join(', ')}]`);
            }

            results.push({
                num: testCase.num,
                passed,
                actualPrimary,
                expectedPrimary: testCase.expectedPrimary,
                actualSecondary,
                expectedSecondary: testCase.expectedSecondary,
                errors
            });

            console.log(`\n────────────────────────────────────────────────────────────────────────────────`);
            if (passed) {
                passCount++;
                console.log(`✅ Case ${testCase.num}: PASS`);
            } else {
                console.log(`❌ Case ${testCase.num}: FAIL`);
            }
            console.log(`   📝 Input: "${testCase.text}"`);
            console.log(`   🎯 Expected Primary:   ${testCase.expectedPrimary}`);
            console.log(`   🤖 Actual Primary:     ${actualPrimary}`);
            console.log(`   🎯 Expected Secondary: [${testCase.expectedSecondary.join(', ')}]`);
            console.log(`   🤖 Actual Secondary:   [${actualSecondary.join(', ')}]`);

            if (!passed) {
                errors.forEach(err => console.log(`   ⚠️  ERROR: ${err}`));
            }

        } catch (error: any) {
            console.log(`❌ Case ${testCase.num}: ERROR - ${error.message}`);
            results.push({
                num: testCase.num,
                passed: false,
                actualPrimary: 'ERROR',
                expectedPrimary: testCase.expectedPrimary,
                actualSecondary: [],
                expectedSecondary: testCase.expectedSecondary,
                errors: [error.message]
            });
        }
    }

    // Summary
    console.log('\n' + '━'.repeat(80));
    console.log(`FINAL SCORE: ${passCount}/40 (${Math.round(passCount / 40 * 100)}%)`);
    console.log('━'.repeat(80));

    return { passCount, total: 40, results };
}

runRespiratoryTests().then(() => process.exit(0));
