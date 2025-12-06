
import * as fs from 'fs';
import { parseInput } from './lib/structured/parser';

// Paths
const INPUT_FILE = './structured_1000_cases.txt';
const RESULTS_FILE = '/Users/khalidaitelmaati/Desktop/results.txt';
const REPORT_FILE = 'medical_audit_report.txt';

// Helper to remove duplicates from array
const unique = (arr: any[]) => Array.from(new Set(arr));

// --- 1. Load Data ---
const rawInput = fs.readFileSync(INPUT_FILE, 'utf8');
const rawResults = fs.readFileSync(RESULTS_FILE, 'utf8');

const inputCases = rawInput.split(/CASE \d+/).filter(c => c.trim().length > 0);
const resultCases = rawResults.split(/CASE \d+/).filter(c => c.trim().length > 0);

if (inputCases.length !== resultCases.length) {
    console.error(`FATAL: Mismatch in case counts. Input: ${inputCases.length}, Results: ${resultCases.length}`);
    process.exit(1);
}

console.log(`Loaded ${inputCases.length} cases for audit.`);

// Stats
let passed = 0;
let failed = 0;
let notCoded = 0; // Should be 0 based on previous checks
const failures: { id: number, reasons: string[] }[] = [];
const domainStats: Record<string, { total: number, failed: number }> = {
    'Diabetes': { total: 0, failed: 0 },
    'Respiratory': { total: 0, failed: 0 },
    'Renal': { total: 0, failed: 0 },
    'Sepsis': { total: 0, failed: 0 },
    'Cardiac': { total: 0, failed: 0 },
    'Wounds/Ulcers': { total: 0, failed: 0 },
    'Trauma': { total: 0, failed: 0 },
    'Oncology': { total: 0, failed: 0 },
    'Other': { total: 0, failed: 0 }
}; // Basic categorization

// --- Audit Logic ---

