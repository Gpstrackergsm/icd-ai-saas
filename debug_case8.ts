import { parseCardiology, resolveCardiologyCodes } from './lib/domains/cardiology/module';

const text = "67-year-old male with NSTEMI admitted for acute myocardial infarction. No prior MI history.";
console.log('Text:', text);
console.log('Lowercase:', text.toLowerCase());
const attrs = parseCardiology(text);
console.log('\nParsed Attributes:');
console.log('  acute_mi:', attrs.acute_mi);
console.log('  old_mi:', attrs.old_mi);
console.log('  mi_type:', attrs.mi_type);

// Check regex matches
const t = text.toLowerCase();
console.log('\nRegex Tests:');
console.log('  /\\bnstemi\\b/.test:', /\bnstemi\b/.test(t));
console.log('  /(prior|previous|old|history).*nstemi/.test:', /(prior|previous|old|history).*nstemi/.test(t));
console.log('  !/continued.*management|follow.?up.*mi/.test:', !/continued.*management|follow.?up.*mi/.test(t));

const codes = resolveCardiologyCodes(attrs);
console.log('\nGenerated Codes:', codes.map(c => c.code));
