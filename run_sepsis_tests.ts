import { parseInput } from './lib/structured/parser';
import { runStructuredRules } from './lib/structured/engine';
import { sepsisCases } from './test_sepsis_40_cases';

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
    return actual.every((code, idx) => code === expected[idx]);
}

async function runSepsisTests() {
    const results: TestResult[] = [];
    let passCount = 0;

    console.log('\n╔════════════════════════════════════════════════════════════════╗');
    console.log('║         SEPSIS MODULE - RUNNING 40 TEST CASES               ║');
    console.log('╚════════════════════════════════════════════════════════════════╝\n');

    for (const testCase of sepsisCases) {
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

            if (passed) {
                passCount++;
                console.log(`✅ Case ${testCase.num}: PASS`);
            } else {
                console.log(`❌ Case ${testCase.num}: FAIL`);
                errors.forEach(err => console.log(`   ${err}`));
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

    // Group failures by type
    const failures = results.filter(r => !r.passed);
    if (failures.length > 0) {
        console.log('\n📋 FAILURE BREAKDOWN:\n');

        const primaryFails = failures.filter(f => f.actualPrimary !== f.expectedPrimary);
        console.log(`Primary Sequencing Issues: ${primaryFails.length} cases`);
        primaryFails.forEach(f => {
            console.log(`  Case ${f.num}: ${f.actualPrimary} → ${f.expectedPrimary}`);
        });

        const secondaryFails = failures.filter(f => !codesMatch(f.actualSecondary, f.expectedSecondary));
        console.log(`\nSecondary Code Issues: ${secondaryFails.length} cases`);
        secondaryFails.forEach(f => {
            console.log(`  Case ${f.num}: [${f.actualSecondary.join(', ')}] → [${f.expectedSecondary.join(', ')}]`);
        });
    }

    return { passCount, total: 40, results };
}

runSepsisTests().then(() => process.exit(0));
