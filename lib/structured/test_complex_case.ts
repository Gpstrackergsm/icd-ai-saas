
import { parseInput } from './parser';
import { runStructuredRules } from './engine';

const complexCase = `
Age: 68
Gender: Male
Encounter Type: Inpatient
Diabetes Type: Type 2
Complications: Neuropathy, Nephropathy, Foot Ulcer
Insulin Use: Yes
Ulcer Site: Right Foot
Ulcer Severity: Muscle
CKD Present: Yes
CKD Stage: 3
Dialysis: None
AKI: Yes
Hypertension: Yes
Heart Failure: Yes
Heart Failure Type: Systolic
Heart Failure Acuity: Acute on Chronic
Pneumonia: Yes
Pneumonia Organism: E. Coli
Infection Present: Yes
Infection Site: Lung
Organism: E. Coli
Sepsis: Yes
Severe Sepsis: Yes
Septic Shock: No
Ulcer Present: Yes
Ulcer Type: Diabetic
Ulcer Location: Right Foot
Ulcer Stage: 3
Altered Mental Status: Yes
Encephalopathy: Yes
Encephalopathy Type: Metabolic
Anemia: Yes
Anemia Type: Chronic Disease
`;

console.log('='.repeat(80));
console.log('COMPLEX MULTI-SYSTEM CASE ANALYSIS');
console.log('='.repeat(80));
console.log('\n--- Input ---');
console.log(complexCase.trim());

const { context, errors } = parseInput(complexCase);

if (errors.length > 0) {
    console.log('\n❌ Parse Errors:');
    errors.forEach(err => console.log(`   - ${err}`));
}

console.log('\n--- Parsed Context ---');
console.log(JSON.stringify(context, null, 2));

const result = runStructuredRules(context);

console.log('\n' + '='.repeat(80));
console.log('GENERATED CODES WITH ICD-10 JUSTIFICATION');
console.log('='.repeat(80) + '\n');

const allCodes = [result.primary, ...result.secondary].filter(c => c);

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
    console.log('\n⚠️  VALIDATION ERRORS:');
    result.validationErrors.forEach(err => console.log(`   - ${err}`));
}

if (result.warnings.length > 0) {
    console.log('\n⚠️  WARNINGS:');
    result.warnings.forEach(warn => console.log(`   - ${warn}`));
}

console.log('\n' + '='.repeat(80));
console.log('ANALYSIS OF POTENTIAL ISSUES');
console.log('='.repeat(80) + '\n');

// Analyze for issues
const codeList = allCodes.map(c => c?.code || '');

console.log('1. SEVERE SEPSIS CODING:');
if (codeList.includes('R65.20') || codeList.includes('R65.21')) {
    console.log('   ✅ Severe sepsis code present (R65.2x)');
    if (codeList.includes('N17.9')) {
        console.log('   ✅ Organ dysfunction documented (AKI - N17.9)');
    } else {
        console.log('   ⚠️  Severe sepsis present but organ dysfunction not explicitly linked');
    }
} else {
    console.log('   ❌ Severe sepsis documented but R65.20/R65.21 not generated');
}

console.log('\n2. ULCER CODING:');
const ulcerCodes = codeList.filter(c => c.startsWith('L97') || c.startsWith('L89'));
console.log(`   Found ${ulcerCodes.length} ulcer code(s): ${ulcerCodes.join(', ')}`);
if (ulcerCodes.length > 1) {
    console.log('   ⚠️  Multiple ulcer codes - may indicate duplicate coding');
}

console.log('\n3. ORGANISM CODING:');
const organismCodes = codeList.filter(c => c.startsWith('B96'));
if (organismCodes.length > 0) {
    console.log(`   ⚠️  Organism code present (${organismCodes.join(', ')}) - may be redundant with sepsis code`);
} else {
    console.log('   ✅ No redundant organism codes');
}

console.log('\n4. PRIMARY DIAGNOSIS:');
console.log(`   Current Primary: ${result.primary?.code} - ${result.primary?.label}`);
console.log('   Expected: Should be sepsis-related (R65.20) or pneumonia (J15.5) per ICD-10-CM guidelines');

console.log('\n' + '='.repeat(80));
