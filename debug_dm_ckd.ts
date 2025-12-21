import { parseInput } from './lib/structured/parser';
import { runStructuredRules } from './lib/structured/engine';

const testCases = [
    {
        id: 162,
        text: "Type 2 diabetes and end stage renal disease in 41-year-old Male",
        expected: ["E11.9", "N18.6"]
    },
    {
        id: 459,
        text: "Acute kidney failure and type 1 diabetes in 20-year-old Female",
        expected: ["N17.9", "E10.9"]
    }
];

testCases.forEach(tc => {
    console.log(`\n=== Case ${tc.id} ===`);
    console.log(`Text: "${tc.text}"`);
    console.log(`Expected: ${tc.expected.join(', ')}`);

    const { context } = parseInput(tc.text);
    console.log(`isDiabetic flag:`, context.conditions.renal?.ckd?.isDiabetic);

    const result = runStructuredRules(context);
    const codes = [result.primary, ...result.secondary]
        .filter(x => !!x)
        .map(x => x.code);

    console.log(`Generated: ${codes.join(', ')}`);
    console.log(`Match: ${codes.join(',') === tc.expected.join(',') ? '✓ PASS' : '✗ FAIL'}`);
});
