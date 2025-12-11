import { parseCardiology } from './lib/domains/cardiology/module';

const text = "63-year-old man with dilated cardiomyopathy and chronic systolic HF, no HTN.";
const attrs = parseCardiology(text);

console.log('Input:', text);
console.log('Parsed attributes:');
console.log('  hypertension:', attrs.hypertension);
console.log('  heart_failure:', attrs.heart_failure);
console.log('  hf_type:', attrs.hf_type);
console.log('  hf_acuity:', attrs.hf_acuity);
console.log('  cardiomyopathy:', attrs.cardiomyopathy);
console.log('  cardiomyopathy_type:', attrs.cardiomyopathy_type);
