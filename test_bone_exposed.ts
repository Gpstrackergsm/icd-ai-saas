import { parseInput } from './lib/structured/parser';
import { validateContext } from './lib/structured/validator';
import { runStructuredRules } from './lib/structured/engine';
import { validateCodeSet } from './lib/structured/validator-post';

const input = `Age: 64
Gender: Female
Encounter Type: Inpatient
Diabetes Type: Type 1
Complications: Foot Ulcer, Retinopathy
Insulin Use: Yes
Ulcer Site: Right Foot
Ulcer Severity: Bone exposed
Pneumonia: Yes
Pneumonia Organism: Viral
Infection Present: Yes
Infection Site: Lung
Sepsis: Yes
Hospital-Acquired: No
Hypertension: No
Respiratory Failure: Acute
Mechanical Ventilation: Yes
Ventilation Duration: 10
Smoking: Never
Alcohol Use: None`;

console.log("🏥 Testing Type 1 DM + Bone Exposed Ulcer + Viral Sepsis...");
console.log("=".repeat(60));

// 1. Parse
const { context, errors: parseErrors } = parseInput(input);

if (parseErrors.length > 0) {
    console.log("\n⚠️ Parse Errors:");
    parseErrors.forEach(err => console.log(`   - ${err}`));
}

// 2. Validate
const validation = validateContext(context);
if (!validation.valid) {
    console.log("\n❌ Validation Errors:");
    validation.errors.forEach(err => console.log(`   - ${err}`));
}

// 3. Engine
const results = runStructuredRules(context);

console.log("\n📊 CLINICAL OUTPUT:");
console.log("=".repeat(60));

if (results.primary) {
    console.log(`\n✅ PRIMARY: ${results.primary.code}`);
    console.log(`   ${results.primary.label}`);
}

if (results.secondary && results.secondary.length > 0) {
    console.log(`\n📋 SECONDARY CODES (${results.secondary.length}):`);
    results.secondary.forEach((c, i) => {
        console.log(`   ${i + 1}. ${c.code}: ${c.label}`);
    });
}

// 4. Apply ICD-10-CM Validation
const validated = validateCodeSet(results.primary, results.secondary, context);

console.log("\n\n🔍 CLAIM-READY OUTPUT:");
console.log("=".repeat(60));

const validatedPrimary = validated.codes[0];
const validatedSecondary = validated.codes.slice(1);

if (validatedPrimary) {
    console.log(`\n✅ PRIMARY: ${validatedPrimary.code}`);
    console.log(`   ${validatedPrimary.label}`);
}

if (validatedSecondary.length > 0) {
    console.log(`\n📋 SECONDARY CODES (${validatedSecondary.length}):`);
    validatedSecondary.forEach((c, i) => {
        console.log(`   ${i + 1}. ${c.code}: ${c.label}`);
    });
}

console.log(`\nTotal Codes: ${validated.codes.length}`);
