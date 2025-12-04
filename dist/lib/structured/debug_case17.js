"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const parser_1 = require("./parser");
const engine_1 = require("./engine");
const testCase = `Case 17:
Age: 36
Gender: Female
Diagnosis: Iron deficiency anemia
Cause: Chronic blood loss`;
console.log('=== DEBUG: Case 17 ===\n');
const { context } = (0, parser_1.parseInput)(testCase);
console.log('Hematology context:');
console.log(JSON.stringify(context.conditions.hematology, null, 2));
const result = (0, engine_1.runStructuredRules)(context);
const codes = [result.primary, ...result.secondary].filter(c => c);
console.log('\nGenerated codes:');
codes.forEach(c => {
    console.log(`\nCode: ${c === null || c === void 0 ? void 0 : c.code}`);
    console.log(`Label: ${c === null || c === void 0 ? void 0 : c.label}`);
    console.log(`Trigger: ${c === null || c === void 0 ? void 0 : c.trigger}`);
    console.log(`Rationale: ${c === null || c === void 0 ? void 0 : c.rationale}`);
});
