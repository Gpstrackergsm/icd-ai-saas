import { parseInput } from './lib/structured/parser';
import { runStructuredRules } from './lib/structured/engine';
import { validateCodeSet } from './lib/structured/validator-post';
import { validateFinalOutput } from './lib/structured/validator-enhanced';
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

const fileContent = fs.readFileSync('./data/structured_cases_v2.txt', 'utf-8');
const cases = parseCases(fileContent);

let output = '';

for (const testCase of cases) {
    try {
        const { context } = parseInput(testCase.input);
        const engineResult = runStructuredRules(context);
        const validated = validateCodeSet(engineResult.primary, engineResult.secondary, context);
        const finalResult = validateFinalOutput(validated.codes, testCase.input);

        output += `CASE ${testCase.id}:\n`;

        if (finalResult.output === 'NO CODABLE DIAGNOSIS' || finalResult.codes.length === 0) {
            output += 'ICD_CODES: NO CODES\n';
        } else {
            const codes = finalResult.codes.map(c => c.code).join(', ');
            output += `ICD_CODES: ${codes}\n`;
        }
        output += '\n';

    } catch (error) {
        output += `CASE ${testCase.id}:\n`;
        output += 'ICD_CODES: NO CODES\n';
        output += '\n';
    }
}

fs.writeFileSync(process.env.HOME + '/Desktop/results_report_v2.txt', output.trim());
console.log('Processed ' + cases.length + ' cases');
console.log('Output saved to ~/Desktop/results_report_v2.txt');
