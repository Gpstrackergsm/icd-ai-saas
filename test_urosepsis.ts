
import { runRulesEngine } from './lib/rulesEngine';

const text = 'Severe urosepsis due to a chronic urinary tract infection (UTI), leading to septic shock in a patient with a history of Type 2 Diabetes Mellitus (T2DM)';
const result = runRulesEngine(text);

console.log('Input:', text);
console.log('\nSequence:');
result.sequence.forEach((code: any, idx: number) => {
    console.log(`${idx + 1}. ${code.code} - ${code.label}`);
});
console.log('\nWarnings:', result.warnings);
console.log('\n✅ Expected:');
console.log('1. A41.9 - Sepsis, unspecified organism');
console.log('2. R65.21 - Severe sepsis with septic shock');
console.log('3. N39.0 - Urinary tract infection, site not specified');
console.log('4. E11.69 - Type 2 diabetes mellitus with other specified complication');
