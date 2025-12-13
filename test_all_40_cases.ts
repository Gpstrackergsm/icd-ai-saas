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

interface Issue {
    caseNum: number;
    type: string;
    description: string;
    expected: string;
    actual: string;
}

const issues: Issue[] = [];

console.log('╔════════════════════════════════════════════════════════════════════════════════╗');
console.log('║              COMPREHENSIVE CARDIOLOGY TEST SUITE - 40 CASES                    ║');
console.log('╚════════════════════════════════════════════════════════════════════════════════╝\n');

cases.forEach((caseText, idx) => {
    const caseNum = idx + 1;
    const { context } = parseInput(caseText);
    const result = runStructuredRules(context);

    const allCodes = [result.primary, ...result.secondary].filter(Boolean);
    const primaryCode = result.primary?.code || 'NONE';

    // Issue detection logic
    const lowerText = caseText.toLowerCase();

    // Check for "no hypertension" negation
    if ((lowerText.includes('no history of hypertension') || lowerText.includes('no hypertension')) &&
        context.conditions.cardiovascular?.hypertension) {
        issues.push({
            caseNum,
            type: 'PARSER_NEGATION',
            description: 'Hypertension detected despite explicit negation',
            expected: 'hypertension = false',
            actual: 'hypertension = true'
        });
    }

    // Check for "no heart failure" negation
    if (lowerText.includes('no heart failure') && context.conditions.cardiovascular?.heartFailure) {
        issues.push({
            caseNum,
            type: 'PARSER_NEGATION',
            description: 'Heart failure detected despite explicit negation',
            expected: 'heartFailure = undefined',
            actual: 'heartFailure = present'
        });
    }

    // Check dialysis encounter sequencing
    if (lowerText.includes('admitted for routine dialysis') && primaryCode !== 'Z49.31') {
        issues.push({
            caseNum,
            type: 'SEQUENCING',
            description: 'Routine dialysis encounter should have Z49.31 as primary',
            expected: 'Z49.31',
            actual: primaryCode
        });
    }

    // Check routine follow-up sequencing
    if (lowerText.includes('routine follow-up') && !lowerText.includes('dialysis') &&
        primaryCode.startsWith('Z') && primaryCode !== 'Z09') {
        issues.push({
            caseNum,
            type: 'SEQUENCING',
            description: 'Routine follow-up should have Z09 as primary',
            expected: 'Z09',
            actual: primaryCode
        });
    }

    // Check for duplicate codes
    const codeCounts = new Map<string, number>();
    allCodes.forEach(c => {
        const count = codeCounts.get(c!.code) || 0;
        codeCounts.set(c!.code, count + 1);
    });
    codeCounts.forEach((count, code) => {
        if (count > 1) {
            issues.push({
                caseNum,
                type: 'DUPLICATE',
                description: `Code ${code} appears ${count} times`,
                expected: '1 occurrence',
                actual: `${count} occurrences`
            });
        }
    });

    console.log(`CASE ${caseNum}: ${allCodes.length} codes | Primary: ${primaryCode}`);
});

console.log('\n' + '═'.repeat(84));
console.log('📊 ISSUE SUMMARY\n');

if (issues.length === 0) {
    console.log('✅ ALL 40 CASES PASSED - NO ISSUES DETECTED!\n');
} else {
    console.log(`❌ FOUND ${issues.length} ISSUES ACROSS ${new Set(issues.map(i => i.caseNum)).size} CASES\n`);

    // Group by type
    const byType = new Map<string, Issue[]>();
    issues.forEach(issue => {
        const list = byType.get(issue.type) || [];
        list.push(issue);
        byType.set(issue.type, list);
    });

    byType.forEach((issueList, type) => {
        console.log(`\n${type} (${issueList.length} issues):`);
        console.log('─'.repeat(84));
        issueList.forEach(issue => {
            console.log(`  Case ${issue.caseNum}: ${issue.description}`);
            console.log(`    Expected: ${issue.expected}`);
            console.log(`    Actual:   ${issue.actual}`);
        });
    });

    console.log('\n' + '═'.repeat(84));
    console.log('🔧 FIXES NEEDED:\n');

    if (byType.has('PARSER_NEGATION')) {
        console.log('1. Fix parser to handle negation phrases:');
        console.log('   - "no history of hypertension"');
        console.log('   - "no hypertension"');
        console.log('   - "no heart failure"');
    }

    if (byType.has('DUPLICATE')) {
        console.log('2. Fix engine to prevent duplicate code generation');
    }

    if (byType.has('SEQUENCING')) {
        console.log('3. Fix sequencing logic for encounter-based codes');
    }
}

console.log('\n╔════════════════════════════════════════════════════════════════════════════════╗');
console.log('║                              ANALYSIS COMPLETE                                 ║');
console.log('╚════════════════════════════════════════════════════════════════════════════════╝');
