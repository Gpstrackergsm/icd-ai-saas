
import { SequencedCode } from '../../rulesEngineCore';

// =======================================================
// 1) NLP RESOLVER - Cardiology Attributes
// =======================================================

export interface CardiologyAttributes {
    hypertension: boolean;
    htn_with_ckd: boolean; // Computed logic
    htn_with_heart_failure: boolean; // Computed logic
    htn_with_ckd_and_hf: boolean; // Computed logic
    ckd_stage: string | null; // "1", "2", "3", "4", "5", "esrd"

    heart_failure: boolean;
    hf_type: 'systolic' | 'diastolic' | 'combined' | 'unspecified' | null;
    hf_acuity: 'acute' | 'chronic' | 'acute_on_chronic' | 'unspecified' | null;

    ischemic_hd: boolean;
    angina: boolean;
    angina_type: 'stable' | 'unstable' | 'variant' | 'unspecified' | null;

    acute_mi: boolean;
    mi_type: 'stemi' | 'nstemi' | 'unspecified' | null;
    mi_location: 'anterior' | 'inferior' | 'other' | 'unspecified' | null;
    mi_days_since_onset: number | null;

    old_mi: boolean;

    atrial_fibrillation: boolean;
    af_type: 'paroxysmal' | 'persistent' | 'chronic' | 'unspecified' | null;

    cardiomyopathy: boolean;
    cardiomyopathy_type: 'dilated' | 'hypertrophic' | 'other' | 'unspecified' | null;

    pulmonary_htn: boolean;
    cardiomegaly: boolean;

    chest_pain: boolean;
    chest_pain_cardiac: boolean | null; // true/false/unknown

    tobacco_use: boolean;
    hyperlipidemia: boolean;
}

