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

    // === HARD STOP 9: SEPSIS REQUIRES INFECTION SITE ===
    if (ctx.conditions.infection?.sepsis?.present) {
        if (!ctx.conditions.infection.site) {
            errors.push('HARD STOP: Sepsis selected but no infection site specified. Infection Site (Lung, Blood, UTI, etc.) is REQUIRED for sepsis coding.');
        }
    }

    // === HARD STOP 10: SEPTIC SHOCK REQUIRES SEPSIS ===
    if (ctx.conditions.infection?.sepsis?.shock === true) {
        if (!ctx.conditions.infection.sepsis.present) {
            errors.push('HARD STOP: Septic shock selected but sepsis not documented. Sepsis = Yes is REQUIRED for septic shock.');
        }
    }

    // === HARD STOP 11: SEVERE SEPSIS REQUIRES SEPSIS ===
    if (ctx.conditions.infection?.sepsis?.severe === true) {
        if (!ctx.conditions.infection.sepsis.present) {
            errors.push('HARD STOP: Severe sepsis selected but sepsis not documented. Sepsis = Yes is REQUIRED for severe sepsis.');
        }
    }

    // === HARD STOP 12: PRESSURE ULCER REQUIRES TYPE + LOCATION + STAGE ===
    if (ctx.conditions.wounds?.present) {
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
    if (ctx.conditions.injury?.present) {
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
    if (ctx.conditions.wounds?.type === 'diabetic') {
        if (!ctx.conditions.diabetes) {
            errors.push('CONFLICT: Diabetic ulcer selected but no diabetes documented. Diabetes Type is REQUIRED for diabetic ulcer.');
        }
    }

    // CONFLICT: Septic shock without sepsis
    if (ctx.conditions.infection?.sepsis?.shock === true) {
        if (ctx.conditions.infection.sepsis.present === false) {
            errors.push('CONFLICT: Septic shock = Yes but Sepsis = No. Cannot have septic shock without sepsis.');
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

    // WARN: Infection without organism specified
    if (ctx.conditions.infection?.present && !ctx.conditions.infection.organism) {
        warnings.push('WARNING: Infection present but organism not specified. Consider documenting organism for more specific coding.');
    }

    return {
        valid: errors.length === 0,
        errors,
        warnings
    };
}
