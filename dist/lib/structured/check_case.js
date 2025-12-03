"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const parser_1 = require("./parser");
const engine_1 = require("./engine");
const input = `
Age: 29
Gender: Female
Pregnant: Yes
Weeks: 32
Preeclampsia: Yes
`;
console.log('--- Input ---');
console.log(input.trim());
const { context, errors } = (0, parser_1.parseInput)(input);
if (errors.length > 0) {
    console.log('\n❌ Parse Errors:', errors);
}
else {
    console.log('\n✅ Parsed Context:', JSON.stringify(context, null, 2));
    const result = (0, engine_1.runStructuredRules)(context);
    const codes = [result.primary, ...result.secondary].filter(c => c).map(c => c.code);
    console.log('\n--- Result ---');
    console.log('Codes:', codes);
    console.log('Details:', JSON.stringify(result, null, 2));
}
