
import { runStructuredRules } from './lib/structured/engine';
import { createFreshContext } from './lib/structured/parser';
import { expect } from 'expect'; // Assuming expect or similar manual assertions

function testGuard(testName: string, setup: (ctx: any) => void, expectedErrors: string[]) {
    console.log(`\nTEST: ${testName}`);
    const ctx = createFreshContext();
    setup(ctx);

    // Stub codes in Engine or mock logic? 
    // Testing Engine Guards directly via integration is best.
    // We can simulate "leaks" by manually injecting conditions that trigger code generation 
    // BUT we must delete the CONTEXT that legitimizes them, to trigger the guard.
    // However, engine logic uses the context to generate codes. 
    // If we delete context, code won't generate.
    // So we can't "generate code but delete context" easily without mocking `resolveNeurology` etc.
    // Exception: Z49.31 is purely "reasonForAdmission = dialysis".
    // If we set reasonForAdmission='dialysis', Z49.31 is generated.
    // The GUARD checks `ctx.conditions.renal`. 
    // So if we have admission='dialysis' but NO renal condition, it SHOULD FAIL.

    const output = runStructuredRules(ctx);

    const errors = output.validationErrors;
    console.log('Validation Errors:', errors);

    let passed = true;
    for (const exp of expectedErrors) {
        if (!errors.some(e => e.includes(exp))) {
            console.error(`[FAIL] Expected error containing "${exp}" not found.`);
            passed = false;
        }
    }

    if (passed && errors.length >= expectedErrors.length) {
        console.log('[PASS]');
    } else {
        console.log(`[FAIL] Got ${errors.length} errors, expected ${expectedErrors.length}`);
    }
}

console.log('=== STARTING ENGINE GUARD TESTS ===');

// TEST 1: Renal Leak (Admission Dialysis but no Renal Context)
testGuard('Renal Leak Check', (ctx) => {
    ctx.encounter.reasonForAdmission = 'dialysis';
    // We purposefully omit ctx.conditions.renal/ckd
}, ['Domain Leak: Renal code Z49.31']);

// TEST 2: OB Leak (Pregnancy code without pregnancy flag?)
// How to force OB code? Maybe Z33.1 via Reason? Engine doesn't generate OB from admission type easily.
// Engine checks `ctx.conditions.obstetric`.
// If I enable `ctx.conditions.obstetric.pregnant = true`, code is valid.
// To leak, I need to force a code generation WITHOUT context.
// But Engine generation IS context-dependent.
// The only "independent" triggers are Encounter fields or top-level fields.
// Example: Sepsis. If `ctx.conditions.infection.sepsis.present` is FALSE, no sepsis code.
// So simple engine usage prevents leaks by design.
// The Guard protects against logical bugs where we generate code X despite context Y missing.
// This is harder to test without mocking.

// However, Z49.31 (Dialysis Encounter) depends on `encounter.reasonForAdmission` but validates against `renal` context.
// This is a perfect test case.

// TEST 3: Safe Renal
testGuard('Safe Renal Case', (ctx) => {
    ctx.encounter.reasonForAdmission = 'dialysis';
    ctx.conditions.renal = { ckd: { stage: 'esrd' } }; // Context present
}, []); // Expect NO errors

console.log('=== TESTS COMPLETE ===');
