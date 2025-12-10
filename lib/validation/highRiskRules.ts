import { SequencedCode } from '../rulesEngine';

export interface ValidationRuleResult {
    ruleId: string;
    ruleName: string;
    issue: string;
    why: string;
    action: string[];
    valid: boolean;
    level: 'error' | 'warning';
    message: string;
}

export type ValidationRule = (codes: SequencedCode[], context?: any) => ValidationRuleResult | null;

// Helper functions
const hasCode = (codes: SequencedCode[], prefix: string) => codes.some(c => c.code.startsWith(prefix));
const hasRange = (codes: SequencedCode[], prefix: string) => codes.some(c => c.code.startsWith(prefix));
const getCode = (codes: SequencedCode[], prefix: string) => codes.find(c => c.code.startsWith(prefix));

export const highRiskRules: ValidationRule[] = [
    // 1. External Cause Codes
    // EXT-001: External Cause Never Principal
    (codes) => {
        if (codes.length === 0) return null;
        const pdx = codes[0];
        if (pdx.code >= 'V00' && pdx.code <= 'Y99') {
            return {
                ruleId: 'EXT-001',
                ruleName: 'External Cause Never Principal',
                issue: `External Cause code (${pdx.code}) cannot be Principal Diagnosis.`,
                why: 'External cause codes describe the circumstances of an injury, not the injury itself.',
                action: ['Sequence the injury code first.'],
                valid: false,
                level: 'error',
                message: `External Cause code (${pdx.code}) cannot be Principal Diagnosis. Sequence the injury first.`
            };
        }
        return null;
    },

    // EXT-002: Place of Occurrence Frequency Limit
    (codes) => {
        const y92 = codes.find(c => c.code.startsWith('Y92'));
        if (!y92) return null;

        // Check if ANY injury code has 7th char 'A'
        const hasInitial = codes.some(c => {
            const clean = c.code.replace('.', '');
            return (c.code.startsWith('S') || c.code.startsWith('T')) && clean.length >= 7 && clean.endsWith('A');
        });

        if (!hasInitial) {
            return {
                ruleId: 'EXT-002',
                ruleName: 'Place of Occurrence Frequency Limit',
                issue: `Place of occurrence code (${y92.code}) reported without an initial encounter injury.`,
                why: 'Place of occurrence codes are typically only reported on the initial encounter (7th char A).',
                action: ['Verify this is an initial encounter.', 'Remove Y92 if subsequent.'],
                valid: false,
                level: 'warning',
                message: `Place of occurrence code (${y92.code}) typically only reported on initial encounter (7th char A).`
            };
        }
        return null;
    },

    // 2. Sepsis
    // SEP-001: Severe Sepsis Sequencing Restriction
    (codes) => {
        if (codes.length === 0) return null;
        const pdx = codes[0];
        if (pdx.code === 'R65.20' || pdx.code === 'R65.21') {
            return {
                ruleId: 'SEP-001',
                ruleName: 'Severe Sepsis Sequencing Restriction',
                issue: `Severe Sepsis (${pdx.code}) cannot be Principal Diagnosis.`,
                why: 'Severe sepsis codes are manifestation codes and must follow the underlying infection.',
                action: ['Sequence the underlying infection first.'],
                valid: false,
                level: 'error',
                message: `Severe Sepsis (${pdx.code}) can never be Principal Diagnosis. Sequence the underlying infection first.`
            };
        }
        return null;
    },

    // SEP-002: Urosepsis Invalid Code (Requires Text Context)
    (codes, context) => {
        // If we don't have text context, skip
        if (!context || !context.text) return null;
        const textLower = context.text.toLowerCase();

        if (textLower.includes('urosepsis')) {
            const hasSepsis = hasRange(codes, 'A40') || hasRange(codes, 'A41');
            const hasUTI = hasCode(codes, 'N39.0');

            if (hasUTI && !hasSepsis) {
                return {
                    ruleId: 'SEP-002',
                    ruleName: 'Urosepsis Ambiguity',
                    issue: `Term 'Urosepsis' is ambiguous; mapped to UTI.`,
                    why: 'Urosepsis is not a valid code. It implies either UTI or Sepsis from UTI.',
                    action: ['If Sepsis confirmed, add A41.9.', 'If only UTI, use N39.0.'],
                    valid: false,
                    level: 'warning',
                    message: `Term 'Urosepsis' is ambiguous. If Sepsis is clinically confirmed, assign A41.9 + N39.0. If only UTI, document 'UTI'.`
                };
            }
        }
        return null;
    },

    // 3. Diabetes & CKD
    // DM-001: Diabetes + CKD Combined Coding
    (codes) => {
        if (hasCode(codes, 'E11.9') && hasRange(codes, 'N18')) {
            return {
                ruleId: 'DM-001',
                ruleName: 'Diabetes + CKD Combined Logic',
                issue: 'Diabetes and CKD are present but not linked.',
                why: 'Diabetes and CKD are presumed related unless stated otherwise.',
                action: ['Use E11.22 instead of E11.9.'],
                valid: false,
                level: 'error',
                message: `Link Diabetes and CKD. Replace E11.9 with E11.22 when N18.x is present.`
            };
        }
        return null;
    },

    // DM-002: Type 1 vs Type 2 Specifier
    (codes) => {
        if (hasRange(codes, 'E10') && hasRange(codes, 'E11')) {
            return {
                ruleId: 'DM-002',
                ruleName: 'Diabetes Type Conflict',
                issue: 'Both Type 1 and Type 2 diabetes coded.',
                why: 'A patient cannot have both types simultaneously.',
                action: ['Remove the incorrect diabetes type.'],
                valid: false,
                level: 'error',
                message: `Cannot code Type 1 (E10) and Type 2 (E11) diabetes on the same record.`
            };
        }
        return null;
    },

    // 4. CKD & HTN
    // CKD-001: Hypertensive CKD Linkage
    (codes) => {
        if (hasCode(codes, 'I10') && hasRange(codes, 'N18')) {
            return {
                ruleId: 'CKD-001',
                ruleName: 'Hypertension + CKD Linkage',
                issue: 'Hypertension and CKD present but not linked.',
                why: 'Hypertension and CKD are presumed related.',
                action: ['Use I12.9 (or I12.0) instead of I10.'],
                valid: false,
                level: 'error',
                message: `Use I12.x for Hypertensive CKD. Replace I10 with I12.9 (or I12.0 if Stage 5/ESRD).`
            };
        }
        return null;
    },

    // CKD-002: The Triple Threat
    (codes) => {
        if (hasCode(codes, 'I10') && hasRange(codes, 'I50') && hasRange(codes, 'N18')) {
            return {
                ruleId: 'CKD-002',
                ruleName: 'Triple Threat (HTN+HF+CKD)',
                issue: 'HTN, Heart Failure, and CKD present individually.',
                why: 'A combination code from I13.x is required.',
                action: ['Use I13.x instead of I10/I50/N18.'],
                valid: false,
                level: 'error',
                message: `Use I13.x (Hypertensive Heart & CKD) when HTN (I10), Heart Failure (I50), and CKD (N18) are all present.`
            };
        }
        return null;
    },

    // 5. Pregnancy
    // PREG-001: Trimester Specificity
    // PREG-001: Trimester / GA Required
    (codes, context) => {
        // Check for Obstetric codes (Chapter 15)
        const isObs = codes.some(c => c.code.startsWith('O'));
        if (!isObs) return null;

        // Check for Weeks of Gestation (Z3A.xx)
        const hasZ3A = codes.some(c => c.code.startsWith('Z3A'));

        // Exception: Some O-codes might not strictly require Z3A (e.g. O00-O08 Ectopic/Abortion often don't have GA), 
        // but for "Audit Grade" we usually want GA if possible. 
        // User request specifically targets O80 case (Delivery), which DEFINITELY needs Z3A.
        // Let's enforce for all O-codes for now as a high-risk rule, or we can assume O80/O09/etc. 
        // For now, simple strict rule as requested.

        if (!hasZ3A) {
            return {
                ruleId: 'PREG-001',
                ruleName: 'Trimester / GA Required',
                issue: 'Pregnancy encounter detected but no gestational age or trimester provided.',
                why: 'This deviation is automatically flagged in audits as it lacks required trimester specificity.',
                action: [
                    'Please enter Gestational Age (weeks)',
                    'OR Trimester (1st, 2nd, 3rd)'
                ],
                valid: false,
                level: 'error',
                message: 'Pregnancy encounter detected but no gestational age or trimester provided.'
            };
        }
        return null;
    },

    // PREG-002: Normal Delivery Exclusivity
    (codes) => {
        if (hasCode(codes, 'O80')) {
            const otherOCode = codes.find(c => c.code.startsWith('O') && c.code !== 'O80');
            if (otherOCode) {
                return {
                    ruleId: 'PREG-002',
                    ruleName: 'Normal Delivery Exclusivity',
                    issue: `O80 (Normal Delivery) cannot be used with other pregnancy complications (${otherOCode.code}: ${otherOCode.label || otherOCode.code}).`,
                    why: 'This code combination is mutually exclusive and will result in immediate claim rejection.',
                    action: [
                        'Remove O80.',
                        'Retain the specific complication code.'
                    ],
                    valid: false,
                    level: 'error',
                    message: `O80 (Normal Delivery) cannot be used with other pregnancy complications (${otherOCode.code}). Remove O80.`
                };
            }
        }
        return null;
    },

    // 6. Sequencing
    // SEQ-001: Manifestation Code Never Principal
    (codes) => {
        if (codes.length === 0) return null;
        const pdx = codes[0];
        const manifestations = ['F02', 'G21', 'I32', 'N16', 'B95', 'B96', 'B97'];
        if (manifestations.some(prefix => pdx.code.startsWith(prefix))) {
            return {
                ruleId: 'SEQ-001',
                ruleName: 'Manifestation Code Principal',
                issue: `Manifestation code ${pdx.code} cannot be Principal.`,
                why: 'Manifestation codes describe the result of an underlying disease and cannot be primary.',
                action: ['Sequence underlying condition first.'],
                valid: false,
                level: 'error',
                message: `Code ${pdx.code} is a Manifestation code and cannot be Principal. Sequence underlying condition first.`
            };
        }
        return null;
    },

    // 7. Laterality
    // LAT-001: Laterality Required
    (codes) => {
        const needsLat = ['C50', 'C34', 'S42', 'S52', 'S72', 'S82', 'L89'];
        const unspecifiedSideCodes = codes.filter(c => {
            const match = needsLat.some(prefix => c.code.startsWith(prefix));
            if (!match) return false;
            return c.label.toLowerCase().includes('unspecified side') ||
                (c.label.toLowerCase().includes('unspecified') && !c.label.toLowerCase().includes('left') && !c.label.toLowerCase().includes('right'));
        });

        if (unspecifiedSideCodes.length > 0) {
            return {
                ruleId: 'LAT-001',
                ruleName: 'Laterality Required',
                issue: `Laterality unspecified for: ${unspecifiedSideCodes.map(c => c.code).join(', ')}.`,
                why: 'Laterality (Right/Left) is required for these codes.',
                action: ['Specify Right, Left, or Bilateral.'],
                valid: false,
                level: 'warning',
                message: `Laterality unspecified for: ${unspecifiedSideCodes.map(c => c.code).join(', ')}. Please specify Right, Left, or Bilateral.`
            };
        }
        return null;
    },

    // 8. General High Risk
    // INJ-001: 7th Character Active Treatment
    (codes, context) => {
        if (context && context.isAftercare) {
            const text = context.text ? context.text.toLowerCase() : '';
            const isAftercare = text.includes('aftercare') || text.includes('follow-up') || text.includes('cast removal');

            if (isAftercare) {
                const badInjuries = codes.filter(c => {
                    const clean = c.code.replace('.', '');
                    return (c.code.startsWith('S') || c.code.startsWith('T')) && clean.length >= 7 && clean.endsWith('A');
                });

                if (badInjuries.length > 0) {
                    return {
                        ruleId: 'INJ-001',
                        ruleName: 'Injury 7th Character Conflict',
                        issue: 'Aftercare encounter used Active Treatment (A) codes.',
                        why: 'Aftercare encounters should use Subsequent Encounter (D) codes.',
                        action: ["Change 7th character from 'A' to 'D'."],
                        valid: false,
                        level: 'error',
                        message: `Encounter is Aftercare/Follow-up, but codes ${badInjuries.map(c => c.code).join(', ')} use 7th char 'A' (Active). Use 'D' (Subsequent).`
                    };
                }
            }
        }
        return null;
    },

    // NEO-001: Secondary Malignancy Needs Primary
    (codes) => {
        const secondary = codes.filter(c => c.code.startsWith('C78') || c.code.startsWith('C79'));
        if (secondary.length > 0) {
            const hasPrimary = codes.some(c => (c.code >= 'C00' && c.code <= 'C75') || (c.code >= 'C81' && c.code <= 'C96') || c.code === 'C80.1');
            const hasHistory = codes.some(c => c.code.startsWith('Z85'));

            if (!hasPrimary && !hasHistory) {
                return {
                    ruleId: 'NEO-001',
                    ruleName: 'Secondary Malignancy Orphan',
                    issue: `Secondary malignancy (${secondary[0].code}) has no Primary.`,
                    why: 'Secondary malignancies cannot exist without a primary site (current or historical).',
                    action: ['Add Primary Malignancy code or Z85 History code.'],
                    valid: false,
                    level: 'error',
                    message: `Secondary malignancy (${secondary[0].code}) requires a Primary site code or Z85 personal history code.`
                };
            }
        }
        return null;
    },

    // OB-002: Outcome of Delivery Required
    (codes) => {
        const isDelivery = codes.some(c => c.code >= 'O80' && c.code <= 'O82');
        const hasZ37 = codes.some(c => c.code.startsWith('Z37'));

        if (isDelivery && !hasZ37) {
            return {
                ruleId: 'OB-002',
                ruleName: 'Outcome of Delivery Missing',
                issue: 'Delivery encounter missing Outcome code (Z37.x).',
                why: 'All delivery encounters must include an outcome of delivery code.',
                action: ['Add Z37.x code.'],
                valid: false,
                level: 'error',
                message: `Delivery encounters require a Z37.x code to indicate the outcome of delivery.`
            };
        }
        return null;
    }
];
