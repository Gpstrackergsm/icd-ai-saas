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

const fileContent = fs.readFileSync('./data/structured_cases_v3.txt', 'utf-8');
const cases = parseCases(fileContent);

let output = '';
let noCasesBefore = 0;
let noCasesAfter = 0;

for (const testCase of cases) {
    output += `CASE ${testCase.id}:\n`;
    output += '─'.repeat(80) + '\n';
    output += 'CASE DATA:\n';

    const inputLines = testCase.input.split('\n');
    inputLines.forEach(line => {
        output += `  ${line}\n`;
    });

    output += '\n';

    try {
        const { context } = parseInput(testCase.input);
        const engineResult = runStructuredRules(context);
        const validated = validateCodeSet(engineResult.primary, engineResult.secondary, context);
        const enhanced = validateFinalOutput(validated.codes, testCase.input);

        // Count NO CODES before advanced rules
        if (enhanced.codes.length === 0) {
            noCasesBefore++;
        }

        // Apply advanced medical coding rules
        const finalCodes = applyAdvancedCodingRules(enhanced.codes, testCase.input);

        // Count NO CODES after advanced rules
        if (finalCodes.length === 0) {
            noCasesAfter++;
        }

        output += 'ICD_CODES:\n';

        if (finalCodes.length === 0) {
            output += '  NO CODABLE DIAGNOSIS\n';
        } else {
            finalCodes.forEach((code, idx) => {
                const status = idx === 0 ? '[PRIMARY]  ' : '[SECONDARY]';
                output += `  ${status} ${code.code} - ${code.label}\n`;
            });
        }

    } catch (error) {
        output += 'ICD_CODES:\n';
        output += '  ERROR PROCESSING CASE\n';
        noCasesAfter++;
    }

    output += '\n';
}

fs.writeFileSync(process.env.HOME + '/Desktop/corrected_results_v3.txt', output.trim());

console.log('════════════════════════════════════════════════════════════════');
console.log('ADVANCED MEDICAL CODING VALIDATOR - EXECUTION COMPLETE');
console.log('════════════════════════════════════════════════════════════════');
console.log('');
console.log(`Total Cases Processed: ${cases.length}`);
console.log(`Cases with NO CODES (Before): ${noCasesBefore}`);
console.log(`Cases with NO CODES (After):  ${noCasesAfter}`);
console.log(`Cases Fixed: ${noCasesBefore - noCasesAfter}`);
console.log(`Coverage Rate: ${((cases.length - noCasesAfter) / cases.length * 100).toFixed(2)}%`);
console.log('');
console.log('Output saved to: ~/Desktop/corrected_results_v3.txt');
console.log('════════════════════════════════════════════════════════════════');
