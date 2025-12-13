import { parseInput } from './lib/structured/parser';
import { runStructuredRules } from './lib/structured/engine';

interface TestCase {
    num: number;
    text: string;
    expectedPrimary: string;
    expectedSecondary: string[];
    rationale: string;
}

// All 40 cases with expected correct codes per ICD-10-CM guidelines
const allCases: TestCase[] = [
    {
        num: 1,
        text: "80-year-old male with long-standing hypertension, ESRD on chronic hemodialysis, and chronic systolic CHF admitted for worsening shortness of breath due to acute on chronic heart failure.",
        expectedPrimary: "I50.23",
        expectedSecondary: ["I13.2", "N18.6"],
        rationale: "Admitted for acute on chronic HF - I50.23 is principal per UHDDS"
    },
    {
        num: 2,
        text: "72-year-old female with hypertension and CKD stage 4 admitted for volume overload. No heart failure documented.",
        expectedPrimary: "I12.9",
        expectedSecondary: ["N18.4"],
        rationale: "HTN+CKD without HF - I12.9 is principal"
    },
    {
        num: 3,
        text: "68-year-old male with hypertension admitted for acute decompensated systolic heart failure. No CKD.",
        expectedPrimary: "I50.21",
        expectedSecondary: ["I11.0"],
        rationale: "Acute systolic HF - I50.21 principal, I11.0 secondary"
    },
    {
        num: 4,
        text: "75-year-old female with hypertension, CKD stage 3, and chronic diastolic heart failure admitted for acute on chronic HF exacerbation.",
        expectedPrimary: "I50.33",
        expectedSecondary: ["I13.0", "N18.3"],
        rationale: "Acute on chronic diastolic HF - I50.33 principal"
    },
    {
        num: 5,
        text: "60-year-old male with essential hypertension admitted for blood pressure control. No cardiac or renal disease.",
        expectedPrimary: "I10",
        expectedSecondary: [],
        rationale: "Essential HTN only - I10"
    },
    {
        num: 6,
        text: "82-year-old male with ESRD on dialysis, hypertension, and chronic systolic heart failure admitted for routine dialysis, no HF exacerbation.",
        expectedPrimary: "Z49.31",
        expectedSecondary: ["I13.2", "I50.22", "N18.6", "Z99.2"],
        rationale: "Routine dialysis - Z49.31 principal per UHDDS"
    },
    {
        num: 7,
        text: "70-year-old female with chronic systolic CHF and no history of hypertension admitted for acute on chronic HF.",
        expectedPrimary: "I50.23",
        expectedSecondary: [],
        rationale: "No HTN - only I50.23"
    },
    {
        num: 8,
        text: "67-year-old male with NSTEMI admitted for acute myocardial infarction. No prior MI history.",
        expectedPrimary: "I21.4",
        expectedSecondary: [],
        rationale: "Acute NSTEMI - I21.4"
    },
    {
        num: 9,
        text: "74-year-old female with prior MI two years ago admitted for acute systolic heart failure exacerbation.",
        expectedPrimary: "I50.21",
        expectedSecondary: ["I25.2"],
        rationale: "Acute systolic HF principal, old MI secondary"
    },
    {
        num: 10,
        text: "65-year-old male with coronary artery disease and chronic stable angina admitted for exertional chest pain without MI.",
        expectedPrimary: "I25.111",
        expectedSecondary: [],
        rationale: "CAD with stable angina - I25.111"
    },
    {
        num: 11,
        text: "71-year-old female admitted for chest pain at rest diagnosed as unstable angina. No troponin elevation.",
        expectedPrimary: "I20.0",
        expectedSecondary: [],
        rationale: "Unstable angina - I20.0"
    },
    {
        num: 12,
        text: "59-year-old male with inferior STEMI admitted within 24 hours of symptom onset.",
        expectedPrimary: "I21.19",
        expectedSecondary: [],
        rationale: "Acute inferior STEMI - I21.19"
    },
    {
        num: 13,
        text: "78-year-old female with hypertension, CKD stage 5, and systolic heart failure admitted for acute on chronic HF.",
        expectedPrimary: "I50.23",
        expectedSecondary: ["I13.2", "N18.5"],
        rationale: "Acute on chronic HF principal"
    },
    {
        num: 14,
        text: "66-year-old male with dilated cardiomyopathy and chronic systolic HF admitted for routine follow-up.",
        expectedPrimary: "Z09",
        expectedSecondary: ["I50.22", "I42.0"],
        rationale: "Routine follow-up - Z09 principal"
    },
    {
        num: 15,
        text: "73-year-old female with hypertrophic cardiomyopathy admitted for syncope evaluation.",
        expectedPrimary: "I42.2",
        expectedSecondary: [],
        rationale: "Hypertrophic cardiomyopathy - I42.2"
    },
    {
        num: 16,
        text: "69-year-old male with chronic atrial fibrillation admitted for rapid ventricular response.",
        expectedPrimary: "I48.91",
        expectedSecondary: [],
        rationale: "Chronic AF - I48.91"
    },
    {
        num: 17,
        text: "58-year-old female with new-onset atrial fibrillation identified in the emergency department.",
        expectedPrimary: "I48.91",
        expectedSecondary: [],
        rationale: "New-onset AF - I48.91"
    },
    {
        num: 18,
        text: "77-year-old male with hypertension and CKD stage 3 admitted for hypertensive urgency.",
        expectedPrimary: "I12.9",
        expectedSecondary: ["N18.3"],
        rationale: "HTN+CKD - I12.9 principal"
    },
    {
        num: 19,
        text: "64-year-old female with coronary artery disease without angina admitted for elective cardiac evaluation.",
        expectedPrimary: "I25.10",
        expectedSecondary: [],
        rationale: "CAD without angina - I25.10"
    },
    {
        num: 20,
        text: "81-year-old male with hypertension, ESRD, and heart failure admitted for acute pulmonary edema.",
        expectedPrimary: "I50.9",
        expectedSecondary: ["I13.2", "N18.6"],
        rationale: "Acute pulmonary edema (HF) principal"
    },
    {
        num: 21,
        text: "70-year-old female with acute on chronic diastolic heart failure due to long-standing hypertension.",
        expectedPrimary: "I50.33",
        expectedSecondary: ["I11.0"],
        rationale: "Acute on chronic diastolic HF principal"
    },
    {
        num: 22,
        text: "62-year-old male with chest pain ruled out for cardiac etiology and diagnosed as non-cardiac chest pain.",
        expectedPrimary: "NONE",
        expectedSecondary: [],
        rationale: "Non-cardiac - no cardiac codes"
    },
    {
        num: 23,
        text: "76-year-old female with chronic systolic CHF admitted for worsening dyspnea. No hypertension.",
        expectedPrimary: "I50.22",
        expectedSecondary: [],
        rationale: "No HTN - only I50.22"
    },
    {
        num: 24,
        text: "68-year-old male with hypertension and CKD stage 2 admitted for CKD monitoring.",
        expectedPrimary: "I12.9",
        expectedSecondary: ["N18.2"],
        rationale: "HTN+CKD - I12.9 principal"
    },
    {
        num: 25,
        text: "79-year-old female with CAD and unstable angina admitted for cardiac catheterization.",
        expectedPrimary: "I20.0",
        expectedSecondary: ["I25.10"],
        rationale: "Unstable angina principal"
    },
    {
        num: 26,
        text: "55-year-old male with hypertension and no other conditions admitted for medication adjustment.",
        expectedPrimary: "I10",
        expectedSecondary: [],
        rationale: "Essential HTN - I10"
    },
    {
        num: 27,
        text: "83-year-old male with ESRD on dialysis admitted for acute on chronic systolic HF exacerbation.",
        expectedPrimary: "I50.23",
        expectedSecondary: ["N18.6"],
        rationale: "Acute on chronic HF principal"
    },
    {
        num: 28,
        text: "71-year-old female with hypertension, CKD stage 4, and no heart failure admitted for renal evaluation.",
        expectedPrimary: "I12.9",
        expectedSecondary: ["N18.4"],
        rationale: "HTN+CKD - I12.9 principal"
    },
    {
        num: 29,
        text: "65-year-old male with permanent atrial fibrillation and chronic diastolic HF admitted for acute HF exacerbation.",
        expectedPrimary: "I50.31",
        expectedSecondary: ["I48.91"],
        rationale: "Acute diastolic HF principal"
    },
    {
        num: 30,
        text: "74-year-old female with prior NSTEMI three weeks ago admitted for continued management of same MI.",
        expectedPrimary: "I22.2",
        expectedSecondary: [],
        rationale: "Subsequent NSTEMI within 4 weeks - I22.2"
    },
    {
        num: 31,
        text: "69-year-old male with coronary artery disease and stable angina admitted for chest pain on exertion.",
        expectedPrimary: "I25.111",
        expectedSecondary: [],
        rationale: "CAD with stable angina - I25.111"
    },
    {
        num: 32,
        text: "77-year-old female with hypertension and combined systolic and diastolic HF admitted for acute decompensation.",
        expectedPrimary: "I50.41",
        expectedSecondary: ["I11.0"],
        rationale: "Acute combined HF principal"
    },
    {
        num: 33,
        text: "63-year-old male with dilated cardiomyopathy without HF admitted for routine cardiology follow-up.",
        expectedPrimary: "I42.0",
        expectedSecondary: [],
        rationale: "Dilated cardiomyopathy - I42.0"
    },
    {
        num: 34,
        text: "80-year-old female with hypertension, CKD stage 5 on dialysis, admitted for hypertensive heart failure.",
        expectedPrimary: "I13.2",
        expectedSecondary: ["I50.9", "N18.5"],
        rationale: "Admitted for HF - I13.2 principal"
    },
    {
        num: 35,
        text: "58-year-old male with acute STEMI anterior wall admitted emergently.",
        expectedPrimary: "I21.09",
        expectedSecondary: [],
        rationale: "Acute anterior STEMI - I21.09"
    },
    {
        num: 36,
        text: "72-year-old female with chronic AF and hypertension admitted for rate control.",
        expectedPrimary: "I10",
        expectedSecondary: ["I48.91"],
        rationale: "HTN principal for rate control admission"
    },
    {
        num: 37,
        text: "66-year-old male with hypertension, CKD stage 3, and systolic HF admitted for acute on chronic HF.",
        expectedPrimary: "I50.23",
        expectedSecondary: ["I13.0", "N18.3"],
        rationale: "Acute on chronic HF principal"
    },
    {
        num: 38,
        text: "79-year-old female with old MI admitted for routine follow-up.",
        expectedPrimary: "Z09",
        expectedSecondary: ["I25.2"],
        rationale: "Routine follow-up - Z09 principal"
    },
    {
        num: 39,
        text: "61-year-old male with hypertrophic cardiomyopathy and chronic diastolic HF admitted for acute HF exacerbation.",
        expectedPrimary: "I50.31",
        expectedSecondary: ["I42.2"],
        rationale: "Acute diastolic HF principal"
    },
    {
        num: 40,
        text: "85-year-old female with hypertension, ESRD, and chronic systolic CHF admitted for worsening shortness of breath.",
        expectedPrimary: "I13.2",
        expectedSecondary: ["I50.22", "N18.6"],
        rationale: "Worsening SOB but chronic HF - I13.2 principal"
    }
];

