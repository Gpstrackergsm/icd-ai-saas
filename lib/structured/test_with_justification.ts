
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

// Test Case 1: Complex Multi-System Patient
const test1 = `
Age: 67
Gender: Male
Encounter Type: Inpatient
Diabetes Type: Type 2
Complications: Nephropathy, Retinopathy
Insulin Use: Yes
CKD Present: Yes
CKD Stage: 5
Dialysis: Chronic
AKI: Yes
Hypertension: Yes
Infection Present: Yes
Infection Site: Urinary
Organism: E. Coli
Sepsis: Yes
`;

analyzeAndJustify('Complex Multi-System Patient (67M)', test1);

// Test Case 2: Pregnant Patient with Complications
const test2 = `
Age: 28
Gender: Female
Encounter Type: Inpatient
Pregnant: Yes
Weeks: 36
Preeclampsia: Yes
Gestational Diabetes: Yes
Hypertension: Yes
Anemia: Yes
Anemia Type: Iron
`;

analyzeAndJustify('Pregnant Patient with Complications (28F)', test2);
