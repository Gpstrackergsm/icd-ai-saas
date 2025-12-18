import { parseInput } from './lib/structured/parser';
import { runStructuredRules } from './lib/structured/engine';
import { validateContext } from './lib/structured/validator';

const testCase = "Acute respiratory distress syndrome in 70-year-old Female";

console.log("Testing:", testCase);
console.log("\n--- Parse ---");
const parseResult = parseInput(testCase);
const parsed = parseResult.context;
console.log("Parsed:", JSON.stringify(parsed, null, 2));

console.log("\n--- Validate ---");
const validation = validateContext(parsed);
console.log("Valid:", validation.valid);
console.log("Errors:", validation.errors);
console.log("Warnings:", validation.warnings);

console.log("\n--- Generate Codes ---");
const engineOutput = runStructuredRules(parsed);
console.log("Engine Output:", JSON.stringify(engineOutput, null, 2));
console.log("Codes:", engineOutput.codes);
