import * as fs from 'fs';
import * as path from 'path';
import { parseInput } from './lib/structured/parser';
import { runStructuredRules } from './lib/structured/engine';
import { validateContext } from './lib/structured/validator';

interface CaseResult {
    caseId: string;
    input: string;
    validationStatus: 'PASS' | 'HARD_STOP' | 'WARNING';
    errors: string[];
    warnings: string[];
    generatedCodes: string[];
}

function processCases(inputPath: string, outputPath: string) {
    console.log(`Reading cases from: ${inputPath}`);

    const inputContent = fs.readFileSync(inputPath, 'utf-8');
    const lines = inputContent.trim().split('\n');

    const header = lines[0];
    const cases = lines.slice(1).filter(line => line.trim().length > 0);

    console.log(`Found ${cases.length} cases to process\n`);

    const results: CaseResult[] = [];
    const startTime = Date.now();

    for (let i = 0; i < cases.length; i++) {
        const line = cases[i];
        const commaIndex = line.indexOf(',');
        if (commaIndex === -1) continue;

        const caseId = line.substring(0, commaIndex).trim();
        const input = line.substring(commaIndex + 1).trim();

        if ((i + 1) % 100 === 0) {
            const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
            console.log(`Processed ${i + 1}/${cases.length} cases (${elapsed}s)...`);
        }

        try {
            const parseResult = parseInput(input);
            const parsed = parseResult.context;
            const validation = validateContext(parsed);

            let validationStatus: 'PASS' | 'HARD_STOP' | 'WARNING' = 'PASS';
            let generatedCodes: string[] = [];

            if (validation.errors && validation.errors.length > 0) {
                validationStatus = 'HARD_STOP';
            } else {
                if (validation.warnings && validation.warnings.length > 0) {
                    validationStatus = 'WARNING';
                }

                const engineOutput = runStructuredRules(parsed);

                if (engineOutput.primary && engineOutput.primary.code) {
                    generatedCodes.push(engineOutput.primary.code);
                }
                if (engineOutput.secondary && Array.isArray(engineOutput.secondary)) {
                    for (const sec of engineOutput.secondary) {
                        if (sec.code) {
                            generatedCodes.push(sec.code);
                        }
                    }
                }
            }

            results.push({
                caseId,
                input,
                validationStatus,
                errors: validation.errors || [],
                warnings: validation.warnings || [],
                generatedCodes
            });

        } catch (error) {
            results.push({
                caseId,
                input,
                validationStatus: 'HARD_STOP',
                errors: [`Processing error: ${error}`],
                warnings: [],
                generatedCodes: []
            });
        }
    }

    console.log(`\nWriting results to: ${outputPath}`);

    const outputLines: string[] = [];
    outputLines.push('Case ID,Input,Validation Status,Generated Codes,Errors,Warnings');

    for (const result of results) {
        const codesStr = result.generatedCodes.join('; ');
        const errorsStr = result.errors.map(e => e.replace(/,/g, ';')).join(' | ');
        const warningsStr = result.warnings.map(w => w.replace(/,/g, ';')).join(' | ');

        const escapeCsv = (str: string) => {
            if (str.includes(',') || str.includes('"') || str.includes('\n')) {
                return `"${str.replace(/"/g, '""')}"`;
            }
            return str;
        };

        outputLines.push([
            result.caseId,
            escapeCsv(result.input),
            result.validationStatus,
            escapeCsv(codesStr),
            escapeCsv(errorsStr),
            escapeCsv(warningsStr)
        ].join(','));
    }

    fs.writeFileSync(outputPath, outputLines.join('\n'), 'utf-8');

    const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);

    console.log('\n' + '='.repeat(60));
    console.log('SUMMARY');
    console.log('='.repeat(60));
    console.log(`Total cases: ${results.length}`);
    console.log(`PASS: ${results.filter(r => r.validationStatus === 'PASS').length}`);
    console.log(`WARNING: ${results.filter(r => r.validationStatus === 'WARNING').length}`);
    console.log(`HARD STOP: ${results.filter(r => r.validationStatus === 'HARD_STOP').length}`);
    console.log(`Processing time: ${totalTime} seconds`);
    console.log('='.repeat(60));
    console.log(`\n✅ Results saved to: ${outputPath}`);
}

const inputPath = '/Users/khalidaitelmaati/Desktop/n2000_input.csv';
const outputPath = '/Users/khalidaitelmaati/Desktop/n2000.csv';

processCases(inputPath, outputPath);
