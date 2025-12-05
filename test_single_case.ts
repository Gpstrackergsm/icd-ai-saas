import { parseInput } from './lib/structured/parser';
import { runStructuredRules } from './lib/structured/engine';
import { validateCodeSet } from './lib/structured/validator-post';

const input = `Age: 59
Gender: Male
Encounter Type: Outpatient
Respiratory Failure: None
COPD: With exacerbation
Mech Vent: No`;

console.log('INPUT:');
console.log(input);
console.log('\n' + '='.repeat(80) + '\n');

const { context } = parseInput(input);
const results = runStructuredRules(context);
const validated = validateCodeSet(results.primary, results.secondary, context);

console.log('OUTPUT:');
console.log('Primary:', validated.codes[0]?.code || 'None');
if (validated.codes.slice(1).length > 0) {
    console.log('Secondary:');
    validated.codes.slice(1).forEach(c => console.log(`  ${c.code} - ${c.label}`));
} else {
    console.log('Secondary: None');
}

console.log('\nALL CODES:', validated.codes.map(c => c.code).join(', '));
