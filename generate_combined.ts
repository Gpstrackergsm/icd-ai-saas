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

const fileContent = fs.readFileSync('./data/structured_1000_cases_v3.txt', 'utf-8');
const cases = parseCases(fileContent);

let output = '';

for (const testCase of cases) {
    output += `CASE ${testCase.id}:\n`;

    // Add case data
    const inputLines = testCase.input.split('\n');
    inputLines.forEach(line => {
        output += `  ${line}\n`;
    });

    output += '\n';

    // Add ICD codes
    try {
        const { context } = parseInput(testCase.input);
        const engineResult = runStructuredRules(context);
        const validated = validateCodeSet(engineResult.primary, engineResult.secondary, context);
        const enhanced = validateFinalOutput(validated.codes, testCase.input);
        const finalCodes = applyAdvancedCodingRules(enhanced.codes, testCase.input);

        output += 'ICD_CODES:\n';

        if (finalCodes.length === 0) {
            output += '  NO CODABLE DIAGNOSIS\n';
        } else {
            output += `  ${finalCodes.map(c => c.code).join(', ')}\n`;
        }

    } catch (error) {
        output += 'ICD_CODES:\n';
        output += '  ERROR\n';
    }

    output += '\n';
}

fs.writeFileSync(process.env.HOME + '/Desktop/final_results_v3.txt', output.trim());

console.log('File generated: ~/Desktop/final_results_v3.txt');
console.log(`Total cases: ${cases.length}`);
