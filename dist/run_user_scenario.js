"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const parser_1 = require("./lib/structured/parser");
const validator_1 = require("./lib/structured/validator");
const engine_1 = require("./lib/structured/engine");
const input = `Age: 45
Gender: Male
Encounter Type: Outpatient
Complications: Neuropathy
Diabetes Type: Type 2
Insulin Use: No`;
console.log('Processing User Scenario:');
console.log(input);
console.log('-----------------------------------');
const { context, errors: parseErrors } = (0, parser_1.parseInput)(input);
if (parseErrors.length > 0) {
    console.error('Parse Errors:', parseErrors);
}
const validation = (0, validator_1.validateContext)(context);
if (validation.valid) {
    const result = (0, engine_1.runStructuredRules)(context);
    console.log('\nGenerated ICD-10-CM Codes:');
    if (result.primary) {
        console.log(`Primary: ${result.primary.code} - ${result.primary.label}`);
    }
    if (result.secondary && result.secondary.length > 0) {
        result.secondary.forEach(c => {
            console.log(`Secondary: ${c.code} - ${c.label}`);
        });
    }
    if (!result.primary && (!result.secondary || result.secondary.length === 0)) {
        console.log('No codes generated.');
    }
}
else {
    console.log('\nValidation Failed:');
    validation.errors.forEach(e => console.log(`- ${e}`));
}
