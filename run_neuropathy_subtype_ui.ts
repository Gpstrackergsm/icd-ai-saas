import { parseInput } from './lib/structured/parser';
import { runStructuredRules } from './lib/structured/engine';

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
        name: "UI Unspecified Selection",
        input: `Diabetes Type: Type 2
Complications: Neuropathy
Neuropathy Type: Unspecified`,
        expected: "E11.40"
    }
];

let failed = false;

cases.forEach(c => {
    console.log(`Running case: ${c.name}`);
    const { context } = parseInput(c.input);
    const result = runStructuredRules(context);

    // Find the diabetes code
    const mainCode = result.primary?.code || result.secondary.find(s => s.code.startsWith('E11'))?.code;

    if (mainCode === c.expected) {
        console.log(`  PASS: Got ${mainCode}`);
    } else {
        console.log(`  FAIL: Expected ${c.expected}, Got ${mainCode}`);
        failed = true;
    }
});

if (failed) process.exit(1);
else console.log('All UI subtype tests passed.');
