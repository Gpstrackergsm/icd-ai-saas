
import * as fs from 'fs';
import * as readline from 'readline';
import { parseInput } from './lib/structured/parser';
import { runStructuredRules } from './lib/structured/engine';

async function processFile() {
    const fileStream = fs.createReadStream('./ICD_1000_RESULTS_TITLES.txt');

    const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity
    });

    const results: string[] = [];
    console.log('Processing 1000 cases from Titles file...');

    // Regex to capture "CASE <number> <text>"
    const lineRegex = /^CASE\s+(\d+)\s+(.+)$/;

    for await (const line of rl) {
        const match = line.match(lineRegex);
        if (match) {
            const id = match[1];
            const text = match[2].trim();

            try {
                // Run Engine
                const { context } = parseInput(text);
                const result = runStructuredRules(context);

                const codes = [result.primary, ...result.secondary]
                    .filter((x): x is NonNullable<typeof x> => !!x)
                    .map(x => x!.code)
                    .join(', ');

                // Format: CASE 1 | Sepsis due to... | CODE, CODE
                // User asked for: "just cases number and results primary and secondary"
                // Let's give: CASE {id} | {codes}
                results.push(`CASE ${id} | ${codes}`);
            } catch (e) {
                results.push(`CASE ${id} | ERROR: ${e instanceof Error ? e.message : String(e)}`);
            }
        }
    }

    const outputContent = results.join('\n');
    fs.writeFileSync('ICD_1000_RESULTS_FINAL.txt', outputContent);
    console.log('Done! Written to ICD_1000_RESULTS_FINAL.txt');
}

processFile();
