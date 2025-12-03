
import { parseInput } from './parser';
import { runStructuredRules } from './engine';

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
    console.log(`--- Case ${index + 1} ---`);
    // Extract key details for header
    const lines = caseText.split('\n');
    const age = lines.find(l => l.startsWith('Age:'))?.split(':')[1].trim();
    const gender = lines.find(l => l.startsWith('Gender:'))?.split(':')[1].trim();
    const organism = lines.find(l => l.includes('Organism:'))?.split(':')[1].trim();
    const site = lines.find(l => l.includes('Infection Site:'))?.split(':')[1].trim();

    console.log(`Patient: ${age}${gender === 'Male' ? 'M' : 'F'}, ${site}, ${organism}`);

    const { context, errors } = parseInput(caseText);

    // DEBUG: Check parsed organism
    console.log(`DEBUG: Parsed Organism: '${context.conditions.infection?.organism}'`);

    if (errors.length > 0) {
        console.log('❌ Parse Errors:', errors);
        return;
    }

    const result = runStructuredRules(context);
    const codes = [result.primary, ...result.secondary].filter(c => c);

    if (codes.length === 0) {
        console.log('❌ No codes generated');
    } else {
        console.log('Codes: ' + codes.map(c => c?.code).join(', '));
        // console.log('Labels: ' + codes.map(c => c?.label).join(' | '));
    }
    console.log('');
});
