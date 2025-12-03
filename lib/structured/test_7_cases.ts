
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

// Test 1: Diabetic with Multiple Complications
const test1 = `
Age: 72
Gender: Male
Encounter Type: Inpatient
Diabetes Type: Type 2
Complications: Foot Ulcer, Neuropathy, Retinopathy
Insulin Use: Yes
Ulcer Site: Left Foot
Ulcer Severity: Muscle
CKD Present: Yes
CKD Stage: 4
Hypertension: Yes
`;

analyzeAndJustify('Test 1: Type 2 DM with Multiple Complications (72M)', test1);

// Test 2: Septic Shock with Organ Dysfunction
const test2 = `
Age: 55
Gender: Female
Encounter Type: ED
Infection Present: Yes
Infection Site: Lung
Organism: MRSA
Sepsis: Yes
Severe Sepsis: Yes
Septic Shock: Yes
Pneumonia: Yes
Pneumonia Organism: MRSA
AKI: Yes
`;

analyzeAndJustify('Test 2: Septic Shock with Pneumonia and AKI (55F)', test2);

// Test 3: Postpartum Patient
const test3 = `
Age: 32
Gender: Female
Encounter Type: Inpatient
Postpartum: Yes
Delivery: Yes
Delivery Type: Cesarean
Anemia: Yes
Anemia Type: Blood Loss
Hypertension: Yes
`;

analyzeAndJustify('Test 3: Postpartum after C-Section with Anemia (32F)', test3);

// Test 4: Cirrhosis with Complications
const test4 = `
Age: 58
Gender: Male
Encounter Type: Inpatient
Cirrhosis: Yes
Cirrhosis Type: Alcoholic
Ascites: Yes
Hepatitis: Yes
Hepatitis Type: Alcoholic
GI Bleeding: Yes
Bleeding Site: Upper
Encephalopathy: Yes
Encephalopathy Type: Hepatic
Alcohol Use: Dependence
`;

analyzeAndJustify('Test 4: Alcoholic Cirrhosis with Complications (58M)', test4);

// Test 5: Trauma with Multiple Injuries
const test5 = `
Age: 28
Gender: Male
Encounter Type: ED
Injury Present: Yes
Injury Type: Fracture
Body Region: Tibia
Laterality: Left
Injury Encounter Type: Initial
External Cause: Fall
Pneumonia: Yes
Altered Mental Status: Yes
GCS: 12
`;

analyzeAndJustify('Test 5: Trauma Patient with Fracture and Pneumonia (28M)', test5);

// Test 6: Heart Failure with CKD
const test6 = `
Age: 78
Gender: Female
Encounter Type: Inpatient
Hypertension: Yes
Heart Failure: Yes
Heart Failure Type: Diastolic
Heart Failure Acuity: Acute on Chronic
CKD Present: Yes
CKD Stage: 3
Diabetes Type: Type 2
Complications: Nephropathy
Anemia: Yes
Anemia Type: Chronic Disease
`;

analyzeAndJustify('Test 6: CHF with CKD and Diabetes (78F)', test6);

// Test 7: Cancer with Chemotherapy Complications
const test7 = `
Age: 64
Gender: Female
Encounter Type: Inpatient
Cancer Present: Yes
Cancer Site: Breast
Metastasis: Yes
Metastatic Site: Bone
Chemotherapy: Yes
Anemia: Yes
Anemia Type: Chronic Disease
Coagulopathy: Yes
Neuropathy: Yes
Smoking Status: Former
Pack Years: 25
`;

analyzeAndJustify('Test 7: Metastatic Breast Cancer on Chemo (64F)', test7);
