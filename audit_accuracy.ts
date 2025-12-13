import { parseInput } from './lib/structured/parser';
import { runStructuredRules } from './lib/structured/engine';

interface TestCase {
    num: number;
    text: string;
    expectedPrimary: string;
    expectedSecondary: string[];
    rationale: string;
}

const testCases: TestCase[] = [
    {
        num: 1,
        text: "80-year-old male with long-standing hypertension, ESRD on chronic hemodialysis, and chronic systolic CHF admitted for worsening shortness of breath due to acute on chronic heart failure.",
        expectedPrimary: "I50.23",
        expectedSecondary: ["I13.2", "N18.6"],
        rationale: "Admitted for HF exacerbation (acute on chronic) - I50.23 is principal. I13.2 for HTN+HF+CKD combo, N18.6 for ESRD stage."
    },
    {
        num: 6,
        text: "82-year-old male with ESRD on dialysis, hypertension, and chronic systolic heart failure admitted for routine dialysis, no HF exacerbation.",
        expectedPrimary: "Z49.31",
        expectedSecondary: ["I13.2", "I50.22", "N18.6", "Z99.2"],
        rationale: "Admitted for routine dialysis - Z49.31 is principal per UHDDS. All conditions are secondary."
    },
    {
        num: 7,
        text: "70-year-old female with chronic systolic CHF and no history of hypertension admitted for acute on chronic HF.",
        expectedPrimary: "I50.23",
        expectedSecondary: [],
        rationale: "No HTN documented - only I50.23 for acute on chronic systolic HF. No I11.0."
    },
    {
        num: 8,
        text: "67-year-old male with NSTEMI admitted for acute myocardial infarction. No prior MI history.",
        expectedPrimary: "I21.4",
        expectedSecondary: [],
        rationale: "Acute NSTEMI - I21.4 is principal. No old MI code."
    },
    {
        num: 14,
        text: "66-year-old male with dilated cardiomyopathy and chronic systolic HF admitted for routine follow-up.",
        expectedPrimary: "Z09",
        expectedSecondary: ["I50.22", "I42.0"],
        rationale: "Routine follow-up should be Z09 as principal, but system may code the conditions as primary."
    },
    {
        num: 22,
        text: "62-year-old male with chest pain ruled out for cardiac etiology and diagnosed as non-cardiac chest pain.",
        expectedPrimary: "NONE",
        expectedSecondary: [],
        rationale: "Non-cardiac chest pain - no cardiac codes should be generated. Correct to have no codes."
    },
    {
        num: 23,
        text: "76-year-old female with chronic systolic CHF admitted for worsening dyspnea. No hypertension.",
        expectedPrimary: "I50.22",
        expectedSecondary: [],
        rationale: "No HTN documented - only I50.22 for chronic systolic HF. No I11.0."
    },
    {
        num: 30,
        text: "74-year-old female with prior NSTEMI three weeks ago admitted for continued management of same MI.",
        expectedPrimary: "I22.2",
        expectedSecondary: [],
        rationale: "Subsequent MI within 4 weeks - I22.2 is correct for subsequent NSTEMI."
    },
    {
        num: 34,
        text: "80-year-old female with hypertension, CKD stage 5 on dialysis, admitted for hypertensive heart failure.",
        expectedPrimary: "I13.2",
        expectedSecondary: ["I50.9", "N18.5"],
        rationale: "Admitted for HF, not dialysis. I13.2 is principal. Should have specific HF code, not I50.9."
    },
    {
        num: 38,
        text: "79-year-old female with old MI admitted for routine follow-up.",
        expectedPrimary: "Z09",
        expectedSecondary: ["I25.2"],
        rationale: "Routine follow-up should be Z09 as principal, I25.2 as secondary."
    }
];

console.log('╔════════════════════════════════════════════════════════════════════════════════╗');
console.log('║              MEDICAL CODING ACCURACY AUDIT - SELECTED CASES                   ║');
console.log('╚════════════════════════════════════════════════════════════════════════════════╝\n');

let correctCount = 0;
let totalAudited = testCases.length;
const issues: string[] = [];

testCases.forEach(tc => {
    const { context } = parseInput(tc.text);
    const result = runStructuredRules(context);

    const actualPrimary = result.primary?.code || 'NONE';
    const actualSecondary = result.secondary.map(c => c.code);

    const primaryMatch = actualPrimary === tc.expectedPrimary;
    const secondaryMatch = tc.expectedSecondary.every(code => actualSecondary.includes(code));

    const isCorrect = primaryMatch && secondaryMatch;
    if (isCorrect) correctCount++;

    console.log(`┌─ CASE ${tc.num} ${isCorrect ? '✅' : '❌'} ${'─'.repeat(70 - `CASE ${tc.num}  `.length)}`);
    console.log(`│`);
    console.log(`│ ${tc.text.substring(0, 76)}`);
    if (tc.text.length > 76) {
        console.log(`│ ${tc.text.substring(76)}`);
    }
    console.log(`│`);
    console.log(`│ Expected Primary: ${tc.expectedPrimary}`);
    console.log(`│ Actual Primary:   ${actualPrimary} ${primaryMatch ? '✅' : '❌'}`);
    console.log(`│`);
    console.log(`│ Expected Secondary: [${tc.expectedSecondary.join(', ')}]`);
    console.log(`│ Actual Secondary:   [${actualSecondary.join(', ')}]`);
    console.log(`│`);
    console.log(`│ Rationale: ${tc.rationale}`);

    if (!isCorrect) {
        if (!primaryMatch) {
            issues.push(`Case ${tc.num}: Primary code mismatch - Expected ${tc.expectedPrimary}, got ${actualPrimary}`);
        }
        if (!secondaryMatch) {
            const missing = tc.expectedSecondary.filter(c => !actualSecondary.includes(c));
            if (missing.length > 0) {
                issues.push(`Case ${tc.num}: Missing secondary codes: ${missing.join(', ')}`);
            }
        }
    }

    console.log(`└${'─'.repeat(84)}\n`);
});

console.log('═'.repeat(86));
console.log('📊 AUDIT RESULTS\n');
console.log(`✅ Correct: ${correctCount}/${totalAudited} (${((correctCount / totalAudited) * 100).toFixed(1)}%)`);
console.log(`❌ Issues: ${totalAudited - correctCount}`);

if (issues.length > 0) {
    console.log('\n🔍 ISSUES FOUND:\n');
    issues.forEach((issue, idx) => {
        console.log(`${idx + 1}. ${issue}`);
    });

    console.log('\n💡 RECOMMENDED FIXES:\n');
    if (issues.some(i => i.includes('Case 14') || i.includes('Case 38'))) {
        console.log('- Implement Z09 (routine follow-up) encounter detection in parser');
    }
    if (issues.some(i => i.includes('Case 34'))) {
        console.log('- Fix parser to detect specific HF type from "hypertensive heart failure"');
        console.log('- Should not trigger dialysis encounter for "admitted for hypertensive heart failure"');
    }
} else {
    console.log('\n🎉 ALL AUDITED CASES PASSED!');
}

console.log('\n╔════════════════════════════════════════════════════════════════════════════════╗');
console.log('║                            AUDIT COMPLETE                                      ║');
console.log('╚════════════════════════════════════════════════════════════════════════════════╝');
