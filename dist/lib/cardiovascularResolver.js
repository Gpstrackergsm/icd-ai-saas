"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveCardiovascular = resolveCardiovascular;
function detectCkd(text) {
    const hasEsrd = /esrd|end stage renal/.test(text);
    let stage = undefined;
    if (/stage 5/.test(text))
        stage = 5;
    else if (/stage 4/.test(text))
        stage = 4;
    else if (/stage 3/.test(text))
        stage = 3;
    else if (/stage 2/.test(text))
        stage = 2;
    else if (/stage 1/.test(text))
        stage = 1;
    const hasCkd = /ckd|chronic kidney|renal disease|renal failure/.test(text) || !!stage || hasEsrd;
    return { hasCkd, stage, hasEsrd };
}
function detectHeartFailure(text) {
    const hasHf = /heart failure|chf|congestive/.test(text);
    let type = 'unspecified';
    if (/systolic/.test(text) && /diastolic/.test(text))
        type = 'combined';
    else if (/systolic/.test(text))
        type = 'systolic';
    else if (/diastolic/.test(text))
        type = 'diastolic';
    let acuity = 'unspecified';
    if (/acute/.test(text) && /chronic/.test(text))
        acuity = 'acute_on_chronic';
    else if (/acute/.test(text))
        acuity = 'acute';
    else if (/chronic/.test(text))
        acuity = 'chronic';
    return { hasHf, type, acuity };
}
function resolveCardiovascular(text) {
    const lower = text.toLowerCase();
    const warnings = [];
    const secondary_codes = [];
    const { hasCkd, stage: ckdStage, hasEsrd } = detectCkd(lower);
    const { hasHf, type: hfType, acuity: hfAcuity } = detectHeartFailure(lower);
    const hasHypertension = /hypertens|high blood pressure/.test(lower);
    // Helper to get I50 code
    const getHfCode = () => {
        let code = 'I50.9';
        if (hfType === 'systolic') {
            if (hfAcuity === 'acute')
                code = 'I50.21';
            else if (hfAcuity === 'chronic')
                code = 'I50.22';
            else if (hfAcuity === 'acute_on_chronic')
                code = 'I50.23';
            else
                code = 'I50.20';
        }
        else if (hfType === 'diastolic') {
            if (hfAcuity === 'acute')
                code = 'I50.31';
            else if (hfAcuity === 'chronic')
                code = 'I50.32';
            else if (hfAcuity === 'acute_on_chronic')
                code = 'I50.33';
            else
                code = 'I50.30';
        }
        else if (hfType === 'combined') {
            if (hfAcuity === 'acute')
                code = 'I50.41';
            else if (hfAcuity === 'chronic')
                code = 'I50.42';
            else if (hfAcuity === 'acute_on_chronic')
                code = 'I50.43';
            else
                code = 'I50.40';
        }
        return code;
    };
    // Helper to get N18 code
    const getCkdCode = () => {
        let n18Code = 'N18.9';
        if (ckdStage === 1)
            n18Code = 'N18.1';
        else if (ckdStage === 2)
            n18Code = 'N18.2';
        else if (ckdStage === 3)
            n18Code = 'N18.30';
        else if (ckdStage === 4)
            n18Code = 'N18.4';
        else if (ckdStage === 5 || hasEsrd)
            n18Code = 'N18.6';
        return n18Code;
    };
    // 1. Hypertensive Combinations (I10-I13)
    if (hasHypertension) {
        if (hasHf && hasCkd) {
            // I13: Hypertensive heart and chronic kidney disease
            let code = 'I13.10';
            if (hasHf) {
                if (ckdStage === 5 || hasEsrd)
                    code = 'I13.2';
                else
                    code = 'I13.0';
            }
            else {
                if (ckdStage === 5 || hasEsrd)
                    code = 'I13.11';
                else
                    code = 'I13.10';
            }
            // Add secondary codes
            if (hasHf)
                secondary_codes.push({ code: getHfCode(), label: 'Heart failure', type: 'manifestation' });
            if (hasCkd)
                secondary_codes.push({ code: getCkdCode(), label: `Chronic kidney disease, stage ${ckdStage || 'unspecified'}`, type: 'manifestation' });
            return {
                code,
                label: 'Hypertensive heart and chronic kidney disease',
                attributes: { type: 'hypertension', has_heart_failure: true, has_ckd: true, ckd_stage: ckdStage, has_esrd: hasEsrd },
                secondary_codes,
                warnings
            };
        }
        if (hasHf) {
            // I11: Hypertensive heart disease
            secondary_codes.push({ code: getHfCode(), label: 'Heart failure', type: 'manifestation' });
            return {
                code: 'I11.0',
                label: 'Hypertensive heart disease with heart failure',
                attributes: { type: 'hypertension', has_heart_failure: true },
                secondary_codes,
                warnings
            };
        }
        if (hasCkd) {
            // I12: Hypertensive chronic kidney disease
            const code = (ckdStage === 5 || hasEsrd) ? 'I12.0' : 'I12.9';
            secondary_codes.push({ code: getCkdCode(), label: `Chronic kidney disease, stage ${ckdStage || 'unspecified'}`, type: 'manifestation' });
            return {
                code,
                label: 'Hypertensive chronic kidney disease',
                attributes: { type: 'hypertension', has_ckd: true, ckd_stage: ckdStage, has_esrd: hasEsrd },
                secondary_codes,
                warnings
            };
        }
        // I10: Essential hypertension
        return {
            code: 'I10',
            label: 'Essential (primary) hypertension',
            attributes: { type: 'hypertension' },
            warnings
        };
    }
    // 2. Ischemic Heart Disease (I20-I25)
    if (/infarction|\bmi\b|heart attack|stemi|nstemi/.test(lower)) {
        const isStemi = /stemi/.test(lower) || (/st/.test(lower) && /elevation/.test(lower));
        const isNstemi = /nstemi/.test(lower) || (/non/.test(lower) && /st/.test(lower) && /elevation/.test(lower));
        if (isStemi) {
            // STEMI logic
            let code = 'I21.3'; // Unspecified site
            if (/anterior/.test(lower))
                code = 'I21.09';
            if (/inferior/.test(lower))
                code = 'I21.19';
            if (/lateral/.test(lower))
                code = 'I21.29';
            if (/posterior/.test(lower))
                code = 'I21.29'; // Often coded as other sites
            if (/left main/.test(lower))
                code = 'I21.01';
            return {
                code,
                label: 'ST elevation (STEMI) myocardial infarction',
                attributes: { type: 'ischemic', location: 'stemi' },
                warnings
            };
        }
        if (isNstemi) {
            return {
                code: 'I21.4',
                label: 'Non-ST elevation (NSTEMI) myocardial infarction',
                attributes: { type: 'ischemic', location: 'nstemi' },
                warnings
            };
        }
        // Old MI
        if (/old|history|past/.test(lower)) {
            return {
                code: 'I25.2',
                label: 'Old myocardial infarction',
                attributes: { type: 'ischemic' },
                warnings
            };
        }
        // Default acute MI
        return {
            code: 'I21.9',
            label: 'Acute myocardial infarction, unspecified',
            attributes: { type: 'ischemic' },
            warnings: ['Specify STEMI vs NSTEMI and location']
        };
    }
    if (/angina/.test(lower)) {
        if (/unstable/.test(lower)) {
            return {
                code: 'I20.0',
                label: 'Unstable angina',
                attributes: { type: 'ischemic', location: 'unstable_angina' },
                warnings
            };
        }
        return {
            code: 'I20.9',
            label: 'Angina pectoris, unspecified',
            attributes: { type: 'ischemic' },
            warnings
        };
    }
    if (/coronary artery disease|cad|arteriosclerotic heart disease/.test(lower)) {
        return {
            code: 'I25.10',
            label: 'Atherosclerotic heart disease of native coronary artery without angina pectoris',
            attributes: { type: 'ischemic' },
            warnings
        };
    }
    // 3. Heart Failure (I50) - if not captured by Hypertension logic
    if (hasHf) {
        return {
            code: getHfCode(),
            label: 'Heart failure',
            attributes: { type: 'heart_failure', failure_type: hfType, acuity: hfAcuity },
            warnings
        };
    }
    // 4. Atrial Fibrillation (I48)
    if (/atrial fib|afib/.test(lower)) {
        if (/paroxysmal/.test(lower))
            return { code: 'I48.0', label: 'Paroxysmal atrial fibrillation', attributes: { type: 'atrial_fibrillation' } };
        if (/persistent/.test(lower))
            return { code: 'I48.11', label: 'Longstanding persistent atrial fibrillation', attributes: { type: 'atrial_fibrillation' } };
        if (/chronic/.test(lower))
            return { code: 'I48.20', label: 'Chronic atrial fibrillation, unspecified', attributes: { type: 'atrial_fibrillation' } };
        return { code: 'I48.91', label: 'Unspecified atrial fibrillation', attributes: { type: 'atrial_fibrillation' } };
    }
    // 5. Cardiomyopathy (I42)
    if (/cardiomyopathy/.test(lower)) {
        if (/dilated/.test(lower))
            return { code: 'I42.0', label: 'Dilated cardiomyopathy', attributes: { type: 'cardiomyopathy' } };
        if (/hypertrophic/.test(lower))
            return { code: 'I42.1', label: 'Obstructive hypertrophic cardiomyopathy', attributes: { type: 'cardiomyopathy' } };
        return { code: 'I42.9', label: 'Cardiomyopathy, unspecified', attributes: { type: 'cardiomyopathy' } };
    }
    return undefined;
}
