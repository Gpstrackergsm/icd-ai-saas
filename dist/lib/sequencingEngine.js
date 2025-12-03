"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.determineSequencing = determineSequencing;
/**
 * Determines PRIMARY vs SECONDARY code designation based on ICD-10-CM sequencing guidelines
 *
 * Sequencing Rules (in priority order):
 * 1. Etiology before manifestation (diabetes before CKD)
 * 2. Underlying disease before complication (primary cancer before metastasis)
 * 3. Combination codes preferred
 * 4. Poisoning/adverse effects: Poisoning first, adverse effect: manifestation first
 * 5. Hypertension hierarchy
 */
function determineSequencing(codes) {
    const rationale = [];
    if (codes.length === 0) {
        throw new Error('Cannot sequence empty code array');
    }
    if (codes.length === 1) {
        return {
            primary: codes[0],
            secondary: [],
            rationale: ['Single code detected, designated as primary'],
        };
    }
    // Rule 1: Poisoning scenarios - check triggeredBy
    const poisoningCodes = codes.filter(c => c.triggeredBy === 'poisoning_engine');
    const pumpFailureCodes = codes.filter(c => c.triggeredBy === 'insulin_pump_failure');
    if (poisoningCodes.length > 0) {
        // Poisoning intent: T-code first, then manifestation
        const tCodes = codes.filter(c => c.code.startsWith('T'));
        const nonTCodes = codes.filter(c => !c.code.startsWith('T'));
        if (tCodes.length > 0) {
            rationale.push('Poisoning detected: T-code sequenced as primary per ICD-10-CM guidelines');
            return {
                primary: tCodes[0],
                secondary: [...tCodes.slice(1), ...nonTCodes],
                rationale,
            };
        }
    }
    if (pumpFailureCodes.length > 0) {
        // Insulin pump failure: mechanical complication first
        const mechanicalCode = codes.find(c => c.code.startsWith('T85'));
        if (mechanicalCode) {
            rationale.push('Insulin pump failure: mechanical complication (T85) sequenced as primary');
            return {
                primary: mechanicalCode,
                secondary: codes.filter(c => c.code !== mechanicalCode.code),
                rationale,
            };
        }
    }
    // Rule 2: Diabetes + complications (etiology before manifestation)
    const diabetesCodes = codes.filter(c => /^E(08|09|10|11|13)\./.test(c.code));
    const ckdCodes = codes.filter(c => c.code.startsWith('N18'));
    const retinopathyCodes = codes.filter(c => c.code.startsWith('H'));
    if (diabetesCodes.length > 0) {
        // Check if diabetes has combination code (e.g., E11.22 includes CKD)
        const diabetesWithNephropathy = diabetesCodes.find(c => /\.(21|22|29)$/.test(c.code));
        const diabetesWithRetinopathy = diabetesCodes.find(c => /\.3[0-9]/.test(c.code));
        const diabetesWithNeuropathy = diabetesCodes.find(c => /\.4[0-9]/.test(c.code));
        const diabetesWithCharcot = diabetesCodes.find(c => /\.610/.test(c.code));
        if (diabetesWithNephropathy && ckdCodes.length > 0) {
            rationale.push('Diabetes with CKD: diabetes combination code (E*.2*) is primary, CKD stage is secondary');
            return {
                primary: diabetesWithNephropathy,
                secondary: codes.filter(c => c.code !== diabetesWithNephropathy.code),
                rationale,
            };
        }
        if (diabetesWithRetinopathy && retinopathyCodes.length > 0) {
            rationale.push('Diabetes with retinopathy: diabetes code is primary per etiology-before-manifestation');
            return {
                primary: diabetesWithRetinopathy,
                secondary: codes.filter(c => c.code !== diabetesWithRetinopathy.code),
                rationale,
            };
        }
        if (diabetesWithNeuropathy || diabetesWithCharcot) {
            const primaryDiabetes = diabetesWithCharcot || diabetesWithNeuropathy;
            rationale.push('Diabetes with neuropathy/Charcot: diabetes code is primary');
            return {
                primary: primaryDiabetes,
                secondary: codes.filter(c => c.code !== primaryDiabetes.code),
                rationale,
            };
        }
        // Any diabetes code should be primary if complications exist
        if (diabetesCodes.length > 0) {
            rationale.push('Diabetes detected: diabetes code sequenced as primary (etiology before manifestation)');
            return {
                primary: diabetesCodes[0],
                secondary: codes.filter(c => c.code !== diabetesCodes[0].code),
                rationale,
            };
        }
    }
    // Rule 3: Cancer primary before metastasis
    const primaryCancerCodes = codes.filter(c => /^C[0-7][0-9]/.test(c.code));
    const metastasisCodes = codes.filter(c => c.code.startsWith('C78') || c.code.startsWith('C79'));
    if (primaryCancerCodes.length > 0 && metastasisCodes.length > 0) {
        rationale.push('Cancer with metastasis: primary cancer site sequenced first');
        return {
            primary: primaryCancerCodes[0],
            secondary: codes.filter(c => c.code !== primaryCancerCodes[0].code),
            rationale,
        };
    }
    // Rule 4: Hypertension hierarchy
    const hypertensionCodes = codes.filter(c => c.code.startsWith('I1'));
    const heartFailureCodes = codes.filter(c => c.code.startsWith('I50'));
    if (hypertensionCodes.length > 0 && heartFailureCodes.length > 0) {
        // Check for hypertensive heart disease with heart failure (I11.0)
        const htnHeartDisease = hypertensionCodes.find(c => c.code.startsWith('I11'));
        if (htnHeartDisease) {
            rationale.push('Hypertensive heart disease: combination code is primary');
            return {
                primary: htnHeartDisease,
                secondary: codes.filter(c => c.code !== htnHeartDisease.code),
                rationale,
            };
        }
    }
    // Default: Use first code (highest score from previous ranking)
    rationale.push('Default sequencing: highest-ranked code designated as primary');
    return {
        primary: codes[0],
        secondary: codes.slice(1),
        rationale,
    };
}
