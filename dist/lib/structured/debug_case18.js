"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const parser_1 = require("./parser");
const engine_1 = require("./engine");
const testCase = `Case 18:
Age: 64
Gender: Male
Diagnosis: Chronic kidney disease Stage 5
On dialysis: Yes`;
console.log('=== DEBUG: Case 18 ===\n');
const { context, errors } = (0, parser_1.parseInput)(testCase);
console.log('Parsed CKD context:');
console.log(JSON.stringify(context.conditions.ckd, null, 2));
const result = (0, engine_1.runStructuredRules)(context);
const codes = [result.primary, ...result.secondary].filter(c => c);
console.log('\nGenerated codes:');
codes.forEach(c => console.log(`  ${c === null || c === void 0 ? void 0 : c.code}: ${c === null || c === void 0 ? void 0 : c.label}`));
