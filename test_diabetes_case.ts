import { parseInput } from './lib/structured/parser';
import { validateContext } from './lib/structured/validator';
import { runStructuredRules } from './lib/structured/engine';

const input = `Age: 34
Gender: Male
Encounter Type: Inpatient
Complications: Nephropathy/CKD, Foot Ulcer, Retinopathy
Diabetes Type: Type 2
Insulin Use: Yes
Ulcer Site: Right Foot
Ulcer Severity: Muscle exposed`;

const { context, errors: parseErrors } = parseInput(input);
console.log('Parse errors:', parseErrors);
console.log('\nContext:', JSON.stringify(context, null, 2));

const validation = validateContext(context);
console.log('\nValidation valid:', validation.valid);
console.log('Validation errors:', validation.errors);
console.log('Validation warnings:', validation.warnings);

if (validation.valid) {
    const result = runStructuredRules(context);
    const codes = [result.primary, ...result.secondary].filter((c): c is NonNullable<typeof c> => c !== null && c !== undefined);
    console.log('\nCodes:', codes.map(c => c.code).join(', '));
} else {
    console.log('\n❌ Validation failed - cannot generate codes');
}
