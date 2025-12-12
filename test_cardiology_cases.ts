import { parseInput } from './lib/structured/parser';
import { runStructuredRules } from './lib/structured/engine';

const cases = [
    "80-year-old male with long-standing hypertension, ESRD on chronic hemodialysis, and chronic systolic CHF admitted for worsening shortness of breath due to acute on chronic heart failure.",
    "72-year-old female with hypertension and CKD stage 4 admitted for volume overload. No heart failure documented.",
    "68-year-old male with hypertension admitted for acute decompensated systolic heart failure. No CKD.",
    "75-year-old female with hypertension, CKD stage 3, and chronic diastolic heart failure admitted for acute on chronic HF exacerbation.",
    "60-year-old male with essential hypertension admitted for blood pressure control. No cardiac or renal disease.",
    "82-year-old male with ESRD on dialysis, hypertension, and chronic systolic heart failure admitted for routine dialysis, no HF exacerbation.",
    "70-year-old female with chronic systolic CHF and no history of hypertension admitted for acute on chronic HF.",
    "67-year-old male with NSTEMI admitted for acute myocardial infarction. No prior MI history.",
    "74-year-old female with prior MI two years ago admitted for acute systolic heart failure exacerbation.",
    "65-year-old male with coronary artery disease and chronic stable angina admitted for exertional chest pain without MI.",
    "71-year-old female admitted for chest pain at rest diagnosed as unstable angina. No troponin elevation.",
    "59-year-old male with inferior STEMI admitted within 24 hours of symptom onset.",
    "78-year-old female with hypertension, CKD stage 5, and systolic heart failure admitted for acute on chronic HF.",
    "66-year-old male with dilated cardiomyopathy and chronic systolic HF admitted for routine follow-up.",
    "73-year-old female with hypertrophic cardiomyopathy admitted for syncope evaluation.",
    "69-year-old male with chronic atrial fibrillation admitted for rapid ventricular response.",
    "58-year-old female with new-onset atrial fibrillation identified in the emergency department.",
    "77-year-old male with hypertension and CKD stage 3 admitted for hypertensive urgency.",
    "64-year-old female with coronary artery disease without angina admitted for elective cardiac evaluation.",
    "81-year-old male with hypertension, ESRD, and heart failure admitted for acute pulmonary edema.",
    "70-year-old female with acute on chronic diastolic heart failure due to long-standing hypertension.",
    "62-year-old male with chest pain ruled out for cardiac etiology and diagnosed as non-cardiac chest pain.",
    "76-year-old female with chronic systolic CHF admitted for worsening dyspnea. No hypertension.",
    "68-year-old male with hypertension and CKD stage 2 admitted for CKD monitoring.",
    "79-year-old female with CAD and unstable angina admitted for cardiac catheterization.",
    "55-year-old male with hypertension and no other conditions admitted for medication adjustment.",
    "83-year-old male with ESRD on dialysis admitted for acute on chronic systolic HF exacerbation.",
    "71-year-old female with hypertension, CKD stage 4, and no heart failure admitted for renal evaluation.",
    "65-year-old male with permanent atrial fibrillation and chronic diastolic HF admitted for acute HF exacerbation.",
    "74-year-old female with prior NSTEMI three weeks ago admitted for continued management of same MI.",
    "69-year-old male with coronary artery disease and stable angina admitted for chest pain on exertion.",
    "77-year-old female with hypertension and combined systolic and diastolic HF admitted for acute decompensation.",
    "63-year-old male with dilated cardiomyopathy without HF admitted for routine cardiology follow-up.",
    "80-year-old female with hypertension, CKD stage 5 on dialysis, admitted for hypertensive heart failure.",
    "58-year-old male with acute STEMI anterior wall admitted emergently.",
    "72-year-old female with chronic AF and hypertension admitted for rate control.",
    "66-year-old male with hypertension, CKD stage 3, and systolic HF admitted for acute on chronic HF.",
    "79-year-old female with old MI admitted for routine follow-up.",
    "61-year-old male with hypertrophic cardiomyopathy and chronic diastolic HF admitted for acute HF exacerbation.",
    "85-year-old female with hypertension, ESRD, and chronic systolic CHF admitted for worsening shortness of breath."
];

console.log('=== CARDIOLOGY BATCH TEST (40 CASES) ===\n');

cases.forEach((caseText, idx) => {
    const { context } = parseInput(caseText);
    const result = runStructuredRules(context);

    const codes = [
        result.primary?.code,
        ...(result.secondary?.map(c => c.code) || [])
    ].filter(Boolean);

    console.log(`CASE ${idx + 1}: ${codes.join(', ') || 'NO CODES'}`);
});

console.log('\n=== COMPLETE ===');
