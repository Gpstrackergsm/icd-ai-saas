"use strict";
var _a, _b;
Object.defineProperty(exports, "__esModule", { value: true });
const parser_1 = require("./lib/structured/parser");
const test7 = `Age: 70
Gender: Male
Encounter Type: Inpatient
Diabetes Type: Type 2
Complications: Foot Ulcer
Ulcer Site: Right Foot
Ulcer Severity: Fat layer exposed`;
console.log('Test 7 (Ulcer depth):');
const { context } = (0, parser_1.parseInput)(test7);
console.log('Ulcer severity:', (_a = context.conditions.diabetes) === null || _a === void 0 ? void 0 : _a.ulcerSeverity);
console.log('Expected: muscle (for L97.513)');
console.log('Got:', (_b = context.conditions.diabetes) === null || _b === void 0 ? void 0 : _b.ulcerSeverity);
