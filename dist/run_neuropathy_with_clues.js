"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const parser_1 = require("./lib/structured/parser");
const engine_1 = require("./lib/structured/engine");
const cases = [
    {
        name: "Unspecified Neuropathy",
        input: `Age: 45
Gender: Male
Diabetes Type: Type 2
Complications: Neuropathy`,
        expected: "E11.40"
    },
    {
        name: "Bilateral Neuropathy",
        input: `Age: 45
Gender: Male
Diabetes Type: Type 2
Complications: bilateral neuropathy`,
        expected: "E11.42"
    },
    {
        name: "Neuropathy with Tingling",
        input: `Age: 45
Gender: Male
Diabetes Type: Type 2
Complications: neuropathy, tingling`,
        expected: "E11.42"
    },
    {
        name: "Neuropathy with Stocking Distribution",
        input: `Age: 45
Gender: Male
Diabetes Type: Type 2
Complications: neuropathy
Notes: stocking distribution`,
        // Note: parser handles loose text in generic parsing
        // "Notes" is not a specific key but might fall through?
        // Parser splits line by ':'. "Notes" is not in switch?
        // Let's use a key that works or just free text lines.
        // Actually, generic parser triggers on "conditions" or "diagnosis" or just loops.
        // But `key` switch has cases. If key is unknown, it falls to default?
        // No, current parser has no default? 
        // Lines 20 loop.
        // If key is not matched, it does nothing?
        // Let's us "Condition: stocking distribution" or append to complications line.
        // Using "Complications" line for simplicity as that's where I added logic too.
        expected: "E11.42"
    },
    {
        name: "Neuropathy with Stocking (Same Line)",
        input: `Age: 45
Gender: Male
Diabetes Type: Type 2
Complications: neuropathy, stocking distribution`,
        expected: "E11.42"
    }
];
let failed = false;
cases.forEach(c => {
    var _a, _b;
    console.log(`Running case: ${c.name}`);
    const { context } = (0, parser_1.parseInput)(c.input);
    const result = (0, engine_1.runStructuredRules)(context);
    // Find the diabetes code
    const mainCode = ((_a = result.primary) === null || _a === void 0 ? void 0 : _a.code) || ((_b = result.secondary.find(s => s.code.startsWith('E11'))) === null || _b === void 0 ? void 0 : _b.code);
    if (mainCode === c.expected) {
        console.log(`  PASS: Got ${mainCode}`);
    }
    else {
        console.log(`  FAIL: Expected ${c.expected}, Got ${mainCode}`);
        failed = true;
    }
});
if (failed)
    process.exit(1);
else
    console.log('All integrated tests passed.');
