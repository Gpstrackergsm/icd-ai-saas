import { traumaCases } from './test_trauma_50_cases';
import { parseInput } from './lib/structured/parser';
import { runStructuredRules } from './lib/structured/engine';

async function runTests() {
    console.log('╔════════════════════════════════════════════════════════════════════════════════╗');
    console.log('║                  TRAUMA MODULE - 50 REGRESSION CASES                          ║');
    console.log('╚════════════════════════════════════════════════════════════════════════════════╝\n');

    let passed = 0;
    let failed = 0;

    for (const testCase of traumaCases) {
        try {
            const { context } = parseInput(testCase.text);
            const result = runStructuredRules(context);

            const actualPrimary = result.primary?.code || 'NONE';
            const actualSecondary = result.secondary.map(c => c.code).sort();
            const expectedSecondary = testCase.expectedSecondary.sort();

            const primaryMatch = actualPrimary === testCase.expectedPrimary;

            if (primaryMatch) {
                const codes = [actualPrimary, ...actualSecondary].join(', ');
                console.log(`Case ${testCase.num} (${testCase.text}), Output: ${codes}`);
                passed++;
            } else {
                console.log(`\n--------------------------------------------------------------------------------`);
                console.log(`CASE ${testCase.num}: ${testCase.text}`);
                console.log(`❌ FAIL: Expected ${testCase.expectedPrimary}, Got ${actualPrimary}`);
                console.log(`   Rationale: ${testCase.rationale || 'None'}`);
                failed++;
            }
        } catch (e) {
            console.log(`\nCASE ${testCase.num}: ${testCase.text}`);
            console.log(`❌ CRITICAL ERROR: ${e}`);
            failed++;
        }
    }

    console.log('\n================================================================================');
    console.log(`FINAL RESULTS: ${passed}/${traumaCases.length} PASSED (${Math.round(passed / traumaCases.length * 100)}%)`);
    console.log('================================================================================');
}

runTests();