export function parseCardiology(text: string): CardiologyAttributes {
    const t = text.toLowerCase();
    const attrs: CardiologyAttributes = {
        hypertension: false,
        htn_with_ckd: false, // will be computed in logic phase usually, but NLP can hint
        htn_with_heart_failure: false,
        htn_with_ckd_and_hf: false,
        ckd_stage: null,

        heart_failure: false,
        hf_type: null,
        hf_acuity: null,

        ischemic_hd: false,
        angina: false,
        angina_type: null,

        acute_mi: false,
        mi_type: null,
        mi_location: null,
        mi_days_since_onset: null,

        old_mi: false,

        atrial_fibrillation: false,
        af_type: null,

        cardiomyopathy: false,
        cardiomyopathy_type: null,

        pulmonary_htn: false,
        cardiomegaly: false,

        chest_pain: false,
        chest_pain_cardiac: null,

        tobacco_use: false,
        hyperlipidemia: false,
    };



    // HEART FAILURE
    // Fix: "volume overload" implies HF clinically but strictly should look for failure diagnoses or strong synonyms.
    // Case 2 failed because "volume overload" triggered HF? No, check regex. "congestive heart failure" ... wait.
    // Actually, Case 2 output had "I50.9". Why? "volume overload" isn't in my regex. 
    // Wait, "admitted for volume overload" -> The text has "ckd stage 4" -> attributes.ckd_stage = 4.
    // Why did it have I50.9? Ah, checking regex again.
    // Regex: /(chf|heart failure|hfrr|hfpef|biventricular failure|pulmonary edema)/
    // Input: "...admitted for volume overload. No heart failure documented."
    // "No heart failure" -> The "no evidence of" check might have failed due to "documented"?
    // Fix: Improve negation check and regex.

    // ACUTE MI exclusion Logic
    // Case 11: "history of inferior STEMI 3 days ago" -> This IS acute. "History of" usually implies old, but "3 days ago" makes it acute.
    // Fix: special check for "history of ... X days ago" where X < 28.

    // HYPERTENSION
    // Fix Case 15: Check for "no HTN" with flexible spacing/punctuation
    if (/\b(htn|hypertension|high blood pressure|elevated bp)\b/.test(t)) {
        // Use global search to check if any negation pattern exists
        const hasNegation = /\b(no|without|denies|ruled out|negative for)[\s,;.]+\b(htn|hypertension)\b/.test(t);
        if (!hasNegation) {
            attrs.hypertension = true;
        }
    }

    // HEART FAILURE
    if (/\b(chf|heart failure|hf|hfrr|hfpef|biventricular failure|pulmonary edema)\b/.test(t)) {
        // Check negation
        if (!/(no|denies|ruled out|free of|negative for)\s+(chf|heart failure|hf|pulmonary edema)/.test(t)) {
            attrs.heart_failure = true;
        }

        if (attrs.heart_failure) {
            // Type - Fix Case 6: Check "combined" FIRST before systolic/diastolic
            if (/combined|systolic and diastolic|biventricular/.test(t)) attrs.hf_type = 'combined';
            else if (/systolic|hfrr|reduced ef/.test(t)) attrs.hf_type = 'systolic';
            else if (/diastolic|hfpef|preserved ef/.test(t)) attrs.hf_type = 'diastolic';
            else attrs.hf_type = 'unspecified';

            // Acuity
            if (/acute on chronic/.test(t)) attrs.hf_acuity = 'acute_on_chronic';
            else if (/acute|decompensated|flash/.test(t)) attrs.hf_acuity = 'acute';
            else if (/chronic|stable/.test(t)) attrs.hf_acuity = 'chronic';
            else attrs.hf_acuity = 'unspecified';
        }
    }

    // CKD
    if (/\b(ckd|chronic kidney disease|renal failure)\b/.test(t)) {
        if (/stage 5|esrd|end stage/.test(t)) attrs.ckd_stage = '5';
        else if (/stage 4/.test(t)) attrs.ckd_stage = '4';
        else if (/stage 3/.test(t)) attrs.ckd_stage = '3';
        else if (/stage 2/.test(t)) attrs.ckd_stage = '2';
        else if (/stage 1/.test(t)) attrs.ckd_stage = '1';

        if (/dialysis/.test(t)) attrs.ckd_stage = 'esrd';
    }

    // ISCHEMIC HEART DISEASE / CAD
    if (/\b(cad|coronary artery disease|ischemic heart|coronary atherosclerosis|vessel disease)\b/.test(t)) {
        attrs.ischemic_hd = true;
    }

    // ANGINA
    if (/\bangina\b/.test(t) && !/no angina/.test(t)) {
        attrs.angina = true;
        if (/unstable/.test(t)) attrs.angina_type = 'unstable';
        else if (/variant|prinzmetal|vasospastic/.test(t)) attrs.angina_type = 'variant';
        else if (/stable|exertional/.test(t)) attrs.angina_type = 'stable';
        else attrs.angina_type = 'unspecified';
    }

    // ACUTE MI vs OLD MI
    // Fix: Word boundaries + better negation for "without MI", "no prior MI", "no new MI"
    const miRegex = /\b(mi|myocardial infarction|heart attack|stemi|nstemi)\b/;

    if (miRegex.test(t)) {
        // Extract timing info first
        const daysMatch = t.match(/(\d+)\s*days\s*ago/);
        const weeksMatch = t.match(/(\d+)\s*weeks?\s*ago/);
        let days = daysMatch ? parseInt(daysMatch[1]) : (weeksMatch ? parseInt(weeksMatch[1]) * 7 : null);

        // Fix Case 6: "No new MI" should ALLOW old_mi, but "No MI" should block everything
        const hasNewMiNegation = /(no|without)\s+new\s+(mi|myocard|heart attack)/.test(t);
        // General negation: "no MI" but NOT "no NEW mi"  
        const hasGeneralMiNegation = /(no|without)\s+(?!new\s+)(mi|myocard|heart attack)/.test(t);


        // Fix Case 5: Check separately for "no prior MI" negation phrase
        const isHistory = /(history of|old|prior|previous)\s*\b(mi|myocardial infarction|heart attack|stemi)\b/.test(t);
        const hasPriorMiNegation = /no\s+(prior|previous|old)\s+(mi|myocardial infarction)/.test(t);

        // Special handling: "History of MI 3 days ago" -> Acute (recent event within 28 days)
        if (isHistory && days !== null && days <= 28) {
            if (!hasGeneralMiNegation && !hasNewMiNegation) {
                attrs.acute_mi = true;
                attrs.mi_days_since_onset = days;
            }
        } else if (isHistory || /\bold mi\b/.test(t) || (days !== null && days > 28)) {
            // Old MI: either explicitly "history/prior/old" OR > 28 days ago
            // Allow old_mi if only "no NEW mi" is present (not general "no mi")
            if (!hasPriorMiNegation && !hasGeneralMiNegation) {
                attrs.old_mi = true;
            }
            // Check for NEW MI distinct from old (e.g., "prior MI, now with NSTEMI")
            if (/now with|current|new onset/.test(t) && miRegex.test(t)) {
                if (/\b(nstemi|acute mi|new mi|stemi)\b/.test(t)) attrs.acute_mi = true;
            }
        } else {
            // No history term -> Check if it's actually acute (not negated)
            if (!hasGeneralMiNegation && !hasNewMiNegation) {
                attrs.acute_mi = true;
            }
        }
    }

    // Cleanup: if NSTEMI distinct from old MI (overrides history checks)
    if (/nstemi/.test(t)) {
        attrs.acute_mi = true;
        attrs.mi_type = 'nstemi';  // Set type here too
    }

    // Type detection (if not already set by cleanup)
    if (attrs.acute_mi && !attrs.mi_type) {
        if (/stemi/.test(t) && !/nstemi/.test(t)) {
            attrs.mi_type = 'stemi';
            if (/anterior/.test(t)) attrs.mi_location = 'anterior';
            else if (/inferior/.test(t)) attrs.mi_location = 'inferior';
            else attrs.mi_location = 'unspecified';
        } else {
            attrs.mi_type = 'unspecified';
        }
    }


    // ATRIAL FIBRILLATION
    // Case 8 fix: "AF"
    if (/(af\b|afib|a-fib|atrial fibrillation)/.test(t)) {
        attrs.atrial_fibrillation = true;
        if (/paroxysmal/.test(t)) attrs.af_type = 'paroxysmal';
        else if (/persistent/.test(t)) attrs.af_type = 'persistent';
        else if (/chronic|permanent/.test(t)) attrs.af_type = 'chronic';
        else attrs.af_type = 'unspecified';
    }

    // CARDIOMYOPATHY
    if (/cardiomyopathy/.test(t)) {
        attrs.cardiomyopathy = true;
        if (/dilated|dcm/.test(t)) attrs.cardiomyopathy_type = 'dilated';
        else if (/hypertrophic|hcm/.test(t)) attrs.cardiomyopathy_type = 'hypertrophic';
        else attrs.cardiomyopathy_type = 'unspecified';
    }

    // CHEST PAIN
    if (/chest pain/.test(t)) {
        attrs.chest_pain = true;
        if (/non-cardiac/.test(t)) attrs.chest_pain_cardiac = false;
        // Should default null/unknown
    }

    return attrs;
}

