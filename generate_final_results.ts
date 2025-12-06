
import * as fs from 'fs';
import * as path from 'path';
import { parseInput } from './lib/structured/parser';
import { runStructuredRules } from './lib/structured/engine';

const inputFile = './structured_1000_cases.txt';
// Hardcoded output path as requested
const outputFile = '/Users/khalidaitelmaati/Desktop/results.txt';

try {
    const rawData = fs.readFileSync(inputFile, 'utf8');

    // Split by "CASE \d+"
    // We want to keep the "CASE N" header or handle indexing
    // The split removes the delimiter, so we need to re-assemble or just use index
    const casesRaw = rawData.split(/CASE \d+/).filter(c => c.trim().length > 0);

    console.log(`Loaded ${casesRaw.length} cases.`);

    let outputContent = '';

    casesRaw.forEach((caseText, index) => {
        const caseNum = index + 1;
        let context;
        let codes: string[] = [];

        try {
            const parsed = parseInput(caseText);
            context = parsed.context;
            const output = runStructuredRules(context);
            codes = [
                ...(output.primary ? [output.primary.code] : []),
                ...output.secondary.map(c => c.code)
            ];
        } catch (e) {
            console.error(`CASE ${caseNum}: Parse/Engine Error`, e);
            codes = ['ERROR'];
        }

        outputContent += `CASE ${caseNum}\n`;
        outputContent += `Codes: ${codes.join(', ')}\n\n`;
    });

    fs.writeFileSync(outputFile, outputContent.trim());
    console.log(`Successfully wrote results to ${outputFile}`);

} catch (error) {
    console.error('Error:', error);
}
