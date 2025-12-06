
import { parseInput } from './lib/structured/parser';
import { runStructuredRules } from './lib/structured/engine';

const case2Text = `
Age: 61
Gender: Female
Encounter Type: Inpatient
Diabetes Type: Type 2
Complications: Nephropathy/CKD, Foot Ulcer, Neuropathy
CKD Stage: 3
Insulin Use: No
Ulcer Site: Left Foot
Ulcer Severity: Bone exposed
CKD Present: Yes
CKD Stage: 4
Dialysis: None
Acute Kidney Injury: Yes
Hypertension: No
Heart Failure: Diastolic
Heart Failure Acuity: Acute on chronic
Ischemic Heart Disease: Yes
Prior MI: Yes
Atrial Fibrillation: Yes
Respiratory Failure: Acute
COPD: With exacerbation
Asthma: Yes
Mechanical Ventilation: Yes
Ventilation Duration: 114
Pneumonia: Yes
Pneumonia Organism: Viral
Infection Present: No
Sepsis: No
Septic Shock: No
Ulcer/Wound: No
Smoking: Former
Alcohol: Yes
Drug Use: None
`;

console.log("Analyzing Case 2...");
const { context, errors } = parseInput(case2Text);

if (errors.length > 0) {
    console.error("Parsing Errors:", errors);
}

const result = runStructuredRules(context);

console.log("\nGenerated ICD-10-CM Codes:");
if (result.primary) {
    console.log(`Primary: ${result.primary.code} (${result.primary.label})`);
}
result.secondary.forEach(c => {
    console.log(`Secondary: ${c.code} (${c.label})`);
});
