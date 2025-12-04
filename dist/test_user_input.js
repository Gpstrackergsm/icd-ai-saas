"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const parser_1 = require("./lib/structured/parser");
const validator_1 = require("./lib/structured/validator");
const engine_1 = require("./lib/structured/engine");
const input = `Age: 44
Gender: Male
Encounter Type: Outpatient
Complications: Nephropathy/CKD, Foot Ulcer, Retinopathy
CKD Stage: 2
Insulin Use: Yes
Ulcer Site: Right Foot
Ulcer Severity: Muscle exposed`;
console.log('Testing input:\n', input);
console.log('\n' + '='.repeat(60) + '\n');
const { context, errors: parseErrors } = (0, parser_1.parseInput)(input);
console.log('Parse errors:', parseErrors);
console.log('\nParsed context:', JSON.stringify(context, null, 2));
const validation = (0, validator_1.validateContext)(context);
console.log('\n' + '='.repeat(60));
console.log('Validation valid:', validation.valid);
console.log('Validation errors:', validation.errors);
console.log('Validation warnings:', validation.warnings);
if (validation.valid) {
    const result = (0, engine_1.runStructuredRules)(context);
    const codes = [result.primary, ...result.secondary].filter((c) => c !== null && c !== undefined);
    console.log('\n' + '='.repeat(60));
    console.log('Generated codes:');
    codes.forEach(c => console.log(`  ${c.code} - ${c.rationale}`));
}
else {
    console.log('\n❌ Cannot generate codes due to validation errors');
}
