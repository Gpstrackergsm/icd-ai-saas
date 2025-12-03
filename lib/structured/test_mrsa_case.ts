
import { parseInput } from './parser';
import { runStructuredRules } from './engine';

const testCase = `
Age: 74
Gender: Male
Encounter Type: Inpatient
Diabetes Type: Type 2
Complications: Neuropathy, Nephropathy, Foot Ulcer
Insulin Use: Yes
Ulcer Site: Left Foot
Ulcer Severity: Bone
CKD Present: Yes
CKD Stage: 4
Dialysis: None
AKI: Yes
Hypertension: Yes
Heart Failure: Yes
Heart Failure Type: Diastolic
Heart Failure Acuity: Acute on Chronic
Pneumonia: Yes
Pneumonia Organism: MRSA
Infection Present: Yes
Infection Site: Lung
Organism: MRSA
Sepsis: Yes
Severe Sepsis: Yes
Septic Shock: No
Ulcer Present: Yes
Ulcer Type: Diabetic
Ulcer Location: Left Foot
Ulcer Stage: 4
Altered Mental Status: Yes
Encephalopathy: Yes
Encephalopathy Type: Metabolic
Anemia: Yes
Anemia Type: Chronic Disease
`;

console.log('='.repeat(80));
console.log('TEST CASE: 74M with MRSA Sepsis, Diabetic Foot Ulcer to Bone, CHF, CKD4');
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

if (result.validationErrors.length > 0) {
    console.log('\n⚠️  VALIDATION ERRORS:');
    result.validationErrors.forEach(err => console.log(`   - ${err}`));
}

console.log('\n' + '='.repeat(80));
console.log('CLINICAL ANALYSIS');
console.log('='.repeat(80));
console.log(`\nTotal Codes: ${allCodes.length}`);
console.log(`Primary Diagnosis: ${result.primary?.code} - ${result.primary?.label}`);
console.log(`\nKey Clinical Points:`);
console.log(`- Severe sepsis with MRSA pneumonia`);
console.log(`- Diabetic foot ulcer to bone (osteomyelitis risk)`);
console.log(`- Acute on chronic diastolic heart failure`);
console.log(`- CKD Stage 4 with AKI`);
console.log(`- Metabolic encephalopathy with AMS`);
console.log('\n' + '='.repeat(80));
