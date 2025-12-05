"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const fs = __importStar(require("fs"));
function parseCases(fileContent) {
    const cases = new Map();
    const lines = fileContent.split('\n');
    let currentCase = null;
    for (const line of lines) {
        if (line.trim().startsWith('CASE ')) {
            if (currentCase) {
                cases.set(currentCase.id, currentCase.lines.join('\n'));
            }
            const caseNum = parseInt(line.replace('CASE ', '').trim());
            currentCase = { id: caseNum, lines: [] };
        }
        else if (currentCase && line.trim()) {
            currentCase.lines.push(line.trim());
        }
    }
    if (currentCase) {
        cases.set(currentCase.id, currentCase.lines.join('\n'));
    }
    return cases;
}
function parseResults(fileContent) {
    const results = new Map();
    const lines = fileContent.split('\n');
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line.startsWith('CASE ')) {
            const caseNum = parseInt(line.replace('CASE ', '').replace(':', '').trim());
            const codesLine = lines[i + 1];
            if (codesLine && codesLine.startsWith('ICD_CODES:')) {
                const codesStr = codesLine.replace('ICD_CODES:', '').trim();
                if (codesStr === 'NO CODES') {
                    results.set(caseNum, []);
                }
                else {
                    const codes = codesStr.split(',').map(c => c.trim()).filter(c => c);
                    results.set(caseNum, codes);
                }
            }
        }
    }
    return results;
}
function auditAndCorrect(caseId, input, codes) {
    const errors = [];
    let correctedCodes = [...codes];
    const lower = input.toLowerCase();
    // Rule 1: Diabetes coding validation
    if (lower.includes('diabetes')) {
        const hasE1121 = correctedCodes.includes('E11.21');
        const hasE1122 = correctedCodes.includes('E11.22');
        // Cannot have both E11.21 and E11.22
        if (hasE1121 && hasE1122) {
            correctedCodes = correctedCodes.filter(c => c !== 'E11.21');
            errors.push('Removed E11.21 (conflicts with E11.22)');
        }
        // If CKD mentioned, should have E1x.22 + N18.x
        if (lower.includes('ckd') || lower.includes('nephropathy')) {
            const hasE1x22 = correctedCodes.some(c => /E1[01]\.22/.test(c));
            const hasN18 = correctedCodes.some(c => c.startsWith('N18'));
            if (!hasE1x22 && correctedCodes.some(c => c.startsWith('E1'))) {
                // Check if they used wrong diabetes code
                const wrongDMCode = correctedCodes.find(c => /E1[01]\.21/.test(c));
                if (wrongDMCode) {
                    const fixed = wrongDMCode.replace('.21', '.22');
                    correctedCodes = correctedCodes.map(c => c === wrongDMCode ? fixed : c);
                    errors.push(`Changed ${wrongDMCode} to ${fixed} for CKD/nephropathy`);
                }
            }
        }
    }
    // Rule 2: Sepsis organism validation
    if (lower.includes('sepsis')) {
        if (lower.includes('mrsa')) {
            if (!correctedCodes.includes('A41.02')) {
                const wrongSepsis = correctedCodes.find(c => c.startsWith('A41') && c !== 'A41.02');
                if (wrongSepsis) {
                    correctedCodes = correctedCodes.map(c => c === wrongSepsis ? 'A41.02' : c);
                    errors.push(`Corrected ${wrongSepsis} to A41.02 for MRSA sepsis`);
                }
            }
        }
        if (lower.includes('e. coli') || lower.includes('e.coli')) {
            if (!correctedCodes.includes('A41.51')) {
                const wrongSepsis = correctedCodes.find(c => c.startsWith('A41') && c !== 'A41.51');
                if (wrongSepsis) {
                    correctedCodes = correctedCodes.map(c => c === wrongSepsis ? 'A41.51' : c);
                    errors.push(`Corrected ${wrongSepsis} to A41.51 for E. coli sepsis`);
                }
            }
        }
        if (lower.includes('viral')) {
            const hasA4189 = correctedCodes.includes('A41.89');
            if (hasA4189) {
                correctedCodes = correctedCodes.map(c => c === 'A41.89' ? 'A41.9' : c);
                errors.push('Changed A41.89 to A41.9 for viral sepsis');
            }
        }
    }
    // Rule 3: Hypertension & Heart Failure - I13.x cannot be with I50.x
    const hasI13 = correctedCodes.some(c => c.startsWith('I13'));
    if (hasI13) {
        const i50Codes = correctedCodes.filter(c => c.startsWith('I50'));
        if (i50Codes.length > 0) {
            correctedCodes = correctedCodes.filter(c => !c.startsWith('I50'));
            errors.push(`Removed ${i50Codes.join(', ')} (conflicts with I13.x)`);
        }
    }
    // Rule 4: Pulmonary - avoid J22 when J44.0 present
    const hasJ440 = correctedCodes.includes('J44.0');
    const hasJ22 = correctedCodes.includes('J22');
    if (hasJ440 && hasJ22) {
        correctedCodes = correctedCodes.filter(c => c !== 'J22');
        errors.push('Removed J22 (redundant with J44.0)');
    }
    // Rule 5: Ulcers - pressure ulcers use L89.x not L97.x
    if (lower.includes('pressure') && lower.includes('ulcer')) {
        const hasL97 = correctedCodes.some(c => c.startsWith('L97'));
        if (hasL97) {
            errors.push('Pressure ulcer incorrectly coded with L97.x (should be L89.x)');
            correctedCodes = correctedCodes.filter(c => !c.startsWith('L97'));
            // Add appropriate L89 code
            let l89Code = 'L89.90';
            if (lower.includes('sacral') || lower.includes('sacrum')) {
                if (lower.includes('bone') || lower.includes('necrosis') || lower.includes('stage 4')) {
                    l89Code = 'L89.154';
                }
                else if (lower.includes('muscle') || lower.includes('stage 3')) {
                    l89Code = 'L89.153';
                }
            }
            correctedCodes.push(l89Code);
            errors.push(`Added ${l89Code} for pressure ulcer`);
        }
    }
    // Rule 6: CKD must have N18.x
    if (lower.includes('ckd') || (lower.includes('chronic kidney') && lower.includes('disease'))) {
        const hasN18 = correctedCodes.some(c => c.startsWith('N18'));
        if (!hasN18 && correctedCodes.length > 0) {
            // Extract stage if present
            let stage = 'unspecified';
            if (lower.includes('stage 1'))
                stage = '1';
            else if (lower.includes('stage 2'))
                stage = '2';
            else if (lower.includes('stage 3b'))
                stage = '32';
            else if (lower.includes('stage 3a'))
                stage = '31';
            else if (lower.includes('stage 3'))
                stage = '30';
            else if (lower.includes('stage 4'))
                stage = '4';
            else if (lower.includes('stage 5'))
                stage = '5';
            const n18Code = stage === 'unspecified' ? 'N18.9' : `N18.${stage}`;
            if (!correctedCodes.includes(n18Code)) {
                correctedCodes.push(n18Code);
                errors.push(`Added ${n18Code} for CKD`);
            }
        }
    }
    // If no codes at all
    if (correctedCodes.length === 0) {
        return {
            caseId,
            originalCodes: codes,
            correctedCodes: [],
            errors: ['NO CODABLE DIAGNOSIS'],
            wasCorrect: codes.length === 0
        };
    }
    return {
        caseId,
        originalCodes: codes,
        correctedCodes,
        errors,
        wasCorrect: errors.length === 0
    };
}
async function runAudit() {
    const casesContent = fs.readFileSync('./data/structured_cases_v2.txt', 'utf-8');
    const resultsContent = fs.readFileSync(process.env.HOME + '/Desktop/results_report_v2.txt', 'utf-8');
    const cases = parseCases(casesContent);
    const results = parseResults(resultsContent);
    const auditResults = [];
    let correctedCount = 0;
    for (let i = 1; i <= 1000; i++) {
        const input = cases.get(i) || '';
        const codes = results.get(i) || [];
        const audit = auditAndCorrect(i, input, codes);
        auditResults.push(audit);
        if (!audit.wasCorrect) {
            correctedCount++;
        }
    }
    // Generate corrected_results.txt
    let correctedOutput = '';
    for (const result of auditResults) {
        correctedOutput += `CASE ${result.caseId}:\n`;
        if (result.correctedCodes.length === 0) {
            correctedOutput += 'FINAL_CODES: NO CODABLE DIAGNOSIS\n';
        }
        else {
            correctedOutput += `FINAL_CODES: ${result.correctedCodes.join(', ')}\n`;
        }
        correctedOutput += '\n';
    }
    fs.writeFileSync(process.env.HOME + '/Desktop/corrected_results.txt', correctedOutput.trim());
    // Generate error_report.txt
    let errorReport = 'ICD-10-CM AUDIT ERROR REPORT\n';
    errorReport += '='.repeat(80) + '\n\n';
    const casesWithErrors = auditResults.filter(r => !r.wasCorrect);
    for (const result of casesWithErrors) {
        errorReport += `CASE ${result.caseId}:\n`;
        errorReport += `  Original: ${result.originalCodes.join(', ') || 'NO CODES'}\n`;
        errorReport += `  Corrected: ${result.correctedCodes.join(', ') || 'NO CODABLE DIAGNOSIS'}\n`;
        errorReport += `  Errors:\n`;
        result.errors.forEach(e => errorReport += `    - ${e}\n`);
        errorReport += '\n';
    }
    fs.writeFileSync(process.env.HOME + '/Desktop/error_report.txt', errorReport);
    // Generate summary.txt
    const totalCases = auditResults.length;
    const correctCases = auditResults.filter(r => r.wasCorrect).length;
    const accuracy = (correctCases / totalCases * 100).toFixed(2);
    let summary = 'CLINICAL CODING AUDIT SUMMARY\n';
    summary += '='.repeat(80) + '\n\n';
    summary += `Total Cases Audited: ${totalCases}\n`;
    summary += `Cases Corrected: ${correctedCount}\n`;
    summary += `Cases Already Correct: ${correctCases}\n`;
    summary += `Final Accuracy: ${accuracy}%\n\n`;
    summary += `Error Categories:\n`;
    const errorCategories = new Map();
    casesWithErrors.forEach(r => {
        r.errors.forEach(e => {
            const category = e.split('(')[0].trim();
            errorCategories.set(category, (errorCategories.get(category) || 0) + 1);
        });
    });
    Array.from(errorCategories.entries())
        .sort((a, b) => b[1] - a[1])
        .forEach(([cat, count]) => {
        summary += `  ${cat}: ${count}\n`;
    });
    fs.writeFileSync(process.env.HOME + '/Desktop/summary.txt', summary);
    console.log('Audit complete');
    console.log(`Total cases: ${totalCases}`);
    console.log(`Corrected: ${correctedCount}`);
    console.log(`Already correct: ${correctCases}`);
    console.log(`Accuracy: ${accuracy}%`);
    console.log('');
    console.log('Files generated:');
    console.log('  ~/Desktop/corrected_results.txt');
    console.log('  ~/Desktop/error_report.txt');
    console.log('  ~/Desktop/summary.txt');
}
runAudit().catch(console.error);
