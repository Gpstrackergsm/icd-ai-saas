
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

describe('Debug: Complex Respiratory Scenario', () => {
    test('Severe acute respiratory failure post-PTCA', () => {
        const text = 'Severe acute respiratory failure due to pneumonia following an open percutaneous transluminal coronary angioplasty (PTCA) procedure performed 3 days ago';
        const result = runRulesEngine(text);
        console.log('Input:', text);
        console.log('Sequence:', JSON.stringify(result.sequence, null, 2));
        console.log('Warnings:', result.warnings);
    });
});
