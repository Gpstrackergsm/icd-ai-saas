import { parseInput } from './lib/structured/parser';
import { runStructuredRules } from './lib/structured/engine';

const cases = [
    { id: 1, text: "80-year-old male with long-standing hypertension, ESRD on chronic hemodialysis, and chronic systolic CHF admitted for worsening shortness of breath due to acute on chronic heart failure." },
    { id: 6, text: "82-year-old male with ESRD on dialysis, hypertension, and chronic systolic heart failure admitted for routine dialysis, no HF exacerbation." },
    { id: 13, text: "78-year-old female with hypertension, CKD stage 5, and systolic heart failure admitted for acute on chronic HF." },
    { id: 27, text: "83-year-old male with ESRD on dialysis admitted for acute on chronic systolic HF exacerbation." },
];

console.log('=== CARDIOLOGY DIALYSIS CASES TEST ===\n');

cases.forEach(({ id, text }) => {
    console.log(`\n┌─ CASE ${id} ${'─'.repeat(80 - `CASE ${id} `.length)}`);
    console.log(`│ ${text}`);

    const { context } = parseInput(text);
    const result = runStructuredRules(context);

    const allCodes = [result.primary, ...result.secondary].filter(Boolean);

    console.log(`│`);
    console.log(`│ Encounter Reason: ${context.encounter?.reasonForAdmission || 'not set'}`);
    console.log(`│ Generated Codes:`);
    allCodes.forEach((code, idx) => {
        const position = idx === 0 ? 'PRIMARY  ' : 'SECONDARY';
        console.log(`│   ${idx + 1}. [${position}] ${code!.code}    ${code!.label}`);
    });

    // Validation
    if (text.includes('admitted for routine dialysis')) {
        if (result.primary?.code === 'Z49.31') {
            console.log(`│ ✅ PASS: Z49.31 correctly sequenced as primary for routine dialysis`);
        } else {
            console.log(`│ ❌ FAIL: Expected Z49.31 as primary for routine dialysis, got ${result.primary?.code}`);
        }
    } else if (text.includes('admitted for') && text.includes('heart failure')) {
        if (result.primary?.code.startsWith('I')) {
            console.log(`│ ✅ PASS: Heart failure correctly sequenced as primary`);
        } else {
            console.log(`│ ❌ FAIL: Expected heart failure code as primary, got ${result.primary?.code}`);
        }
    }

    console.log(`└${'─'.repeat(85)}`);
});

console.log('\n=== TEST COMPLETE ===\n');