// =======================================================
// 2) CARDIO LOGIC RESOLVER (Rules Engine)
// =======================================================

export function resolveCardiologyCodes(attrs: CardiologyAttributes): SequencedCode[] {
    const codes: SequencedCode[] = [];

    // Track if we have HTN+CKD+HF combination for sequencing priority
    const hasHtnCkdHf = attrs.hypertension && attrs.heart_failure && attrs.ckd_stage;

    // --- HYPERTENSION FAMILY LOGIC (I10-I15) ---
    if (attrs.hypertension) {
        if (attrs.heart_failure && attrs.ckd_stage) {
            // I13: Hypertensive Heart & CKD
            let code = 'I13.10'; // Default unspecified
            if (['5', 'esrd'].includes(attrs.ckd_stage)) {
                code = 'I13.2'; // Stage 5/ESRD with HF
            } else {
                code = 'I13.0'; // Stage 1-4 with HF
            }
            codes.push({ code, label: 'Hypertensive heart and chronic kidney disease with heart failure', triggeredBy: 'htn_hf_ckd', hcc: true });

            // MUST ADD HF TYPE (I50.x)
            addHeartFailureCode(codes, attrs);
            // MUST ADD CKD STAGE (N18.x)
            addCkdCode(codes, attrs);

        } else if (attrs.heart_failure) {
            // I11: Hypertensive Heart Disease
            codes.push({ code: 'I11.0', label: 'Hypertensive heart disease with heart failure', triggeredBy: 'htn_hf', hcc: true });
            addHeartFailureCode(codes, attrs);

        } else if (attrs.ckd_stage) {
            // I12: Hypertensive CKD
            let code = 'I12.9';
            if (['5', 'esrd'].includes(attrs.ckd_stage)) code = 'I12.0';
            codes.push({ code, label: 'Hypertensive chronic kidney disease', triggeredBy: 'htn_ckd', hcc: true });
            addCkdCode(codes, attrs);

        } else {
            // I10: Essential HTN
            codes.push({ code: 'I10', label: 'Essential (primary) hypertension', triggeredBy: 'htn_essential', hcc: false }); // I10 is not HCC usually? Wait, I10 is not HCC. I12, I11 are.
        }
    } else {
        // No HTN, but might have HF isolated
        if (attrs.heart_failure) {
            addHeartFailureCode(codes, attrs);
        }
        if (attrs.ckd_stage) {
            addCkdCode(codes, attrs);
        }
    }

    // --- ACUTE MI (I21) ---
    if (attrs.acute_mi) {
        if (attrs.mi_type === 'nstemi') {
            codes.push({ code: 'I21.4', label: 'Non-ST elevation (NSTEMI) myocardial infarction', triggeredBy: 'mi', hcc: true });
        } else {
            // STEMI
            let code = 'I21.3'; // Unspecified site
            if (attrs.mi_location === 'anterior') code = 'I21.09'; // Simplified for "Anterior", specific I21.0x needs more detail
            else if (attrs.mi_location === 'inferior') code = 'I21.19';

            codes.push({ code, label: `STEMI myocardial infarction, ${attrs.mi_location || 'unspecified'}`, triggeredBy: 'mi', hcc: true });
        }
    }

    // --- OLD MI (I25.2) ---
    if (attrs.old_mi) {
        codes.push({ code: 'I25.2', label: 'Old myocardial infarction', triggeredBy: 'old_mi', hcc: false });
    }

    // --- CAD / ANGINA (I25.1x) ---
    if (attrs.ischemic_hd) {
        if (attrs.angina) {
            // CAD + Angina = Combination Code
            if (attrs.angina_type === 'unstable') {
                // I25.110 - CAD with unstable angina
                codes.push({ code: 'I25.110', label: 'Atherosclerotic heart disease of native coronary artery with unstable angina pectoris', triggeredBy: 'cad_angina', hcc: true });
            } else {
                // Default to I25.119 (unspecified angina) or I25.118? No, I25.119 is CAD with unspecified angina.
                // Actually I25.119 is "with unspecified angina pectoris".
                codes.push({ code: 'I25.119', label: 'Atherosclerotic heart disease of native coronary artery with unspecified angina pectoris', triggeredBy: 'cad_angina', hcc: true });
            }
        } else {
            // CAD alone
            codes.push({ code: 'I25.10', label: 'Atherosclerotic heart disease of native coronary artery without angina pectoris', triggeredBy: 'cad', hcc: true });
        }
    } else if (attrs.angina) {
        // Angina without stated CAD
        if (attrs.angina_type === 'unstable') {
            codes.push({ code: 'I20.0', label: 'Unstable angina', triggeredBy: 'angina', hcc: true });
        } else if (attrs.angina_type === 'variant') {
            codes.push({ code: 'I20.1', label: 'Angina pectoris with documented spasm', triggeredBy: 'angina', hcc: false });
        } // else stable/unspecified often not coded if underlying cause unknown? Or I20.9
    }

    // --- ISOLATED UNSTABLE ANGINA LOGIC --- 
    // (Covered above: if CAD present -> I25.110. If no CAD -> I20.0)

    // --- ATRIAL FIBRILLATION ---
    if (attrs.atrial_fibrillation) {
        const map: Record<string, string> = {
            'paroxysmal': 'I48.0',
            'persistent': 'I48.1',
            'chronic': 'I48.2',
            'unspecified': 'I48.91'
        };
        const c = map[attrs.af_type || 'unspecified'];
        codes.push({ code: c, label: `Atrial Fibrillation, ${attrs.af_type}`, triggeredBy: 'afib', hcc: true });
    }

    // --- CARDIOMYOPATHY ---
    if (attrs.cardiomyopathy) {
        if (attrs.cardiomyopathy_type === 'dilated') codes.push({ code: 'I42.0', label: 'Dilated cardiomyopathy', triggeredBy: 'cmp', hcc: true });
        else if (attrs.cardiomyopathy_type === 'hypertrophic') codes.push({ code: 'I42.2', label: 'Other hypertrophic cardiomyopathy', triggeredBy: 'cmp', hcc: true });
        else codes.push({ code: 'I42.9', label: 'Cardiomyopathy, unspecified', triggeredBy: 'cmp', hcc: true }); // I42.9 is HCC? Commonly yes.
    }

    // SEQUENCING PATCH: Apply ICD-10-CM/UHDDS sequencing rules
    return applyCardiologySequencing(codes, attrs);
}

