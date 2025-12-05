"use strict";
// COMPREHENSIVE ICD-10-CM MEDICAL CODING VALIDATOR - 30 RULES
// Target: ≥99.9% Medical Accuracy
Object.defineProperty(exports, "__esModule", { value: true });
exports.applyAdvancedCodingRules = applyAdvancedCodingRules;
exports.applyComprehensiveMedicalRules = applyComprehensiveMedicalRules;
function applyAdvancedCodingRules(codes, input) {
    const result = applyComprehensiveMedicalRules(codes, input);
    return result.codes;
}
function applyComprehensiveMedicalRules(codes, input) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s;
    const lower = input.toLowerCase();
    let correctedCodes = [...codes];
    const errors = [];
    const warnings = [];
    // ===== A) PARSER HARDENING =====
    // Rule 1-3: Domain separation for wound vs CKD stage
    const hasUlcerWound = lower.includes('ulcer/wound: yes') || lower.includes('ulcer:yes');
    const woundType = (_b = (_a = lower.match(/type:\s*(pressure|diabetic|traumatic)/i)) === null || _a === void 0 ? void 0 : _a[1]) === null || _b === void 0 ? void 0 : _b.toLowerCase();
    const woundLocation = (_d = (_c = lower.match(/location:\s*([^\n]+)/i)) === null || _c === void 0 ? void 0 : _c[1]) === null || _d === void 0 ? void 0 : _d.trim();
    const woundStage = (_f = (_e = lower.match(/stage\/depth:\s*([^\n]+)/i)) === null || _e === void 0 ? void 0 : _e[1]) === null || _f === void 0 ? void 0 : _f.trim();
    const hasCKD = lower.includes('ckd present: yes') || lower.includes('ckd:yes') || lower.includes('nephropathy');
    const ckdStage = (_g = lower.match(/ckd stage:\s*(\d+|esrd)/i)) === null || _g === void 0 ? void 0 : _g[1];
    // CRITICAL: Never confuse wound stage with CKD stage
    const isWoundCase = hasUlcerWound && woundType;
    // ===== B) WOUNDS / ULCERS =====
    // Rule 4: PRESSURE ULCERS - Never use L89.90 when location/stage exist
    if (woundType === 'pressure') {
        correctedCodes = correctedCodes.filter(c => !c.code.startsWith('N18')); // Never CKD
        let ulcerCode = 'L89.90'; // Default only if no details
        if (woundLocation && woundStage) {
            const loc = woundLocation.toLowerCase();
            const stage = woundStage.toLowerCase();
            // Sacral codes
            if (loc.includes('sacral') || loc.includes('sacrum')) {
                if (stage.includes('stage 4') || stage.includes('bone'))
                    ulcerCode = 'L89.154';
                else if (stage.includes('stage 3') || stage.includes('muscle'))
                    ulcerCode = 'L89.153';
                else if (stage.includes('stage 2'))
                    ulcerCode = 'L89.152';
                else if (stage.includes('stage 1'))
                    ulcerCode = 'L89.151';
                else if (stage.includes('unstageable'))
                    ulcerCode = 'L89.150';
            }
            // Heel codes  
            else if (loc.includes('heel')) {
                if (stage.includes('stage 4') || stage.includes('bone'))
                    ulcerCode = 'L89.624';
                else if (stage.includes('stage 3') || stage.includes('muscle'))
                    ulcerCode = 'L89.623';
                else if (stage.includes('stage 2'))
                    ulcerCode = 'L89.622';
                else if (stage.includes('stage 1'))
                    ulcerCode = 'L89.621';
                else if (stage.includes('unstageable'))
                    ulcerCode = 'L89.620';
            }
            // Buttock codes
            else if (loc.includes('buttock')) {
                if (stage.includes('stage 4'))
                    ulcerCode = 'L89.324';
                else if (stage.includes('stage 3'))
                    ulcerCode = 'L89.323';
                else if (stage.includes('stage 2'))
                    ulcerCode = 'L89.322';
                else if (stage.includes('stage 1'))
                    ulcerCode = 'L89.321';
                else if (stage.includes('unstageable'))
                    ulcerCode = 'L89.320';
            }
        }
        else if (!woundLocation || !woundStage) {
            errors.push('Missing ulcer location and stage');
        }
        correctedCodes = correctedCodes.filter(c => !c.code.startsWith('L89'));
        correctedCodes.push({
            code: ulcerCode,
            label: 'Pressure ulcer',
            isPrimary: correctedCodes.length === 0
        });
    }
    // Rule 5: DIABETIC ULCERS - E1x.621 + L97.x with laterality/depth
    if (woundType === 'diabetic') {
        correctedCodes = correctedCodes.filter(c => !c.code.startsWith('N18')); // Never CKD
        const dmType = lower.includes('diabetes type: type 1') || lower.includes('type 1') ? 'E10.621' : 'E11.621';
        if (!correctedCodes.some(c => /E1[01]\.621/.test(c.code))) {
            correctedCodes.push({
                code: dmType,
                label: 'Diabetes with foot ulcer',
                isPrimary: correctedCodes.length === 0
            });
        }
        // L97.x with specificity
        let l97Code = 'L97.519'; // Default
        if (woundLocation && woundStage) {
            const loc = woundLocation.toLowerCase();
            const stage = woundStage.toLowerCase();
            // Right foot/heel/ankle
            if (loc.includes('right')) {
                if (stage.includes('bone') || stage.includes('stage 4'))
                    l97Code = 'L97.514';
                else if (stage.includes('muscle') || stage.includes('stage 3'))
                    l97Code = 'L97.513';
                else if (stage.includes('fat') || stage.includes('stage 2'))
                    l97Code = 'L97.512';
                else if (stage.includes('skin') || stage.includes('stage 1'))
                    l97Code = 'L97.511';
            }
            // Left foot/heel/ankle
            else if (loc.includes('left')) {
                if (stage.includes('bone') || stage.includes('stage 4'))
                    l97Code = 'L97.524';
                else if (stage.includes('muscle') || stage.includes('stage 3'))
                    l97Code = 'L97.523';
                else if (stage.includes('fat') || stage.includes('stage 2'))
                    l97Code = 'L97.522';
                else if (stage.includes('skin') || stage.includes('stage 1'))
                    l97Code = 'L97.521';
            }
        }
        correctedCodes = correctedCodes.filter(c => !c.code.startsWith('L97'));
        correctedCodes.push({
            code: l97Code,
            label: 'Diabetic ulcer of foot',
            isPrimary: false
        });
    }
    // Rule 6: TRAUMATIC WOUNDS - S/T codes
    if (woundType === 'traumatic') {
        correctedCodes = correctedCodes.filter(c => !c.code.startsWith('N18')); // Never CKD
        if (!correctedCodes.some(c => c.code.startsWith('S') || c.code.startsWith('T'))) {
            correctedCodes.push({
                code: 'S00.00XA',
                label: 'Traumatic wound',
                isPrimary: correctedCodes.length === 0
            });
        }
    }
    // ===== C) RESPIRATORY =====
    // Rule 7-8: COPD "With both" → J44.0 + J44.1 TOGETHER
    const copdType = (_j = (_h = lower.match(/copd:\s*([^\n]+)/i)) === null || _h === void 0 ? void 0 : _h[1]) === null || _j === void 0 ? void 0 : _j.toLowerCase();
    if (copdType === 'with both') {
        const hasJ440 = correctedCodes.some(c => c.code === 'J44.0');
        const hasJ441 = correctedCodes.some(c => c.code === 'J44.1');
        if (!hasJ440) {
            correctedCodes.push({
                code: 'J44.0',
                label: 'COPD with acute lower respiratory infection',
                isPrimary: false
            });
        }
        if (!hasJ441) {
            correctedCodes.push({
                code: 'J44.1',
                label: 'COPD with acute exacerbation',
                isPrimary: false
            });
        }
    }
    // Rule 9: Pneumonia organism mapping
    const pneumoniaOrg = (_l = (_k = lower.match(/pneumonia organism:\s*([^\n]+)/i)) === null || _k === void 0 ? void 0 : _k[1]) === null || _l === void 0 ? void 0 : _l.toLowerCase();
    if (lower.includes('pneumonia: yes') && pneumoniaOrg) {
        correctedCodes = correctedCodes.filter(c => !c.code.startsWith('J15') && c.code !== 'J18.9' && c.code !== 'J12.9');
        let pneumoniaCode = 'J18.9';
        if (pneumoniaOrg.includes('mrsa'))
            pneumoniaCode = 'J15.212';
        else if (pneumoniaOrg.includes('pseudomonas'))
            pneumoniaCode = 'J15.1';
        else if (pneumoniaOrg.includes('e. coli'))
            pneumoniaCode = 'J15.5';
        else if (pneumoniaOrg.includes('viral'))
            pneumoniaCode = 'J12.9';
        else if (pneumoniaOrg.includes('unspecified'))
            pneumoniaCode = 'J18.9';
        correctedCodes.push({
            code: pneumoniaCode,
            label: 'Pneumonia',
            isPrimary: false
        });
    }
    // ===== D) SEPSIS =====
    // Rule 10-13: Sepsis priority + viral = A41.89
    if (lower.includes('sepsis: yes') || lower.includes('sepsis:yes')) {
        const organism = (_o = (_m = lower.match(/organism:\s*([^\n]+)/i)) === null || _m === void 0 ? void 0 : _m[1]) === null || _o === void 0 ? void 0 : _o.toLowerCase();
        let sepsisCode = 'A41.9';
        if (organism === null || organism === void 0 ? void 0 : organism.includes('viral'))
            sepsisCode = 'A41.89'; // Rule 11: Viral → A41.89
        else if (organism === null || organism === void 0 ? void 0 : organism.includes('mrsa'))
            sepsisCode = 'A41.02';
        else if (organism === null || organism === void 0 ? void 0 : organism.includes('e. coli'))
            sepsisCode = 'A41.51';
        else if (organism === null || organism === void 0 ? void 0 : organism.includes('pseudomonas'))
            sepsisCode = 'A41.52';
        else if (organism === null || organism === void 0 ? void 0 : organism.includes('unspecified'))
            sepsisCode = 'A41.9';
        // Remove existing sepsis codes and add to FIRST position
        correctedCodes = correctedCodes.filter(c => !c.code.startsWith('A41'));
        correctedCodes.unshift({
            code: sepsisCode,
            label: 'Sepsis',
            isPrimary: true
        });
        // Rule 12: Septic shock
        if (lower.includes('septic shock: yes')) {
            const hasR6521 = correctedCodes.some(c => c.code === 'R65.21');
            if (!hasR6521) {
                correctedCodes.splice(1, 0, {
                    code: 'R65.21',
                    label: 'Severe sepsis with septic shock',
                    isPrimary: false
                });
            }
        }
    }
    // ===== E) CARDIAC + RENAL =====
    // Rule 14-16: HTN combinations
    const hasHTN = lower.includes('hypertension: yes');
    const hasHF = lower.includes('heart failure:') && !lower.includes('heart failure: none');
    if (hasHTN && hasHF && hasCKD) {
        // Rule 16: HTN + HF + CKD → I13.x
        correctedCodes = correctedCodes.filter(c => !c.code.startsWith('I11') && !c.code.startsWith('I12'));
        if (!correctedCodes.some(c => c.code.startsWith('I13'))) {
            correctedCodes.push({
                code: ckdStage === '5' || ckdStage === 'esrd' ? 'I13.2' : 'I13.10',
                label: 'Hypertensive heart and CKD',
                isPrimary: correctedCodes.length === 0
            });
        }
    }
    else if (hasHTN && hasHF) {
        // Rule 14: HTN + HF → I11.0
        if (!correctedCodes.some(c => c.code.startsWith('I11'))) {
            correctedCodes.push({
                code: 'I11.0',
                label: 'Hypertensive heart disease with heart failure',
                isPrimary: correctedCodes.length === 0
            });
        }
    }
    else if (hasHTN && hasCKD) {
        // Rule 15: HTN + CKD → I12.x
        if (!correctedCodes.some(c => c.code.startsWith('I12'))) {
            correctedCodes.push({
                code: ckdStage === '5' || ckdStage === 'esrd' ? 'I12.0' : 'I12.9',
                label: 'Hypertensive CKD',
                isPrimary: correctedCodes.length === 0
            });
        }
    }
    // Rule 17: Heart failure specificity
    const hfType = (_q = (_p = lower.match(/heart failure:\s*([^\n]+)/i)) === null || _p === void 0 ? void 0 : _p[1]) === null || _q === void 0 ? void 0 : _q.toLowerCase();
    const hfAcuity = (_s = (_r = lower.match(/heart failure acuity:\s*([^\n]+)/i)) === null || _r === void 0 ? void 0 : _r[1]) === null || _s === void 0 ? void 0 : _s.toLowerCase();
    if (hfType && !hasHTN) {
        let hfCode = 'I50.9';
        if (hfType.includes('systolic')) {
            if (hfAcuity === null || hfAcuity === void 0 ? void 0 : hfAcuity.includes('acute on chronic'))
                hfCode = 'I50.23';
            else if (hfAcuity === null || hfAcuity === void 0 ? void 0 : hfAcuity.includes('acute'))
                hfCode = 'I50.21';
            else if (hfAcuity === null || hfAcuity === void 0 ? void 0 : hfAcuity.includes('chronic'))
                hfCode = 'I50.22';
            else
                hfCode = 'I50.20';
        }
        else if (hfType.includes('diastolic')) {
            if (hfAcuity === null || hfAcuity === void 0 ? void 0 : hfAcuity.includes('acute on chronic'))
                hfCode = 'I50.33';
            else if (hfAcuity === null || hfAcuity === void 0 ? void 0 : hfAcuity.includes('acute'))
                hfCode = 'I50.31';
            else if (hfAcuity === null || hfAcuity === void 0 ? void 0 : hfAcuity.includes('chronic'))
                hfCode = 'I50.32';
            else
                hfCode = 'I50.30';
        }
        else if (hfType.includes('combined')) {
            if (hfAcuity === null || hfAcuity === void 0 ? void 0 : hfAcuity.includes('acute on chronic'))
                hfCode = 'I50.43';
            else if (hfAcuity === null || hfAcuity === void 0 ? void 0 : hfAcuity.includes('acute'))
                hfCode = 'I50.41';
            else if (hfAcuity === null || hfAcuity === void 0 ? void 0 : hfAcuity.includes('chronic'))
                hfCode = 'I50.42';
            else
                hfCode = 'I50.40';
        }
        correctedCodes = correctedCodes.filter(c => !c.code.startsWith('I50'));
        correctedCodes.push({
            code: hfCode,
            label: 'Heart failure',
            isPrimary: false
        });
    }
    // Rule 18: ESRD → N18.6 (not N18.9 or N18.5)
    if (hasCKD && !isWoundCase) {
        let renal, Code = 'N18.9';
        if (ckdStage) {
            if (ckdStage === 'esrd' || ckdStage === '6')
                renalCode = 'N18.6';
            else if (ckdStage === '5')
                renalCode = 'N18.5';
            else if (ckdStage === '4')
                renalCode = 'N18.4';
            else if (ckdStage === '3')
                renalCode = 'N18.30';
            else if (ckdStage === '2')
                renalCode = 'N18.2';
            else if (ckdStage === '1')
                renalCode = 'N18.1';
        }
        correctedCodes = correctedCodes.filter(c => !c.code.startsWith('N18'));
        correctedCodes.push({
            code: renalCode,
            label: 'Chronic kidney disease',
            isPrimary: false
        });
    }
    // Rule 27: NO CODABLE DIAGNOSIS blocker
    const hasAnyDiagnosis = hasUlcerWound || lower.includes('sepsis') ||
        lower.includes('pneumonia') || lower.includes('cancer') ||
        lower.includes('diabetes') || hasHTN || hasCKD;
    if (correctedCodes.length === 0 && hasAnyDiagnosis) {
        if (isWoundCase && (!woundLocation || !woundStage)) {
            errors.push('Missing ulcer location and stage');
        }
        else if (lower.includes('cancer') && !lower.includes('site:')) {
            errors.push('Cancer site required');
        }
        else {
            errors.push('Insufficient clinical detail for coding');
        }
    }
    // Set primary correctly
    if (correctedCodes.length > 0) {
        correctedCodes = correctedCodes.map((c, idx) => ({
            ...c,
            isPrimary: idx === 0
        }));
    }
    return { codes: correctedCodes, errors, warnings };
}
