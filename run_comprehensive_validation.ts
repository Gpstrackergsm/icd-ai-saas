
import * as fs from 'fs';
import { parseInput } from './lib/structured/parser';
import { runStructuredRules } from './lib/structured/engine';

interface TestCase {
    id: number;
    module: string;
    text: string;
    expectedCodes: string[];
}

interface ValidationResult {
    id: number;
    text: string;
    module: string;
    expected: string[];
    generated: string[];
    isCorrect: boolean;
    missing: string[]; // Codes in expected but not generated
    extra: string[];   // Codes in generated but not expected
}

async function runValidation() {
    const data = JSON.parse(fs.readFileSync('generated_dataset.json', 'utf-8'));
    const results: ValidationResult[] = [];

    let correctCount = 0;
    const errorsByModule: Record<string, number> = {};
    const totalByModule: Record<string, number> = {};

    console.log(`Running validation on ${data.length} cases...`);

    for (const testCase of data) {
        // Initialize module stats
        if (!totalByModule[testCase.module]) totalByModule[testCase.module] = 0;
        if (!errorsByModule[testCase.module]) errorsByModule[testCase.module] = 0;

        totalByModule[testCase.module]++;

        let generatedCodes: string[] = [];
        try {
            const { context } = parseInput(testCase.text);
            const engineResult = runStructuredRules(context);
            generatedCodes = [engineResult.primary, ...engineResult.secondary]
                .filter((x): x is NonNullable<typeof x> => !!x)
                .map(x => x!.code);
        } catch (e) {
            console.error(`Error processing case ${testCase.id}:`, e);
            generatedCodes = ["ERROR"];
        }

        // Comparison Logic
        // We use Set comparison. Order usually matters for primary, but let's check basic set containment first
        // If user wants STRICT verification: checking Primary match + Set match for others

        // Let's assume STRICT equality of Sets for correctness for now, ignoring order beyond Primary?
        // Actually, expected codes in generator don't strictly define Primary vs Secondary order in comma list.
        // So Set Equality is fair for this batch.

        const expectedSet = new Set(testCase.expectedCodes);
        const generatedSet = new Set(generatedCodes);

        // Remove known auto-generated codes that might not be in "expected" but are valid side-effects?
        // E.g. J96.00 often comes with J18.9 if implied? 
        // For this strict benchmark, we expect exact match.

        const missing = testCase.expectedCodes.filter(c => !generatedSet.has(c));
        const extra = generatedCodes.filter(c => !expectedSet.has(c));

        const isCorrect = missing.length === 0 && extra.length === 0;

        if (isCorrect) correctCount++;
        else errorsByModule[testCase.module]++;

        results.push({
            id: testCase.id,
            text: testCase.text,
            module: testCase.module,
            expected: testCase.expectedCodes,
            generated: generatedCodes,
            isCorrect,
            missing,
            extra
        });
    }

    // Generate Report
    const reportLines: string[] = [];
    reportLines.push(`COMPREHENSIVE BENCHMARK REPORT`);
    reportLines.push(`=============================`);
    reportLines.push(`Total Cases: ${data.length}`);
    reportLines.push(`Correct: ${correctCount}`);
    reportLines.push(`Accuracy: ${((correctCount / data.length) * 100).toFixed(1)}%`);
    reportLines.push(``);
    reportLines.push(`ACCURACY BY MODULE`);
    reportLines.push(`------------------`);
    for (const mod of Object.keys(totalByModule)) {
        const total = totalByModule[mod];
        const errors = errorsByModule[mod] || 0;
        const acc = ((total - errors) / total) * 100;
        reportLines.push(`${mod}: ${acc.toFixed(1)}% (${total - errors}/${total})`);
    }

    reportLines.push(``);
    reportLines.push(`FAILED CASES (First 50)`);
    reportLines.push(`-----------------------`);

    let failedShown = 0;
    for (const res of results) {
        if (!res.isCorrect && failedShown < 50) {
            reportLines.push(`CASE ${res.id} (${res.module}): ${res.text}`);
            reportLines.push(`  Expected: ${res.expected.join(', ')}`);
            reportLines.push(`  Got:      ${res.generated.join(', ')}`);
            if (res.missing.length) reportLines.push(`  MISSING:  ${res.missing.join(', ')}`);
            if (res.extra.length) reportLines.push(`  EXTRA:    ${res.extra.join(', ')}`);
            reportLines.push(``);
            failedShown++;
        }
    }

    fs.writeFileSync('COMPREHENSIVE_REPORT.txt', reportLines.join('\n'));
    // Also save simple CSV of all results
    const csvContent = results.map(r => `CASE ${r.id}|${r.isCorrect ? 'PASS' : 'FAIL'}|${r.generated.join(',')}`).join('\n');
    fs.writeFileSync('COMPREHENSIVE_RESULTS.csv', csvContent);

    console.log('Validation complete. Report saved to COMPREHENSIVE_REPORT.txt');
}

runValidation();
