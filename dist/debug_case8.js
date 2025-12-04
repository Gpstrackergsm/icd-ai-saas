"use strict";
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
const parser_1 = require("./lib/structured/parser");
const engine_1 = require("./lib/structured/engine");
const test8 = "Age: 48\nGender: Female\nEncounter Type: Outpatient\nDiabetes Type: Type 2\nComplications: Nephropathy";
console.log('Test 8 (Nephropathy only):');
const { context } = (0, parser_1.parseInput)(test8);
console.log('Diabetes complications:', (_a = context.conditions.diabetes) === null || _a === void 0 ? void 0 : _a.complications);
console.log('CKD object:', context.conditions.ckd);
const result = (0, engine_1.runStructuredRules)(context);
const codes = [result.primary, ...result.secondary]
    .filter((c) => c !== null && c !== undefined)
    .map(c => c.code);
console.log('Generated codes:', codes);
console.log('Expected: E11.21 only');
