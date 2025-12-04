import { parseInput } from './lib/structured/parser';
import { validateContext } from './lib/structured/validator';
import { runStructuredRules } from './lib/structured/engine';
import { validateCodeSet } from './lib/structured/validator-post';

const input = `Age: 73
Gender: Male
Encounter Type: Inpatient

Diabetes Type: Type 2
Complications: Nephropathy/CKD
CKD Stage: 4

CKD Present: Yes
CKD Stage: 4
Acute Kidney Injury: Yes

Hypertension: Yes
Heart Failure: Diastolic
Heart Failure Acuity: Chronic
Ischemic Heart Disease: Yes

Respiratory Failure: Acute
Mechanical Ventilation: Yes
Ventilation Duration: 18
Pneumonia: Yes
Pneumonia Organism: Pseudomonas

Infection Present: Yes
Infection Site: Lung
Organism: Pseudomonas
Sepsis: Yes
Hospital-Acquired: Yes

Smoking: Former
Alcohol Use: Yes`;

console.log("🏥 Running Complex Multi-System Case...");
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

console.log("\n📊 CLINICAL OUTPUT (All documented conditions):");
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

console.log(`\nTotal Codes: ${1 + (results.secondary?.length || 0)}`);

// 4. Apply ICD-10-CM Validation
const validated = validateCodeSet(results.primary, results.secondary, context);

console.log("\n\n🔍 CLAIM-READY OUTPUT (ICD-10-CM validated):");
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

// Show changes
if (validated.removed.length > 0 || validated.added.length > 0) {
    console.log("\n\n📝 VALIDATION CHANGES:");
    console.log("=".repeat(60));

    if (validated.removed.length > 0) {
        console.log("\n❌ REMOVED:");
        validated.removed.forEach(r => {
            console.log(`   - ${r.code}: ${r.reason}`);
        });
    }

    if (validated.added.length > 0) {
        console.log("\n✅ ADDED:");
        validated.added.forEach(a => {
            console.log(`   + ${a.code}: ${a.reason}`);
        });
    }
}

console.log("\n" + "=".repeat(60));

