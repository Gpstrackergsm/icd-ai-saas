import { SequencedCode } from '../rulesEngineCore';

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
    },

    // --- STRICT HOSPITAL OB AUDIT RULES ---

    // 1. HEMORRHAGE (O72 REQUIRED)
    (codes, context) => {
        if (!context || !context.text) return null;
        const text = context.text.toLowerCase();
        const impliesPPH = text.includes('postpartum hemorrhage') || text.includes('pph') || text.includes('excessive bleeding');
        const hasO72 = hasRange(codes, 'O72');

        if (impliesPPH && !hasO72) {
            return {
                ruleId: 'OB-AUDIT-001',
                ruleName: 'Hemorrhage Code Required',
                issue: 'Narrative indicates Postpartum Hemorrhage but O72.x is missing.',
                why: 'Documentation of PPH requires specific coding (O72.x).',
                action: ['Add O72.x.'],
                valid: false,
                level: 'error',
                message: 'Documentation indicates Postpartum Hemorrhage. O72.x code is REQUIRED.'
            };
        }
        return null;
    },

    // 2. PREECLAMPSIA SEVERITY
    (codes) => {
        const o14 = codes.find(c => c.code.startsWith('O14'));
        if (o14) {
            // O14.0 (Mild), O14.1 (Severe), O14.2 (HELLP), O14.9 (Unspecified)
            if (o14.code.startsWith('O14.9')) {
                return {
                    ruleId: 'OB-AUDIT-002',
                    ruleName: 'Preeclampsia Severity',
                    issue: `Preeclampsia code (${o14.code}) is unspecified.`,
                    why: 'Preeclampsia must be specified as Mild, Severe, or HELLP for audit compliance.',
                    action: ['Specify severity (O14.0x, O14.1x, O14.2x).'],
                    valid: false,
                    level: 'error',
                    message: `Preeclampsia severity must be specified (Mild, Severe, or HELLP). O14.9 is not audit-compliant.`
                };
            }
        }
        return null;
    },

    // 3. MULTIPLE GESTATION SPECIFICITY
    (codes, context) => {
        if (!context || !context.text) return null;
        const text = context.text.toLowerCase();
        const impliesMultiple = text.includes('twins') || text.includes('triplets') || text.includes('multiple gestation');
        const o30_9 = codes.find(c => c.code.startsWith('O30.9'));

        if (impliesMultiple && o30_9) {
            return {
                ruleId: 'OB-AUDIT-003',
                ruleName: 'Multiple Gestation Specificity',
                issue: `Multiple gestation code (${o30_9.code}) is unspecified.`,
                why: 'Documentation indicates multiples; specific type and chorionicity required.',
                action: ['Specify Twin/Triplet and Chorionicity.'],
                valid: false,
                level: 'error',
                message: `Multiple gestation code O30.9 is unspecified. Specify number of fetuses and chorionicity/amnionicity.`
            };
        }
        return null;
    },

    // 4. PRETERM CONTRADICTION
    (codes, context) => {
        // Need explicit GA logic check here or rely on Z3A
        // We can check Z3A codes.
        const z3a = codes.find(c => c.code.startsWith('Z3A'));
        if (z3a && context && context.text) {
            const weeksMatch = z3a.code.match(/Z3A\.(\d+)/);
            if (weeksMatch) {
                const weeks = parseInt(weeksMatch[1]);
                const text = context.text.toLowerCase();
                // Term is usually 37+ weeks
                if (weeks < 37 && (text.includes('term') && !text.includes('preterm') && !text.includes('pre-term'))) {
                    return {
                        ruleId: 'OB-AUDIT-004',
                        ruleName: 'Preterm / Term Contradiction',
                        issue: `Gestational Age is ${weeks} weeks (Preterm) but narrative says 'Term'.`,
                        why: 'Clinical documentation contradicts the assigned gestational age code.',
                        action: ['Resolve contradiction between GA and Term status.'],
                        valid: false,
                        level: 'error',
                        message: `Contradiction: Gestational Age (${weeks} weeks) is Preterm, but narrative documents 'Term'.`
                    };
                }
            }
        }
        return null;
    },

    // 5. POST-TERM ENFORCEMENT
    (codes) => {
        const z3a = codes.find(c => c.code.startsWith('Z3A'));
        if (z3a) {
            // Z3A.49 is > 42 weeks? No, Z3A.42 is 42 weeks. Z3A.49 is > 42 weeks.
            if (z3a.code === 'Z3A.49' || z3a.code === 'Z3A.43' /* hypothetically */) {
                const hasO48 = hasRange(codes, 'O48');
                if (!hasO48) {
                    return {
                        ruleId: 'OB-AUDIT-005',
                        ruleName: 'Post-term Pregnancy Code Required',
                        issue: `Gestational Age > 42 weeks but O48.0 (Post-term) missing.`,
                        why: 'Pregnancies > 42 weeks require O48 series codes.',
                        action: ['Add O48.0 or O48.1.'],
                        valid: false,
                        level: 'error',
                        message: `Gestational Age > 42 weeks requires Post-term pregnancy code (O48.x).`
                    };
                }
            }
        }
        return null;
    },

    // 6. VBAC IDENTIFICATION
    (codes, context) => {
        if (!context || !context.text) return null;
        const text = context.text.toLowerCase();
        const impliesVBAC = text.includes('vbac') || text.includes('vaginal birth after cesarean');
        const hasO75_82 = codes.some(c => c.code === 'O75.82');

        if (impliesVBAC && !hasO75_82) {
            return {
                ruleId: 'OB-AUDIT-006',
                ruleName: 'VBAC Code Required',
                issue: 'Narrative indicates VBAC but O75.82 is missing.',
                why: 'VBAC attempts require O75.82 (Onset of labor after previous cesarean).',
                action: ['Add O75.82.'],
                valid: false,
                level: 'error',
                message: 'Documentation indicates VBAC. O75.82 (Onset of labor after previous cesarean) is REQUIRED.'
            };
        }
        return null;
    },

    // 7. C-SECTION TYPING
    (codes, context) => {
        if (!context || !context.text) return null;
        const text = context.text.toLowerCase();

        // EXCEPTIONS:
        // 1. VBAC code present (O75.82) -> O82 not required (Superseded)
        if (codes.some(c => c.code === 'O75.82')) return null;

        // 2. VBAC explicitly mentioned -> O82 not required (likely successful VBAC)
        if (text.includes('vbac') || text.includes('vaginal birth after cesarean')) return null;

        // 3. Historical C-Section Check
        // If "cesarean" appears BUT it's part of "history/prior/previous", ignore it.
        // We use a regex to see if 'cesarean' exists WITHOUT such qualifiers.
        // This is a simplified check: if ANY "cesarean" is found that ISN'T preceded by history terms?
        // Easier: Split by newline? The context.text might be joined.

        // Strict regex: Look for 'cesarean' or 'c-section' NOT preceded by history terms within a reasonable window?
        // Or simply:
        const impliesCS = (text.includes('cesarean') || text.includes('c-section')) &&
            !text.includes('history of cesarean') &&
            !text.includes('prior cesarean') &&
            !text.includes('previous cesarean') &&
            !text.includes('history of c-section') &&
            !text.includes('prior c-section') &&
            !text.includes('previous c-section');

        const hasO82 = hasRange(codes, 'O82');

        // If it's a delivery encounter...
        const isDelivery = codes.some(c => c.code.startsWith('Z37'));
        if (impliesCS && isDelivery && !hasO82) {
            return {
                ruleId: 'OB-AUDIT-007',
                ruleName: 'Cesarean Diagnosis Required',
                issue: 'Narrative indicates C-Section but O82 is missing.',
                why: 'Cesarean deliveries require O82 (or specific indication).',
                action: ['Add O82 or specific indication code.'],
                valid: false,
                level: 'error',
                message: 'Narrative indicates Cesarean delivery. O82.x code (or valid indication) is REQUIRED.'
            };
        }
        return null;
    },

    // 8. O80 SUPPRESSION CHECK (Redundant but safe)
    (codes) => {
        if (hasCode(codes, 'O80')) {
            // Check for ANY complication
            const complications = codes.filter(c =>
                (c.code.startsWith('O') && c.code !== 'O80') // Any active O code precludes O80
            );
            if (complications.length > 0) {
                return {
                    ruleId: 'OB-AUDIT-008',
                    ruleName: 'O80 Violation',
                    issue: `O80 is present with other O-codes (${complications[0].code}).`,
                    why: 'O80 is strictly for uncomplicated deliveries with NO other O-codes.',
                    action: ['Remove O80.'],
                    valid: false,
                    level: 'error',
                    message: `O80 cannot co-exist with any complication code (${complications[0].code}). Remove O80.`
                };
            }
        }
        return null;
    }
];
