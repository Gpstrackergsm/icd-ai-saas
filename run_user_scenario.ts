import { parseInput } from './lib/structured/parser';
import { validateContext } from './lib/structured/validator';
import { runStructuredRules } from './lib/structured/engine';

const input = `Age: 45
Gender: Male
Encounter Type: Outpatient
Complications: Neuropathy
Diabetes Type: Type 2
Insulin Use: No`;

console.log('Processing User Scenario:');
console.log(input);
console.log('-----------------------------------');

const { context, errors: parseErrors } = parseInput(input);

if (parseErrors.length > 0) {
    console.error('Parse Errors:', parseErrors);
}

const validation = validateContext(context);

if (validation.valid) {
    const result = runStructuredRules(context);
    console.log('\nGenerated ICD-10-CM Codes:');

    if (result.primary) {
        console.log(`Primary: ${result.primary.code} - ${result.primary.label}`);
    }

    if (result.secondary && result.secondary.length > 0) {
        result.secondary.forEach(c => {
            console.log(`Secondary: ${c.code} - ${c.label}`);
        });
    }

    if (!result.primary && (!result.secondary || result.secondary.length === 0)) {
        console.log('No codes generated.');
    }
} else {
    console.log('\nValidation Failed:');
    validation.errors.forEach(e => console.log(`- ${e}`));
}
