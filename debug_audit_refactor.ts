
import { parseInput } from './lib/structured/parser';
import { runStructuredRules } from './lib/structured/engine';

const cases = [
    { id: 35, text: "68-year-old admitted with severe sepsis secondary to pneumonia." }, // Expect NO R65.20
    { id: 41, text: "60-year-old admitted with ARDS following sepsis." }, // Expect R65.20
    { id: 48, text: "80-year-old admitted with aspiration pneumonia leading to sepsis." }, // Expect A41.9 (no org specified)
    { id: 4, text: "70-year-old admitted for E. coli pneumonia with septic shock and acute hypoxic respiratory failure." } // Expect A41.51 (E. Coli) + R65.21
];

console.log('=== DEBUG AUDIT REFACTOR ===\n');

cases.forEach(c => {
    const { context } = parseInput(c.text);
    const result = runStructuredRules(context);
    const codes = [result.primary, ...result.secondary].filter((x): x is NonNullable<typeof x> => !!x).map(x => x!.code).join(', ');
    console.log(`CASE ${c.id}`);
    console.log(`Input: "${c.text}"`);
    console.log(`Codes: ${codes}`);
    console.log('---');
});
