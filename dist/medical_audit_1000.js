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
const parser_1 = require("./lib/structured/parser");
const engine_1 = require("./lib/structured/engine");
function parseClinicalStory(story) {
    // Convert clinical story to structured input
    const lines = [];
    // Extract key information from clinical story
    const lowerStory = story.toLowerCase();
    // Sepsis detection
    if (lowerStory.includes('septic shock')) {
        lines.push('Sepsis: Yes');
        lines.push('Septic Shock: Yes');
    }
    else if (lowerStory.includes('sepsis')) {
        lines.push('Sepsis: Yes');
    }
    // Infection source
    if (lowerStory.includes('uti') || lowerStory.includes('urinary')) {
        lines.push('Infection Present: Yes');
        lines.push('Infection Site: Urinary tract');
    }
    else if (lowerStory.includes('pneumonia') || lowerStory.includes('lung')) {
        lines.push('Infection Present: Yes');
        lines.push('Infection Site: Lung');
        lines.push('Pneumonia: Yes');
    }
    else if (lowerStory.includes('skin') || lowerStory.includes('cellulitis')) {
        lines.push('Infection Present: Yes');
        lines.push('Infection Site: Skin');
    }
    else if (lowerStory.includes('abdominal') || lowerStory.includes('peritonitis')) {
        lines.push('Infection Present: Yes');
        lines.push('Infection Site: Abdominal');
    }
    // Organism
    if (lowerStory.includes('e. coli') || lowerStory.includes('e.coli')) {
        lines.push('Organism: E. coli');
    }
    else if (lowerStory.includes('mrsa')) {
        lines.push('Organism: MRSA');
    }
    else if (lowerStory.includes('pseudomonas')) {
        lines.push('Organism: Pseudomonas');
    }
    else if (lowerStory.includes('staph')) {
        lines.push('Organism: Staphylococcus aureus');
    }
    else if (lowerStory.includes('strep')) {
        lines.push('Organism: Streptococcus');
    }
    // Diabetes
    if (lowerStory.includes('type 2 dm') || lowerStory.includes('type 2 diabetes')) {
        lines.push('Diabetes Type: Type 2');
    }
    else if (lowerStory.includes('type 1 dm') || lowerStory.includes('type 1 diabetes')) {
        lines.push('Diabetes Type: Type 1');
    }
    // CKD
    const ckdMatch = lowerStory.match(/ckd stage (\d)/);
    if (ckdMatch) {
        lines.push('CKD Present: Yes');
        lines.push(`CKD Stage: ${ckdMatch[1]}`);
    }
    else if (lowerStory.includes('esrd')) {
        lines.push('CKD Present: Yes');
        lines.push('CKD Stage: ESRD');
    }
    // HTN/HF
    if (lowerStory.includes('hypertension') || lowerStory.includes('htn')) {
        lines.push('Hypertension: Yes');
    }
    if (lowerStory.includes('heart failure') || lowerStory.includes('hf')) {
        lines.push('Heart Failure: Systolic');
        if (lowerStory.includes('acute on chronic')) {
            lines.push('Heart Failure Acuity: Acute on chronic');
        }
        else if (lowerStory.includes('acute')) {
            lines.push('Heart Failure Acuity: Acute');
        }
        else if (lowerStory.includes('chronic')) {
            lines.push('Heart Failure Acuity: Chronic');
        }
    }
    // COPD
    if (lowerStory.includes('copd exacerbation')) {
        lines.push('COPD: With exacerbation');
    }
    else if (lowerStory.includes('copd')) {
        lines.push('COPD: Uncomplicated');
    }
    // Respiratory failure
    if (lowerStory.includes('acute respiratory failure')) {
        lines.push('Respiratory Failure: Acute');
    }
    return lines.join('\n');
}
function auditCodes(category, clinicalStory, systemCodes) {
    const audit = {
        correct: false,
        expectedCodes: [],
        issues: [],
        rationale: ''
    };
    const story = clinicalStory.toLowerCase();
    // E. coli urosepsis with septic shock
    if (story.includes('e. coli') && story.includes('uti') && story.includes('septic shock')) {
        audit.expectedCodes = ['A41.51', 'N39.0', 'R65.21'];
        audit.rationale = 'E. coli sepsis (A41.51) + UTI source (N39.0) + Septic shock (R65.21)';
        if (systemCodes.includes('A41.51') && systemCodes.includes('N39.0') && systemCodes.includes('R65.21')) {
            audit.correct = true;
        }
        else {
            if (!systemCodes.includes('A41.51'))
                audit.issues.push('Missing A41.51 (E. coli sepsis)');
            if (!systemCodes.includes('N39.0'))
                audit.issues.push('Missing N39.0 (UTI)');
            if (!systemCodes.includes('R65.21'))
                audit.issues.push('Missing R65.21 (Septic shock)');
        }
    }
    return audit;
}
async function main() {
    console.log('='.repeat(80));
    console.log('MEDICAL CODING AUDIT - HOSPITAL 1000 CASES');
    console.log('='.repeat(80));
    console.log();
    const filePath = '/Users/khalidaitelmaati/Desktop/hospital_1000_cases_no_answers.txt';
    const content = fs.readFileSync(filePath, 'utf-8');
    // Parse cases
    const caseBlocks = content.split(/^CASE \d+$/m).filter(b => b.trim());
    console.log(`Loaded ${caseBlocks.length} cases\n`);
    const results = [];
    let processedCount = 0;
    console.log('Processing and auditing cases...\n');
    for (let i = 0; i < Math.min(caseBlocks.length, 1000); i++) {
        const block = caseBlocks[i].trim();
        if (!block)
            continue;
        // Parse case details
        const categoryMatch = block.match(/CATEGORY:\s*(.+)/);
        const ageMatch = block.match(/AGE:\s*(\d+)/);
        const genderMatch = block.match(/GENDER:\s*(.+)/);
        const encounterMatch = block.match(/ENCOUNTER TYPE:\s*(.+)/);
        const storyMatch = block.match(/CLINICAL STORY:\s*(.+)/);
        if (!storyMatch)
            continue;
        const category = categoryMatch ? categoryMatch[1].trim() : 'UNKNOWN';
        const age = ageMatch ? parseInt(ageMatch[1]) : 0;
        const gender = genderMatch ? genderMatch[1].trim() : 'Unknown';
        const encounterType = encounterMatch ? encounterMatch[1].trim() : 'Unknown';
        const clinicalStory = storyMatch[1].trim();
        // Convert to structured input
        const structuredInput = `Age: ${age}\nGender: ${gender}\nEncounter Type: ${encounterType}\n${parseClinicalStory(clinicalStory)}`;
        // Run through system
        try {
            const { context } = (0, parser_1.parseInput)(structuredInput);
            const result = (0, engine_1.runStructuredRules)(context);
            const codes = [];
            if (result.primary)
                codes.push(result.primary.code);
            codes.push(...result.secondary.map(c => c.code));
            // Audit the codes
            const medicalAudit = auditCodes(category, clinicalStory, codes);
            results.push({
                id: i + 1,
                category,
                age,
                gender,
                encounterType,
                clinicalStory,
                systemCodes: codes,
                medicalAudit
            });
            processedCount++;
            if (processedCount % 50 === 0) {
                process.stdout.write(`[${processedCount}/${caseBlocks.length}]\n`);
            }
            else {
                process.stdout.write(codes.length > 0 ? '✓' : '0');
            }
        }
        catch (error) {
            processedCount++;
            process.stdout.write('E');
        }
    }
    console.log('\n\n' + '='.repeat(80));
    console.log('AUDIT RESULTS');
    console.log('='.repeat(80));
    const withCodes = results.filter(r => r.systemCodes.length > 0);
    const noCodes = results.filter(r => r.systemCodes.length === 0);
    console.log(`Total Cases Processed: ${results.length}`);
    console.log(`Generated Codes: ${withCodes.length} (${(withCodes.length / results.length * 100).toFixed(1)}%)`);
    console.log(`No Codes: ${noCodes.length} (${(noCodes.length / results.length * 100).toFixed(1)}%)`);
    console.log();
    // Show first 20 results with medical audit
    console.log('FIRST 20 CASES - MEDICAL CODING AUDIT:\n');
    for (let i = 0; i < Math.min(20, results.length); i++) {
        const r = results[i];
        console.log(`CASE ${r.id} [${r.category}]`);
        console.log(`Clinical: ${r.clinicalStory}`);
        console.log(`System Codes: ${r.systemCodes.join(', ') || 'NONE'}`);
        if (r.medicalAudit.expectedCodes.length > 0) {
            console.log(`Expected: ${r.medicalAudit.expectedCodes.join(', ')}`);
            console.log(`Verdict: ${r.medicalAudit.correct ? '✓ CORRECT' : '✗ INCORRECT'}`);
            if (r.medicalAudit.issues.length > 0) {
                console.log(`Issues: ${r.medicalAudit.issues.join('; ')}`);
            }
            console.log(`Rationale: ${r.medicalAudit.rationale}`);
        }
        console.log();
    }
    // Save detailed report
    let report = 'MEDICAL CODING AUDIT REPORT\n';
    report += '='.repeat(80) + '\n\n';
    report += `Total Cases: ${results.length}\n`;
    report += `With Codes: ${withCodes.length}\n`;
    report += `No Codes: ${noCodes.length}\n\n`;
    results.slice(0, 50).forEach(r => {
        report += `CASE ${r.id}\n`;
        report += `Category: ${r.category}\n`;
        report += `Clinical: ${r.clinicalStory}\n`;
        report += `System: ${r.systemCodes.join(', ') || 'NONE'}\n\n`;
    });
    fs.writeFileSync('medical_audit_report.txt', report);
    console.log('Full report saved to: medical_audit_report.txt');
}
main().catch(console.error);