inputCases.forEach((caseText, index) => {
    const caseNum = index + 1;
    let resultText = resultCases[index];

    // Parse codes from resultText
    // Format: "Codes: A, B, C"
    // Remove newlines and trim
    let codeLine = resultText.trim().split('\n').find(l => l.startsWith('Codes:'));
    let codes: string[] = [];
    if (codeLine) {
        codes = codeLine.replace('Codes:', '').split(',').map(c => c.trim()).filter(c => c);
    }

    if (codes.length === 0 || (codes.length === 1 && codes[0] === 'ERROR')) {
        notCoded++;
        failed++;
        failures.push({ id: caseNum, reasons: ['NO OUTPUT / ERROR'] });
        return;
    }

    // Parse input context
    let context: any;
    try {
        const parsed = parseInput(caseText);
        context = parsed.context;
    } catch (e) {
        failed++;
        failures.push({ id: caseNum, reasons: ['INPUT PARSE ERROR'] });
        return;
    }

    const reasons: string[] = [];

    // --- RULES ---

    // 1) RESPIRATORY FAILURE RULE
    // Vent >= 24h OR Resp Fail = Acute/Acute on chronic -> J96.xx required
    const vent = context.conditions.respiratory?.mechanicalVent?.present; // Note: parser doesn't strictly parse duration to logic yet in all places, but let's check input text
    const ventDurationLine = caseText.split('\n').find(l => l.startsWith('Ventilation Duration:'));
    let ventDuration = 0;
    if (ventDurationLine) ventDuration = parseInt(ventDurationLine.split(':')[1].trim()) || 0;

    const respFailType = context.conditions.respiratory?.failure?.type;
    const hasAcuteRespFail = respFailType === 'acute' || respFailType === 'acute_on_chronic' || caseText.toLowerCase().includes('acute respiratory failure') || caseText.toLowerCase().includes('acute on chronic respiratory failure');

    if ((vent && ventDuration >= 24) || hasAcuteRespFail) {
        if (!codes.some(c => c.startsWith('J96'))) {
            reasons.push('Missing J96.xx with Vent >= 24h or Acute Resp Failure');
        }
    }

    // 2) DIABETES + CKD RULE
    // NEVER E1x.22 + N18.x
    // NEVER E1x.21 + E1x.22
    const e22 = codes.some(c => /^E1[0-9]\.22/.test(c));
    const e21 = codes.some(c => /^E1[0-9]\.21/.test(c));
    const n18 = codes.some(c => c.startsWith('N18'));

    if (e22 && n18) reasons.push('Illegal E1x.22 + N18.x combination');
    if (e21 && e22) reasons.push('Illegal E1x.21 + E1x.22 combination');

    // 3) DIABETIC FOOT ULCER RULE
    // E11.621 / E10.621 -> L97.xxx mandatory
    // Check suffixes: Stage 1->x91, Fat->x92, Muscle->x93, Bone->x94
    const hasDiabeticUlcerCode = codes.some(c => c.endsWith('.621') && c.startsWith('E'));
    if (hasDiabeticUlcerCode) {
        const l97 = codes.find(c => c.startsWith('L97'));
        if (!l97) {
            reasons.push('Missing L97.xxx with E11.621/E10.621');
        } else {
            // Check depth mapping
            let expectedSuffix = '';
            if (caseText.toLowerCase().includes('stage 1')) expectedSuffix = '1';
            else if (caseText.toLowerCase().includes('fat')) expectedSuffix = '2';
            else if (caseText.toLowerCase().includes('muscle')) expectedSuffix = '3';
            else if (caseText.toLowerCase().includes('bone')) expectedSuffix = '4';

            // Allow override if bone exposed is present (fixed in previous turn)
            if (caseText.toLowerCase().includes('bone exposed') || context.conditions.diabetes?.ulcerSeverity === 'bone') expectedSuffix = '4';

            if (expectedSuffix && !l97.endsWith(expectedSuffix)) {
                reasons.push(`Wrong L97 suffix. Expected ...${expectedSuffix}, got ${l97}`);
            }
        }
    }

    // 4) SEPSIS RULE
    // Sepsis=Yes -> A40.x or A41.x mandatory
    // Septic Shock=Yes -> R65.21 REQUIRED
    // Sequencing: A41 -> Site -> R65.21
    if (context.conditions.infection?.sepsis?.present || caseText.includes('Sepsis: Yes')) {
        const hasACode = codes.some(c => c.startsWith('A40') || c.startsWith('A41'));
        if (!hasACode) reasons.push('Sepsis=Yes but missing A40/A41 code');

        if (context.conditions.infection?.sepsis?.shock || caseText.includes('Septic Shock: Yes')) {
            if (!codes.includes('R65.21')) reasons.push('Septic Shock=Yes but missing R65.21');
        }

        // Sequencing check (basic): A41 before R65
        const aIndex = codes.findIndex(c => c.startsWith('A40') || c.startsWith('A41'));
        const rIndex = codes.findIndex(c => c === 'R65.21');
        if (aIndex !== -1 && rIndex !== -1 && aIndex > rIndex) {
            reasons.push('Sequencing Error: R65.21 appeared before Sepsis code');
        }
    }

    // 5) DRUG USE RULE
    // Drug Use: Yes ONLY -> Z72.2
    // F19/F11/F12 ONLY if abuse/dependence
    if (caseText.includes('Drug Use: Yes') && !caseText.toLowerCase().includes('abuse') && !caseText.toLowerCase().includes('dependence')) {
        const fCodes = codes.filter(c => c.startsWith('F1'));
        if (fCodes.length > 0) reasons.push(`Drug Use: Yes (no abuse) mapped to F-code (${fCodes.join(',')}) instead of Z72.2`);
        if (!codes.includes('Z72.2') && fCodes.length === 0) reasons.push('Drug Use: Yes missing Z72.2');
    }

    // 6) TRAUMA RULE
    // No S00 unless head
    // S90 calculated for superficial, S91 for open
    const s00 = codes.find(c => c.startsWith('S00'));
    // If S00 present, check if location is head/scalp
    if (s00) {
        const isHead = caseText.toLowerCase().includes('head') || caseText.toLowerCase().includes('scalp');
        // Actually, user says "DO NOT allow S00.xxx unless injury is to the head"
        // If the location is "Other" or "Right foot" etc, S00 is wrong.
        if (!isHead) reasons.push(`S00 code used for non-head injury`);
    }

    // 7) HEART FAILURE RULE
    // Heart Failure=Yes -> I11/I13 MUST be accompanied by I50.xx
    // No I50 = INCORRECT
    const hfPresent = caseText.toLowerCase().includes('heart failure: systolic') ||
        caseText.toLowerCase().includes('heart failure: diastolic') ||
        caseText.toLowerCase().includes('heart failure: combined') ||
        (context.conditions.cardiovascular?.heartFailure && context.conditions.cardiovascular.heartFailure.type !== 'none');

    if (hfPresent) {
        if (!codes.some(c => c.startsWith('I50'))) reasons.push('Heart Failure documented but missing I50.xx');
    }

    // 8) CKD STAGING RULE
    // Multiple CKD stages -> keep highest (Logic check mainly, hard to auto-verify unless we see multiple N18s)
    const n18Codes = codes.filter(c => c.startsWith('N18'));
    if (n18Codes.length > 1) {
        reasons.push(`Multiple N18 codes present: ${n18Codes.join(', ')}`);
    }

    // 9) PRIMARY DIAGNOSIS RULE
    // Determine true principal diagnosis
    // This is complex to automate perfectly without a full encoder, but we can check common failures.
    // e.g., if Sepsis is present on admission, it's usually primary (unless localized infection is source and sepsis is not present on admission? User rule: "Sepsis sequencing must be: A41/A40 -> site")
    // If Sepsis is primary, first code MUST be A41/A40.
    if (context.conditions.infection?.sepsis?.present) {
        // Assuming sepsis is POA (Present on Admission) which is standard for these cases unless stated otherwise
        // The user rule "Sepsis sequencing must be: A41 -> site" implies A41 is primary.
        if (codes.length > 0 && !(codes[0].startsWith('A40') || codes[0].startsWith('A41'))) {
            // Exception: If T81 (post-procedural) is primary?
            // For now, strict check based on user prompt.
            // User provided specific order: A41/A40 -> site
            reasons.push(`Sepsis sequencing violation: Expected A41/A40 as first code`);
        }
    }


    // Determine Domain for Stats
    let domain = 'Other';
    if (caseText.includes('Diabetes Type:')) domain = 'Diabetes';
    else if (caseText.includes('COPD:')) domain = 'Respiratory';
    else if (caseText.includes('CKD Present: Yes')) domain = 'Renal';
    else if (caseText.includes('Sepsis: Yes')) domain = 'Sepsis';
    else if (caseText.toLowerCase().includes('heart failure')) domain = 'Cardiac';
    else if (caseText.includes('Ulcer/Wound: Yes')) domain = 'Wounds/Ulcers';
    else if (caseText.includes('Type: Traumatic')) domain = 'Trauma';
    else if (caseText.toLowerCase().includes('cancer') || caseText.toLowerCase().includes('neoplasm')) domain = 'Oncology';

    domainStats[domain] = domainStats[domain] || { total: 0, failed: 0 };
    domainStats[domain].total++;

    if (reasons.length > 0) {
        failed++;
        failures.push({ id: caseNum, reasons });
        domainStats[domain].failed++;
    } else {
        passed++;
    }
});


