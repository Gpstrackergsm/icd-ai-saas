
import { PatientContext } from './context';

export interface ValidationResult {
    valid: boolean;
    errors: string[];
}

export function validateContext(ctx: PatientContext): ValidationResult {
    const errors: string[] = [];

    // 1. Mutually Exclusive Conditions
    if (ctx.conditions.diabetes) {
        if (ctx.conditions.diabetes.type === 'type1' && ctx.conditions.diabetes.type === 'type2') {
            // This is structurally impossible in our TS type, but good for logic check if type changed
        }
    }

    // 2. Logical Conflicts
    if (ctx.conditions.ckd) {
        if (ctx.conditions.ckd.stage === 'esrd' && ctx.conditions.ckd.stage === 3) {
            // Impossible by type, but check logical consistency
        }
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
