import { PatientContext } from './context';

export interface ValidationResult {
    valid: boolean;
    errors: string[];
    warnings: string[];
}

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
export function validateContext(ctx: PatientContext): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

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
        } else if ([1, 2, 3, 4, 5].includes(k.stage as any)) {
            // Valid
        } else {
            errors.push('CONFLICT: Invalid CKD stage value.');
        }
    }

    // === HARD STOP 3: DIABETES FOOT ULCER REQUIRES SITE + SEVERITY ===
    if (ctx.conditions.diabetes) {
        const d = ctx.conditions.diabetes;

        if (d.complications.includes('foot_ulcer')) {
            if (!d.ulcerSite) {
                errors.push('HARD STOP: Foot ulcer selected but no site specified. Ulcer Site (Left Foot, Right Foot, etc.) is REQUIRED.');
            }
            if (!d.ulcerSeverity) {
                errors.push('HARD STOP: Foot ulcer selected but no severity/depth specified. Ulcer Depth (Skin, Fat, Muscle, Bone) is REQUIRED.');
            }
        }

        // === CONFLICT: Cannot have ulcer fields without foot ulcer ===
        if (!d.complications.includes('foot_ulcer')) {
            if (d.ulcerSite || d.ulcerSeverity) {
                errors.push('CONFLICT: Ulcer site/severity specified but "Foot Ulcer" not selected in complications.');
            }
        }

        // === HARD STOP 4: DIABETES TYPE REQUIRED ===
        if (!d.type) {
            errors.push('HARD STOP: Diabetes selected but no type specified. Type (Type 1 or Type 2) is REQUIRED.');
        }
    }

    // === HARD STOP 5: INJURY REQUIRES ENCOUNTER TYPE ===
    if (ctx.conditions.injury?.present) {
        const i = ctx.conditions.injury;

        if (!i.encounterType) {
            errors.push('HARD STOP: Injury selected but no encounter type specified. Encounter Type (Initial, Subsequent, Sequela) is REQUIRED for injury coding.');
        }

        if (!i.type) {
            errors.push('HARD STOP: Injury selected but no injury type specified. Injury Type (Fracture, Open wound, Burn) is REQUIRED.');
        }
    }

    // === HARD STOP 6: SEPSIS REQUIRES INFECTION SOURCE ===
    if (ctx.conditions.infection?.sepsis?.present) {
        if (!ctx.conditions.infection.site) {
            errors.push('HARD STOP: Sepsis selected but no infection source specified. Infection Site (Lung, Blood, UTI, etc.) is REQUIRED for sepsis coding.');
        }
    }

    // === HARD STOP 7: PRESSURE ULCER REQUIRES STAGE ===
    if (ctx.conditions.wounds?.present) {
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
    if (ctx.conditions.neoplasm?.metastasis === true) {
        if (!ctx.conditions.neoplasm.site) {
            errors.push('HARD STOP: Metastasis selected but no primary cancer site specified. Cancer Site is REQUIRED for metastatic coding.');
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
    if (ctx.conditions.cardiovascular?.heartFailure && ctx.conditions.ckd) {
        if (!ctx.conditions.cardiovascular.hypertension) {
            warnings.push('WARNING: Heart failure with CKD typically requires hypertension documentation for I13.x combination code. Consider documenting hypertension if present.');
        }
    }

    return {
        valid: errors.length === 0,
        errors,
        warnings
    };
}
