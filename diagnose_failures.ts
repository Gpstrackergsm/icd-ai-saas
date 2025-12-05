import { parseInput } from './lib/structured/parser';
import { runStructuredRules } from './lib/structured/engine';
import { validateCodeSet } from './lib/structured/validator-post';
import { validateFinalOutput } from './lib/structured/validator-enhanced';
import { applyAdvancedCodingRules } from './lib/structured/validator-advanced';
import * as fs from 'fs';

function parseCases(fileContent: string): Array<{ id: number, input: string }> {
    const cases: Array<{ id: number, input: string }> = [];
    const lines = fileContent.split('\n');
    let currentCase: { id: number, lines: string[] } | null = null;

    for (const line of lines) {
        if (line.trim().startsWith('CASE ')) {
            if (currentCase) {
                cases.push({ id: currentCase.id, input: currentCase.lines.join('\n') });
            }
            const caseNum = parseInt(line.replace('CASE ', '').trim());
            currentCase = { id: caseNum, lines: [] };
        } else if (currentCase && line.trim()) {
            currentCase.lines.push(line.trim());
        }
    }
    if (currentCase) {
        cases.push({ id: currentCase.id, input: currentCase.lines.join('\n') });
    }
    return cases;
}

const fileContent = fs.readFileSync('./test_failed_cases.txt', 'utf-8');
const cases = parseCases(fileContent);

console.log('DIAGNOSTIC REPORT - FAILED CASES ANALYSIS');
console.log('='.repeat(80));
console.log('');

for (const testCase of cases) {
    console.log(`CASE ${testCase.id}:`);
    console.log('-'.repeat(80));

    const inputLines = testCase.input.split('\n');
    inputLines.forEach(line => console.log(`  ${line}`));
    console.log('');

    try {
        const { context, errors } = parseInput(testCase.input);

        if (errors.length > 0) {
            console.log('  ⚠ PARSER ERRORS:', errors.join('; '));
        }

        const engineResult = runStructuredRules(context);
        console.log(`  ENGINE: ${engineResult.primary ? 'Primary code generated' : 'No primary'}, ${engineResult.secondary.length} secondary`);

        const validated = validateCodeSet(engineResult.primary, engineResult.secondary, context);
        console.log(`  VALIDATED: ${validated.codes.length} codes`);

        const enhanced = validateFinalOutput(validated.codes, testCase.input);
        console.log(`  ENHANCED: ${enhanced.codes.length} codes`);

        const finalCodes = applyAdvancedCodingRules(enhanced.codes, testCase.input);
        console.log(`  FINAL (Advanced): ${finalCodes.length} codes`);

        if (finalCodes.length === 0) {
            console.log('  ❌ RESULT: NO CODES GENERATED');
            console.log('  REASON: Insufficient clinical data to generate ICD codes');
        } else {
            console.log(`  ✅ RESULT: ${finalCodes.map(c => c.code).join(', ')}`);
        }

    } catch (error) {
        console.log('  ❌ ERROR:', (error as Error).message);
    }

    console.log('');
}

console.log('='.repeat(80));
