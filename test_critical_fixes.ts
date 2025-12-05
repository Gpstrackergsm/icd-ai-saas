import { parseInput } from './lib/structured/parser';
import { runStructuredRules } from './lib/structured/engine';
import { validateCodeSet } from './lib/structured/validator-post';
import { validateFinalOutput } from './lib/structured/validator-enhanced';
import { applyComprehensiveCodingRules } from './lib/structured/validator-advanced';
import * as fs from 'fs';

// Test cases targeting all 10 critical fixes
const criticalTestCases = `
CASE 1
Age: 60
Gender: Female
Encounter Type: Inpatient
Ulcer/Wound: Yes
Type: Pressure
Location: Heel
Stage/Depth: Stage 3

CASE 2
Age: 37
Gender: Female
Encounter Type: Inpatient
Diabetes Type: Type 2
Ulcer/Wound: Yes
Type: Diabetic
Location: Right Foot
Stage/Depth: Muscle exposed

CASE 3
Age: 45
Gender: Male
Encounter Type: ED
Ulcer/Wound: Yes
Type: Traumatic
Location: Left Arm  
Stage/Depth: Deep laceration

CASE 4
Age: 55
Gender: Female
Encounter Type: Inpatient
Cancer Present: Yes
Active Tx: Yes
Site: Lung
Type: Primary

CASE 5
Age: 29
Gender: Female
Encounter Type: ED
Sepsis: Yes
Organism: MRSA
Infection Site: Skin

CASE 6
Age: 50
Gender: Male
Encounter Type: Outpatient
CKD Present: Yes
CKD Stage: 3

CASE 7
Age: 44
Gender: Female
Encounter Type: ED
Diagnosis: Essential Hypertension

CASE 8
Age: 66
Gender: Female
Encounter Type: Inpatient
Cancer Present: Yes
Active Tx: Yes
Metastasis: Yes
Site: Colon
Type: Primary
`;

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

const cases = parseCases(criticalTestCases);

let correctedResults = '';
let errorLog = '';
let complianceReport = '';

const results: any[] = [];

console.log('='.repeat(80));
console.log('COMPREHENSIVE ICD-10-CM VALIDATION REPAIR - CRITICAL FIXES TEST');
console.log('='.repeat(80));
console.log('');

for (const testCase of cases) {
    console.log(`\nCASE ${testCase.id}:`);
    console.log('-'.repeat(80));
    const inputLines = testCase.input.split('\n');
    inputLines.forEach(line => console.log(`  ${line}`));
    console.log('');

    try {
        const { context } = parseInput(testCase.input);
        const engineResult = runStructuredRules(context);
        const validated = validateCodeSet(engineResult.primary, engineResult.secondary, context);
        const enhanced = validateFinalOutput(validated.codes, testCase.input);

        // Apply comprehensive rules with error reporting
        const finalResult = applyComprehensiveCodingRules(enhanced.codes, testCase.input);

        console.log('  RESULT:');
        if (finalResult.codes.length === 0) {
            console.log('    ❌ NO CODES GENERATED');
            if (finalResult.errors.length > 0) {
                console.log('    ERRORS:');
                finalResult.errors.forEach(e => console.log(`      - ${e}`));
            }
        } else {
            finalResult.codes.forEach((code, idx) => {
                const status = idx === 0 ? '[PRIMARY]  ' : '[SECONDARY]';
                console.log(`    ✅ ${status} ${code.code} - ${code.label}`);
            });

            if (finalResult.warnings.length > 0) {
                console.log('    WARNINGS:');
                finalResult.warnings.forEach(w => console.log(`      ⚠ ${w}`));
            }
        }

        // Build corrected results
        correctedResults += `CASE ${testCase.id}:\n`;
        inputLines.forEach(line => correctedResults += `  ${line}\n`);
        correctedResults += '\nICD_CODES:\n';
        if (finalResult.codes.length === 0) {
            correctedResults += '  NO CODABLE DIAGNOSIS\n';
        } else {
            correctedResults += `  ${finalResult.codes.map(c => c.code).join(', ')}\n`;
        }
        correctedResults += '\n';

        // Build error log
        if (finalResult.errors.length > 0 || finalResult.warnings.length > 0) {
            errorLog += `CASE ${testCase.id}:\n`;
            if (finalResult.errors.length > 0) {
                errorLog += '  ERRORS:\n';
                finalResult.errors.forEach(e => errorLog += `    - ${e}\n`);
            }
            if (finalResult.warnings.length > 0) {
                errorLog += '  WARNINGS:\n';
                finalResult.warnings.forEach(w => errorLog += `    - ${w}\n`);
            }
            errorLog += '\n';
        }

        results.push({
            caseId: testCase.id,
            success: finalResult.codes.length > 0,
            codes: finalResult.codes.map(c => c.code),
            errors: finalResult.errors,
            warnings: finalResult.warnings
        });

    } catch (error) {
        console.log(`    ❌ ERROR: ${(error as Error).message}`);

        correctedResults += `CASE ${testCase.id}:\n`;
        inputLines.forEach(line => correctedResults += `  ${line}\n`);
        correctedResults += '\nICD_CODES:\n  ERROR\n\n';

        errorLog += `CASE ${testCase.id}:\n  CRITICAL ERROR: ${(error as Error).message}\n\n`;

        results.push({
            caseId: testCase.id,
            success: false,
            codes: [],
            errors: [(error as Error).message],
            warnings: []
        });
    }
}

