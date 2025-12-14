import { parseInput } from './lib/structured/parser';
import { runStructuredRules } from './lib/structured/engine';
import { sepsisCases } from './test_sepsis_40_cases';
import * as fs from 'fs';

interface TestResult {
    num: number;
    text: string;
    passed: boolean;
    actualPrimary: string;
    expectedPrimary: string;
    actualSecondary: string[];
    expectedSecondary: string[];
    errors: string[];
    rationale: string;
}

function codesMatch(actual: string[], expected: string[]): boolean {
    if (actual.length !== expected.length) return false;
    const sortedActual = [...actual].sort();
    const sortedExpected = [...expected].sort();
    return sortedActual.every((code, idx) => code === sortedExpected[idx]);
}

async function generateReport() {
    const results: TestResult[] = [];
    let passCount = 0;

    for (const testCase of sepsisCases) {
        const errors: string[] = [];
        let passed = false;
        let actualPrimary = 'NONE';
        let actualSecondary: string[] = [];

        try {
            const parseResult = parseInput(testCase.text);
            const output = runStructuredRules(parseResult.context);

            actualPrimary = output.primary ? output.primary.code : 'NONE';
            actualSecondary = output.secondary.map(c => c.code);

            const primaryMatch = actualPrimary === testCase.expectedPrimary;
            const secondaryMatch = codesMatch(actualSecondary, testCase.expectedSecondary);

            passed = primaryMatch && secondaryMatch;

            if (!primaryMatch) {
                errors.push(`Primary mismatch: got ${actualPrimary}, expected ${testCase.expectedPrimary}`);
            }
            if (!secondaryMatch) {
                errors.push(`Secondary mismatch: got [${actualSecondary.join(', ')}], expected [${testCase.expectedSecondary.join(', ')}]`);
            }

            if (passed) passCount++;

        } catch (error: any) {
            errors.push(`ERROR: ${error.message}`);
        }

        results.push({
            num: testCase.num,
            text: testCase.text,
            passed,
            actualPrimary,
            expectedPrimary: testCase.expectedPrimary,
            actualSecondary,
            expectedSecondary: testCase.expectedSecondary,
            errors,
            rationale: testCase.rationale
        });
    }

    // Generate Report output
    let report = `SEPSIS MODULE - COMPREHENSIVE TEST RESULTS
Generated: ${new Date().toISOString()}
Total Cases: 40
Pass Rate: ${passCount}/40 (${Math.round(passCount / 40 * 100)}%)
================================================================================

`;

    results.forEach(caseResult => {
        report += `CASE ${caseResult.num}: ${caseResult.passed ? '✅ PASS' : '❌ FAIL'}\n`;
        report += `Narrative: ${caseResult.text}\n`;
        report += `Rationale: ${caseResult.rationale}\n`;

        if (!caseResult.passed) {
            report += `errors:\n`;
            caseResult.errors.forEach(e => report += `  - ${e}\n`);
        }

        report += `Expected Primary:   ${caseResult.expectedPrimary}\n`;
        report += `Actual Primary:     ${caseResult.actualPrimary}\n`;
        report += `Expected Secondary: [${caseResult.expectedSecondary.join(', ')}]\n`;
        report += `Actual Secondary:   [${caseResult.actualSecondary.join(', ')}]\n`;
        report += `-`.repeat(80) + `\n\n`;
    });

    fs.writeFileSync('sepsis_test_results.txt', report);
    console.log('Report generated: sepsis_test_results.txt');
}

generateReport();
