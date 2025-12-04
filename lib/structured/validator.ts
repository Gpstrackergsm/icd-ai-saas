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

    // === HARD STOP 1: CKD VALIDATION ===
    // CKD validation is now handled below (line ~70) with diabetes-specific logic

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

    // === CKD VALIDATION - RELAXED FOR DIABETES ===
    // Only validate CKD stage if there's a standalone CKD object AND diabetes has CKD complication
    // If CKD is only mentioned as diabetes complication, don't require stage
    if (ctx.conditions.ckd) {
        const ckd = ctx.conditions.ckd;
        const hasDiabetesCKD = ctx.conditions.diabetes?.complications.includes('ckd');

        // Only validate stage if CKD exists independently (not just as diabetes complication)
        if (!hasDiabetesCKD) {
            if (ckd.stage === undefined || ckd.stage === null) {
                errors.push('HARD STOP: CKD selected but no stage specified. CKD Stage (1-5 or ESRD) is REQUIRED.');
            }
            if (ckd.stage !== undefined && ckd.stage !== null) {
                if (typeof ckd.stage === 'number' && (ckd.stage < 1 || ckd.stage > 6)) {
                    errors.push('CONFLICT: Invalid CKD stage value.');
                }
            }
        }
    }
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

    // === HARD STOP 14: ENCEPHALOPATHY REQUIRES TYPE ===
    if (ctx.conditions.neurology?.encephalopathy?.present) {
        if (!ctx.conditions.neurology.encephalopathy.type) {
            errors.push('HARD STOP: Encephalopathy selected but no type specified. Type (Metabolic, Toxic, Hepatic, Hypoxic) is REQUIRED.');
        }
    }

    // === HARD STOP 15: COMA REQUIRES GCS ===
    if (ctx.conditions.neurology?.coma) {
        if (!ctx.conditions.neurology.gcs) {
            errors.push('HARD STOP: Coma documented but no GCS score provided. Glasgow Coma Scale is REQUIRED for coma coding.');
        }
    }

    // === HARD STOP 16: HEPATITIS REQUIRES TYPE ===
    if (ctx.conditions.gastro?.hepatitis) {
        if (!ctx.conditions.gastro.hepatitis.type || ctx.conditions.gastro.hepatitis.type === 'unspecified') {
            errors.push('HARD STOP: Hepatitis selected but no type specified. Type (A, B, C, Alcoholic) is REQUIRED.');
        }
    }

    // === HARD STOP 17: GI BLEEDING REQUIRES SITE ===
    if (ctx.conditions.gastro?.bleeding) {
        if (!ctx.conditions.gastro.bleeding.site || ctx.conditions.gastro.bleeding.site === 'unspecified') {
            errors.push('HARD STOP: GI bleeding selected but no site specified. Site (Upper, Lower) is REQUIRED.');
        }
    }

    // === HARD STOP 18: PANCREATITIS REQUIRES TYPE ===
    if (ctx.conditions.gastro?.pancreatitis) {
        if (!ctx.conditions.gastro.pancreatitis.type || ctx.conditions.gastro.pancreatitis.type === 'unspecified') {
            errors.push('HARD STOP: Pancreatitis selected but no type specified. Type (Acute, Chronic) is REQUIRED.');
        }
    }

    // === HARD STOP 19: CANCER REQUIRES PRIMARY SITE ===
    if (ctx.conditions.neoplasm?.present) {
        if (!ctx.conditions.neoplasm.site) {
            errors.push('HARD STOP: Cancer selected but no primary site specified. Primary Site (Lung, Breast, Colon, Prostate) is REQUIRED.');
        }
    }

    // === HARD STOP 20: METASTASIS REQUIRES PRIMARY + METASTATIC SITE ===
    if (ctx.conditions.neoplasm?.metastasis) {
        if (!ctx.conditions.neoplasm.site) {
            errors.push('HARD STOP: Metastasis selected but no primary cancer site specified. Primary Site is REQUIRED for metastatic cancer.');
        }
        if (!ctx.conditions.neoplasm.metastaticSite) {
            errors.push('HARD STOP: Metastasis selected but no metastatic site specified. Metastatic Site (Bone, Brain, Liver, Lung) is REQUIRED.');
        }
    }

    // === HARD STOP 21: ANEMIA REQUIRES TYPE ===
    if (ctx.conditions.hematology?.anemia) {
        if (!ctx.conditions.hematology.anemia.type || ctx.conditions.hematology.anemia.type === 'unspecified') {
            errors.push('HARD STOP: Anemia selected but no type specified. Type (Iron deficiency, B12 deficiency, Chronic disease, Acute blood loss) is REQUIRED.');
        }
    }

    // === HARD STOP 22: PREGNANCY REQUIRES TRIMESTER OR GESTATIONAL AGE ===
    if (ctx.conditions.obstetric?.pregnant) {
        if (!ctx.conditions.obstetric.trimester && !ctx.conditions.obstetric.gestationalAge) {
            errors.push('HARD STOP: Pregnancy selected but no trimester or gestational age specified. Trimester (1st, 2nd, 3rd) OR Gestational Age is REQUIRED.');
        }
    }

    // === HARD STOP 23: DELIVERY REQUIRES TYPE ===
    if (ctx.conditions.obstetric?.delivery?.occurred) {
        if (!ctx.conditions.obstetric.delivery.type) {
            errors.push('HARD STOP: Delivery occurred but no delivery type specified. Type (Vaginal, Cesarean) is REQUIRED.');
        }
    }

    // === CONFLICT DETECTION (PHASE 2) ===

    // CONFLICT: Pregnancy + Male gender
    if (ctx.conditions.obstetric?.pregnant && ctx.demographics.gender === 'male') {
        errors.push('CONFLICT: Pregnancy documented but patient gender is Male. Please verify patient demographics.');
    }

    // CONFLICT: Delivery without pregnancy
    if (ctx.conditions.obstetric?.delivery?.occurred && !ctx.conditions.obstetric.pregnant) {
        errors.push('CONFLICT: Delivery occurred but pregnancy not documented. Pregnancy = Yes is REQUIRED for delivery coding.');
    }

    // CONFLICT: Chemotherapy without cancer
    if (ctx.conditions.neoplasm?.chemotherapy && !ctx.conditions.neoplasm.present) {
        errors.push('CONFLICT: Chemotherapy documented but no cancer diagnosis. Cancer = Yes is REQUIRED for chemotherapy coding.');
    }

    // CONFLICT: Hepatic encephalopathy without liver disease
    if (ctx.conditions.neurology?.encephalopathy?.type === 'hepatic') {
        if (!ctx.conditions.gastro?.liverDisease && !ctx.conditions.gastro?.cirrhosis) {
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
