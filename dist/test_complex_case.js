"use strict";
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
const parser_1 = require("./lib/structured/parser");
const validator_1 = require("./lib/structured/validator");
const engine_1 = require("./lib/structured/engine");
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
const { context, errors: parseErrors } = (0, parser_1.parseInput)(input);
if (parseErrors.length > 0) {
    console.log("\n⚠️ Parse Errors:");
    parseErrors.forEach(err => console.log(`   - ${err}`));
}
// 2. Validate
const validation = (0, validator_1.validateContext)(context);
if (!validation.valid) {
    console.log("\n❌ Validation Errors:");
    validation.errors.forEach(err => console.log(`   - ${err}`));
}
// 3. Engine
const results = (0, engine_1.runStructuredRules)(context);
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
}
else {
    console.log("\n   No secondary codes");
}
console.log("\n" + "=".repeat(60));
console.log(`Total Codes Generated: ${1 + (((_a = results.secondary) === null || _a === void 0 ? void 0 : _a.length) || 0)}`);
