
import { parseInput } from './lib/structured/parser';
import { runStructuredRules } from './lib/structured/engine';

const cases = [
    { id: 5, text: "68-year-old male with COPD admitted with pneumonia causing sepsis." }
];

console.log('=== DEBUG AUDIT ROUND 3 ===\n');

cases.forEach(c => {
    const { context } = parseInput(c.text);
    const result = runStructuredRules(context);
    const codes = [result.primary, ...result.secondary].filter((x): x is NonNullable<typeof x> => !!x).map(x => x!.code).join(', ');
    console.log(`CASE ${c.id}`);
    console.log(`Input: "${c.text}"`);
    console.log(`Codes: ${codes}`);
    console.log('---');
});
