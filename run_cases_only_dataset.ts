
import * as fs from 'fs';
import * as readline from 'readline';
import { parseInput } from './lib/structured/parser';
import { runStructuredRules } from './lib/structured/engine';

async function processFile() {
    const fileStream = fs.createReadStream('./ICD_1000_CASES_ONLY.csv');

    const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity
    });

    const results: string[] = [];
    console.log('Processing 1000 cases only dataset...');

    // Regex to capture "CASE <number> <text>"
    // Based on view: "CASE 1 Community-acquired pneumonia in 64-year-old Male"
    // The previous files had "CASE <id> | <text>" or similar.
    // This CSV has a header "Case_Title", and then lines like "CASE 1 ...".
    // It seems the whole line is the title, containing the ID at the start.
    // Or maybe it's just one column? View showed:
    // 1: Case_Title
    // 2: CASE 1 Community-acquired pneumonia in 64-year-old Male
    
    // So distinct columns are NOT comma separated, it's just one column?
    // Let's assume the line *is* the content (minus header).
    
    const lineRegex = /^(?:CASE\s+(\d+)\s+)?(.+)$/i;

    let isHeader = true;

    for await (const line of rl) {
        if (isHeader) {
            isHeader = false;
            continue;
        }

        const match = line.match(lineRegex);
        if (match) {
            let id = match[1]; // might be undefined if "CASE X" is not present or regex fails
            let text = match[0].trim(); // Use the whole line as text for parsing?
            
            // Actually, if the line is "CASE 1 Pneumonia...", we can extract ID=1.
            // If regex matches:
            // Group 1: ID (digits)
            // Group 2: The rest of the text? No, simple regex:
            // /^CASE\s+(\d+)\s+(.+)$/
            
            const strictMatch = line.match(/^CASE\s+(\d+)\s+(.+)$/i);
            
            if (strictMatch) {
                id = strictMatch[1];
                text = strictMatch[2].trim();
            } else {
                // Fallback: use line number or hash if ID is missing?
                // But the file shows consistent "CASE N ..." format.
                // If it fails, maybe line is empty or formatted differently.
                if (!line.trim()) continue;
                id = "UNKNOWN"; 
                text = line.trim();
            }

            try {
                // Run Engine
                const { context } = parseInput(text);
                const result = runStructuredRules(context);
                
                const codes = [result.primary, ...result.secondary]
                    .filter((x): x is NonNullable<typeof x> => !!x)
                    .map(x => x!.code)
                    .join(', ');

                results.push(`CASE ${id} | ${codes}`);
            } catch (e) {
                results.push(`CASE ${id} | ERROR: ${e instanceof Error ? e.message : String(e)}`);
            }
        }
    }

    const outputContent = results.join('\n');
    fs.writeFileSync('ICD_1000_CASES_ONLY_RESULTS.txt', outputContent);
    console.log('Done! Written to ICD_1000_CASES_ONLY_RESULTS.txt');
}

processFile();
