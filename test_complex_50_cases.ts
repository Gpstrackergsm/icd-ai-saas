import { runStructuredRules } from './lib/structured/engine';
import { parseInput } from './lib/structured/parser';

const complexCases = [
    "72-year-old admitted with pneumonia due to MRSA complicated by sepsis and acute hypoxic respiratory failure.",
    "80-year-old female with COVID-19 pneumonia, septic shock, and acute respiratory failure.",
    "65-year-old male with aspiration pneumonia leading to severe sepsis and acute renal failure.",
    "70-year-old admitted for E. coli pneumonia with septic shock and acute hypoxic respiratory failure.",
    "68-year-old male with COPD admitted with pneumonia causing sepsis.",
    "75-year-old with COPD exacerbation and acute hypercapnic respiratory failure.",
    "70-year-old female with congestive heart failure and acute pulmonary edema causing respiratory failure.",
    "60-year-old with COPD and CHF admitted with acute on chronic respiratory failure.",
    "55-year-old with severe asthma exacerbation and hypoxic respiratory failure.",
    "80-year-old on home oxygen admitted with chronic respiratory failure.",
    "68-year-old male admitted with pneumonia complicated by acute respiratory failure.",
    "72-year-old female with influenza A pneumonia and acute respiratory failure.",
    "65-year-old male with ventilator-associated pneumonia due to Pseudomonas.",
    "85-year-old nursing home resident admitted with aspiration pneumonia.",
    "70-year-old admitted with acute respiratory failure of unspecified type.",
    "68-year-old with COPD exacerbation leading to acute respiratory failure.",
    "72-year-old admitted with pneumonia resulting in acute hypoxic respiratory failure.",
    "50-year-old developed acute respiratory failure following surgery.",
    "55-year-old with severe asthma exacerbation and hypoxic respiratory failure.",
    "75-year-old admitted with acute pulmonary embolism causing acute cor pulmonale.",
    "68-year-old with type 2 diabetes and chronic kidney disease admitted for sepsis due to UTI.",
    "55-year-old with type 1 diabetes admitted with diabetic ketoacidosis.",
    "72-year-old type 2 diabetic with foot ulcer admitted for sepsis.",
    "65-year-old diabetic admitted with pneumonia and acute hypoxic respiratory failure.",
    "70-year-old diabetic with ESRD on dialysis admitted with sepsis.",
    "60-year-old with COVID-19 pneumonia complicated by acute respiratory distress syndrome.",
    "75-year-old admitted with acute on chronic respiratory failure due to COPD.",
    "68-year-old male with pneumonia and acute respiratory failure requiring oxygen.",
    "80-year-old female admitted with COPD exacerbation and pneumonia.",
    "65-year-old admitted with acute hypoxic respiratory failure secondary to pulmonary edema.",
    "55-year-old male smoker admitted with COPD and acute respiratory failure.",
    "70-year-old female with CHF admitted with pleural effusion and shortness of breath.",
    "60-year-old admitted with viral pneumonia and respiratory failure.",
    "75-year-old admitted with COVID-19, pneumonia, and septic shock.",
    "68-year-old admitted with severe sepsis secondary to pneumonia.",
    "72-year-old admitted with pneumonia complicated by acute renal failure.",
    "65-year-old admitted with aspiration pneumonia and acute respiratory failure.",
    "80-year-old admitted with acute respiratory failure following intubation.",
    "55-year-old admitted with spontaneous pneumothorax.",
    "70-year-old admitted with acute saddle pulmonary embolism.",
    "60-year-old admitted with ARDS following sepsis.",
    "75-year-old admitted with COPD exacerbation and hypercapnic respiratory failure.",
    "68-year-old admitted with pneumonia and acute on chronic respiratory failure.",
    "72-year-old admitted with influenza pneumonia and hypoxic respiratory failure.",
    "65-year-old admitted with postoperative respiratory failure.",
    "70-year-old admitted with ventilator-associated pneumonia.",
    "55-year-old admitted with COVID-19 pneumonia and ARDS.",
    "80-year-old admitted with aspiration pneumonia leading to sepsis.",
    "60-year-old admitted with acute respiratory failure and metabolic encephalopathy.",
    "75-year-old admitted with septic shock complicated by ARDS and acute renal failure."
];

console.log('═══════════════════════════════════════════════════════════════════════════════');
console.log('         COMPLEX MULTI-CONDITION TEST CASES - 50 CASES');
console.log('═══════════════════════════════════════════════════════════════════════════════');
console.log('');

complexCases.forEach((text, index) => {
    const caseNum = index + 1;
    const { context } = parseInput(text);
    const result = runStructuredRules(context);

    const primary = result.primary?.code || 'NONE';
    const secondary = result.secondary.map(c => c.code);

    console.log('─────────────────────────────────────────────────────────────────────────────');
    console.log(`Case ${caseNum}:`);
    console.log('─────────────────────────────────────────────────────────────────────────────');
    console.log(`📝 Input: "${text}"`);
    console.log(`🔹 Primary:   ${primary}`);
    console.log(`🔹 Secondary: [${secondary.join(', ')}]`);
    console.log('');
});

console.log('═══════════════════════════════════════════════════════════════════════════════');
console.log(`COMPLETED: ${complexCases.length} complex test cases processed`);
console.log('═══════════════════════════════════════════════════════════════════════════════');
