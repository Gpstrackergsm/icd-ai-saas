
import { parseInput } from './parser';
import { runStructuredRules } from './engine';

console.log('='.repeat(80));
console.log('TEST CASE 1: Complex Multi-System Patient');
console.log('='.repeat(80));

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

console.log('\n--- Input ---');
console.log(test1.trim());

const { context: ctx1, errors: err1 } = parseInput(test1);
if (err1.length > 0) {
    console.log('\n❌ Parse Errors:', err1);
} else {
    console.log('\n✅ Parsed Successfully');
    const result1 = runStructuredRules(ctx1);
    const codes1 = [result1.primary, ...result1.secondary].filter(c => c).map(c => c!.code);

    console.log('\n--- Generated Codes ---');
    codes1.forEach((code, i) => {
        const codeObj = i === 0 ? result1.primary : result1.secondary[i - 1];
        console.log(`${i + 1}. ${code} - ${codeObj?.label}`);
    });

    if (result1.validationErrors.length > 0) {
        console.log('\n⚠️  Validation Errors:', result1.validationErrors);
    }
}

console.log('\n' + '='.repeat(80));
console.log('TEST CASE 2: Pregnant Patient with Complications');
console.log('='.repeat(80));

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

console.log('\n--- Input ---');
console.log(test2.trim());

const { context: ctx2, errors: err2 } = parseInput(test2);
if (err2.length > 0) {
    console.log('\n❌ Parse Errors:', err2);
} else {
    console.log('\n✅ Parsed Successfully');
    const result2 = runStructuredRules(ctx2);
    const codes2 = [result2.primary, ...result2.secondary].filter(c => c).map(c => c!.code);

    console.log('\n--- Generated Codes ---');
    codes2.forEach((code, i) => {
        const codeObj = i === 0 ? result2.primary : result2.secondary[i - 1];
        console.log(`${i + 1}. ${code} - ${codeObj?.label}`);
    });

    if (result2.validationErrors.length > 0) {
        console.log('\n⚠️  Validation Errors:', result2.validationErrors);
    }
}

console.log('\n' + '='.repeat(80));
