
import { PatientContext } from './context';

export interface ValidationResult {
    valid: boolean;
    errors: string[];
}

export function validateContext(ctx: PatientContext): ValidationResult {
    const errors: string[] = [];

    // 1. Mutually Exclusive Conditions
    // (Type system enforces single value for diabetes type and CKD stage, so no need to check for simultaneous conflicting values on the same field)

    // 2. Logical Conflicts
    if (ctx.conditions.ckd) {
        // Example: Dialysis without CKD/ESRD/AKI?
        // Actually Z99.2 can exist alone, but usually implies renal disease.
    }

    // 3. Required Fields
    if (ctx.conditions.diabetes?.complications.includes('foot_ulcer')) {
        if (!ctx.conditions.diabetes.ulcerSite) {
            errors.push('Diabetes with foot ulcer requires "Ulcer Site" to be specified.');
        }
        if (!ctx.conditions.diabetes.ulcerSeverity) {
            errors.push('Diabetes with foot ulcer requires "Ulcer Severity" (depth) to be specified.');
        }
    }

    if (ctx.conditions.respiratory?.pneumonia?.organism && !ctx.conditions.respiratory.pneumonia) {
        // Logic handled in parser, but double check
    }

    return {
        valid: errors.length === 0,
        errors
    };
}
