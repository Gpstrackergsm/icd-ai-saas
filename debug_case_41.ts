
import { parseInput } from './lib/structured/parser';
import { runStructuredRules } from './lib/structured/engine';

const text = "69-year-old male with multiple prior CVAs and residual left hemiplegia.";
console.log(`Input: "${text}"`);

const { context, errors } = parseInput(text);
console.log("Context conditions.neurology:", JSON.stringify(context.conditions.neurology, null, 2));
console.log("Errors:", errors);

const result = runStructuredRules(context);
const codes = [];
if (result.primary) codes.push(result.primary);
codes.push(...result.secondary);
console.log("Codes:", codes.map(c => c.code));
