
import { parseInput } from './lib/structured/parser';
import { validateContext } from './lib/structured/validator';
import { runStructuredRules } from './lib/structured/engine';

const input = `
Age: 67
Gender: Female
Hypertension: Yes
Heart Failure: Yes
Heart Failure Type: Systolic
Heart Failure Acuity: Acute on chronic
Diabetes Type: Type 2
Diabetes Complication: CKD, Foot Ulcer
Ulcer Site: Left Foot
Ulcer Severity: Muscle
CKD Stage: 4
Dialysis: Yes
Acute Kidney Injury: Yes
Pneumonia: Yes
Pneumonia Organism: Pseudomonas
`;

console.log('--- 1. PARSING INPUT ---');
const { context, errors } = parseInput(input);
if (errors.length > 0) {
    console.error('Parsing Errors:', errors);
} else {
    console.log('Context:', JSON.stringify(context, null, 2));
}

console.log('\n--- 2. VALIDATING CONTEXT ---');
const validation = validateContext(context);
if (!validation.valid) {
    console.error('Validation Errors:', validation.errors);
} else {
    console.log('Validation: PASSED');
}

console.log('\n--- 3. RUNNING RULES ENGINE ---');
const result = runStructuredRules(context);

console.log('Primary:', result.primary?.code, '-', result.primary?.label);
console.log('Secondary:');
result.secondary.forEach(c => {
    console.log(`  ${c.code} - ${c.label} [${c.rationale}]`);
});

if (result.warnings.length > 0) {
    console.log('Warnings:', result.warnings);
}
