
import { parseInput } from './parser';
import { runStructuredRules } from './engine';

const input = `
Age: 29
Gender: Female
Pregnant: Yes
Weeks: 32
Preeclampsia: Yes
`;

console.log('--- Input ---');
console.log(input.trim());

const { context, errors } = parseInput(input);

if (errors.length > 0) {
    console.log('\n❌ Parse Errors:', errors);
} else {
    console.log('\n✅ Parsed Context:', JSON.stringify(context, null, 2));

    const result = runStructuredRules(context);
    const codes = [result.primary, ...result.secondary].filter(c => c).map(c => c!.code);

    console.log('\n--- Result ---');
    console.log('Codes:', codes);
    console.log('Details:', JSON.stringify(result, null, 2));
}
