// Hardening Verification Script
import { parseInput } from './lib/structured/parser';
import { runStructuredRules } from './lib/structured/engine';

console.log('=== NEUROLOGY DOMAIN SAFETY VERIFICATION ===');

const cases = [
    {
        name: 'STRICT: Weakness Block',
        text: 'Patient has right arm weakness.'
    },
    {
        name: 'STRICT: Seizure Block',
        text: 'Patient had a seizure yesterday.' // No epilepsy mention
    },
    {
        name: 'STRICT: Hemiplegia Side Block',
        text: 'Patient has hemiplegia.' // No side
    },
    {
        name: 'STRICT: Acute Stroke Laterality Block',
        text: 'Patient has an MCA stroke.' // Unspecified laterality
    },
    {
        name: 'STRICT: Encephalopathy Types (Metabolic)',
        text: 'Patient has metabolic encephalopathy.',
        expected: 'G93.41'
    },
    {
        name: 'STRICT: Encephalopathy Types (Toxic)',
        text: 'Patient has toxic encephalopathy.',
        expected: 'G92.8'
    },
    {
        name: 'STRICT: Epilepsy Modifiers (Intr+Gen)',
        text: 'Patient has intractable generalized epilepsy.',
        expected: 'G40.319' // Gen, Intr, No Status
    }
];

cases.forEach(c => {
    console.log(`\nTesting Case: ${c.name}`);
    const { context, errors } = parseInput(c.text); // Capture parser errors
    const output = runStructuredRules(context);

    // Collect all blocks: Parser Errors + Validation Errors + 'AMBIGUITY_BLOCK' codes
    let blocks = [
        ...errors.filter(e => e.includes('AMBIGUITY_BLOCK')),
        ...output.validationErrors.filter(e => e && (e.includes('AMBIGUITY_BLOCK') || e.includes('Domain Leak')))
    ];

    // Check if AMBIGUITY_BLOCK code exists in output (Resolver Block)
    if (output.primary?.code === 'AMBIGUITY_BLOCK') blocks.push(`Resolver Block: ${output.primary.label}`);
    output.secondary.forEach(s => {
        if (s.code === 'AMBIGUITY_BLOCK') blocks.push(`Resolver Block: ${s.label}`);
    });

    const codes = [];
    if (output.primary && output.primary.code !== 'AMBIGUITY_BLOCK') codes.push(output.primary.code);
    if (output.secondary) codes.push(...output.secondary.map(s => s.code).filter(c => c !== 'AMBIGUITY_BLOCK'));

    console.log(`Input: "${c.text}"`);
    console.log(`Codes (Valid): ${codes.join(', ')}`);
    console.log(`Blocks: ${blocks.join(' | ')}`);

    // Assertions
    if (c.name.includes('Block')) {
        if (blocks.length > 0 && codes.length === 0) console.log('[PASS] Blocked successfully.');
        else if (blocks.length > 0 && codes.length > 0) console.log(`[WARN] Blocked but some codes leaked: ${codes.join(', ')}`);
        else console.log(`[FAIL] Expected BLOCK, got Codes: ${codes.join(', ')}`);
    } else {
        if (c.expected) {
            if (codes.includes(c.expected)) console.log(`[PASS] Found expected code: ${c.expected}`);
            else console.log(`[FAIL] Expected ${c.expected}, got: ${codes.join(', ')}`);
        } else {
            if (codes.length > 0) console.log('[PASS] Coded:', codes[0]);
            else console.log('[FAIL] Expected Code, got nothing.');
        }
    }
});
