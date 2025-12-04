import { parseInput } from './lib/structured/parser';
import { validateContext } from './lib/structured/validator';
import { runStructuredRules } from './lib/structured/engine';

const input = `Age: 74
Gender: Male
Encounter Type: Inpatient
Condition: Sepsis secondary to urinary tract infection
Organism: E. coli`;

console.log("🏥 Running Ad-hoc Test Case...");
console.log("--------------------------------");
console.log("INPUT:");
console.log(input);
console.log("--------------------------------");

// 1. Parse
const { context, errors: parseErrors } = parseInput(input);
console.log("🔍 Parsed Context:", JSON.stringify(context, null, 2));

if (parseErrors.length > 0) {
    console.log("⚠️ Parse Errors:", parseErrors);
}

// 2. Validate
const validation = validateContext(context);
if (!validation.valid) {
    console.log("❌ Validation Failed:", validation.errors);
}

// 3. Engine
const results = runStructuredRules(context);

console.log("\n📊 RESULTS:");
if (results.primary) {
    console.log(`   Primary: ${results.primary.code} - ${results.primary.label}`);
    console.log(`   Rationale: ${results.primary.rationale}`);
}
if (results.secondary && results.secondary.length > 0) {
    console.log("   Secondary:");
    results.secondary.forEach(c => {
        console.log(`     - ${c.code}: ${c.label}`);
        console.log(`       Rationale: ${c.rationale}`);
    });
} else {
    console.log("   Secondary: None");
}
