import { parseInput } from './lib/structured/parser';
import { validateContext } from './lib/structured/validator';
import { runStructuredRules } from './lib/structured/engine';

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

console.log("\n📊 RESULTS:");
console.log("=".repeat(60));

if (results.primary) {
    console.log(`\n✅ PRIMARY: ${results.primary.code}`);
    console.log(`   ${results.primary.label}`);
    console.log(`   Rationale: ${results.primary.rationale}`);
}

if (results.secondary && results.secondary.length > 0) {
    console.log(`\n📋 SECONDARY CODES (${results.secondary.length}):`);
    results.secondary.forEach((c, i) => {
        console.log(`\n   ${i + 1}. ${c.code}: ${c.label}`);
        console.log(`      Rationale: ${c.rationale}`);
    });
} else {
    console.log("\n   No secondary codes");
}

console.log("\n" + "=".repeat(60));
console.log(`Total Codes Generated: ${1 + (results.secondary?.length || 0)}`);