// =======================================================
// SEQUENCING PATCH v3.3 - ICD-10-CM/UHDDS COMPLIANCE
// =======================================================

/**
 * Apply cardiology-specific sequencing rules per ICD-10-CM guidelines
 * 
 * RULES ENFORCED:
 * 1. ESRD Suppression: Remove N18.5 if N18.6 exists
 * 2. HTN+CKD+HF Priority: I13.x is PRIMARY for acute HF admissions
 * 3. Code Ordering: I13.x → I50.xx → N18.x
 * 4. Prohibited: N18.5+N18.6 together, N18.x as primary when I13.x exists
 */
function applyCardiologySequencing(codes: SequencedCode[], attrs: CardiologyAttributes): SequencedCode[] {
    if (codes.length === 0) return codes;

    // RULE 1: ESRD Suppression - Remove N18.5 if N18.6 is present
    const hasEsrd = codes.some(c => c.code === 'N18.6');
    if (hasEsrd) {
        codes = codes.filter(c => c.code !== 'N18.5');
    }

    // RULE 2-3: HTN+CKD+HF Priority Sequencing
    const hasHtnCkdHf = attrs.hypertension && attrs.heart_failure && attrs.ckd_stage;

    if (hasHtnCkdHf) {
        // Find the I13.x combination code
        const i13Code = codes.find(c => c.code.startsWith('I13'));
        const i50Code = codes.find(c => c.code.startsWith('I50'));
        const n18Code = codes.find(c => c.code.startsWith('N18'));

        if (i13Code) {
            // Enforce sequence: I13.x (PRIMARY) → I50.xx → N18.x
            const orderedCodes: SequencedCode[] = [i13Code];

            if (i50Code) orderedCodes.push(i50Code);
            if (n18Code) orderedCodes.push(n18Code);

            // Add any remaining codes (AF, MI, CAD, etc.) after the HTN+CKD+HF triad
            const remainingCodes = codes.filter(c =>
                !c.code.startsWith('I13') &&
                !c.code.startsWith('I50') &&
                !c.code.startsWith('N18')
            );

            return [...orderedCodes, ...remainingCodes];
        }
    }

    // RULE 4: Acute HF without HTN+CKD → I50.xx should be first
    if (attrs.heart_failure && attrs.hf_acuity && attrs.hf_acuity !== 'unspecified') {
        const i50Code = codes.find(c => c.code.startsWith('I50'));
        if (i50Code) {
            const otherCodes = codes.filter(c => !c.code.startsWith('I50'));
            return [i50Code, ...otherCodes];
        }
    }

    // RULE 5: Acute MI priority
    if (attrs.acute_mi) {
        const i21Code = codes.find(c => c.code.startsWith('I21'));
        if (i21Code) {
            const otherCodes = codes.filter(c => !c.code.startsWith('I21'));
            return [i21Code, ...otherCodes];
        }
    }

    // Default: return as-is
    return codes;
}

