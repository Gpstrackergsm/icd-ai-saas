import { parseCardiology } from './lib/domains/cardiology/module';

const text = "63-year-old male with dilated cardiomyopathy without HF admitted for routine cardiology follow-up.";
console.log('Text:', text);
const attrs = parseCardiology(text);
console.log('encounter_type:', attrs.encounter_type);
console.log('heart_failure:', attrs.heart_failure);
