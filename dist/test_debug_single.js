"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const parser_1 = require("./lib/structured/parser");
const engine_1 = require("./lib/structured/engine");
const validator_post_1 = require("./lib/structured/validator-post");
// Test Case 1 from JSON: Diabetes + CKD
const primary1 = "Type 2 diabetes mellitus with diabetic chronic kidney disease";
const secondary1 = "Stage 3b chronic kidney disease";
const expected1 = ["E11.22", "N18.32"];
const input1 = `Age: 65
Gender: Female
Encounter Type: Outpatient
Diagnosis: ${primary1}
Condition: ${secondary1}`;
console.log('TEST 1: Diabetes + CKD');
console.log('Input:', primary1, '+', secondary1);
console.log('Expected:', expected1.join(', '));
const { context: ctx1, errors: err1 } = (0, parser_1.parseInput)(input1);
console.log('Parsed context:', JSON.stringify(ctx1, null, 2));
console.log('Parse errors:', err1);
const result1 = (0, engine_1.runStructuredRules)(ctx1);
console.log('Engine result primary:', result1.primary);
console.log('Engine result secondary:', result1.secondary);
const validated1 = (0, validator_post_1.validateCodeSet)(result1.primary, result1.secondary, ctx1);
console.log('Generated codes:', validated1.codes.map(c => `${c.code} (${c.label})`).join(', '));
console.log('Match:', validated1.codes.map(c => c.code).join(',') === expected1.join(',') ? '✅ PASS' : '❌ FAIL');
