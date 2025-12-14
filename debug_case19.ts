import { parseInput } from './lib/structured/parser';
import { runStructuredRules } from './lib/structured/engine';

const text = "64-year-old female with coronary artery disease without angina admitted for elective cardiac evaluation.";
const { context } = parseInput(text);
const result = runStructuredRules(context);

console.log('Case 19 Debug\n');
console.log('Text:', JSON.stringify(text));
console.log('\nParsed Context:');
console.log('CAD:', JSON.stringify(context.conditions.cardiovascular?.cad));
console.log('Angina:', JSON.stringify(context.conditions.cardiovascular?.angina));
console.log('\nGenerated Codes:');
console.log('Primary:', result.primary);
console.log('Secondary:', result.secondary);
