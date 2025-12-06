import * as fs from 'fs';
import { parseInput } from './lib/structured/parser';
import { runStructuredRules } from './lib/structured/engine';

interface TestCase {
    id: number;
    input: string;
}

function parseCasesFile(filePath: string): TestCase[] {
    const content = fs.readFileSync(filePath, 'utf-8');
    const cases: TestCase[] = [];

    const caseBlocks = content.split(/^CASE \d+$/m).filter(block => block.trim());

    caseBlocks.forEach((block, index) => {
        const trimmed = block.trim();
        if (trimmed) {
            cases.push({
                id: index + 1,
                input: trimmed
            });
        }
    });

    return cases;
}

function processTestCase(testCase: TestCase): { success: boolean; codes: string[]; error?: string } {
    try {
        const { context } = parseInput(testCase.input);
        const result = runStructuredRules(context);

        const allCodes: string[] = [];
        if (result.primary) {
            allCodes.push(result.primary.code);
        }
        allCodes.push(...result.secondary.map(c => c.code));

        return {
            success: allCodes.length > 0,
            codes: allCodes
        };
    } catch (error) {
        return {
            success: false,
            codes: [],
            error: error instanceof Error ? error.message : String(error)
        };
    }
}

async function main() {
    console.log('================================================================================');
    console.log('ICD-10-CM 200 CASES TEST');
    console.log('================================================================================\n');

    const filePath = '/Users/khalidaitelmaati/Desktop/structured_200_cases_v2.txt';

    console.log(`Loading test cases from: ${filePath}`);
    const cases = parseCasesFile(filePath);
    console.log(`Loaded ${cases.length} test cases\n`);

    let successCount = 0;
    let failureCount = 0;
    let emptyCount = 0;
    const failures: { id: number; error?: string; codes: string[] }[] = [];

    console.log('Processing cases...\n');

    for (const testCase of cases) {
        const result = processTestCase(testCase);

        if (result.error) {
            failureCount++;
            failures.push({ id: testCase.id, error: result.error, codes: [] });
            process.stdout.write('E');
        } else if (result.codes.length === 0) {
            emptyCount++;
            failures.push({ id: testCase.id, codes: [] });
            process.stdout.write('0');
        } else {
            successCount++;
            process.stdout.write('✓');
        }

        if (testCase.id % 50 === 0) {
            process.stdout.write(`  [${testCase.id}/${cases.length}]\n`);
        }
    }

    console.log('\n');
    console.log('================================================================================');
    console.log('RESULTS');
    console.log('================================================================================');
    console.log(`Total Cases:           ${cases.length}`);
    console.log(`Successful (with codes): ${successCount} (${(successCount / cases.length * 100).toFixed(1)}%)`);
    console.log(`Empty (no codes):      ${emptyCount} (${(emptyCount / cases.length * 100).toFixed(1)}%)`);
    console.log(`Errors:                ${failureCount} (${(failureCount / cases.length * 100).toFixed(1)}%)`);
    console.log('================================================================================\n');

    if (failures.length > 0 && failures.length <= 20) {
        console.log('Failed Cases:');
        failures.forEach(f => {
            console.log(`  CASE ${f.id}: ${f.error || 'No codes generated'}`);
        });
        console.log('');
    }

    // Sample successful cases
    console.log('Sample Results (first 5 cases):');
    for (let i = 0; i < Math.min(5, cases.length); i++) {
        const result = processTestCase(cases[i]);
        console.log(`\nCASE ${cases[i].id}:`);
        console.log(`  Codes: ${result.codes.join(', ') || 'NONE'}`);
        if (result.error) {
            console.log(`  Error: ${result.error}`);
        }
    }
}

main().catch(console.error);
