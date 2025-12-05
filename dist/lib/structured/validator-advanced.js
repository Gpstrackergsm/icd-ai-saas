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
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _u, _v, _w, _x, _y, _z, _0, _1, _2, _3, _4;
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
            // Ankle codes
            else if (loc.includes('ankle')) {
                // Right ankle
                if (loc.includes('right')) {
                    if (stage.includes('stage 4') || stage.includes('bone'))
                        ulcerCode = 'L89.514';
                    else if (stage.includes('stage 3') || stage.includes('muscle'))
                        ulcerCode = 'L89.513';
                    else if (stage.includes('stage 2'))
                        ulcerCode = 'L89.512';
                    else if (stage.includes('stage 1'))
                        ulcerCode = 'L89.511';
                    else if (stage.includes('unstageable'))
                        ulcerCode = 'L89.510';
                }
                // Left ankle
                else if (loc.includes('left')) {
                    if (stage.includes('stage 4') || stage.includes('bone'))
                        ulcerCode = 'L89.524';
                    else if (stage.includes('stage 3') || stage.includes('muscle'))
                        ulcerCode = 'L89.523';
                    else if (stage.includes('stage 2'))
                        ulcerCode = 'L89.522';
                    else if (stage.includes('stage 1'))
                        ulcerCode = 'L89.521';
                    else if (stage.includes('unstageable'))
                        ulcerCode = 'L89.520';
                }
            }
            // Foot codes (use ankle codes as foot pressure ulcers typically involve ankle region)
            else if (loc.includes('foot')) {
                // Right foot
                if (loc.includes('right')) {
                    if (stage.includes('stage 4') || stage.includes('bone'))
                        ulcerCode = 'L89.514';
                    else if (stage.includes('stage 3') || stage.includes('muscle'))
                        ulcerCode = 'L89.513';
                    else if (stage.includes('stage 2'))
                        ulcerCode = 'L89.512';
                    else if (stage.includes('stage 1'))
                        ulcerCode = 'L89.511';
                    else if (stage.includes('unstageable'))
                        ulcerCode = 'L89.510';
                }
                // Left foot
                else if (loc.includes('left')) {
                    if (stage.includes('stage 4') || stage.includes('bone'))
                        ulcerCode = 'L89.524';
                    else if (stage.includes('stage 3') || stage.includes('muscle'))
                        ulcerCode = 'L89.523';
                    else if (stage.includes('stage 2'))
                        ulcerCode = 'L89.522';
                    else if (stage.includes('stage 1'))
                        ulcerCode = 'L89.521';
                    else if (stage.includes('unstageable'))
                        ulcerCode = 'L89.520';
                }
            }
            // Elbow codes
            else if (loc.includes('elbow')) {
                // Right elbow
                if (loc.includes('right')) {
                    if (stage.includes('stage 4'))
                        ulcerCode = 'L89.014';
                    else if (stage.includes('stage 3'))
                        ulcerCode = 'L89.013';
                    else if (stage.includes('stage 2'))
                        ulcerCode = 'L89.012';
                    else if (stage.includes('stage 1'))
                        ulcerCode = 'L89.011';
                    else if (stage.includes('unstageable'))
                        ulcerCode = 'L89.010';
                }
                // Left elbow
                else if (loc.includes('left')) {
                    if (stage.includes('stage 4'))
                        ulcerCode = 'L89.024';
                    else if (stage.includes('stage 3'))
                        ulcerCode = 'L89.023';
                    else if (stage.includes('stage 2'))
                        ulcerCode = 'L89.022';
                    else if (stage.includes('stage 1'))
                        ulcerCode = 'L89.021';
                    else if (stage.includes('unstageable'))
                        ulcerCode = 'L89.020';
                }
            }
            // Back codes
            else if (loc.includes('back')) {
                if (stage.includes('stage 4'))
                    ulcerCode = 'L89.144';
                else if (stage.includes('stage 3'))
                    ulcerCode = 'L89.143';
                else if (stage.includes('stage 2'))
                    ulcerCode = 'L89.142';
                else if (stage.includes('stage 1'))
                    ulcerCode = 'L89.141';
                else if (stage.includes('unstageable'))
                    ulcerCode = 'L89.140';
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
    // Rule 6: TRAUMATIC WOUNDS - S/T codes by body region
    if (woundType === 'traumatic') {
        correctedCodes = correctedCodes.filter(c => !c.code.startsWith('N18')); // Never CKD
        if (!correctedCodes.some(c => c.code.startsWith('S') || c.code.startsWith('T'))) {
            let traumaCode = 'S09.90XA'; // Default unspecified head/neck injury
            let traumaLabel = 'Traumatic wound';
            if (woundLocation) {
                const loc = woundLocation.toLowerCase();
                // Foot injuries (S90.xxx)
                if (loc.includes('foot')) {
                    if (loc.includes('right'))
                        traumaCode = 'S90.91XA';
                    else if (loc.includes('left'))
                        traumaCode = 'S90.92XA';
                    else
                        traumaCode = 'S90.90XA';
                    traumaLabel = 'Unspecified injury of foot';
                }
                // Ankle injuries (S90.xxx)
                else if (loc.includes('ankle')) {
                    if (loc.includes('right'))
                        traumaCode = 'S90.91XA';
                    else if (loc.includes('left'))
                        traumaCode = 'S90.92XA';
                    else
                        traumaCode = 'S90.90XA';
                    traumaLabel = 'Unspecified injury of ankle';
                }
                // Heel injuries (S90.xxx)
                else if (loc.includes('heel')) {
                    if (loc.includes('right'))
                        traumaCode = 'S90.91XA';
                    else if (loc.includes('left'))
                        traumaCode = 'S90.92XA';
                    else
                        traumaCode = 'S90.90XA';
                    traumaLabel = 'Unspecified injury of heel';
                }
                // Lower leg injuries (S80.xxx)
                else if (loc.includes('leg') || loc.includes('shin') || loc.includes('calf')) {
                    if (loc.includes('right'))
                        traumaCode = 'S80.91XA';
                    else if (loc.includes('left'))
                        traumaCode = 'S80.92XA';
                    else
                        traumaCode = 'S80.90XA';
                    traumaLabel = 'Unspecified injury of lower leg';
                }
                // Knee injuries (S80.xxx)
                else if (loc.includes('knee')) {
                    if (loc.includes('right'))
                        traumaCode = 'S80.91XA';
                    else if (loc.includes('left'))
                        traumaCode = 'S80.92XA';
                    else
                        traumaCode = 'S80.90XA';
                    traumaLabel = 'Unspecified injury of knee';
                }
                // Arm/upper limb injuries (S40.xxx-S69.xxx)
                else if (loc.includes('arm') || loc.includes('hand') || loc.includes('wrist') || loc.includes('finger')) {
                    if (loc.includes('right'))
                        traumaCode = 'S69.91XA';
                    else if (loc.includes('left'))
                        traumaCode = 'S69.92XA';
                    else
                        traumaCode = 'S69.90XA';
                    traumaLabel = 'Unspecified injury of wrist, hand and finger(s)';
                }
                // Elbow/forearm injuries (S50.xxx)
                else if (loc.includes('elbow') || loc.includes('forearm')) {
                    if (loc.includes('right'))
                        traumaCode = 'S59.91XA';
                    else if (loc.includes('left'))
                        traumaCode = 'S59.92XA';
                    else
                        traumaCode = 'S59.90XA';
                    traumaLabel = 'Unspecified injury of forearm';
                }
                // Shoulder injuries (S40.xxx)
                else if (loc.includes('shoulder')) {
                    if (loc.includes('right'))
                        traumaCode = 'S49.91XA';
                    else if (loc.includes('left'))
                        traumaCode = 'S49.92XA';
                    else
                        traumaCode = 'S49.90XA';
                    traumaLabel = 'Unspecified injury of shoulder';
                }
                // Head injuries (S00.xxx-S09.xxx)
                else if (loc.includes('head') || loc.includes('scalp') || loc.includes('face')) {
                    traumaCode = 'S09.90XA';
                    traumaLabel = 'Unspecified injury of head';
                }
                // Neck injuries (S10.xxx-S19.xxx)
                else if (loc.includes('neck')) {
                    traumaCode = 'S19.9XXA';
                    traumaLabel = 'Unspecified injury of neck';
                }
                // Chest/thorax injuries (S20.xxx-S29.xxx)
                else if (loc.includes('chest') || loc.includes('thorax') || loc.includes('rib')) {
                    traumaCode = 'S29.9XXA';
                    traumaLabel = 'Unspecified injury of thorax';
                }
                // Abdomen injuries (S30.xxx-S39.xxx)
                else if (loc.includes('abdomen') || loc.includes('stomach')) {
                    traumaCode = 'S39.91XA';
                    traumaLabel = 'Unspecified injury of abdomen';
                }
                // Back injuries (S30.xxx-S39.xxx)
                else if (loc.includes('back') || loc.includes('spine')) {
                    traumaCode = 'S39.012A';
                    traumaLabel = 'Contusion of lower back and pelvis';
                }
            }
            correctedCodes.push({
                code: traumaCode,
                label: traumaLabel,
                isPrimary: correctedCodes.length === 0
            });
        }
    }
    // ===== C) RESPIRATORY =====
    // Rule 7-8: COPD "With both" → J44.0 + J44.1 TOGETHER
    const copdType = (_j = (_h = lower.match(/copd:\s*([^\n]+)/i)) === null || _h === void 0 ? void 0 : _h[1]) === null || _j === void 0 ? void 0 : _j.toLowerCase();
    const hasPneumonia = lower.includes('pneumonia: yes');
    // CRITICAL FIX: When COPD has BOTH infection AND exacerbation, code BOTH J44.0 and J44.1
    if (copdType === 'with both' || (copdType === 'with exacerbation' && hasPneumonia) || (copdType === 'with infection' && lower.includes('exacerbation'))) {
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
    else if (copdType === 'with exacerbation') {
        if (!correctedCodes.some(c => c.code === 'J44.1')) {
            correctedCodes.push({
                code: 'J44.1',
                label: 'COPD with acute exacerbation',
                isPrimary: false
            });
        }
    }
    else if (copdType === 'with infection') {
        if (!correctedCodes.some(c => c.code === 'J44.0')) {
            correctedCodes.push({
                code: 'J44.0',
                label: 'COPD with acute lower respiratory infection',
                isPrimary: false
            });
        }
    }
    // Rule 9: Pneumonia organism mapping
    const pneumoniaOrg = (_l = (_k = lower.match(/pneumonia organism:\s*([^\n]+)/i)) === null || _k === void 0 ? void 0 : _k[1]) === null || _l === void 0 ? void 0 : _l.toLowerCase();
    if (hasPneumonia && pneumoniaOrg) {
        correctedCodes = correctedCodes.filter(c => !c.code.startsWith('J15') && c.code !== 'J18.9' && c.code !== 'J12.9' && c.code !== 'J22');
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
        // CRITICAL FIX: Remove J22 if specific organism known
        // J22 is only for truly unspecified acute lower respiratory infection
        correctedCodes = correctedCodes.filter(c => c.code !== 'J22');
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
    // Get HF details first (needed for multiple sections)
    const hfType = (_q = (_p = lower.match(/heart failure:\s*([^\n]+)/i)) === null || _p === void 0 ? void 0 : _p[1]) === null || _q === void 0 ? void 0 : _q.toLowerCase();
    const hfAcuity = (_s = (_r = lower.match(/heart failure acuity:\s*([^\n]+)/i)) === null || _r === void 0 ? void 0 : _r[1]) === null || _s === void 0 ? void 0 : _s.toLowerCase();
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
        // CRITICAL FIX: I13.x does NOT include HF specificity - must add I50.xx
        // Per ICD-10-CM Guidelines: Code also the type of heart failure
        if (hfType && !correctedCodes.some(c => c.code.startsWith('I50'))) {
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
            correctedCodes.push({
                code: hfCode,
                label: 'Heart failure',
                isPrimary: false
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
    // Rule 17: Heart failure specificity (for standalone HF without HTN)
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
        let renalCode = 'N18.9';
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
    // ===== F) DIABETES DETAILING (Rules 19-22) =====
    const hasDiabetes = lower.includes('diabetes type:');
    const dmComplications = (_u = (_t = lower.match(/complications:\s*([^\n]+)/i)) === null || _t === void 0 ? void 0 : _t[1]) === null || _u === void 0 ? void 0 : _u.toLowerCase();
    const dmType = lower.includes('diabetes type: type 1') || lower.includes('type 1') ? 'E10' : 'E11';
    if (hasDiabetes && dmComplications) {
        // Rule 20: Neuropathy specificity
        if (dmComplications.includes('neuropathy') && !dmComplications.includes('foot ulcer')) {
            const isPolyneuropathy = lower.includes('polyneuropathy');
            const neuropathyCode = isPolyneuropathy ? `${dmType}.42` : `${dmType}.40`;
            if (!correctedCodes.some(c => c.code === neuropathyCode)) {
                correctedCodes = correctedCodes.filter(c => !c.code.match(/E1[01]\.4[02]/));
                correctedCodes.push({
                    code: neuropathyCode,
                    label: isPolyneuropathy ? 'Diabetes with polyneuropathy' : 'Diabetes with neuropathy',
                    isPrimary: correctedCodes.length === 0
                });
            }
        }
        // Rule 21: Hypoglycemia
        if (dmComplications.includes('hypoglycemia')) {
            const hypoglycemiaCode = `${dmType}.649`;
            if (!correctedCodes.some(c => c.code === hypoglycemiaCode)) {
                correctedCodes.push({
                    code: hypoglycemiaCode,
                    label: 'Diabetes with hypoglycemia',
                    isPrimary: correctedCodes.length === 0
                });
            }
        }
        // Rule 22: Ketoacidosis
        if (dmComplications.includes('ketoacidosis')) {
            const ketoacidosisCode = `${dmType}.10`;
            if (!correctedCodes.some(c => c.code === ketoacidosisCode)) {
                correctedCodes.push({
                    code: ketoacidosisCode,
                    label: 'Diabetes with ketoacidosis',
                    isPrimary: correctedCodes.length === 0
                });
            }
        }
    }
    // ===== G) MALIGNANCY (Rules 23-26) =====
    const hasCancer = lower.includes('cancer present: yes') || lower.includes('active tx: yes');
    const cancerSite = (_w = (_v = lower.match(/site:\s*([^\n]+)/i)) === null || _v === void 0 ? void 0 : _v[1]) === null || _w === void 0 ? void 0 : _w.toLowerCase();
    const hasMetastasis = lower.includes('metastasis: yes');
    const metastaticSite = (_y = (_x = lower.match(/metastatic site:\s*([^\n]+)/i)) === null || _x === void 0 ? void 0 : _x[1]) === null || _y === void 0 ? void 0 : _y.toLowerCase();
    const isHistory = lower.includes('history of cancer');
    // Rule 24: Forbid Z85 unless "History of" explicit
    if (!isHistory) {
        correctedCodes = correctedCodes.filter(c => !c.code.startsWith('Z85'));
    }
    if (hasCancer && !isHistory) {
        // Rule 23: Site-specific C-code
        if (cancerSite) {
            let cancerCode = 'C80.1'; // Default
            let cancerLabel = 'Malignant neoplasm, unspecified';
            if (cancerSite.includes('lung')) {
                cancerCode = 'C34.90';
                cancerLabel = 'Malignant neoplasm of lung';
            }
            else if (cancerSite.includes('breast')) {
                cancerCode = 'C50.919';
                cancerLabel = 'Malignant neoplasm of breast';
            }
            else if (cancerSite.includes('colon')) {
                cancerCode = 'C18.9';
                cancerLabel = 'Malignant neoplasm of colon';
            }
            else if (cancerSite.includes('prostate')) {
                cancerCode = 'C61';
                cancerLabel = 'Malignant neoplasm of prostate';
            }
            else if (cancerSite.includes('pancreas')) {
                cancerCode = 'C25.9';
                cancerLabel = 'Malignant neoplasm of pancreas';
            }
            else if (cancerSite.includes('liver')) {
                cancerCode = 'C22.9';
                cancerLabel = 'Malignant neoplasm of liver';
            }
            if (!correctedCodes.some(c => c.code.startsWith('C') && c.code !== 'C80.1')) {
                correctedCodes = correctedCodes.filter(c => !c.code.startsWith('C'));
                correctedCodes.push({
                    code: cancerCode,
                    label: cancerLabel,
                    isPrimary: correctedCodes.length === 0
                });
            }
        }
        else {
            // Rule 26: C80.1 only if site truly unknown
            if (!correctedCodes.some(c => c.code.startsWith('C'))) {
                correctedCodes.push({
                    code: 'C80.1',
                    label: 'Malignant neoplasm, unspecified',
                    isPrimary: correctedCodes.length === 0
                });
            }
        }
        // Rule 24: Metastasis → C77-C79
        if (hasMetastasis && metastaticSite) {
            let metastasisCode = 'C79.9';
            let metastasisLabel = 'Secondary malignant neoplasm';
            if (metastaticSite.includes('bone')) {
                metastasisCode = 'C79.51';
                metastasisLabel = 'Secondary malignant neoplasm of bone';
            }
            else if (metastaticSite.includes('brain')) {
                metastasisCode = 'C79.31';
                metastasisLabel = 'Secondary malignant neoplasm of brain';
            }
            else if (metastaticSite.includes('liver')) {
                metastasisCode = 'C78.7';
                metastasisLabel = 'Secondary malignant neoplasm of liver';
            }
            else if (metastaticSite.includes('lung')) {
                metastasisCode = 'C78.00';
                metastasisLabel = 'Secondary malignant neoplasm of lung';
            }
            if (!correctedCodes.some(c => c.code.startsWith('C7'))) {
                correctedCodes.push({
                    code: metastasisCode,
                    label: metastasisLabel,
                    isPrimary: false
                });
            }
        }
    }
    // ===== H) INFECTION SOURCE CODES (Rule 13 Enhancement) =====
    if (lower.includes('sepsis: yes') || lower.includes('sepsis:yes')) {
        const infectionSite = (_0 = (_z = lower.match(/infection site:\s*([^\n]+)/i)) === null || _z === void 0 ? void 0 : _z[1]) === null || _0 === void 0 ? void 0 : _0.toLowerCase();
        if (infectionSite) {
            // Rule 14: Add infection source as secondary
            if (infectionSite.includes('urinary') || infectionSite.includes('uti')) {
                if (!correctedCodes.some(c => c.code === 'N39.0')) {
                    correctedCodes.push({
                        code: 'N39.0',
                        label: 'Urinary tract infection, site not specified',
                        isPrimary: false
                    });
                }
            }
            else if (infectionSite.includes('skin')) {
                if (!correctedCodes.some(c => c.code.startsWith('L03'))) {
                    correctedCodes.push({
                        code: 'L03.90',
                        label: 'Cellulitis, unspecified',
                        isPrimary: false
                    });
                }
            }
            else if (infectionSite.includes('blood') && !correctedCodes.some(c => c.code.startsWith('A41'))) {
                // Blood infection is already handled by sepsis code
            }
            // Lung infections are handled by pneumonia rules above
        }
    }
    // Handle standalone infections WITHOUT sepsis
    const hasInfection = lower.includes('infection present: yes');
    const hasSepsis = lower.includes('sepsis: yes') || lower.includes('sepsis:yes');
    if (hasInfection && !hasSepsis) {
        const infectionSite = (_2 = (_1 = lower.match(/infection site:\s*([^\n]+)/i)) === null || _1 === void 0 ? void 0 : _1[1]) === null || _2 === void 0 ? void 0 : _2.toLowerCase();
        const organism = (_4 = (_3 = lower.match(/organism:\s*([^\n]+)/i)) === null || _3 === void 0 ? void 0 : _3[1]) === null || _4 === void 0 ? void 0 : _4.toLowerCase();
        if (infectionSite) {
            // Skin infection → Cellulitis
            if (infectionSite.includes('skin')) {
                if (!correctedCodes.some(c => c.code.startsWith('L03'))) {
                    correctedCodes.push({
                        code: 'L03.90',
                        label: 'Cellulitis, unspecified',
                        isPrimary: correctedCodes.length === 0
                    });
                }
            }
            // Lung infection → Pneumonia
            else if (infectionSite.includes('lung')) {
                if (!correctedCodes.some(c => c.code.startsWith('J'))) {
                    let pneumoniaCode = 'J18.9';
                    if (organism === null || organism === void 0 ? void 0 : organism.includes('mrsa'))
                        pneumoniaCode = 'J15.212';
                    else if (organism === null || organism === void 0 ? void 0 : organism.includes('pseudomonas'))
                        pneumoniaCode = 'J15.1';
                    else if ((organism === null || organism === void 0 ? void 0 : organism.includes('e. coli')) || (organism === null || organism === void 0 ? void 0 : organism.includes('e.coli')))
                        pneumoniaCode = 'J15.5';
                    else if (organism === null || organism === void 0 ? void 0 : organism.includes('viral'))
                        pneumoniaCode = 'J12.9';
                    correctedCodes.push({
                        code: pneumoniaCode,
                        label: 'Pneumonia',
                        isPrimary: correctedCodes.length === 0
                    });
                }
            }
            // Urinary tract infection
            else if (infectionSite.includes('urinary')) {
                if (!correctedCodes.some(c => c.code === 'N39.0')) {
                    correctedCodes.push({
                        code: 'N39.0',
                        label: 'Urinary tract infection, site not specified',
                        isPrimary: correctedCodes.length === 0
                    });
                }
            }
            // Blood infection without sepsis → Bacteremia
            else if (infectionSite.includes('blood')) {
                if (!correctedCodes.some(c => c.code === 'R78.81')) {
                    correctedCodes.push({
                        code: 'R78.81',
                        label: 'Bacteremia',
                        isPrimary: correctedCodes.length === 0
                    });
                }
            }
        }
    }
    // ===== I) FAIL-SAFE (Rules 29-30) =====
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