// --- Generate Report ---

const accuracy = ((passed / inputCases.length) * 100).toFixed(1);

let report = `MEDICAL AUDIT REPORT — 1000 CASES
========================================

TOTAL CASES: ${inputCases.length}

✅ CORRECT:  ${passed}
❌ INCORRECT: ${failed}
⚠ NOT CODED / NO OUTPUT: ${notCoded}

MEDICAL ACCURACY: ${accuracy}%

----------------------------------------
DOMAIN BREAKDOWN:
----------------------------------------
`;

for (const [dom, stats] of Object.entries(domainStats)) {
    report += `${dom}: ${stats.failed}/${stats.total} Failed\n`;
}

report += `
----------------------------------------
TOP ERROR PATTERNS:
----------------------------------------
`;

const allReasons = failures.flatMap(f => f.reasons);
const reasonCounts: Record<string, number> = {};
allReasons.forEach(r => reasonCounts[r] = (reasonCounts[r] || 0) + 1);
const topReasons = Object.entries(reasonCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);

topReasons.forEach((r, i) => {
    report += `${i + 1}) ${r[0]} (${r[1]} cases)\n`;
});

report += `
----------------------------------------
CRITICAL FAILURES (List CASE NUMBERS):
----------------------------------------
`;
const criticalFailures = failures.slice(0, 50); // Warning: showing top 50 only
criticalFailures.forEach(f => {
    report += `CASE ${f.id} – ${f.reasons.join(', ')}\n`;
});
if (failures.length > 50) report += `... and ${failures.length - 50} more.\n`;


report += `
----------------------------------------
FINAL MEDICAL VERDICT:
----------------------------------------
`;

let verdict = '☐ NOT AUDIT-SAFE';
let justification = 'Too many critical failures.';

if (accuracy === '100.0') {
    verdict = '☐ AUDIT-GRADE COMPLIANT'; // Check user requested format, actually logic below
    verdict = '☑ AUDIT-GRADE COMPLIANT'; // Use checkmark? User had empty box.
    // User Output format had empty boxes. I will check the appropriate one.
    verdict = '☐ NOT AUDIT-SAFE\n☐ CONDITIONALLY ACCEPTABLE\n☑ AUDIT-GRADE COMPLIANT';
    justification = '100% Accuracy achieved across all mandatory rules.';
} else if (parseFloat(accuracy) > 95) {
    verdict = '☐ NOT AUDIT-SAFE\n☑ CONDITIONALLY ACCEPTABLE\n☐ AUDIT-GRADE COMPLIANT';
    justification = 'High accuracy but critical errors persist in specific domains.';
} else {
    verdict = '☑ NOT AUDIT-SAFE\n☐ CONDITIONALLY ACCEPTABLE\n☐ AUDIT-GRADE COMPLIANT';
    justification = 'Significant systematic errors violating mandatory ICD-10-CM guidelines.';
}

report += `${verdict}

With justification.
${justification}

----------------------------------------
RECOMMENDATIONS TO REACH ≥ 99%:
----------------------------------------
`;

if (topReasons.length === 0) {
    report += '1) Maintain current logic.\n2) Periodic regression testing.\n';
} else {
    topReasons.forEach((r, i) => {
        report += `${i + 1}) Fix: ${r[0]}\n`;
    });
}

console.log(report);
fs.writeFileSync(REPORT_FILE, report);
