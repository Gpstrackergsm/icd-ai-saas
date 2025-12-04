"use strict";
var _a, _b;
Object.defineProperty(exports, "__esModule", { value: true });
const parser_1 = require("./lib/structured/parser");
// Test case 14: Acute severe asthma
const input14 = "Age: 52\nGender: Female\nEncounter Type: Inpatient\nCondition: Acute severe asthma";
const { context: ctx14 } = (0, parser_1.parseInput)(input14);
console.log('Case 14 - Acute severe asthma:');
console.log('Asthma:', JSON.stringify((_a = ctx14.conditions.respiratory) === null || _a === void 0 ? void 0 : _a.asthma, null, 2));
console.log('Expected: J45.901 (unspecified with exacerbation)');
console.log('Current logic would give: J45.51 (severe persistent with exacerbation)');
// Test case 15: COPD with acute lower respiratory infection
const input15 = "Age: 67\nGender: Male\nEncounter Type: Inpatient\nCondition: COPD with acute lower respiratory infection";
const { context: ctx15 } = (0, parser_1.parseInput)(input15);
console.log('\nCase 15 - COPD with infection:');
console.log('COPD:', JSON.stringify((_b = ctx14.conditions.respiratory) === null || _b === void 0 ? void 0 : _b.copd, null, 2));
console.log('Expected: J44.0 + J22');
console.log('Need to add J22 for acute lower respiratory infection');
