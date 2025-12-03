import assert from 'assert';
import { runRulesEngine } from '../rulesEngine.js';

function describe(name: string, fn: () => void) {
    console.log(`\n${name}`);
    fn();
}

function test(name: string, fn: () => void) {
    try {
        fn();
        console.log(`✔️  ${name}`);
    } catch (err) {
        console.error(`❌ ${name}`);
        console.error(err);
    }
}

describe('Debug: Complex Respiratory Scenario with Sepsis', () => {
    test('Post-procedural sepsis with respiratory failure and pneumonia', () => {
        const text = 'Severe acute respiratory failure due to pneumonia following an open percutaneous transluminal coronary angioplasty (PTCA) procedure performed 3 days ago';
        const result = runRulesEngine(text);
        console.log('Input:', text);
        console.log('Sequence:', JSON.stringify(result.sequence, null, 2));
        console.log('Warnings:', result.warnings);

        const codes = result.sequence.map(s => s.code);

        // Verify correct sequencing per ICD-10-CM guidelines
        console.log('\n✅ Expected Sequence:');
        console.log('1. T81.44XA - Sepsis following a procedure');
        console.log('2. A41.9 - Sepsis, unspecified organism');
        console.log('3. J95.821 - Acute postprocedural respiratory failure');
        console.log('4. J18.9 - Pneumonia, unspecified organism');

        console.log('\n📋 Actual Codes:', codes);

        assert.ok(codes.includes('T81.44XA'), 'Should include T81.44XA (Post-procedural sepsis)');
        assert.ok(codes.includes('A41.9'), 'Should include A41.9 (Sepsis, unspecified)');
        assert.ok(codes.includes('J95.821'), 'Should include J95.821 (Post-procedural respiratory failure)');
        assert.ok(codes.includes('J18.9'), 'Should include J18.9 (Pneumonia)');

        // Verify sequencing: T81.44XA should come before J95.821
        const t81Index = codes.indexOf('T81.44XA');
        const j95Index = codes.indexOf('J95.821');
        assert.ok(t81Index < j95Index, 'T81.44XA should be sequenced before J95.821');

        console.log('\n✅ All sequencing rules validated!');
    });
});