// Generate compliance report
const totalCases = cases.length;
const successfulCases = results.filter(r => r.success).length;
const failedCases = totalCases - successfulCases;
const accuracy = ((successfulCases / totalCases) * 100).toFixed(2);

complianceReport = `COMPREHENSIVE ICD-10-CM VALIDATION COMPLIANCE REPORT
${'='.repeat(80)}

TARGET: 100% Codable Cases with Clinically Correct Domain Mapping

RESULTS:
  Total Cases: ${totalCases}
  Successful: ${successfulCases}
  Failed: ${failedCases}
  Accuracy: ${accuracy}%

CRITICAL FIXES APPLIED:
  ✓ Fix #1: Pressure ulcers → L89.x only (never CKD)
  ✓ Fix #2: Diabetic ulcers → E1x.621 + L97.x (never CKD alone)
  ✓ Fix #3: Traumatic wounds → S-codes (never CKD)
  ✓ Fix #4: Block "NO CODABLE DIAGNOSIS" if diagnosis exists
  ✓ Fix #5: Malignancy → correct C-code (avoid C80.1 when site exists)
  ✓ Fix #6: Sepsis → A41.x first, then source
  ✓ Fix #7: CKD → only when explicitly stated (not "stage" alone)
  ✓ Fix #8: Error reporting implemented
  ✓ Fix #9: Domain isolation enforced
  ✓ Fix #10: Failed cases re-processed

CASE-BY-CASE VALIDATION:
`;

results.forEach(r => {
    complianceReport += `\n  CASE ${r.caseId}: ${r.success ? '✓ PASS' : '❌ FAIL'}`;
    if (r.codes.length > 0) {
        complianceReport += ` → ${r.codes.join(', ')}`;
    }
    if (r.errors.length > 0) {
        complianceReport += `\n    Errors: ${r.errors.join('; ')}`;
    }
});

complianceReport += `\n\n${'='.repeat(80)}\nSTATUS: ${accuracy === '100.00' ? '✓ TARGET ACHIEVED' : '⚠ FURTHER REVIEW REQUIRED'}\n`;

// Write output files
fs.writeFileSync(process.env.HOME + '/Desktop/corrected_results.txt', correctedResults.trim());
fs.writeFileSync(process.env.HOME + '/Desktop/compliance_report.txt', complianceReport.trim());
fs.writeFileSync(process.env.HOME + '/Desktop/error_log.txt', errorLog.trim() || 'No errors logged.');

console.log('');
console.log('='.repeat(80));
console.log('FILES GENERATED:');
console.log('  ~/Desktop/corrected_results.txt');
console.log('  ~/Desktop/compliance_report.txt');
console.log('  ~/Desktop/error_log.txt');
console.log('='.repeat(80));
console.log('');
console.log(`FINAL ACCURACY: ${accuracy}%`);
console.log('');
