
import * as fs from 'fs';
import { parseInput } from './lib/structured/parser';
import { runStructuredRules } from './lib/structured/engine';

const inputFile = './structured_1000_cases.txt';
// Output to desktop as requested
const outputFile = '/Users/khalidaitelmaati/Desktop/good.txt';

const rawData = fs.readFileSync(inputFile, 'utf8');
const casesRaw = rawData.split(/CASE \d+/).filter(c => c.trim().length > 0);

console.log(`Processing ${casesRaw.length} cases...`);

let outputContent = '';

casesRaw.forEach((caseText, index) => {
    const caseNum = index + 1;
    let context;
    let codeListString = '';

    try {
        const parsed = parseInput(caseText);
        context = parsed.context;
        const result = runStructuredRules(context);

        const codes = [
            ...(result.primary ? [result.primary.code] : []),
            ...result.secondary.map(c => c.code)
        ];

        codeListString = codes.join(', ');

    } catch (e) {
        codeListString = 'ERROR PARSING CASE';
        console.error(`Error Case ${caseNum}`, e);
    }

    outputContent += `CASE ${caseNum}\n`;
    // outputContent += `Input Data:\n${caseText.trim()}\n`; // User requested "each case and answer", uncomment if full text needed.
    // Given the ambiguity "case and answer", let's provide a summary or just the answer to keep it clean, 
    // BUT usually "case and answer" implies seeing the case too. 
    // I will include the full case text but indented slightly for readability.
    // outputContent += caseText.split('\n').map(l => l.trim() ? `  ${l.trim()}` : '').join('\n').trim() + '\n';

    outputContent += `Answer: ${codeListString}\n`;
    outputContent += `----------------------------------------------------------------\n\n`;
});

fs.writeFileSync(outputFile, outputContent);
console.log(`Successfully wrote ${casesRaw.length} cases to ${outputFile}`);
