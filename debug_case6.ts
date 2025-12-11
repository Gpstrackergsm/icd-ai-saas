import { parseCardiology } from './lib/domains/cardiology/module';

const text = "75-year-old male with prior MI 2 years ago, now admitted for HF exacerbation. No new MI. Acute combined systolic and diastolic HF.";
const attrs = parseCardiology(text);

console.log('Input:', text);
console.log('Parsed attributes:');
console.log('  acute_mi:', attrs.acute_mi);
console.log('  old_mi:', attrs.old_mi);
console.log('  mi_type:', attrs.mi_type);
