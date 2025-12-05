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
const parser_1 = require("./lib/structured/parser");
const engine_1 = require("./lib/structured/engine");
const validator_post_1 = require("./lib/structured/validator-post");
const fs = __importStar(require("fs"));
function arraysEqual(a, b) {
    if (a.length !== b.length)
        return false;
    for (let i = 0; i < a.length; i++) {
        if (a[i] !== b[i])
            return false;
    }
    return true;
}
// Convert free-form clinical text to structured format
function convertToStructuredFormat(primary, secondary, domain) {
    const p = primary.toLowerCase();
    const s = secondary.toLowerCase();
    let structured = '';
    // Pulmonology cases
    if (p.includes('acute exacerbation of chronic obstructive pulmonary disease')) {
        structured += 'COPD: With exacerbation\n';
    }
    if (s.includes('tobacco dependence')) {
        structured += 'Tobacco Use: Yes\n';
    }
    // Diabetes cases  
    if (p.includes('type 2 diabetes')) {
        structured += 'Diabetes Type: Type 2\n';
    }
    else if (p.includes('type 1 diabetes')) {
        structured += 'Diabetes Type: Type 1\n';
    }
    if (p.includes('diabetic chronic kidney disease') || p.includes('diabetic nephropathy')) {
        structured += 'Complications: Nephropathy/CKD\n';
    }
    if (s.includes('stage 3b'))
        structured += 'CKD Stage: 3b\n';
    else if (s.includes('stage 3a'))
        structured += 'CKD Stage: 3a\n';
    else if (s.includes('stage 3'))
        structured += 'CKD Stage: 3\n';
    else if (s.includes('stage 2'))
        structured += 'CKD Stage: 2\n';
    else if (s.includes('stage 4'))
        structured += 'CKD Stage: 4\n';
    else if (s.includes('stage 5'))
        structured += 'CKD Stage: 5\n';
    // Sepsis cases
    if (p.includes('severe sepsis') && p.includes('septic shock')) {
        structured += 'Sepsis: Yes\n';
        structured += 'Septic Shock: Yes\n';
    }
    if (p.includes('staphylococcus aureus') || p.includes('mrsa')) {
        structured += 'Organism: MRSA\n';
    }
    if (p.includes('pneumonia')) {
        structured += 'Pneumonia: Yes\n';
        structured += 'Site: Lung\n';
    }
    if (s.includes('acute respiratory failure with hypoxia')) {
        structured += 'Respiratory Failure: Acute\n';
        structured += 'Hypoxia: Yes\n';
    }
    // Cardiology cases
    if (p.includes('atrial fibrillation')) {
        structured += 'Diagnosis: Atrial fibrillation\n';
    }
    if (p.includes('long-term anticoagulant')) {
        structured += 'Long-term anticoagulant use: Yes\n';
    }
    // Neurology cases
    if (p.includes('alzheimer')) {
        structured += 'Diagnosis: Alzheimer disease\n';
    }
    if (p.includes('behavioral disturbance')) {
        structured += 'Behavioral disturbance: Yes\n';
    }
    // CKD & Nephrology
    if (p.includes('acute kidney failure') && p.includes('superimposed on chronic kidney disease')) {
        structured += 'AKI: Yes\n';
        structured += 'CKD Present: Yes\n';
        if (p.includes('stage 3'))
            structured += 'CKD Stage: 3\n';
    }
    // Oncology
    if (p.includes('history of malignant neoplasm')) {
        structured += 'History: Cancer\n';
    }
    if (p.includes('breast')) {
        structured += 'Site: Breast\n';
    }
    if (p.includes('status post chemotherapy') || p.includes('chemotherapy')) {
        structured += 'Chemotherapy: Yes\n';
    }
    // OB/GYN
    if (p.includes('normal labor')) {
        structured += 'Labor: Normal\n';
    }
    if (p.includes('39 weeks')) {
        structured += 'Gestation: 39 weeks\n';
    }
    // Liver & GI
    if (p.includes('alcoholic cirrhosis')) {
        structured += 'Diagnosis: Alcoholic cirrhosis of liver\n';
    }
    if (p.includes('ascites') || s.includes('ascites')) {
        structured += 'Ascites: Yes\n';
    }
    // Infectious Disease
    if (p.includes('urinary tract infection') && p.includes('indwelling urinary catheter')) {
        structured += 'Diagnosis: UTI associated with catheter\n';
    }
    // Psychiatry
    if (p.includes('major depressive disorder')) {
        structured += 'Diagnosis: Major depressive disorder\n';
    }
    if (p.includes('single episode')) {
        structured += 'Episode: Single\n';
    }
    if (p.includes('moderate')) {
        structured += 'Severity: Moderate\n';
    }
    // Dermatology
    if (p.includes('third degree burn')) {
        structured += 'Diagnosis: Third degree burn\n';
    }
    if (p.includes('right forearm')) {
        structured += 'Location: Right forearm\n';
    }
    if (p.includes('initial encounter')) {
        structured += 'Encounter: Initial\n';
    }
    return structured;
}
async function runVerification() {
    const testData = JSON.parse(fs.readFileSync('./data/icd10_test_cases_1000.json', 'utf-8'));
    const results = [];
    const domainStats = {};
    for (const testCase of testData) {
        const { id, domain, age, gender, encounter, primary, secondary, expected_codes } = testCase;
        // Convert to structured format
        const structuredFields = convertToStructuredFormat(primary, secondary, domain);
        const structuredInput = `Age: ${age}
Gender: ${gender}
Encounter Type: ${encounter}
${structuredFields}`;
        // Run through structured ICD engine
        const { context } = (0, parser_1.parseInput)(structuredInput);
        const engineResult = (0, engine_1.runStructuredRules)(context);
        const validated = (0, validator_post_1.validateCodeSet)(engineResult.primary, engineResult.secondary, context);
        const generatedCodes = validated.codes.map(c => c.code);
        // Compare
        const status = arraysEqual(generatedCodes, expected_codes) ? 'PASS' : 'FAIL';
        results.push({
            id,
            domain,
            status,
            expected: expected_codes,
            generated: generatedCodes
        });
        // Update domain stats
        if (!domainStats[domain]) {
            domainStats[domain] = { passed: 0, total: 0 };
        }
        domainStats[domain].total++;
        if (status === 'PASS') {
            domainStats[domain].passed++;
        }
    }
    // Calculate aggregate stats
    const total = results.length;
    const passed = results.filter(r => r.status === 'PASS').length;
    const failed = total - passed;
    const accuracy = ((passed / total) * 100).toFixed(2);
    // Generate report
    console.log('ICD-10-CM ENGINE — AUTOMATED TEST REPORT\\n');
    console.log(`Total Cases: ${total}`);
    console.log(`Passed: ${passed}`);
    console.log(`Failed: ${failed}`);
    console.log(`Accuracy: ${accuracy}%\\n`);
    console.log('Batch Summary (by domain):');
    const sortedDomains = Object.keys(domainStats).sort();
    for (const domain of sortedDomains) {
        const stats = domainStats[domain];
        console.log(`${domain}: ${stats.passed}/${stats.total}`);
    }
    console.log('\\nFINAL STATUS:');
    if (accuracy === '100.00') {
        console.log('✅ SYSTEM VALIDATED — 100% PASS');
    }
    else {
        console.log(`❌ SYSTEM FAILED — Accuracy ${accuracy}%`);
    }
    // Save detailed failure log
    const failures = results.filter(r => r.status === 'FAIL');
    if (failures.length > 0) {
        const failureLog = failures.map(f => ({
            id: f.id,
            domain: f.domain,
            expected: f.expected,
            generated: f.generated
        }));
        fs.writeFileSync('./test_1000_failures.json', JSON.stringify(failureLog, null, 2));
        console.log(`\\nDetailed failures saved to: test_1000_failures.json`);
    }
}
runVerification().catch(console.error);
