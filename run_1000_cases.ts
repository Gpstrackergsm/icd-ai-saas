
import { parseInput } from './lib/structured/parser';
import { runStructuredRules } from './lib/structured/engine';
import * as fs from 'fs';

interface TestCase {
    id: number;
    module: string;
    clinical_text: string;
    expected_codes: string[];
}

const rawData = fs.readFileSync('./icd_1000_cases.json', 'utf-8');
const cases: TestCase[] = JSON.parse(rawData);

let passed = 0;
let failed = 0;
const failures: string[] = [];

console.log(`Starting regression run for ${cases.length} cases...`);
const startTime = Date.now();

cases.forEach((c, index) => {
    // Progress check every 100 cases
    if ((index + 1) % 100 === 0) {
        process.stdout.write(`Processed ${index + 1}/${cases.length} cases...\r`);
    }

    try {
        const { context } = parseInput(c.clinical_text);
        const result = runStructuredRules(context);

        const generatedCodes = [result.primary, ...result.secondary]
            .filter((x): x is NonNullable<typeof x> => !!x)
            .map(x => x!.code);

        // Sort and compare
        const expectedSorted = [...c.expected_codes].sort().join(',');
        const generatedSorted = [...generatedCodes].sort().join(',');

        if (expectedSorted === generatedSorted) {
            passed++;
        } else {
            failed++;
            failures.push(
                `CASE ${c.id} [${c.module}] FAIL\n` +
                `Input: "${c.clinical_text}"\n` +
                `Expected: ${expectedSorted}\n` +
                `Got:      ${generatedSorted}\n` +
                `--------------------------------------------------`
            );
        }
    } catch (e) {
        failed++;
        failures.push(`CASE ${c.id} EXCEPTION: ${e instanceof Error ? e.message : String(e)}`);
    }
});

const duration = ((Date.now() - startTime) / 1000).toFixed(2);

console.log('\n\n=== REGRESSION SUMMARY ===');
console.log(`Total Cases: ${cases.length}`);
console.log(`Passed:      ${passed}`);
console.log(`Failed:      ${failed}`);
console.log(`Accuracy:    ${((passed / cases.length) * 100).toFixed(2)}%`);
console.log(`Time:        ${duration}s`);
console.log('==========================\n');

if (failed > 0) {
    console.log('=== FAILURE LOG ===');
    console.log(failures.join('\n'));
} else {
    console.log('ALL CASES PASSED! 🚀');
}
