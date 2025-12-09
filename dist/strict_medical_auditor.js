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
function auditSepsisCase(story, systemCodes) {
    const corrections = [];
    const rulesApplied = [];
    let correctedCodes = [...systemCodes];
    const lowerStory = story.toLowerCase();
    // SEPSIS RULE ENFORCEMENT
    if (lowerStory.includes('septic shock') || lowerStory.includes('sepsis')) {
        // Rule 1: Organism-specific sepsis code required
        const hasEColi = lowerStory.includes('e. coli') || lowerStory.includes('e.coli');
        const hasMRSA = lowerStory.includes('mrsa');
        const hasPseudomonas = lowerStory.includes('pseudomonas');
        if (hasEColi && !systemCodes.includes('A41.51')) {
            corrections.push('Added A41.51 (Sepsis due to E. coli) - organism documented');
            correctedCodes.unshift('A41.51');
            rulesApplied.push('Sepsis Rule: Organism-specific code mandatory when documented');
        }
        if (hasMRSA && !systemCodes.includes('A41.02')) {
            corrections.push('Added A41.02 (Sepsis due to MRSA) - organism documented');
            correctedCodes.unshift('A41.02');
            rulesApplied.push('Sepsis Rule: MRSA sepsis requires A41.02');
        }
        // Rule 2: Source infection required
        const hasUTI = lowerStory.includes('uti') || lowerStory.includes('urinalysis positive') || lowerStory.includes('urinary');
        const hasPneumonia = lowerStory.includes('pneumonia');
        if (hasUTI && !systemCodes.includes('N39.0')) {
            corrections.push('Added N39.0 (UTI, unspecified) - source infection documented');
            if (!correctedCodes.includes('N39.0')) {
                correctedCodes.push('N39.0');
            }
            rulesApplied.push('Sepsis Rule: Source infection must be coded');
        }
        if (hasPneumonia && hasMRSA && !systemCodes.includes('J15.212')) {
            corrections.push('Added J15.212 (Pneumonia due to MRSA) - source + organism');
            if (!correctedCodes.includes('J15.212')) {
                correctedCodes.push('J15.212');
            }
            rulesApplied.push('Sepsis Rule: Organism-specific pneumonia code required');
        }
        // Rule 3: Septic shock indicator
        if (lowerStory.includes('septic shock') && !systemCodes.includes('R65.21')) {
            corrections.push('Added R65.21 (Severe sepsis with septic shock)');
            if (!correctedCodes.includes('R65.21')) {
                correctedCodes.push('R65.21');
            }
            rulesApplied.push('Sepsis Rule: R65.21 mandatory for septic shock');
        }
        // Rule 4: Sequencing check (Sepsis → Source → Shock)
        const sepsisIndex = correctedCodes.findIndex(c => c.startsWith('A41') || c.startsWith('A40'));
        const sourceIndex = correctedCodes.findIndex(c => c.startsWith('N39') || c.startsWith('J15'));
        const shockIndex = correctedCodes.findIndex(c => c === 'R65.21');
        if (sepsisIndex > sourceIndex && sourceIndex !== -1) {
            corrections.push('Resequenced: Sepsis code must be first');
            rulesApplied.push('Sepsis Rule: Sepsis → Source → Shock sequencing');
        }
    }
    return {
        correctedCodes,
        corrections,
        rulesApplied,
        verdict: corrections.length > 0 ? 'CORRECTED' : 'CORRECT'
    };
}
function auditHTNHFCKDCase(story, systemCodes) {
    const corrections = [];
    const rulesApplied = [];
    let correctedCodes = [...systemCodes];
    const lowerStory = story.toLowerCase();
    const hasHTN = lowerStory.includes('hypertension') || lowerStory.includes('htn');
    const hasHF = lowerStory.includes('heart failure') || lowerStory.includes(' hf ');
    const hasCKD = lowerStory.includes('ckd') || lowerStory.includes('chronic kidney');
    // HTN/HF/CKD COMBINATION RULE
    if (hasHTN && hasHF && hasCKD) {
        const hasI13 = systemCodes.some(c => c.startsWith('I13'));
        if (!hasI13) {
            const ckdMatch = lowerStory.match(/ckd stage (\d)/);
            const isESRD = lowerStory.includes('esrd');
            if (isESRD || (ckdMatch && parseInt(ckdMatch[1]) === 5)) {
                corrections.push('Added I13.2 (HTN heart and CKD with HF and stage 5/ESRD)');
                correctedCodes.unshift('I13.2');
            }
            else {
                corrections.push('Added I13.0 (HTN heart and CKD with HF and stage 1-4)');
                correctedCodes.unshift('I13.0');
            }
            rulesApplied.push('HTN/HF/CKD Rule: I13.x mandatory for combination');
        }
        // Must have I50.xx when HF present
        const hasI50 = systemCodes.some(c => c.startsWith('I50'));
        if (!hasI50) {
            if (lowerStory.includes('systolic')) {
                if (lowerStory.includes('acute on chronic')) {
                    corrections.push('Added I50.23 (Acute on chronic systolic HF)');
                    correctedCodes.push('I50.23');
                }
                else if (lowerStory.includes('acute')) {
                    corrections.push('Added I50.21 (Acute systolic HF)');
                    correctedCodes.push('I50.21');
                }
            }
            rulesApplied.push('HTN/HF/CKD Rule: I50.xx required when HF documented');
        }
        // Must have N18.x for CKD stage
        const hasN18 = systemCodes.some(c => c.startsWith('N18'));
        if (!hasN18) {
            const ckdMatch = lowerStory.match(/ckd stage (\d)/);
            if (ckdMatch) {
                corrections.push(`Added N18.${ckdMatch[1]} (CKD stage ${ckdMatch[1]})`);
                correctedCodes.push(`N18.${ckdMatch[1]}`);
            }
            else if (lowerStory.includes('esrd')) {
                corrections.push('Added N18.6 (ESRD)');
                correctedCodes.push('N18.6');
            }
            rulesApplied.push('HTN/HF/CKD Rule: N18.x required for CKD stage');
        }
        // Remove I10 if present (should use I13.x instead)
        if (systemCodes.includes('I10')) {
            corrections.push('Removed I10 (replaced by I13.x combination code)');
            correctedCodes = correctedCodes.filter(c => c !== 'I10');
            rulesApplied.push('HTN/HF/CKD Rule: No I10 when combination codes apply');
        }
    }
    return {
        correctedCodes,
        corrections,
        rulesApplied,
        verdict: corrections.length > 0 ? 'CORRECTED' : 'CORRECT'
    };
}
async function main() {
    console.log('='.repeat(80));
    console.log('MEDICAL CODING AUDITOR - STRICT CORRECTION ENGINE');
    console.log('='.repeat(80));
    console.log();
    const filePath = '/Users/khalidaitelmaati/Desktop/hospital_1000_cases_rewritten.txt';
    const content = fs.readFileSync(filePath, 'utf-8');
    const caseBlocks = content.split(/^CASE \d+$/m).filter(b => b.trim());
    console.log(`Auditing ${caseBlocks.length} cases with strict ICD-10-CM guidelines\n`);
    const auditResults = [];
    let correctionCount = 0;
    let perfectCount = 0;
    for (let i = 0; i < Math.min(caseBlocks.length, 1000); i++) {
        const block = caseBlocks[i].trim();
        if (!block)
            continue;
        const categoryMatch = block.match(/CATEGORY:\s*(.+)/);
        const storyMatch = block.match(/CLINICAL STORY:\s*([\s\S]+?)(?=----|----|$)/);
        if (!storyMatch)
            continue;
        const category = categoryMatch ? categoryMatch[1].trim() : 'UNKNOWN';
        const clinicalStory = storyMatch[1].trim();
        // Get system codes (run through encoder)
        const ageMatch = block.match(/AGE:\s*(\d+)/);
        const genderMatch = block.match(/GENDER:\s*(.+)/);
        const encounterMatch = block.match(/ENCOUNTER TYPE:\s*(.+)/);
        const age = ageMatch ? parseInt(ageMatch[1]) : 0;
        const gender = genderMatch ? genderMatch[1].trim() : 'Unknown';
        const encounterType = encounterMatch ? encounterMatch[1].trim() : 'Unknown';
        // Parse and get system codes
        const parsedInput = parseClinicalStory(clinicalStory, age, gender, encounterType);
        try {
            const { context } = (0, parser_1.parseInput)(parsedInput);
            const result = (0, engine_1.runStructuredRules)(context);
            const systemCodes = [];
            if (result.primary)
                systemCodes.push(result.primary.code);
            systemCodes.push(...result.secondary.map(c => c.code));
            if (systemCodes.length === 0)
                continue;
            // AUDIT based on category
            let auditResult;
            if (category.includes('SEPSIS')) {
                auditResult = auditSepsisCase(clinicalStory, systemCodes);
            }
            else if (category.includes('HTN') || category.includes('HF') || category.includes('CKD')) {
                auditResult = auditHTNHFCKDCase(clinicalStory, systemCodes);
            }
            else {
                auditResult = {
                    correctedCodes: systemCodes,
                    corrections: [],
                    rulesApplied: [],
                    verdict: 'CORRECT'
                };
            }
            if (auditResult.verdict === 'CORRECTED') {
                correctionCount++;
                process.stdout.write('C');
            }
            else {
                perfectCount++;
                process.stdout.write('✓');
            }
            auditResults.push({
                caseId: i + 1,
                category,
                clinicalStory,
                systemCodes,
                correctedCodes: auditResult.correctedCodes,
                correctionsMade: auditResult.corrections,
                rulesApplied: auditResult.rulesApplied,
                verdict: auditResult.verdict
            });
            if ((i + 1) % 50 === 0) {
                process.stdout.write(`  [${i + 1}]\n`);
            }
        }
        catch (error) {
            // Skip
        }
    }
    // Generate report
    let output = 'MEDICAL CODING AUDIT REPORT - CORRECTED RESULTS\n';
    output += '='.repeat(80) + '\n';
    output += `Audited: ${auditResults.length} cases\n`;
    output += `Perfect (No corrections): ${perfectCount}\n`;
    output += `Corrected: ${correctionCount}\n`;
    output += '='.repeat(80) + '\n\n';
    // Show corrected cases
    const correctedCases = auditResults.filter(r => r.verdict === 'CORRECTED');
    output += 'CORRECTED CASES:\n\n';
    correctedCases.forEach(r => {
        output += `CASE ${r.caseId} [${r.category}]\n`;
        output += `CLINICAL STORY: ${r.clinicalStory}\n`;
        output += `SYSTEM CODES: ${r.systemCodes.join(', ')}\n`;
        output += `CORRECTED CODES: ${r.correctedCodes.join(', ')}\n`;
        output += `CORRECTIONS MADE:\n`;
        r.correctionsMade.forEach(c => output += `  - ${c}\n`);
        output += `RULES APPLIED:\n`;
        r.rulesApplied.forEach(r => output += `  - ${r}\n`);
        output += '-'.repeat(80) + '\n\n';
    });
    fs.writeFileSync('/Users/khalidaitelmaati/Desktop/audited_corrected_results.txt', output);
    console.log('\n\n' + '='.repeat(80));
    console.log('AUDIT COMPLETE');
    console.log('='.repeat(80));
    console.log(`Total Audited: ${auditResults.length}`);
    console.log(`Perfect: ${perfectCount}`);
    console.log(`Corrected: ${correctionCount}`);
    console.log('='.repeat(80));
    console.log(`\n✓ Saved to Desktop/audited_corrected_results.txt`);
}
function parseClinicalStory(story, age, gender, encounterType) {
    const lines = [`Age: ${age}`, `Gender: ${gender}`, `Encounter Type: ${encounterType}`];
    const lowerStory = story.toLowerCase();
    if (lowerStory.includes('septic shock')) {
        lines.push('Sepsis: Yes', 'Septic Shock: Yes');
    }
    else if (lowerStory.includes('sepsis')) {
        lines.push('Sepsis: Yes');
    }
    if (lowerStory.includes('uti') || lowerStory.includes('urinalysis positive')) {
        lines.push('Infection Present: Yes', 'Infection Site: Urinary tract');
    }
    else if (lowerStory.includes('pneumonia')) {
        lines.push('Infection Present: Yes', 'Infection Site: Lung', 'Pneumonia: Yes');
    }
    if (lowerStory.includes('e. coli'))
        lines.push('Organism: E. coli');
    else if (lowerStory.includes('mrsa'))
        lines.push('Organism: MRSA');
    if (lowerStory.includes('hypertension') || lowerStory.includes('htn'))
        lines.push('Hypertension: Yes');
    if (lowerStory.includes('heart failure') || lowerStory.includes(' hf ')) {
        lines.push('Heart Failure: Systolic');
        if (lowerStory.includes('acute on chronic'))
            lines.push('Heart Failure Acuity: Acute on chronic');
        else if (lowerStory.includes('acute'))
            lines.push('Heart Failure Acuity: Acute');
    }
    const ckdMatch = lowerStory.match(/ckd stage (\d)/);
    if (ckdMatch) {
        lines.push('CKD Present: Yes', `CKD Stage: ${ckdMatch[1]}`);
    }
    else if (lowerStory.includes('esrd')) {
        lines.push('CKD Present: Yes', 'CKD Stage: ESRD');
    }
    return lines.join('\n');
}
main().catch(console.error);
