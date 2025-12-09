"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const parser_1 = require("./lib/structured/parser");
const engine_1 = require("./lib/structured/engine");
const cases = [
    {
        name: "UI Autonomic Selection",
        input: `Diabetes Type: Type 2
Complications: Neuropathy
Neuropathy Type: Autonomic`,
        expected: "E11.43"
    },
    {
        name: "UI Polyneuropathy Selection",
        input: `Diabetes Type: Type 2
Complications: Neuropathy
Neuropathy Type: Polyneuropathy`,
        expected: "E11.42"
    },
    {
        name: "Direct Polyneuropathy Checkbox",
        input: `Diabetes Type: Type 2
Complications: Polyneuropathy`,
        expected: "E11.42"
    },
    {
        name: "UI Unspecified Selection",
        input: `Diabetes Type: Type 2
Complications: Neuropathy
Neuropathy Type: Unspecified`,
        expected: "E11.40"
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
    console.log('All UI subtype tests passed.');
