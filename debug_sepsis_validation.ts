import { parseInput } from './lib/structured/parser';
import { runStructuredRules } from './lib/structured/engine';
import { validateContext } from './lib/structured/validator';

const narrative = "Pulmonary embolism without acute cor pulmonale and sepsis in 23-year-old Male";

console.log("=== Testing Sepsis Validation ===");
console.log("Narrative:", narrative);
console.log("\n--- Step 1: Parsing ---");

const parseResult = parseInput(narrative);
const parsed = parseResult.context;
console.log("Parsed context:", JSON.stringify(parsed, null, 2));

console.log("\n--- Step 2: Validation ---");
const validation = validateContext(parsed);
console.log("Validation result:", JSON.stringify(validation, null, 2));

if (validation.errors && validation.errors.length > 0) {
    console.log("\n🛑 HARD STOP - Validation Errors:");
    validation.errors.forEach((error: string, idx: number) => {
        console.log(`  ${idx + 1}. ${error}`);
    });
    console.log("\n✅ System correctly blocked code generation!");
    process.exit(0);
}

if (validation.warnings && validation.warnings.length > 0) {
    console.log("\n⚠️  Validation Warnings:");
    validation.warnings.forEach((warning: string, idx: number) => {
        console.log(`  ${idx + 1}. ${warning}`);
    });
}

console.log("\n--- Step 3: Code Generation ---");
const engineOutput = runStructuredRules(parsed);
console.log("Generated codes:", engineOutput.codes);

if (engineOutput.codes && engineOutput.codes.length > 0) {
    console.log("\n❌ ERROR: System generated codes when it should have HARD STOPPED!");
    console.log("Generated:", engineOutput.codes.join(", "));
} else {
    console.log("\n✅ No codes generated (as expected)");
}
