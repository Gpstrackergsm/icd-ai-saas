"use strict";
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
const parser_1 = require("./lib/structured/parser");
const validator_1 = require("./lib/structured/validator");
const engine_1 = require("./lib/structured/engine");
const validator_post_1 = require("./lib/structured/validator-post");
const input = `Age: 45
Gender: Female
Encounter Type: Inpatient

Diabetes Type: Type 1
Complications: Foot Ulcer, Retinopathy
Ulcer Site: Right Foot
Ulcer Depth: Muscle exposed

Infection Present: Yes
Infection Site: Lung
Organism: Viral
Sepsis: Yes
Pneumonia: Yes
Pneumonia Organism: Viral`;
console.log("🏥 Testing Type 1 DM + Viral Sepsis + Pneumonia Case...");
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
console.log(`\nTotal Codes: ${1 + (((_a = results.secondary) === null || _a === void 0 ? void 0 : _a.length) || 0)}`);
// 4. Apply ICD-10-CM Validation
const validated = (0, validator_post_1.validateCodeSet)(results.primary, results.secondary, context);
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
// Expected codes
console.log("\n\n📝 EXPECTED CODES:");
console.log("=".repeat(60));
console.log("Primary: A41.89 — Sepsis due to viral");
console.log("Secondary: E10.621 — Type 1 DM with foot ulcer");
console.log("Secondary: E10.319 — Type 1 DM with retinopathy without macular edema");
console.log("Secondary: L97.514 — Non-pressure chronic ulcer of foot");
console.log("Secondary: J12.9 — Viral pneumonia, unspecified");
console.log("\n" + "=".repeat(60));
