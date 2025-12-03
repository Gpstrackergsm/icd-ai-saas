import { PatientContext } from './context';

export interface ValidationResult {
    valid: boolean;
    errors: string[];
    warnings: string[];
}

export function validateContext(ctx: PatientContext): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // ===== DIABETES VALIDATION =====
    if (ctx.conditions.diabetes) {
        const d = ctx.conditions.diabetes;

        // RULE: Foot ulcer requires site and severity
        if (d.complications.includes('foot_ulcer')) {
            if (!d.ulcerSite) {
                errors.push('Diabetes with foot ulcer requires "Ulcer Site" specification');
            }
            if (!d.ulcerSeverity) {
                errors.push('Diabetes with foot ulcer requires "Ulcer Severity" (depth) specification');
            }
        }

        // RULE: Cannot have ulcer fields without foot ulcer complication
        if (!d.complications.includes('foot_ulcer')) {
            if (d.ulcerSite || d.ulcerSeverity) {
                errors.push('Ulcer site/severity specified but "Foot Ulcer" not selected in complications');
            }
        }

        // RULE: Diabetes type is required
        if (!d.type) {
            errors.push('Diabetes Type (Type 1 or Type 2) is required');
        }
    }

    // ===== CKD VALIDATION =====
    if (ctx.conditions.ckd) {
        const k = ctx.conditions.ckd;

        // RULE: CKD requires stage
        if (!k.stage) {
            errors.push('CKD requires stage specification (1-5 or ESRD)');
        }

        // RULE: ESRD requires dialysis status
        if (k.stage === 'esrd') {
            if (k.onDialysis === undefined) {
                errors.push('ESRD (End Stage Renal Disease) requires dialysis status');
            }
            if (k.onDialysis === false && !k.transplantStatus) {
                errors.push('ESRD without dialysis requires transplant status documentation');
            }
        }

        // RULE: Cannot have both ESRD and stage 1-4
        // (This is prevented by type system, but check for data integrity)
        if (k.stage === 'esrd') {
            // Valid
        } else if ([1, 2, 3, 4, 5].includes(k.stage as any)) {
            // Valid stages 1-5
        } else {
            errors.push('Invalid CKD stage value');
        }
    }

    // ===== DIABETES + CKD COMBINATION =====
    if (ctx.conditions.diabetes && ctx.conditions.ckd) {
        const d = ctx.conditions.diabetes;
        const k = ctx.conditions.ckd;

        // Warn if CKD present but not in diabetes complications
        if (!d.complications.includes('ckd')) {
            warnings.push('CKD is present but not listed in diabetes complications. Consider adding "Nephropathy/CKD" to complications.');
        }
    }

    // ===== CARDIOVASCULAR VALIDATION =====
    if (ctx.conditions.cardiovascular) {
        const c = ctx.conditions.cardiovascular;

        // Warn if HF + CKD without HTN
        if (c.heartFailure && ctx.conditions.ckd && !c.hypertension) {
            warnings.push('Heart failure with CKD typically requires hypertension documentation for I13.x combination code');
        }
    }

    return {
        valid: errors.length === 0,
        errors,
        warnings
    };
}
