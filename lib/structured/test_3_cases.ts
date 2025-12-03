
import { parseInput } from './parser';
import { runStructuredRules } from './engine';

function analyzeAndJustify(testName: string, input: string) {
    console.log('='.repeat(80));
    console.log(`TEST: ${testName}`);
    console.log('='.repeat(80));
    console.log('\n--- Input ---');
    console.log(input.trim());

    const { context, errors } = parseInput(input);

    if (errors.length > 0) {
        console.log('\n❌ Parse Errors:', errors);
        return;
    }

    const result = runStructuredRules(context);
    const allCodes = [result.primary, ...result.secondary].filter(c => c);

    console.log('\n--- Generated Codes with ICD-10 Justification ---\n');

    allCodes.forEach((codeObj, i) => {
        if (!codeObj) return;

        console.log(`${i + 1}. CODE: ${codeObj.code}`);
        console.log(`   Label: ${codeObj.label}`);
        console.log(`   ✓ Guideline: ${codeObj.guideline}`);
        console.log(`   ✓ Rule: ${codeObj.rule}`);
        console.log(`   ✓ Trigger: ${codeObj.trigger}`);
        console.log(`   ✓ Rationale: ${codeObj.rationale}`);
        console.log('');
    });

    if (result.validationErrors.length > 0) {
        console.log('⚠️  Validation Errors:');
        result.validationErrors.forEach(err => console.log(`   - ${err}`));
    }

    console.log('\n' + '='.repeat(80) + '\n');
}

// Test Case 1: Elderly Patient with Heart Failure and Multiple Comorbidities
const test1 = `
Age: 82
Gender: Female
Encounter Type: Inpatient
Diabetes Type: Type 2
Complications: Neuropathy, Retinopathy
Insulin Use: Yes
Hypertension: Yes
Heart Failure: Yes
Heart Failure Type: Systolic
Heart Failure Acuity: Acute on Chronic
CKD Present: Yes
CKD Stage: 3
Anemia: Yes
Anemia Type: Chronic Disease
Smoking Status: Former
Pack Years: 30
`;

analyzeAndJustify('Elderly Patient with CHF and Multiple Comorbidities (82F)', test1);

// Test Case 2: Trauma Patient with Injury and Complications
const test2 = `
Age: 45
Gender: Male
Encounter Type: ED
Injury Present: Yes
Injury Type: Fracture
Body Region: Femur
Laterality: Right
Injury Encounter Type: Initial
External Cause: MVC
Hypertension: Yes
Diabetes Type: Type 2
Complications: None
Smoking Status: Current
Alcohol Use: Abuse
`;

analyzeAndJustify('Trauma Patient - MVC with Femur Fracture (45M)', test2);

// Test Case 3: Cancer Patient with Metastasis and Complications
const test3 = `
Age: 58
Gender: Female
Encounter Type: Inpatient
Cancer Present: Yes
Cancer Site: Lung
Metastasis: Yes
Metastatic Site: Brain
Chemotherapy: Yes
Anemia: Yes
Anemia Type: Chronic Disease
Coagulopathy: Yes
Pneumonia: Yes
Pneumonia Organism: Pseudomonas
Smoking Status: Current
Pack Years: 40
`;

analyzeAndJustify('Cancer Patient with Metastasis and HAP (58F)', test3);
