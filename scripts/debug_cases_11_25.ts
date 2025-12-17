
import { parseInput } from '../lib/structured/parser';
import { runStructuredRules } from '../lib/structured/engine';

const cases = [
    {
        id: 11,
        text: "74-year-old male with perforated diverticulitis and severe sepsis without shock. Acute kidney injury noted. Blood cultures positive."
    },
    {
        id: 25,
        text: "72-year-old diabetic male with pneumonia, sepsis, COPD exacerbation, and CHF. Blood cultures positive."
    },
    {
        id: 37,
        text: "62-year-old male admitted with COVID-19 pneumonia complicated by severe sepsis and respiratory failure."
    }
];

cases.forEach(c => {
    console.log(`\n────────────────────────────────────────────────────────────────────────────────`);
    console.log(`Running Case ${c.id}`);
    console.log(`Input: "${c.text}"`);

    const result = parseInput(c.text);
    const output = runStructuredRules(result.context);

    console.log('Primary:', output.primary?.code);
    console.log('Secondary:', output.secondary.map(code => code.code).join(', '));
});
