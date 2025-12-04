"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const parser_1 = require("./lib/structured/parser");
const engine_1 = require("./lib/structured/engine");
const input7 = "Age: 62\nGender: Female\nEncounter Type: Inpatient\nCondition: Hypertension with Chronic Kidney Disease Stage 3";
const { context } = (0, parser_1.parseInput)(input7);
console.log('Context:');
console.log('  cardiovascular:', JSON.stringify(context.conditions.cardiovascular, null, 2));
console.log('  renal:', JSON.stringify(context.conditions.renal, null, 2));
console.log('  ckd (old):', JSON.stringify(context.conditions.ckd, null, 2));
const result = (0, engine_1.runStructuredRules)(context);
console.log('\nCodes generated:');
const all = [result.primary, ...result.secondary].filter(c => c);
all.forEach((c, i) => {
    console.log(`  ${i === 0 ? 'PRIMARY' : 'SECONDARY'}: ${c === null || c === void 0 ? void 0 : c.code} - ${c === null || c === void 0 ? void 0 : c.label}`);
});
console.log('\nExpected: I12.9 (primary), N18.3 (secondary)');
