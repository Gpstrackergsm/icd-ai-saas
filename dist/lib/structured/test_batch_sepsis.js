"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const parser_1 = require("./parser");
const engine_1 = require("./engine");
const cases = [
    `Age: 66
Gender: Male
Encounter Type: Inpatient
Sepsis: Yes
Severe Sepsis: No
Septic Shock: No
Infection Site: Urinary (UTI)
Organism: E. Coli
Acute Kidney Injury / AKI: No
Pneumonia: No`,
    `Age: 72
Gender: Female
Encounter Type: Inpatient
Sepsis: Yes
Severe Sepsis: Yes
Septic Shock: No
Infection Site: Lung (Pneumonia)
Organism: MRSA
Acute Kidney Injury / AKI: Yes
Encephalopathy: No`,
    `Age: 58
Gender: Male
Encounter Type: ED
Sepsis: Yes
Severe Sepsis: Yes
Septic Shock: Yes
Infection Site: Blood
Organism: Staphylococcus aureus
Acute Kidney Injury / AKI: Yes
Encephalopathy: Yes`,
    `Age: 70
Gender: Female
Encounter Type: Inpatient
Sepsis: Yes
Severe Sepsis: No
Septic Shock: No
Infection Site: Skin
Organism: Streptococcus
Acute Kidney Injury / AKI: No
Pneumonia: No`,
    `Age: 63
Gender: Male
Encounter Type: Inpatient
Sepsis: Yes
Severe Sepsis: Yes
Septic Shock: No
Infection Site: Lung (Pneumonia)
Organism: Pseudomonas
Acute Kidney Injury / AKI: Yes
Encephalopathy: No`,
    `Age: 77
Gender: Female
Encounter Type: Inpatient
Sepsis: Yes
Severe Sepsis: Yes
Septic Shock: Yes
Infection Site: Urinary (UTI)
Organism: E. Coli
Acute Kidney Injury / AKI: Yes
Encephalopathy: Yes`,
    `Age: 46
Gender: Male
Encounter Type: Inpatient
Sepsis: Yes
Severe Sepsis: No
Septic Shock: No
Infection Site: Lung (Pneumonia)
Organism: Klebsiella
Acute Kidney Injury / AKI: No
Pneumonia: Yes`,
    `Age: 81
Gender: Female
Encounter Type: Inpatient
Sepsis: Yes
Severe Sepsis: Yes
Septic Shock: No
Infection Site: Blood
Organism: Enterococcus
Acute Kidney Injury / AKI: Yes
Encephalopathy: No`,
    `Age: 55
Gender: Male
Encounter Type: Inpatient
Sepsis: Yes
Severe Sepsis: No
Septic Shock: No
Infection Site: Urinary (UTI)
Organism: Proteus
Acute Kidney Injury / AKI: No
Pneumonia: No`,
    `Age: 69
Gender: Female
Encounter Type: Inpatient
Sepsis: Yes
Severe Sepsis: Yes
Septic Shock: Yes
Infection Site: Lung (Pneumonia)
Organism: MRSA
Acute Kidney Injury / AKI: Yes
Encephalopathy: Yes`,
    `Age: 62
Gender: Male
Encounter Type: Inpatient
Sepsis: Yes
Severe Sepsis: Yes
Septic Shock: No
Infection Site: Abdominal
Organism: E. Coli
Acute Kidney Injury / AKI: Yes
Encephalopathy: No`,
    `Age: 75
Gender: Female
Encounter Type: Inpatient
Sepsis: Yes
Severe Sepsis: No
Septic Shock: No
Infection Site: Skin
Organism: MRSA
Acute Kidney Injury / AKI: No
Pneumonia: No`,
    `Age: 48
Gender: Male
Encounter Type: ED
Sepsis: Yes
Severe Sepsis: No
Septic Shock: No
Infection Site: Lung (Pneumonia)
Organism: Influenza
Acute Kidney Injury / AKI: No`,
    `Age: 83
Gender: Female
Encounter Type: Inpatient
Sepsis: Yes
Severe Sepsis: Yes
Septic Shock: No
Infection Site: Urinary (UTI)
Organism: Candida
Acute Kidney Injury / AKI: Yes`,
    `Age: 60
Gender: Male
Encounter Type: Inpatient
Sepsis: Yes
Severe Sepsis: Yes
Septic Shock: Yes
Infection Site: Abdominal
Organism: Bacteroides
Acute Kidney Injury / AKI: Yes
Encephalopathy: Yes`,
    `Age: 71
Gender: Female
Encounter Type: Inpatient
Sepsis: Yes
Severe Sepsis: No
Septic Shock: No
Infection Site: Lung (Pneumonia)
Organism: MRSA
Acute Kidney Injury / AKI: No`,
    `Age: 57
Gender: Male
Encounter Type: Inpatient
Sepsis: Yes
Severe Sepsis: Yes
Septic Shock: No
Infection Site: Blood
Organism: E. Coli
Acute Kidney Injury / AKI: Yes`,
    `Age: 68
Gender: Female
Encounter Type: Inpatient
Sepsis: Yes
Severe Sepsis: No
Septic Shock: No
Infection Site: Skin
Organism: Pseudomonas
Acute Kidney Injury / AKI: No`,
    `Age: 52
Gender: Male
Encounter Type: ED
Sepsis: Yes
Severe Sepsis: Yes
Septic Shock: Yes
Infection Site: Lung (Pneumonia)
Organism: Legionella
Acute Kidney Injury / AKI: Yes`,
    `Age: 79
Gender: Female
Encounter Type: Inpatient
Sepsis: Yes
Severe Sepsis: No
Septic Shock: No
Infection Site: Urinary (UTI)
Organism: Enterobacter
Acute Kidney Injury / AKI: No`
];
console.log('Running Batch Sepsis Tests...\n');
cases.forEach((caseText, index) => {
    var _a, _b, _c, _d, _e;
    console.log(`--- Case ${index + 1} ---`);
    // Extract key details for header
    const lines = caseText.split('\n');
    const age = (_a = lines.find(l => l.startsWith('Age:'))) === null || _a === void 0 ? void 0 : _a.split(':')[1].trim();
    const gender = (_b = lines.find(l => l.startsWith('Gender:'))) === null || _b === void 0 ? void 0 : _b.split(':')[1].trim();
    const organism = (_c = lines.find(l => l.includes('Organism:'))) === null || _c === void 0 ? void 0 : _c.split(':')[1].trim();
    const site = (_d = lines.find(l => l.includes('Infection Site:'))) === null || _d === void 0 ? void 0 : _d.split(':')[1].trim();
    console.log(`Patient: ${age}${gender === 'Male' ? 'M' : 'F'}, ${site}, ${organism}`);
    const { context, errors } = (0, parser_1.parseInput)(caseText);
    // DEBUG: Check parsed organism
    console.log(`DEBUG: Parsed Organism: '${(_e = context.conditions.infection) === null || _e === void 0 ? void 0 : _e.organism}'`);
    if (errors.length > 0) {
        console.log('❌ Parse Errors:', errors);
        return;
    }
    const result = (0, engine_1.runStructuredRules)(context);
    const codes = [result.primary, ...result.secondary].filter(c => c);
    if (codes.length === 0) {
        console.log('❌ No codes generated');
    }
    else {
        console.log('Codes: ' + codes.map(c => c === null || c === void 0 ? void 0 : c.code).join(', '));
        // console.log('Labels: ' + codes.map(c => c?.label).join(' | '));
    }
    console.log('');
});
