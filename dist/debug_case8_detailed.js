"use strict";
var _a, _b;
Object.defineProperty(exports, "__esModule", { value: true });
const parser_1 = require("./lib/structured/parser");
const test8 = "Age: 48\nGender: Female\nEncounter Type: Outpatient\nDiabetes Type: Type 2\nComplications: Nephropathy";
console.log('Parsing:', test8);
console.log('\n');
// Add instrumentation to parser
const { context, errors } = (0, parser_1.parseInput)(test8);
console.log('Final diabetes complications:', (_a = context.conditions.diabetes) === null || _a === void 0 ? void 0 : _a.complications);
console.log('Expected: [\"nephropathy\"] only');
console.log('Got:', (_b = context.conditions.diabetes) === null || _b === void 0 ? void 0 : _b.complications);
console.log('\nIssue: Both ckd and nephropathy are in the array');
