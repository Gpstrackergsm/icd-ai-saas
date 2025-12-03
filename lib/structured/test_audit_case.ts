
import { parseInput } from './parser';
import { runStructuredRules } from './engine';

const testCase = `
Age: 57
Gender: Female
Encounter Type: Inpatient
Diabetes Type: Type 1
Complications: Nephropathy, Retinopathy
Insulin Use: Yes
CKD Present: Yes
CKD Stage: 5
Dialysis: Chronic
AKI: Yes
Hypertension: Yes
Heart Failure: Yes
Heart Failure Type: Combined
Heart Failure Acuity: Acute
Pneumonia: Yes
Pneumonia Organism: Pseudomonas
Infection Present: Yes
Infection Site: Lung
Organism: Pseudomonas
Sepsis: Yes
Severe Sepsis: Yes
Septic Shock: Yes
Ulcer Present: Yes
Ulcer Type: Pressure
Ulcer Location: Sacral
Ulcer Stage: 4
Altered Mental Status: Yes
Encephalopathy: Yes
Encephalopathy Type: Hypoxic
Anemia: Yes
Anemia Type: Acute Blood Loss
Smoking: Former
Pack Years: 25
`;

console.log('='.repeat(80));
console.log('TEST CASE: 57F with Pseudomonas Sepsis, CKD 5, DM1');
console.log('='.repeat(80));

const { context, errors } = parseInput(testCase);

if (errors.length > 0) {
    console.log('\n❌ Parse Errors:', errors);
}

const result = runStructuredRules(context);
const allCodes = [result.primary, ...result.secondary].filter(c => c);

console.log('\n--- GENERATED CODES WITH ICD-10 JUSTIFICATION ---\n');

allCodes.forEach((codeObj, i) => {
    if (!codeObj) return;

    console.log(`${i + 1}. CODE: ${codeObj.code}`);
    console.log(`   Label: ${codeObj.label}`);
    console.log(`   ✓ Guideline: ${codeObj.guideline}`);
    console.log(`   ✓ Rationale: ${codeObj.rationale}`);
    console.log('');
});

// Verification Checks
const hasI132 = allCodes.some(c => c?.code === 'I13.2');
const hasB965 = allCodes.some(c => c?.code === 'B96.5');
const hasA4152 = allCodes.some(c => c?.code === 'A41.52');

console.log('\n--- VERIFICATION RESULTS ---');
console.log(`✅ I13.2 (HTN+HF+CKD5) Present: ${hasI132}`);
console.log(`✅ B96.5 (Redundant Organism) Absent: ${!hasB965}`);
console.log(`✅ A41.52 (Pseudomonas Sepsis) Present: ${hasA4152}`);

if (hasI132 && !hasB965 && hasA4152) {
    console.log('\n🎉 ALL CHECKS PASSED');
} else {
    console.log('\n❌ CHECKS FAILED');
}