console.log('╔════════════════════════════════════════════════════════════════════════════════╗');
console.log('║         COMPREHENSIVE MEDICAL CODING AUDIT - ALL 40 CASES                     ║');
console.log('╚════════════════════════════════════════════════════════════════════════════════╝\n');

let correctCount = 0;
const issues: string[] = [];

allCases.forEach(tc => {
    const { context } = parseInput(tc.text);
    const result = runStructuredRules(context);

    const actualPrimary = result.primary?.code || 'NONE';
    const actualSecondary = result.secondary.map(c => c.code);

    const primaryMatch = actualPrimary === tc.expectedPrimary;
    const secondaryMatch = tc.expectedSecondary.every(code => actualSecondary.includes(code));

    const isCorrect = primaryMatch && secondaryMatch;
    if (isCorrect) correctCount++;

    const status = isCorrect ? '✅' : '❌';

    console.log(`${status} CASE ${tc.num}: ${tc.text.substring(0, 70)}...`);
    console.log(`   Expected: ${tc.expectedPrimary} | Actual: ${actualPrimary} ${primaryMatch ? '✅' : '❌'}`);

    if (!isCorrect) {
        if (!primaryMatch) {
            issues.push(`Case ${tc.num}: PRIMARY MISMATCH - Expected ${tc.expectedPrimary}, got ${actualPrimary}`);
            console.log(`   ⚠️  PRIMARY MISMATCH`);
        }
        if (!secondaryMatch) {
            const missing = tc.expectedSecondary.filter(c => !actualSecondary.includes(c));
            const extra = actualSecondary.filter(c => !tc.expectedSecondary.includes(c));
            if (missing.length > 0) {
                issues.push(`Case ${tc.num}: MISSING SECONDARY - ${missing.join(', ')}`);
                console.log(`   ⚠️  MISSING SECONDARY: ${missing.join(', ')}`);
            }
            if (extra.length > 0 && tc.expectedSecondary.length > 0) {
                console.log(`   ℹ️  EXTRA SECONDARY: ${extra.join(', ')}`);
            }
        }
        console.log(`   Rationale: ${tc.rationale}`);
    }
    console.log('');
});

console.log('═'.repeat(86));
console.log('📊 FINAL AUDIT RESULTS\n');
console.log(`✅ Correct: ${correctCount}/40 (${((correctCount / 40) * 100).toFixed(1)}%)`);
console.log(`❌ Incorrect: ${40 - correctCount}/40\n`);

if (issues.length > 0) {
    console.log('🔍 ISSUES FOUND:\n');
    issues.forEach((issue, idx) => {
        console.log(`${idx + 1}. ${issue}`);
    });
} else {
    console.log('🎉 PERFECT! ALL 40 CASES PASSED!\n');
}

console.log('\n╔════════════════════════════════════════════════════════════════════════════════╗');
console.log('║                            AUDIT COMPLETE                                      ║');
console.log('╚════════════════════════════════════════════════════════════════════════════════╝');
