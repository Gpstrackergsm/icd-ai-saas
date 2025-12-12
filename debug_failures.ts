import { parseCardiology, resolveCardiologyCodes } from './lib/domains/cardiology/module';

const debugCases = [
    { id: 6, text: "82-year-old male with ESRD on dialysis, hypertension, and chronic systolic heart failure admitted for routine dialysis, no HF exacerbation." },
    { id: 20, text: "81-year-old male with hypertension, ESRD, and heart failure admitted for acute pulmonary edema." },
    { id: 23, text: "76-year-old female with chronic systolic CHF admitted for worsening dyspnea.  No hypertension." },
    { id: 30, text: "74-year-old female with prior NSTEMI three weeks ago admitted for continued management of same MI." }
];

debugCases.forEach(c => {
    console.log(`\nCase ${c.id}:`);
    console.log(`Text: "${c.text}"`);
    const attrs = parseCardiology(c.text);
    console.log(`  hf_type: ${attrs.hf_type}`);
    console.log(`  hf_acuity: ${attrs.hf_acuity}`);
    console.log(`  acute_mi: ${attrs.acute_mi}`);
    console.log(`  old_mi: ${attrs.old_mi}`);

    const codes = resolveCardiologyCodes(attrs);
    console.log(`  Codes: ${codes.map(c => c.code).join(', ')}`);
});
