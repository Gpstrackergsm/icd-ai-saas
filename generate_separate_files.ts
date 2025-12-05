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

let casesOutput = '';
let resultsOutput = '';

for (const testCase of cases) {
    // Build cases file
    casesOutput += `CASE ${testCase.id}:\n`;
    const inputLines = testCase.input.split('\n');
    inputLines.forEach(line => {
        casesOutput += `  ${line}\n`;
    });
    casesOutput += '\n';

    // Build results file
    try {
        const { context } = parseInput(testCase.input);
        const engineResult = runStructuredRules(context);
        const validated = validateCodeSet(engineResult.primary, engineResult.secondary, context);
        const enhanced = validateFinalOutput(validated.codes, testCase.input);
        const finalCodes = applyAdvancedCodingRules(enhanced.codes, testCase.input);

        resultsOutput += `CASE ${testCase.id}:\n`;

        if (finalCodes.length === 0) {
            resultsOutput += 'ICD_CODES: NO CODABLE DIAGNOSIS\n';
        } else {
            resultsOutput += `ICD_CODES: ${finalCodes.map(c => c.code).join(', ')}\n`;
        }
        resultsOutput += '\n';

    } catch (error) {
        resultsOutput += `CASE ${testCase.id}:\n`;
        resultsOutput += 'ICD_CODES: ERROR\n';
        resultsOutput += '\n';
    }
}

fs.writeFileSync(process.env.HOME + '/Desktop/cases_v3.txt', casesOutput.trim());
fs.writeFileSync(process.env.HOME + '/Desktop/results_v3.txt', resultsOutput.trim());

console.log('Files generated:');
console.log('  ~/Desktop/cases_v3.txt (1000 cases)');
console.log('  ~/Desktop/results_v3.txt (ICD codes)');