// Helpers
function addHeartFailureCode(codes: SequencedCode[], attrs: CardiologyAttributes) {
    let base = 'I50.9'; // Unspecified
    const type = attrs.hf_type || 'unspecified';
    const acuity = attrs.hf_acuity || 'unspecified';

    if (type === 'systolic') {
        if (acuity === 'acute') base = 'I50.21';
        else if (acuity === 'chronic') base = 'I50.22';
        else if (acuity === 'acute_on_chronic') base = 'I50.23';
        else base = 'I50.20';
    } else if (type === 'diastolic') {
        if (acuity === 'acute') base = 'I50.31';
        else if (acuity === 'chronic') base = 'I50.32';
        else if (acuity === 'acute_on_chronic') base = 'I50.33';
        else base = 'I50.30';
    } else if (type === 'combined') {
        if (acuity === 'acute') base = 'I50.41';
        else if (acuity === 'chronic') base = 'I50.42';
        else if (acuity === 'acute_on_chronic') base = 'I50.43';
        else base = 'I50.40';
    }

    codes.push({ code: base, label: `Heart failure (${type}, ${acuity})`, triggeredBy: 'hf_detail', hcc: true });
}

function addCkdCode(codes: SequencedCode[], attrs: CardiologyAttributes) {
    if (!attrs.ckd_stage) return;

    // PATCH RULE 1: ESRD Suppression - If ESRD detected, ONLY use N18.6, never N18.5
    // When "on dialysis" or "ESRD" keywords are present, ckd_stage should be 'esrd'
    const map: Record<string, string> = {
        '1': 'N18.1',
        '2': 'N18.2',
        '3': 'N18.3',
        '4': 'N18.4',
        '5': 'N18.5',  // Will be suppressed if ESRD also present
        'esrd': 'N18.6'
    };

    const c = map[attrs.ckd_stage] || 'N18.9';
    const isHcc = ['4', '5', 'esrd'].includes(attrs.ckd_stage);

    codes.push({
        code: c,
        label: `Chronic kidney disease, stage ${attrs.ckd_stage === 'esrd' ? 'end stage' : attrs.ckd_stage}`,
        triggeredBy: 'ckd_stage',
        hcc: isHcc
    });
}


