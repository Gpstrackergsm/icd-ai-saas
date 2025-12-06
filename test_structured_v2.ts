import { parseInput } from './lib/structured/parser';
import { runStructuredRules } from './lib/structured/engine';
import { validateCodeSet } from './lib/structured/validator-post';
import { validateFinalOutput } from './lib/structured/validator-enhanced';
import { applyComprehensiveMedicalRules } from './lib/structured/validator-advanced';
import * as fs from 'fs';

const inputFile = fs.readFileSync(process.env.HOME + '/Desktop/structured_200_cases_v2.txt', 'utf-8');
const cases = inputFile.split(/\nCASE \d+\n/).filter(c => c.trim());

console.log(`Processing ${cases.length} cases from structured_200_cases_v2.txt...\n`);

let output = '';
let correctCount = 0;
let errorCount = 0;

for (let i = 0; i < cases.length; i++) {
    const caseInput = cases[i].trim();
    if (!caseInput) continue;

    try {
        const { context } = parseInput(caseInput);
        const engineResult = runStructuredRules(context);
        const validated = validateCodeSet(engineResult.primary, engineResult.secondary, context);
        const enhanced = validateFinalOutput(validated.codes, caseInput);
        const finalResult = applyComprehensiveMedicalRules(enhanced.codes, caseInput);

        const codes = finalResult.codes.map(c => c.code);

        output += `CASE ${i + 1}\n`;
        caseInput.split('\n').forEach(line => output += `${line}\n`);
        output += `\nICD_CODES:\n`;
        if (codes.length === 0) {
            output += '  NO CODABLE DIAGNOSIS\n';
        } else {
            output += `  ${codes.join(', ')}\n`;
        }
        output += '\n';
        correctCount++;

    } catch (error) {
        console.log(`ERROR processing CASE ${i + 1}: ${(error as Error).message}`);
        output += `CASE ${i + 1}\n`;
        caseInput.split('\n').forEach(line => output += `${line}\n`);
        output += `\nICD_CODES:\n  ERROR\n\n`;
        errorCount++;
    }
}

fs.writeFileSync(process.env.HOME + '/Desktop/structured_200_cases_v2_RESULTS.txt', output.trim());

console.log('\n================================================================================');
console.log('TEST RESULTS');
console.log('================================================================================');
console.log(`Total cases: ${cases.length}`);
console.log(`Processed successfully: ${correctCount}`);
console.log(`Errors: ${errorCount}`);
console.log(`Success rate: ${((correctCount / cases.length) * 100).toFixed(2)}%`);
console.log('\nOutput file: ~/Desktop/structured_200_cases_v2_RESULTS.txt');
console.log('================================================================================');
