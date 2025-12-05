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
function medicalAudit(caseId, input, codes) {
    const errors = [];
    let correctedCodes = [...codes];
    const lower = input.toLowerCase();
    // RULE: Neoplasm - Active cancer needs C-code not Z85
    if (lower.includes('cancer') || lower.includes('neoplasm')) {
        const isActive = lower.includes('active') || lower.includes('chemotherapy') || lower.includes('radiation');
        const hasZ85 = correctedCodes.some(c => c.startsWith('Z85'));
        const hasCCode = correctedCodes.some(c => c.startsWith('C'));
        if (isActive && hasZ85) {
            correctedCodes = correctedCodes.filter(c => !c.startsWith('Z85'));
            errors.push('Removed Z85 - active cancer requires C-code');
        }
        if (isActive && !hasCCode) {
            let cCode = 'C80.1';
            if (lower.includes('breast'))
                cCode = 'C50.919';
            else if (lower.includes('lung'))
                cCode = 'C34.90';
            else if (lower.includes('colon'))
                cCode = 'C18.9';
            else if (lower.includes('prostate'))
                cCode = 'C61';
            correctedCodes.unshift(cCode);
            errors.push(`Added ${cCode} for active cancer`);
        }
    }
    // RULE: Pressure Ulcer - Must be L89.x with site and stage
    if (lower.includes('pressure') && lower.includes('ulcer')) {
        const hasL89 = correctedCodes.some(c => c.startsWith('L89'));
        const hasWrongUlcer = correctedCodes.some(c => c.startsWith('L97') || c.startsWith('N18'));
        if (hasWrongUlcer) {
            correctedCodes = correctedCodes.filter(c => !c.startsWith('L97') && !c.startsWith('N18'));
            errors.push('Removed wrong ulcer codes for pressure ulcer');
        }
        if (!hasL89 || correctedCodes.includes('L89.90')) {
            correctedCodes = correctedCodes.filter(c => c !== 'L89.90');
            let ulcerCode = 'L89.90';
            if (lower.includes('sacral') || lower.includes('sacrum')) {
                if (lower.includes('stage 4') || lower.includes('bone'))
                    ulcerCode = 'L89.154';
                else if (lower.includes('stage 3') || lower.includes('muscle'))
                    ulcerCode = 'L89.153';
                else if (lower.includes('stage 2'))
                    ulcerCode = 'L89.152';
                else if (lower.includes('stage 1'))
                    ulcerCode = 'L89.151';
            }
            else if (lower.includes('heel')) {
                if (lower.includes('stage 4'))
                    ulcerCode = 'L89.624';
                else if (lower.includes('stage 3'))
                    ulcerCode = 'L89.623';
                else if (lower.includes('stage 2'))
                    ulcerCode = 'L89.622';
            }
            if (!correctedCodes.includes(ulcerCode)) {
                correctedCodes.push(ulcerCode);
                errors.push(`Added/corrected pressure ulcer code to ${ulcerCode}`);
            }
        }
    }
    // RULE: Diabetic Ulcer - E1x.621 + L97.x
    if (lower.includes('diabetes') && lower.includes('ulcer')) {
        const hasE1x621 = correctedCodes.some(c => /E1[01]\.621/.test(c));
        const hasL97 = correctedCodes.some(c => c.startsWith('L97'));
        if (!hasE1x621) {
            const dmType = lower.includes('type 1') ? 'E10.621' : 'E11.621';
            correctedCodes.unshift(dmType);
            errors.push(`Added ${dmType} for diabetic ulcer`);
        }
        if (!hasL97) {
            correctedCodes.push('L97.519');
            errors.push('Added L97.519 for diabetic foot ulcer');
        }
    }
    // RULE: Traumatic Wound - Must have precise S-code
    if (lower.includes('traumatic') || lower.includes('laceration') || lower.includes('fracture')) {
        const hasGenericS00 = correctedCodes.some(c => c === 'S00.00XA');
        const hasN18 = correctedCodes.some(c => c.startsWith('N18'));
        if (hasN18 && !lower.includes('ckd') && !lower.includes('kidney')) {
            correctedCodes = correctedCodes.filter(c => !c.startsWith('N18'));
            errors.push('Removed inappropriate N18 from traumatic injury case');
        }
        if (hasGenericS00) {
            errors.push('Generic S00.00XA used - needs precise injury code');
        }
    }
    // RULE: I13.x cannot be with I50.x
    const hasI13 = correctedCodes.some(c => c.startsWith('I13'));
    const hasI50 = correctedCodes.some(c => c.startsWith('I50'));
    if (hasI13 && hasI50) {
        correctedCodes = correctedCodes.filter(c => !c.startsWith('I50'));
        errors.push('Removed I50.x - conflicts with I13.x');
    }
    // RULE: CKD Stage must have N18.x
    if (lower.includes('ckd') || /stage [1-5]/.test(lower) || lower.includes('esrd')) {
        const hasN18 = correctedCodes.some(c => c.startsWith('N18'));
        if (!hasN18) {
            let ckdCode = 'N18.9';
            if (lower.includes('stage 1'))
                ckdCode = 'N18.1';
            else if (lower.includes('stage 2'))
                ckdCode = 'N18.2';
            else if (lower.includes('stage 3b'))
                ckdCode = 'N18.32';
            else if (lower.includes('stage 3a'))
                ckdCode = 'N18.31';
            else if (lower.includes('stage 3'))
                ckdCode = 'N18.30';
            else if (lower.includes('stage 4'))
                ckdCode = 'N18.4';
            else if (lower.includes('stage 5') || lower.includes('esrd'))
                ckdCode = 'N18.5';
            correctedCodes.push(ckdCode);
            errors.push(`Added ${ckdCode} for CKD`);
        }
    }
    // RULE: Viral sepsis must be A41.9
    if (lower.includes('viral') && lower.includes('sepsis')) {
        const hasA4189 = correctedCodes.includes('A41.89');
        if (hasA4189) {
            correctedCodes = correctedCodes.map(c => c === 'A41.89' ? 'A41.9' : c);
            errors.push('Changed A41.89 to A41.9 for viral sepsis');
        }
    }
    // RULE: J22 redundant with J44.0
    const hasJ440 = correctedCodes.includes('J44.0');
    const hasJ22 = correctedCodes.includes('J22');
    if (hasJ440 && hasJ22) {
        correctedCodes = correctedCodes.filter(c => c !== 'J22');
        errors.push('Removed J22 - redundant with J44.0');
    }
    // RULE: Diabetes E11.21 + E11.22 conflict
    const hasE1121 = correctedCodes.includes('E11.21');
    const hasE1122 = correctedCodes.includes('E11.22');
    if (hasE1121 && hasE1122) {
        correctedCodes = correctedCodes.filter(c => c !== 'E11.21');
        errors.push('Removed E11.21 - conflicts with E11.22');
    }
    // RULE: Diabetes nephropathy needs E1x.22 + N18.x
    if (lower.includes('diabetes') && (lower.includes('nephropathy') || lower.includes('ckd'))) {
        const hasE1x22 = correctedCodes.some(c => /E1[01]\.22/.test(c));
        const hasN18 = correctedCodes.some(c => c.startsWith('N18'));
        if (!hasE1x22 && correctedCodes.some(c => /E1[01]\./.test(c))) {
            const wrongDM = correctedCodes.find(c => /E1[01]\.21/.test(c));
            if (wrongDM) {
                const fixed = wrongDM.replace('.21', '.22');
                correctedCodes = correctedCodes.map(c => c === wrongDM ? fixed : c);
                errors.push(`Changed ${wrongDM} to ${fixed} for diabetic nephropathy`);
            }
        }
        if (hasE1x22 && !hasN18) {
            correctedCodes.push('N18.30');
            errors.push('Added N18.30 for diabetic CKD');
        }
    }
    // If NO CODES and should have codes
    if (correctedCodes.length === 0 && input.trim().length > 20) {
        // Check for any diagnosis
        if (lower.includes('diabetes')) {
            const dmCode = lower.includes('type 1') ? 'E10.9' : 'E11.9';
            correctedCodes.push(dmCode);
            errors.push(`Added ${dmCode} - diabetes mentioned but no code generated`);
        }
        else if (lower.includes('hypertension')) {
            correctedCodes.push('I10');
            errors.push('Added I10 - hypertension mentioned but no code generated');
        }
        else if (lower.includes('copd')) {
            correctedCodes.push('J44.9');
            errors.push('Added J44.9 - COPD mentioned but no code generated');
        }
    }
    return {
        caseId,
        originalCodes: codes,
        correctedCodes,
        errors,
        wasCorrect: errors.length === 0
    };
}
async function runMedicalAudit() {
    var _a;
    const casesContent = fs.readFileSync('./data/structured_cases.txt', 'utf-8');
    // Try to find available results file
    let resultsContent;
    try {
        resultsContent = fs.readFileSync(process.env.HOME + '/Desktop/corrected_results_v3.txt', 'utf-8');
    }
    catch {
        try {
            resultsContent = fs.readFileSync(process.env.HOME + '/Desktop/results_report.txt', 'utf-8');
        }
        catch {
            resultsContent = fs.readFileSync(process.env.HOME + '/Desktop/detailed_results_v3.txt', 'utf-8');
        }
    }
    const cases = parseCases(casesContent);
    // Parse results - handle both formats
    const results = new Map();
    const lines = resultsContent.split('\n');
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line.startsWith('CASE ')) {
            const caseNum = parseInt(line.replace('CASE ', '').replace(':', '').trim());
            // Look for ICD_CODES line
            for (let j = i + 1; j < Math.min(i + 20, lines.length); j++) {
                if (lines[j].includes('ICD_CODES:') || lines[j].includes('FINAL_CODES:') || lines[j].includes('[PRIMARY]')) {
                    const codes = [];
                    if (lines[j].includes('NO CODES') || lines[j].includes('NO CODABLE')) {
                        results.set(caseNum, []);
                        break;
                    }
                    else if (lines[j].includes(':')) {
                        // Single line format
                        const codesStr = lines[j].split(':')[1].trim();
                        if (codesStr && codesStr !== 'NO CODES') {
                            codes.push(...codesStr.split(',').map(c => c.trim().split(' ')[0]).filter(c => c));
                        }
                        results.set(caseNum, codes);
                        break;
                    }
                    else if (lines[j].includes('[PRIMARY]') || lines[j].includes('[SECONDARY]')) {
                        // Multi-line format
                        for (let k = j; k < Math.min(j + 10, lines.length); k++) {
                            if (lines[k].includes('[PRIMARY]') || lines[k].includes('[SECONDARY]')) {
                                const code = (_a = lines[k].split(']')[1]) === null || _a === void 0 ? void 0 : _a.trim().split(' ')[0];
                                if (code)
                                    codes.push(code);
                            }
                            else if (lines[k].trim() === '' || lines[k].startsWith('CASE ')) {
                                break;
                            }
                        }
                        results.set(caseNum, codes);
                        break;
                    }
                }
            }
        }
    }
    const auditResults = [];
    for (let i = 1; i <= 1000; i++) {
        const input = cases.get(i) || '';
        const codes = results.get(i) || [];
        const audit = medicalAudit(i, input, codes);
        auditResults.push(audit);
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
    const casesWithErrors = auditResults.filter(r => !r.wasCorrect);
    let errorReport = 'MEDICAL CODING AUDIT ERROR REPORT\n';
    errorReport += '='.repeat(80) + '\n\n';
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
    const correctedCount = casesWithErrors.length;
    const medicalAccuracy = (correctCases / totalCases * 100).toFixed(2);
    let summary = 'MEDICAL CODING AUDIT SUMMARY\n';
    summary += '='.repeat(80) + '\n\n';
    summary += `Total Cases Audited: ${totalCases}\n`;
    summary += `Medically Correct: ${correctCases}\n`;
    summary += `Required Correction: ${correctedCount}\n`;
    summary += `Medical Accuracy: ${medicalAccuracy}%\n\n`;
    summary += `Error Categories:\n`;
    const errorCategories = new Map();
    casesWithErrors.forEach(r => {
        r.errors.forEach(e => {
            const category = e.split('-')[0].trim();
            errorCategories.set(category, (errorCategories.get(category) || 0) + 1);
        });
    });
    Array.from(errorCategories.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .forEach(([cat, count]) => {
        summary += `  ${cat}: ${count}\n`;
    });
    fs.writeFileSync(process.env.HOME + '/Desktop/summary.txt', summary);
    console.log('Medical audit complete');
    console.log(`Total: ${totalCases}`);
    console.log(`Medically correct: ${correctCases}`);
    console.log(`Corrected: ${correctedCount}`);
    console.log(`Medical accuracy: ${medicalAccuracy}%`);
    console.log('');
    console.log('Files generated:');
    console.log('  ~/Desktop/corrected_results.txt');
    console.log('  ~/Desktop/error_report.txt');
    console.log('  ~/Desktop/summary.txt');
}
runMedicalAudit().catch(console.error);