// =======================================================
// 3) TEST CASES (20) - Verification Suite
// =======================================================

export const CARDIOLOGY_TEST_CASES = [
    {
        narrative: "68-year-old male with long-standing hypertension admitted for acute decompensated systolic heart failure. Echo shows EF 25%. No CKD.",
        expectedCodes: ["I11.0", "I50.21"],
        notes: "HTN + Acute Systolic HF"
    },
    {
        narrative: "72-year-old female with HTN and CKD stage 4 admitted for volume overload. No heart failure documented.",
        expectedCodes: ["I12.9", "N18.4"],
        notes: "HTN + CKD 4 (No HF)"
    },
    {
        narrative: "80-year-old male with HTN, CKD stage 5 on dialysis, and chronic systolic CHF, admitted for worsening shortness of breath due to acute on chronic HF.",
        expectedCodes: ["I13.2", "I50.23", "N18.6"],
        notes: "Triple Threat: HTN + CKD5 + HF"
    },
    {
        narrative: "65-year-old male with chronic stable angina and known CAD of native coronaries, admitted for evaluation of exertional chest pain without MI.",
        expectedCodes: ["I25.119"], // or I25.110 if we map 'stable angina' to unspecified angina type with CAD? Actually strict stable angina + CAD is I25.119 (unspecified type) or I25.118? Usually I25.11x covers it. 
        notes: "CAD + Angina"
    },
    {
        narrative: "59-year-old female with NSTEMI, no prior MI, no PCI history.",
        expectedCodes: ["I21.4"],
        notes: "NSTEMI Isolated"
    },
    {
        narrative: "75-year-old male with prior MI 2 years ago, now admitted for HF exacerbation. No new MI. Acute combined systolic and diastolic HF.",
        expectedCodes: ["I50.41", "I25.2"],
        notes: "Acute Combined HF + Old MI"
    },
    {
        narrative: "70-year-old woman with permanent atrial fibrillation admitted for rapid ventricular response and rate control.",
        expectedCodes: ["I48.2"],
        notes: "Chronic AF"
    },
    {
        narrative: "60-year-old male with new-onset AF identified in ED, type not otherwise specified.",
        expectedCodes: ["I48.91"],
        notes: "Unspecified AF"
    },
    {
        narrative: "50-year-old male with HTN and no other cardiac or renal disease, here for blood pressure management.",
        expectedCodes: ["I10"],
        notes: "Essential HTN"
    },
    {
        narrative: "67-year-old female with hypertrophic cardiomyopathy, no HF, admitted for syncope workup.",
        expectedCodes: ["I42.2"],
        notes: "HCM"
    },
    {
        narrative: "73-year-old male, history of inferior STEMI 3 days ago at outside hospital, transferred for further management.",
        expectedCodes: ["I21.19"], // Inferior STEMI
        notes: "Acute MI (3 days)"
    },
    {
        narrative: "79-year-old woman with CAD and unstable angina admitted for chest pain at rest, no troponin rise.",
        expectedCodes: ["I25.110"],
        notes: "CAD + Unstable Angina"
    },
    {
        narrative: "76-year-old male with HTN, CKD stage 3, stable HFpEF (chronic diastolic HF).",
        expectedCodes: ["I13.0", "I50.32", "N18.3"], // N18.3 or N18.30
        notes: "HTN + CKD3 + Chronic Diastolic HF"
    },
    {
        narrative: "58-year-old female, chest pain, cardiac workup negative, diagnosed with non-cardiac chest pain.",
        expectedCodes: [], // No cardio codes from this module
        notes: "Non-cardiac chest pain"
    },
    {
        narrative: "63-year-old man with dilated cardiomyopathy and chronic systolic HF, no HTN.",
        expectedCodes: ["I42.0", "I50.22"],
        notes: "DCM + Chronic Systolic HF"
    },
    {
        narrative: "69-year-old woman with HTN, CKD stage 4, no HF.",
        expectedCodes: ["I12.9", "N18.4"],
        notes: "Duplicate of Case 2 logic?"
    },
    {
        narrative: "55-year-old male smoker with CAD and stable angina on exertion, no acute changes.",
        expectedCodes: ["I25.119"],
        notes: "CAD + Stable Angina"
    },
    {
        narrative: "62-year-old female with acute on chronic diastolic HF due to long-standing HTN, no CKD.",
        expectedCodes: ["I11.0", "I50.33"],
        notes: "HTN + Acute/Chronic Diastolic HF"
    },
    {
        narrative: "78-year-old male with chronic AF and HFpEF admitted for acute decompensated HF.",
        expectedCodes: ["I50.31", "I48.2"],
        notes: "Acute Diastolic HF + Chronic AF"
    },
    {
        narrative: "70-year-old woman with prior MI 5 weeks ago, now stable, here for follow-up.",
        expectedCodes: ["I25.2"],
        notes: "Old MI (>28 days)"
    }
];
