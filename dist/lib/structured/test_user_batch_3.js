"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const parser_1 = require("./parser");
const engine_1 = require("./engine");
const cases = [
    `Age: 82
Gender: Female
Encounter Type: Inpatient
Sepsis: Yes
Severe Sepsis: Yes
Septic Shock: Yes
Infection Site: Lung (Pneumonia)
Organism: MRSA
Acute Kidney Injury / AKI: Yes
Encephalopathy: Yes
Encephalopathy Type: Hypoxic
Diabetes Type: Type 2
Complications: Nephropathy (CKD)
CKD Present: Yes
CKD Stage: 4
Dialysis / Dialysis Status: None`,
    `Age: 74
Gender: Male
Encounter Type: Inpatient
Sepsis: Yes
Severe Sepsis: No
Septic Shock: No
Infection Site: Blood
Organism: Candida
Diabetes Type: Type 1
Complications: Retinopathy
Insulin Use: Yes`,
    `Age: 67
Gender: Female
Encounter Type: Inpatient
Sepsis: Yes
Severe Sepsis: Yes
Septic Shock: No
Infection Site: Abdominal
Organism: Bacteroides
Acute Kidney Injury / AKI: Yes
Chronic Obstructive Pulmonary Disease: Yes`,
    `Age: 59
Gender: Male
Encounter Type: ICU
Sepsis: Yes
Severe Sepsis: Yes
Septic Shock: Yes
Infection Site: Lung (Pneumonia)
Organism: Legionella
Heart Failure: Yes
Heart Failure Type: Systolic
Heart Failure Acuity: Acute
Hypertension: Yes`,
    `Age: 88
Gender: Female
Encounter Type: Inpatient
Sepsis: Yes
Severe Sepsis: No
Septic Shock: No
Infection Site: Urinary (UTI)
Organism: E. Coli
Acute Kidney Injury / AKI: No
Heart Failure: Yes
Heart Failure Type: Diastolic
Heart Failure Acuity: Chronic`,
    `Age: 71
Gender: Male
Encounter Type: ICU
Sepsis: Yes
Severe Sepsis: Yes
Septic Shock: Yes
Infection Site: Blood
Organism: Staphylococcus aureus
Acute Kidney Injury / AKI: Yes
Encephalopathy: Yes
Encephalopathy Type: Metabolic
Diabetes Type: Type 2
Complications: Foot Ulcer
Ulcer Location: Left Foot
Ulcer Severity / Ulcer Depth: Bone`,
    `Age: 69
Gender: Female
Encounter Type: Inpatient
Sepsis: Yes
Severe Sepsis: No
Septic Shock: No
Infection Site: Skin
Organism: Pseudomonas
Pressure Ulcer: Yes
Ulcer Location: Sacral
Ulcer Stage: 4`,
    `Age: 76
Gender: Male
Encounter Type: Inpatient
Sepsis: Yes
Severe Sepsis: Yes
Septic Shock: No
Infection Site: Lung (Pneumonia)
Organism: MRSA
Acute Kidney Injury / AKI: Yes
Chronic Kidney Disease: Yes
CKD Stage: 5
Dialysis / Dialysis Status: Chronic`,
    `Age: 54
Gender: Female
Encounter Type: ED
Sepsis: Yes
Severe Sepsis: No
Septic Shock: No
Infection Site: Blood
Organism: Enterococcus`,
    `Age: 80
Gender: Male
Encounter Type: Inpatient
Sepsis: Yes
Severe Sepsis: Yes
Septic Shock: Yes
Infection Site: Urinary (UTI)
Organism: Proteus
Acute Kidney Injury / AKI: Yes
Encephalopathy: Yes
Encephalopathy Type: Hypoxic`,
    `Age: 62
Gender: Female
Encounter Type: Inpatient
Sepsis: Yes
Severe Sepsis: No
Septic Shock: No
Infection Site: Lung (Pneumonia)
Organism: Influenza`,
    `Age: 70
Gender: Male
Encounter Type: ICU
Sepsis: Yes
Severe Sepsis: Yes
Septic Shock: No
Infection Site: Skin
Organism: MRSA
Diabetes Type: Type 2
Complications: Neuropathy`,
    `Age: 65
Gender: Female
Encounter Type: Inpatient
Sepsis: Yes
Severe Sepsis: Yes
Septic Shock: Yes
Infection Site: Abdominal
Organism: E. Coli
Acute Kidney Injury / AKI: Yes
Chronic Kidney Disease: Yes
CKD Stage: 3`,
    `Age: 73
Gender: Male
Encounter Type: ICU
Sepsis: Yes
Severe Sepsis: No
Septic Shock: No
Infection Site: Lung (Pneumonia)
Organism: Klebsiella
Heart Failure: Yes
Heart Failure Type: Combined
Heart Failure Acuity: Acute`,
    `Age: 60
Gender: Female
Encounter Type: Inpatient
Sepsis: Yes
Severe Sepsis: Yes
Septic Shock: Yes
Infection Site: Blood
Organism: E. Coli
Diabetes Type: Type 1
Complications: Nephropathy (CKD)
CKD Stage: 5
Dialysis / Dialysis Status: Chronic`,
    `Age: 78
Gender: Male
Encounter Type: Inpatient
Sepsis: Yes
Severe Sepsis: No
Septic Shock: No
Infection Site: Skin
Organism: Enterobacter`,
    `Age: 56
Gender: Female
Encounter Type: ED
Sepsis: Yes
Severe Sepsis: Yes
Septic Shock: No
Infection Site: Lung (Pneumonia)
Organism: Pseudomonas
Acute Kidney Injury / AKI: Yes`,
    `Age: 83
Gender: Male
Encounter Type: Inpatient
Sepsis: Yes
Severe Sepsis: No
Septic Shock: No
Infection Site: Urinary (UTI)
Organism: Candida`,
    `Age: 71
Gender: Female
Encounter Type: ICU
Sepsis: Yes
Severe Sepsis: Yes
Septic Shock: Yes
Infection Site: Lung (Pneumonia)
Organism: MRSA
Acute Kidney Injury / AKI: Yes
Encephalopathy: Yes
Encephalopathy Type: Hypoxic`,
    `Age: 64
Gender: Male
Encounter Type: Inpatient
Sepsis: Yes
Severe Sepsis: No
Septic Shock: No
Infection Site: Abdominal
Organism: Bacteroides`
];
console.log('Running User Batch Tests Set 3...\n');
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
