"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const parser_1 = require("./parser");
const engine_1 = require("./engine");
const cases = [
    `Age: 74
Gender: Male
Encounter Type: Inpatient
Infection Present: Yes
Infection Site: Urinary (UTI)
Organism: E. Coli
Sepsis: Yes
Severe Sepsis: No
Septic Shock: No
Acute Kidney Injury / AKI: No`,
    `Age: 69
Gender: Female
Encounter Type: Inpatient
Infection Present: Yes
Infection Site: Lung (Pneumonia)
Organism: MRSA
Sepsis: Yes
Severe Sepsis: Yes
Septic Shock: No
Acute Kidney Injury / AKI: Yes`,
    `Age: 58
Gender: Male
Encounter Type: ED
Infection Present: Yes
Infection Site: Blood
Organism: Staphylococcus aureus
Sepsis: Yes
Severe Sepsis: Yes
Septic Shock: Yes
Acute Kidney Injury / AKI: Yes
Encephalopathy: Yes
Encephalopathy Type: Metabolic`,
    `Age: 72
Gender: Female
Encounter Type: Inpatient
Infection Present: Yes
Infection Site: Skin
Organism: Streptococcus
Sepsis: Yes
Severe Sepsis: No
Septic Shock: No`,
    `Age: 61
Gender: Male
Encounter Type: Inpatient
Infection Present: Yes
Infection Site: Lung (Pneumonia)
Organism: Pseudomonas
Sepsis: Yes
Severe Sepsis: Yes
Septic Shock: No
Acute Kidney Injury / AKI: Yes`,
    `Age: 79
Gender: Female
Encounter Type: Inpatient
Infection Present: Yes
Infection Site: Urinary (UTI)
Organism: E. Coli
Sepsis: Yes
Severe Sepsis: Yes
Septic Shock: Yes
Acute Kidney Injury / AKI: Yes
Encephalopathy: Yes
Encephalopathy Type: Hypoxic`,
    `Age: 44
Gender: Male
Encounter Type: Inpatient
Infection Present: Yes
Infection Site: Lung (Pneumonia)
Organism: Klebsiella
Sepsis: Yes
Severe Sepsis: No
Septic Shock: No`,
    `Age: 83
Gender: Female
Encounter Type: Inpatient
Infection Present: Yes
Infection Site: Blood
Organism: Enterococcus
Sepsis: Yes
Severe Sepsis: Yes
Septic Shock: No
Acute Kidney Injury / AKI: Yes`,
    `Age: 56
Gender: Male
Encounter Type: Inpatient
Infection Present: Yes
Infection Site: Urinary (UTI)
Organism: Proteus
Sepsis: Yes
Severe Sepsis: No
Septic Shock: No`,
    `Age: 70
Gender: Female
Encounter Type: Inpatient
Infection Present: Yes
Infection Site: Lung (Pneumonia)
Organism: MRSA
Sepsis: Yes
Severe Sepsis: Yes
Septic Shock: Yes
Acute Kidney Injury / AKI: Yes
Encephalopathy: Yes
Encephalopathy Type: Metabolic`,
    `Age: 64
Gender: Male
Encounter Type: Inpatient
Infection Present: Yes
Infection Site: Abdominal
Organism: E. Coli
Sepsis: Yes
Severe Sepsis: Yes
Septic Shock: No
Acute Kidney Injury / AKI: Yes`,
    `Age: 77
Gender: Female
Encounter Type: Inpatient
Infection Present: Yes
Infection Site: Skin
Organism: MRSA
Sepsis: Yes
Severe Sepsis: No
Septic Shock: No`,
    `Age: 49
Gender: Male
Encounter Type: ED
Infection Present: Yes
Infection Site: Lung (Pneumonia)
Organism: Influenza
Sepsis: Yes
Severe Sepsis: No
Septic Shock: No`,
    `Age: 85
Gender: Female
Encounter Type: Inpatient
Infection Present: Yes
Infection Site: Urinary (UTI)
Organism: Candida
Sepsis: Yes
Severe Sepsis: Yes
Septic Shock: No
Acute Kidney Injury / AKI: Yes`,
    `Age: 62
Gender: Male
Encounter Type: Inpatient
Infection Present: Yes
Infection Site: Abdominal
Organism: Bacteroides
Sepsis: Yes
Severe Sepsis: Yes
Septic Shock: Yes
Acute Kidney Injury / AKI: Yes
Encephalopathy: Yes
Encephalopathy Type: Hypoxic`,
    `Age: 73
Gender: Female
Encounter Type: Inpatient
Infection Present: Yes
Infection Site: Lung (Pneumonia)
Organism: MRSA
Sepsis: Yes
Severe Sepsis: No
Septic Shock: No`,
    `Age: 55
Gender: Male
Encounter Type: Inpatient
Infection Present: Yes
Infection Site: Blood
Organism: E. Coli
Sepsis: Yes
Severe Sepsis: Yes
Septic Shock: No
Acute Kidney Injury / AKI: Yes`,
    `Age: 69
Gender: Female
Encounter Type: Inpatient
Infection Present: Yes
Infection Site: Skin
Organism: Pseudomonas
Sepsis: Yes
Severe Sepsis: No
Septic Shock: No`,
    `Age: 51
Gender: Male
Encounter Type: ED
Infection Present: Yes
Infection Site: Lung (Pneumonia)
Organism: Legionella
Sepsis: Yes
Severe Sepsis: Yes
Septic Shock: Yes
Acute Kidney Injury / AKI: Yes`,
    `Age: 80
Gender: Female
Encounter Type: Inpatient
Infection Present: Yes
Infection Site: Urinary (UTI)
Organism: Enterobacter
Sepsis: Yes
Severe Sepsis: No
Septic Shock: No`
];
console.log('Running User Batch Tests...\n');
cases.forEach((caseText, index) => {
    console.log(`TEST ${index + 1}`);
    const { context, errors } = (0, parser_1.parseInput)(caseText);
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
        console.log('Output: ' + codes.map(c => c === null || c === void 0 ? void 0 : c.code).join(', '));
    }
    console.log('');
});
