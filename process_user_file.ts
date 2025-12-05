import { parseInput } from './lib/structured/parser';
import { runStructuredRules } from './lib/structured/engine';
import { validateCodeSet } from './lib/structured/validator-post';
import { validateFinalOutput } from './lib/structured/validator-enhanced';
import { applyComprehensiveMedicalRules } from './lib/structured/validator-advanced';
import * as fs from 'fs';

// Parse the user's actual results file
function parseUserFile(content: string): Array<{ caseId: number, input: string }> {
    const cases: Array<{ caseId: number, input: string }> = [];
    const lines = content.split('\n');

    let currentCase: any = null;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        if (line.startsWith('CASE ')) {
            if (currentCase && currentCase.inputLines) {
                currentCase.input = currentCase.inputLines.join('\n');
                delete currentCase.inputLines;
                cases.push(currentCase);
            }
            currentCase = {
                caseId: parseInt(line.replace('CASE ', '').replace(':', '').trim()),
                inputLines: []
            };
        } else if (currentCase && line.trim() && !line.startsWith('ICD_CODES:')) {
            currentCase.inputLines.push(line.trim());
        }
    }

    if (currentCase && currentCase.inputLines) {
        currentCase.input = currentCase.inputLines.join('\n');
        delete currentCase.inputLines;
        cases.push(currentCase);
    }

    return cases.filter(c => c.input);
}

const userFile = fs.readFileSync(process.env.HOME + '/Desktop/icd_results_2025-12-05.txt', 'utf-8');
const cases = parseUserFile(userFile);

console.log('Processing user file with medical coding fixes...');
console.log(`Total cases: ${cases.length}\n`);

let output = '';

for (const testCase of cases) {
    try {
        const { context } = parseInput(testCase.input);
        const engineResult = runStructuredRules(context);
        const validated = validateCodeSet(engineResult.primary, engineResult.secondary, context);
        const enhanced = validateFinalOutput(validated.codes, testCase.input);
        const finalResult = applyComprehensiveMedicalRules(enhanced.codes, testCase.input);

        const codes = finalResult.codes.map(c => c.code);

        output += `CASE ${testCase.caseId}:\n`;
        testCase.input.split('\n').forEach(line => output += `  ${line}\n`);
        output += '\nICD_CODES:\n';
        if (codes.length === 0) {
            output += '  NO CODABLE DIAGNOSIS\n';
        } else {
            output += `  ${codes.join(', ')}\n`;
        }
        output += '\n';

    } catch (error) {
        console.log(`ERROR processing CASE ${testCase.caseId}: ${(error as Error).message}`);
        output += `CASE ${testCase.caseId}:\n`;
        testCase.input.split('\n').forEach(line => output += `  ${line}\n`);
        output += '\nICD_CODES:\n  ERROR\n\n';
    }
}

fs.writeFileSync(process.env.HOME + '/Desktop/icd_results_FIXED.txt', output.trim());
console.log('\nFixed results written to: ~/Desktop/icd_results_FIXED.txt');
