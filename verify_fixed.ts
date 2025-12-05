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

const fileContent = fs.readFileSync('./test_fixed_cases.txt', 'utf-8');
const cases = parseCases(fileContent);

console.log('FIXED CASES VERIFICATION');
console.log('='.repeat(80));
console.log('');

for (const testCase of cases) {
    console.log(`CASE ${testCase.id}:`);
    console.log('-'.repeat(80));

    const inputLines = testCase.input.split('\n');
    inputLines.forEach(line => console.log(`  ${line}`));
    console.log('');

    try {
        const { context } = parseInput(testCase.input);
        const engineResult = runStructuredRules(context);
        const validated = validateCodeSet(engineResult.primary, engineResult.secondary, context);
        const enhanced = validateFinalOutput(validated.codes, testCase.input);
        const finalCodes = applyAdvancedCodingRules(enhanced.codes, testCase.input);

        if (finalCodes.length === 0) {
            console.log('  ❌ RESULT: NO CODES');
        } else {
            console.log('  ✅ RESULT:');
            finalCodes.forEach((code, idx) => {
                const status = idx === 0 ? '[PRIMARY]  ' : '[SECONDARY]';
                console.log(`     ${status} ${code.code} - ${code.label}`);
            });
        }

    } catch (error) {
        console.log('  ❌ ERROR:', (error as Error).message);
    }

    console.log('');
}

console.log('='.repeat(80));
