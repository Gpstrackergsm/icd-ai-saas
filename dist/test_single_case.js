"use strict";
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
const parser_1 = require("./lib/structured/parser");
const engine_1 = require("./lib/structured/engine");
const validator_post_1 = require("./lib/structured/validator-post");
const input = `Age: 59
Gender: Male
Encounter Type: Outpatient
Respiratory Failure: None
COPD: With exacerbation
Mech Vent: No`;
console.log('INPUT:');
console.log(input);
console.log('\n' + '='.repeat(80) + '\n');
const { context } = (0, parser_1.parseInput)(input);
const results = (0, engine_1.runStructuredRules)(context);
const validated = (0, validator_post_1.validateCodeSet)(results.primary, results.secondary, context);
console.log('OUTPUT:');
console.log('Primary:', ((_a = validated.codes[0]) === null || _a === void 0 ? void 0 : _a.code) || 'None');
if (validated.codes.slice(1).length > 0) {
    console.log('Secondary:');
    validated.codes.slice(1).forEach(c => console.log(`  ${c.code} - ${c.label}`));
}
else {
    console.log('Secondary: None');
}
console.log('\nALL CODES:', validated.codes.map(c => c.code).join(', '));
