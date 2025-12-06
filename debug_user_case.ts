
import { parseInput } from './lib/structured/parser';
import { runStructuredRules } from './lib/structured/engine';

const userCaseInput = `
Age: 32
Gender: Male
Encounter Type: ED
CKD Present: Yes
CKD Stage: 2
Dialysis: None
Acute Kidney Injury: Yes
Hypertension: Yes
Heart Failure: None
Ischemic Heart Disease: No
Prior MI: Yes
Atrial Fibrillation: Yes
Respiratory Failure: None
COPD: With infection
Asthma: Yes
Mechanical Ventilation: Yes
Ventilation Duration: 75
Pneumonia: Yes
Pneumonia Organism: Unspecified
Infection Present: No
Sepsis: No
Septic Shock: No
Ulcer/Wound: Yes
Type: Diabetic
Location: Other
Stage/Depth: Stage 3
Smoking: Never
Alcohol: None
Drug Use: Yes
`;

console.log("Analyzing User Case 1...");
console.log("Input Data:");
console.log(userCaseInput);

// Parse input
const { context, errors } = parseInput(userCaseInput);

if (errors.length > 0) {
    console.error("Parsing Errors:", errors);
}

// Run rules
const result = runStructuredRules(context);

console.log("\nGenerated ICD-10-CM Codes:");
const codes = [];
if (result.primary) {
    codes.push(result.primary.code);
    console.log(`Primary: ${result.primary.code}`);
}

result.secondary.forEach(c => {
    codes.push(c.code);
    console.log(`Secondary: ${c.code}`);
});

console.log("\nCode List: " + codes.join(', '));
