
import * as fs from 'fs';
import * as readline from 'readline';
import { parseInput } from './lib/structured/parser';
import { runStructuredRules } from './lib/structured/engine';

async function processFile() {
    const fileStream = fs.createReadStream('./ICD_1000_REALISTIC_DATASET.csv');

    const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity
    });

    const results: string[] = [];
    console.log('Processing 1000 realistic cases...');

    // Regex to capture CSV line: Case_ID,Clinical_Title,ICD10_Codes
    // Assuming no commas in Clinical_Title for now based on glimpse, but let's be careful.
    // The previous view showed: CASE 1,Acute systolic heart failure in 75-year-old Female,I50.21
    // It seems simple: CaseID, Title, Codes.
    // We will split by comma, but rejoin the middle if > 3 parts (unlikely based on data seen).

    let isHeader = true;

    for await (const line of rl) {
        if (isHeader) {
            isHeader = false;
            continue;
        }

        // Simple CSV split assuming no quoted commas in text for now. 
        // If data has commas in text, this might break, but let's see.
        // Actually, "Type 2 diabetes with chronic kidney disease stage 4 in 88-year-old Male" has no comma.
        // Let's use a smarter regex to split by comma outside quotes if needed, 
        // but simple split might work for this specific dataset structure.
        const parts = line.split(',');

        if (parts.length < 2) continue;

        const id = parts[0];
        // Title might contain commas? Unlikely in this dataset based on view, but let's handle it.
        // The last part is ICD codes.
        // The middle part is title.

        // Strategy: 
        // Id = parts[0]
        // Codes = parts[parts.length - 1]
        // Title = parts.slice(1, parts.length - 1).join(',')

        const title = parts.slice(1, parts.length - 1).join(',');

        // If title is empty (parts.length=2), then maybe the last part is title and codes are missing?
        // But headers say 3 columns.
        if (!title) {
            // fallback
            console.warn(`Skipping malformed line: ${line}`);
            continue;
        }

        try {
            // Run Engine on Title
            const { context } = parseInput(title);
            const result = runStructuredRules(context);

            const codes = [result.primary, ...result.secondary]
                .filter((x): x is NonNullable<typeof x> => !!x)
                .map(x => x!.code)
                .join(', ');

            // Output format matches previous request: CASE {id} | {codes}
            results.push(`${id} | ${codes}`);
        } catch (e) {
            results.push(`${id} | ERROR: ${e instanceof Error ? e.message : String(e)}`);
        }
    }

    const outputContent = results.join('\n');
    fs.writeFileSync('ICD_1000_REALISTIC_RESULTS.txt', outputContent);
    console.log('Done! Written to ICD_1000_REALISTIC_RESULTS.txt');
}

processFile();
