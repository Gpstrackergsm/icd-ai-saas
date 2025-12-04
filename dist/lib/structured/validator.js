"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateContext = validateContext;
/**
 * ZERO-ASSUMPTION VALIDATOR
 *
 * COMMANDMENTS (HARD STOPS):
 * 1. Never infer missing data
 * 2. Never upgrade severity
 * 3. Never assume ESRD or dialysis
 * 4. Never auto-fill CKD stage
 * 5. Never generate code without explicit label
 * 6. Never allow contradictory outputs
 */
function validateContext(ctx) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _u, _v, _w, _x, _y, _z, _0, _1, _2, _3, _4, _5, _6, _7, _8, _9, _10, _11, _12, _13;
    const errors = [];
    const warnings = [];
    // === HARD STOP 1: CKD REQUIRES STAGE ===
    if (ctx.conditions.ckd) {
        const k = ctx.conditions.ckd;
        if (!k.stage) {
            errors.push('HARD STOP: CKD selected but no stage specified. CKD Stage (1-5 or ESRD) is REQUIRED.');
        }
        // === HARD STOP 2: ESRD REQUIRES DIALYSIS STATUS ===
        if (k.stage === 'esrd') {
            if (k.onDialysis === undefined) {
                errors.push('HARD STOP: ESRD requires dialysis status. You must specify Dialysis (None/Temporary/Chronic).');
            }
            if (k.onDialysis === false && !k.dialysisType) {
                errors.push('HARD STOP: ESRD without dialysis requires explicit "Dialysis: None" selection.');
            }
        }
        // === CONFLICT: Cannot have ESRD + CKD Stage 1-4 ===
        // Type system prevents this, but double-check
        if (k.stage === 'esrd') {
            // Valid
        }
        else if ([1, 2, 3, 4, 5].includes(k.stage)) {
            // Valid
        }
        else {
            errors.push('CONFLICT: Invalid CKD stage value.');
        }
    }
    // === HARD STOP 3: DIABETES FOOT ULCER - RELAXED VALIDATION ===
    if (ctx.conditions.diabetes) {
        const d = ctx.conditions.diabetes;
        // Foot ulcer validation - make site/severity optional
        if (d.complications.includes('foot_ulcer')) {
            if (!d.ulcerSite) {
                warnings.push('Foot ulcer site not specified. Will use unspecified location.');
            }
            if (!d.ulcerSeverity) {
                warnings.push('Foot ulcer depth not specified. Will use unspecified depth.');
            }
        }
        // Warn if ulcer fields without foot ulcer
        if (!d.complications.includes('foot_ulcer')) {
            if (d.ulcerSite || d.ulcerSeverity) {
                warnings.push('Ulcer site/severity specified but Foot Ulcer not in complications.');
            }
        }
        // === HARD STOP 4: DIABETES TYPE REQUIRED ===
        if (!d.type) {
            errors.push('HARD STOP: Diabetes selected but no type specified. Type (Type 1 or Type 2) is REQUIRED.');
        }
    }
    // === HARD STOP 5: INJURY REQUIRES ENCOUNTER TYPE ===
    if ((_a = ctx.conditions.injury) === null || _a === void 0 ? void 0 : _a.present) {
        const i = ctx.conditions.injury;
        if (!i.encounterType) {
            errors.push('HARD STOP: Injury selected but no encounter type specified. Encounter Type (Initial, Subsequent, Sequela) is REQUIRED for injury coding.');
        }
        if (!i.type) {
            errors.push('HARD STOP: Injury selected but no injury type specified. Injury Type (Fracture, Open wound, Burn) is REQUIRED.');
        }
    }
    // === HARD STOP 6: SEPSIS REQUIRES INFECTION SOURCE ===
    if ((_c = (_b = ctx.conditions.infection) === null || _b === void 0 ? void 0 : _b.sepsis) === null || _c === void 0 ? void 0 : _c.present) {
        if (!ctx.conditions.infection.site) {
            errors.push('HARD STOP: Sepsis selected but no infection source specified. Infection Site (Lung, Blood, UTI, etc.) is REQUIRED for sepsis coding.');
        }
    }
    // === HARD STOP 7: PRESSURE ULCER REQUIRES STAGE ===
    if ((_d = ctx.conditions.wounds) === null || _d === void 0 ? void 0 : _d.present) {
        const w = ctx.conditions.wounds;
        if (!w.type) {
            errors.push('HARD STOP: Wound/ulcer selected but no type specified. Ulcer Type (Pressure, Diabetic, Traumatic) is REQUIRED.');
        }
        if (!w.location) {
            errors.push('HARD STOP: Wound/ulcer selected but no location specified. Location (Sacral, Foot, Heel, etc.) is REQUIRED.');
        }
        if (!w.stage && !w.depth) {
            errors.push('HARD STOP: Wound/ulcer selected but no stage/depth specified. Stage (1-4) or Depth is REQUIRED.');
        }
    }
    // === HARD STOP 8: CANCER WITH METASTASIS REQUIRES PRIMARY SITE ===
    if (((_e = ctx.conditions.neoplasm) === null || _e === void 0 ? void 0 : _e.metastasis) === true) {
        if (!ctx.conditions.neoplasm.site) {
            errors.push('HARD STOP: Metastasis selected but no primary cancer site specified. Cancer Site is REQUIRED for metastatic coding.');
        }
    }
    // === HARD STOP 9: SEPSIS REQUIRES INFECTION SITE ===
    if ((_g = (_f = ctx.conditions.infection) === null || _f === void 0 ? void 0 : _f.sepsis) === null || _g === void 0 ? void 0 : _g.present) {
        if (!ctx.conditions.infection.site) {
            errors.push('HARD STOP: Sepsis selected but no infection site specified. Infection Site (Lung, Blood, UTI, etc.) is REQUIRED for sepsis coding.');
        }
    }
    // === HARD STOP 10: SEPTIC SHOCK REQUIRES SEPSIS ===
    if (((_j = (_h = ctx.conditions.infection) === null || _h === void 0 ? void 0 : _h.sepsis) === null || _j === void 0 ? void 0 : _j.shock) === true) {
        if (!ctx.conditions.infection.sepsis.present) {
            errors.push('HARD STOP: Septic shock selected but sepsis not documented. Sepsis = Yes is REQUIRED for septic shock.');
        }
    }
    // === HARD STOP 11: SEVERE SEPSIS REQUIRES SEPSIS ===
    if (((_l = (_k = ctx.conditions.infection) === null || _k === void 0 ? void 0 : _k.sepsis) === null || _l === void 0 ? void 0 : _l.severe) === true) {
        if (!ctx.conditions.infection.sepsis.present) {
            errors.push('HARD STOP: Severe sepsis selected but sepsis not documented. Sepsis = Yes is REQUIRED for severe sepsis.');
        }
    }
    // === HARD STOP 12: PRESSURE ULCER REQUIRES TYPE + LOCATION + STAGE ===
    if ((_m = ctx.conditions.wounds) === null || _m === void 0 ? void 0 : _m.present) {
        const w = ctx.conditions.wounds;
        if (!w.type) {
            errors.push('HARD STOP: Wound/ulcer selected but no type specified. Ulcer Type (Pressure, Diabetic, Traumatic) is REQUIRED.');
        }
        if (!w.location) {
            errors.push('HARD STOP: Wound/ulcer selected but no location specified. Location (Sacral, Foot, Heel, etc.) is REQUIRED.');
        }
        if (w.type === 'pressure' && !w.stage && !w.depth) {
            errors.push('HARD STOP: Pressure ulcer selected but no stage specified. Stage (1-4, Unstageable, Deep tissue) is REQUIRED.');
        }
    }
    // === HARD STOP 13: INJURY REQUIRES ENCOUNTER TYPE ===
    if ((_o = ctx.conditions.injury) === null || _o === void 0 ? void 0 : _o.present) {
        const i = ctx.conditions.injury;
        if (!i.encounterType) {
            errors.push('HARD STOP: Injury selected but no encounter type specified. Encounter Type (Initial, Subsequent, Sequela) is REQUIRED for injury coding.');
        }
        if (!i.type) {
            errors.push('HARD STOP: Injury selected but no injury type specified. Injury Type (Fracture, Open wound, Burn) is REQUIRED.');
        }
    }
    // === CONFLICT DETECTION ===
    // CONFLICT: Diabetic ulcer without diabetes
    if (((_p = ctx.conditions.wounds) === null || _p === void 0 ? void 0 : _p.type) === 'diabetic') {
        if (!ctx.conditions.diabetes) {
            errors.push('CONFLICT: Diabetic ulcer selected but no diabetes documented. Diabetes Type is REQUIRED for diabetic ulcer.');
        }
    }
    // CONFLICT: Septic shock without sepsis
    if (((_r = (_q = ctx.conditions.infection) === null || _q === void 0 ? void 0 : _q.sepsis) === null || _r === void 0 ? void 0 : _r.shock) === true) {
        if (ctx.conditions.infection.sepsis.present === false) {
            errors.push('CONFLICT: Septic shock = Yes but Sepsis = No. Cannot have septic shock without sepsis.');
        }
    }
    // === HARD STOP 14: ENCEPHALOPATHY REQUIRES TYPE ===
    if ((_t = (_s = ctx.conditions.neurology) === null || _s === void 0 ? void 0 : _s.encephalopathy) === null || _t === void 0 ? void 0 : _t.present) {
        if (!ctx.conditions.neurology.encephalopathy.type) {
            errors.push('HARD STOP: Encephalopathy selected but no type specified. Type (Metabolic, Toxic, Hepatic, Hypoxic) is REQUIRED.');
        }
    }
    // === HARD STOP 15: COMA REQUIRES GCS ===
    if ((_u = ctx.conditions.neurology) === null || _u === void 0 ? void 0 : _u.coma) {
        if (!ctx.conditions.neurology.gcs) {
            errors.push('HARD STOP: Coma documented but no GCS score provided. Glasgow Coma Scale is REQUIRED for coma coding.');
        }
    }
    // === HARD STOP 16: HEPATITIS REQUIRES TYPE ===
    if ((_v = ctx.conditions.gastro) === null || _v === void 0 ? void 0 : _v.hepatitis) {
        if (!ctx.conditions.gastro.hepatitis.type || ctx.conditions.gastro.hepatitis.type === 'unspecified') {
            errors.push('HARD STOP: Hepatitis selected but no type specified. Type (A, B, C, Alcoholic) is REQUIRED.');
        }
    }
    // === HARD STOP 17: GI BLEEDING REQUIRES SITE ===
    if ((_w = ctx.conditions.gastro) === null || _w === void 0 ? void 0 : _w.bleeding) {
        if (!ctx.conditions.gastro.bleeding.site || ctx.conditions.gastro.bleeding.site === 'unspecified') {
            errors.push('HARD STOP: GI bleeding selected but no site specified. Site (Upper, Lower) is REQUIRED.');
        }
    }
    // === HARD STOP 18: PANCREATITIS REQUIRES TYPE ===
    if ((_x = ctx.conditions.gastro) === null || _x === void 0 ? void 0 : _x.pancreatitis) {
        if (!ctx.conditions.gastro.pancreatitis.type || ctx.conditions.gastro.pancreatitis.type === 'unspecified') {
            errors.push('HARD STOP: Pancreatitis selected but no type specified. Type (Acute, Chronic) is REQUIRED.');
        }
    }
    // === HARD STOP 19: CANCER REQUIRES PRIMARY SITE ===
    if ((_y = ctx.conditions.neoplasm) === null || _y === void 0 ? void 0 : _y.present) {
        if (!ctx.conditions.neoplasm.site) {
            errors.push('HARD STOP: Cancer selected but no primary site specified. Primary Site (Lung, Breast, Colon, Prostate) is REQUIRED.');
        }
    }
    // === HARD STOP 20: METASTASIS REQUIRES PRIMARY + METASTATIC SITE ===
    if ((_z = ctx.conditions.neoplasm) === null || _z === void 0 ? void 0 : _z.metastasis) {
        if (!ctx.conditions.neoplasm.site) {
            errors.push('HARD STOP: Metastasis selected but no primary cancer site specified. Primary Site is REQUIRED for metastatic cancer.');
        }
        if (!ctx.conditions.neoplasm.metastaticSite) {
            errors.push('HARD STOP: Metastasis selected but no metastatic site specified. Metastatic Site (Bone, Brain, Liver, Lung) is REQUIRED.');
        }
    }
    // === HARD STOP 21: ANEMIA REQUIRES TYPE ===
    if ((_0 = ctx.conditions.hematology) === null || _0 === void 0 ? void 0 : _0.anemia) {
        if (!ctx.conditions.hematology.anemia.type || ctx.conditions.hematology.anemia.type === 'unspecified') {
            errors.push('HARD STOP: Anemia selected but no type specified. Type (Iron deficiency, B12 deficiency, Chronic disease, Acute blood loss) is REQUIRED.');
        }
    }
    // === HARD STOP 22: PREGNANCY REQUIRES TRIMESTER OR GESTATIONAL AGE ===
    if ((_1 = ctx.conditions.obstetric) === null || _1 === void 0 ? void 0 : _1.pregnant) {
        if (!ctx.conditions.obstetric.trimester && !ctx.conditions.obstetric.gestationalAge) {
            errors.push('HARD STOP: Pregnancy selected but no trimester or gestational age specified. Trimester (1st, 2nd, 3rd) OR Gestational Age is REQUIRED.');
        }
    }
    // === HARD STOP 23: DELIVERY REQUIRES TYPE ===
    if ((_3 = (_2 = ctx.conditions.obstetric) === null || _2 === void 0 ? void 0 : _2.delivery) === null || _3 === void 0 ? void 0 : _3.occurred) {
        if (!ctx.conditions.obstetric.delivery.type) {
            errors.push('HARD STOP: Delivery occurred but no delivery type specified. Type (Vaginal, Cesarean) is REQUIRED.');
        }
    }
    // === CONFLICT DETECTION (PHASE 2) ===
    // CONFLICT: Pregnancy + Male gender
    if (((_4 = ctx.conditions.obstetric) === null || _4 === void 0 ? void 0 : _4.pregnant) && ctx.demographics.gender === 'male') {
        errors.push('CONFLICT: Pregnancy documented but patient gender is Male. Please verify patient demographics.');
    }
    // CONFLICT: Delivery without pregnancy
    if (((_6 = (_5 = ctx.conditions.obstetric) === null || _5 === void 0 ? void 0 : _5.delivery) === null || _6 === void 0 ? void 0 : _6.occurred) && !ctx.conditions.obstetric.pregnant) {
        errors.push('CONFLICT: Delivery occurred but pregnancy not documented. Pregnancy = Yes is REQUIRED for delivery coding.');
    }
    // CONFLICT: Chemotherapy without cancer
    if (((_7 = ctx.conditions.neoplasm) === null || _7 === void 0 ? void 0 : _7.chemotherapy) && !ctx.conditions.neoplasm.present) {
        errors.push('CONFLICT: Chemotherapy documented but no cancer diagnosis. Cancer = Yes is REQUIRED for chemotherapy coding.');
    }
    // CONFLICT: Hepatic encephalopathy without liver disease
    if (((_9 = (_8 = ctx.conditions.neurology) === null || _8 === void 0 ? void 0 : _8.encephalopathy) === null || _9 === void 0 ? void 0 : _9.type) === 'hepatic') {
        if (!((_10 = ctx.conditions.gastro) === null || _10 === void 0 ? void 0 : _10.liverDisease) && !((_11 = ctx.conditions.gastro) === null || _11 === void 0 ? void 0 : _11.cirrhosis)) {
            warnings.push('WARNING: Hepatic encephalopathy documented but no liver disease or cirrhosis. Consider documenting underlying liver condition.');
        }
    }
    // === WARNINGS (NOT HARD STOPS) ===
    // WARN: CKD + Diabetes but CKD not in diabetes complications
    if (ctx.conditions.diabetes && ctx.conditions.ckd) {
        if (!ctx.conditions.diabetes.complications.includes('ckd')) {
            warnings.push('WARNING: CKD is present but not listed in diabetes complications. Consider adding "Nephropathy/CKD" to diabetes complications if they are related.');
        }
    }
    // WARN: HF + CKD without HTN (unusual for I13.x combination code)
    if (((_12 = ctx.conditions.cardiovascular) === null || _12 === void 0 ? void 0 : _12.heartFailure) && ctx.conditions.ckd) {
        if (!ctx.conditions.cardiovascular.hypertension) {
            warnings.push('WARNING: Heart failure with CKD typically requires hypertension documentation for I13.x combination code. Consider documenting hypertension if present.');
        }
    }
    // WARN: Infection without organism specified
    if (((_13 = ctx.conditions.infection) === null || _13 === void 0 ? void 0 : _13.present) && !ctx.conditions.infection.organism) {
        warnings.push('WARNING: Infection present but organism not specified. Consider documenting organism for more specific coding.');
    }
    return {
        valid: errors.length === 0,
        errors,
        warnings
    };
}
