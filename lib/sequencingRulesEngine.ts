import { SequencedCode } from './rulesEngineCore.js';

/**
 * Sequencing Rules Engine
 * 
 * Enforces ICD-10-CM Official Guidelines for Coding and Reporting
 * Implements sequencing rules in strict priority order
 */

export interface SequencingRule {
    name: string;
    priority: number;
    applies: (codes: SequencedCode[]) => boolean;
    sequence: (codes: SequencedCode[]) => SequencedCode[];
    rationale: string;
}

export interface SequencingValidation {
    valid: boolean;
    sequencedCodes: SequencedCode[];
    rationale: string[];
    errors: string[];
    warnings: string[];
}

/**
 * Rule 1: Post-Procedural Sepsis Sequencing (HIGHEST PRIORITY)
 * ICD-10-CM Guideline I.C.1.d
 * 
 * Sequence: T81.44XA → Organ Dysfunction → A41.9 → Source Infection
 * Example: T81.44XA → J95.821 → A41.9 → J18.9
 */
const postProceduralSepsisRule: SequencingRule = {
    name: 'Post-Procedural Sepsis Sequencing',
    priority: 1,
    applies: (codes) => codes.some(c => c.code === 'T81.44XA'),
    sequence: (codes) => {
        const t8144 = codes.find(c => c.code === 'T81.44XA');
        const organDysfunction = codes.filter(c =>
            c.code.startsWith('J95.8') || // Respiratory failure post-procedure
            c.code.startsWith('N17') ||   // Acute kidney failure
            c.code.startsWith('R65.2')    // Severe sepsis
        );
        const sepsis = codes.find(c => c.code.startsWith('A41') || c.code.startsWith('A40'));
        const sourceInfection = codes.filter(c =>
            c.code.startsWith('J18') ||   // Pneumonia
            c.code.startsWith('N39.0')    // UTI
        );
        const remaining = codes.filter(c =>
            c.code !== 'T81.44XA' &&
            !organDysfunction.includes(c) &&
            c !== sepsis &&
            !sourceInfection.includes(c)
        );

        const sequence: SequencedCode[] = [];
        if (t8144) sequence.push(t8144);
        sequence.push(...organDysfunction);
        if (sepsis) sequence.push(sepsis);
        sequence.push(...sourceInfection);
        sequence.push(...remaining);

        return sequence;
    },
    rationale: 'ICD-10-CM Guideline I.C.1.d: Post-procedural sepsis requires T81.44XA first, followed by organ dysfunction, then A41.9, then source infection'
};

/**
 * Rule 2: Sepsis with Septic Shock Sequencing
 * ICD-10-CM Guideline I.C.1.b
 * 
 * Sequence: A40-A41 (Systemic Infection) → R65.21 (Septic Shock) → Localized Infection
 * Example: A41.9 → R65.21 → N39.0
 */
const sepsisWithShockRule: SequencingRule = {
    name: 'Sepsis with Septic Shock Sequencing',
    priority: 2,
    applies: (codes) => {
        const hasSepsis = codes.some(c => c.code.startsWith('A40') || c.code.startsWith('A41'));
        const hasShock = codes.some(c => c.code === 'R65.21');
        return hasSepsis && hasShock;
    },
    sequence: (codes) => {
        const sepsis = codes.find(c => c.code.startsWith('A40') || c.code.startsWith('A41'));
        const shock = codes.find(c => c.code === 'R65.21');
        const localizedInfection = codes.filter(c =>
            c.code.startsWith('N39.0') || // UTI
            c.code.startsWith('J18') ||   // Pneumonia
            c.code.startsWith('N10')      // Pyelonephritis
        );
        const remaining = codes.filter(c =>
            c !== sepsis &&
            c !== shock &&
            !localizedInfection.includes(c)
        );

        const sequence: SequencedCode[] = [];
        if (sepsis) sequence.push(sepsis);
        if (shock) sequence.push(shock);
        sequence.push(...localizedInfection);
        sequence.push(...remaining);

        return sequence;
    },
    rationale: 'ICD-10-CM Guideline I.C.1.b: Sepsis code (A40-A41) must precede septic shock (R65.21), followed by localized infection'
};

/**
 * Rule 3: Injury with Acute Post-Traumatic Pain
 * ICD-10-CM Guideline I.C.6.b.1
 * 
 * Sequence: Injury Code → G89.11 (Acute Post-Traumatic Pain) → External Cause
 * Example: S52.501A → G89.11 → W19.XXXA
 */
const injuryWithPainRule: SequencingRule = {
    name: 'Injury with Acute Post-Traumatic Pain',
    priority: 3,
    applies: (codes) => {
        const hasInjury = codes.some(c => c.code.startsWith('S') || c.code.startsWith('T'));
        const hasPain = codes.some(c => c.code === 'G89.11');
        return hasInjury && hasPain;
    },
    sequence: (codes) => {
        const injury = codes.filter(c =>
            (c.code.startsWith('S') || c.code.startsWith('T')) &&
            !c.code.startsWith('T81.44') // Exclude post-procedural sepsis
        );
        const pain = codes.find(c => c.code === 'G89.11');
        const externalCause = codes.filter(c =>
            c.code.startsWith('W') ||
            c.code.startsWith('X') ||
            c.code.startsWith('Y')
        );
        const remaining = codes.filter(c =>
            !injury.includes(c) &&
            c !== pain &&
            !externalCause.includes(c)
        );

        const sequence: SequencedCode[] = [];
        sequence.push(...injury);
        if (pain) sequence.push(pain);
        sequence.push(...remaining);
        sequence.push(...externalCause); // External cause always last

        return sequence;
    },
    rationale: 'ICD-10-CM Guideline I.C.6.b.1: Injury code first, then G89.11 (acute post-traumatic pain), then external cause last'
};

/**
 * Rule 4: Etiology before Manifestation
 * ICD-10-CM Guideline I.A.13
 * 
 * Cause (etiology) must precede effect (manifestation)
 * Examples:
 * - Diabetes (E11.22) → CKD (N18.3)
 * - Primary Cancer (C50.911) → Metastasis (C79.51)
 */
const etiologyBeforeManifestation: SequencingRule = {
    name: 'Etiology before Manifestation',
    priority: 4,
    applies: (codes) => {
        // Diabetes + CKD
        const hasDiabetes = codes.some(c => /^E(08|09|10|11|13)\./.test(c.code));
        const hasCKD = codes.some(c => c.code.startsWith('N18'));

        // Primary cancer + metastasis
        const hasPrimaryCancer = codes.some(c => /^C[0-7][0-9]/.test(c.code));
        const hasMetastasis = codes.some(c => c.code.startsWith('C78') || c.code.startsWith('C79'));

        return (hasDiabetes && hasCKD) || (hasPrimaryCancer && hasMetastasis);
    },
    sequence: (codes) => {
        const diabetes = codes.filter(c => /^E(08|09|10|11|13)\./.test(c.code));
        const ckd = codes.filter(c => c.code.startsWith('N18'));
        const primaryCancer = codes.filter(c => /^C[0-7][0-9]/.test(c.code));
        const metastasis = codes.filter(c => c.code.startsWith('C78') || c.code.startsWith('C79'));
        const remaining = codes.filter(c =>
            !diabetes.includes(c) &&
            !ckd.includes(c) &&
            !primaryCancer.includes(c) &&
            !metastasis.includes(c)
        );

        const sequence: SequencedCode[] = [];
        sequence.push(...diabetes);
        sequence.push(...primaryCancer);
        sequence.push(...remaining);
        sequence.push(...ckd);
        sequence.push(...metastasis);

        return sequence;
    },
    rationale: 'ICD-10-CM Guideline I.A.13: Etiology (cause) must be sequenced before manifestation (effect)'
};

/**
 * Rule 5: External Cause Codes Always Last
 * ICD-10-CM Guideline I.C.20
 * 
 * External cause codes (W, X, Y) are always sequenced last
 */
const externalCauseLastRule: SequencingRule = {
    name: 'External Cause Codes Last',
    priority: 10, // Lower priority, applies broadly
    applies: (codes) => codes.some(c =>
        c.code.startsWith('W') ||
        c.code.startsWith('X') ||
        c.code.startsWith('Y')
    ),
    sequence: (codes) => {
        const externalCause = codes.filter(c =>
            c.code.startsWith('W') ||
            c.code.startsWith('X') ||
            c.code.startsWith('Y')
        );
        const remaining = codes.filter(c => !externalCause.includes(c));

        return [...remaining, ...externalCause];
    },
    rationale: 'ICD-10-CM Guideline I.C.20: External cause codes are always sequenced last'
};

/**
 * All sequencing rules in priority order
 */
const SEQUENCING_RULES: SequencingRule[] = [
    postProceduralSepsisRule,
    sepsisWithShockRule,
    injuryWithPainRule,
    etiologyBeforeManifestation,
    externalCauseLastRule,
];

/**
 * Validates and enforces sequencing rules
 * 
 * @param codes - Array of codes to sequence
 * @returns Validation result with sequenced codes, rationale, and errors
 */
export function applySequencingRules(codes: SequencedCode[]): SequencingValidation {
    const rationale: string[] = [];
    const errors: string[] = [];
    const warnings: string[] = [];

    if (codes.length === 0) {
        return {
            valid: true,
            sequencedCodes: [],
            rationale: [],
            errors: [],
            warnings: []
        };
    }

    if (codes.length === 1) {
        return {
            valid: true,
            sequencedCodes: codes,
            rationale: ['Single code detected, no sequencing required'],
            errors: [],
            warnings: []
        };
    }

    let sequencedCodes = [...codes];

    // Apply rules in priority order
    for (const rule of SEQUENCING_RULES.sort((a, b) => a.priority - b.priority)) {
        if (rule.applies(sequencedCodes)) {
            sequencedCodes = rule.sequence(sequencedCodes);
            rationale.push(`Applied: ${rule.name} - ${rule.rationale}`);
        }
    }

    // Validation: Check for common sequencing errors
    validateSepsisSequencing(sequencedCodes, errors, warnings);
    validateEtiologyManifestation(sequencedCodes, errors, warnings);
    validateExternalCause(sequencedCodes, errors, warnings);

    return {
        valid: errors.length === 0,
        sequencedCodes,
        rationale,
        errors,
        warnings
    };
}

/**
 * Validates sepsis sequencing rules
 */
function validateSepsisSequencing(codes: SequencedCode[], errors: string[], warnings: string[]): void {
    const sepsisIndex = codes.findIndex(c => c.code.startsWith('A40') || c.code.startsWith('A41'));
    const shockIndex = codes.findIndex(c => c.code === 'R65.21');

    if (sepsisIndex !== -1 && shockIndex !== -1) {
        if (shockIndex < sepsisIndex) {
            errors.push('SEQUENCING ERROR: R65.21 (Septic shock) must follow A40-A41 (Sepsis) per ICD-10-CM Guideline I.C.1.b');
        }
    }

    // Check for septic shock without sepsis code
    if (shockIndex !== -1 && sepsisIndex === -1) {
        errors.push('CODING ERROR: R65.21 (Septic shock) requires A40-A41 (Sepsis) code per ICD-10-CM guidelines');
    }
}

/**
 * Validates etiology/manifestation sequencing
 */
function validateEtiologyManifestation(codes: SequencedCode[], errors: string[], warnings: string[]): void {
    const diabetesIndex = codes.findIndex(c => /^E(08|09|10|11|13)\./.test(c.code));
    const ckdIndex = codes.findIndex(c => c.code.startsWith('N18'));

    if (diabetesIndex !== -1 && ckdIndex !== -1) {
        if (ckdIndex < diabetesIndex) {
            errors.push('SEQUENCING ERROR: Diabetes code must precede CKD code per etiology-before-manifestation rule');
        }
    }

    const primaryCancerIndex = codes.findIndex(c => /^C[0-7][0-9]/.test(c.code));
    const metastasisIndex = codes.findIndex(c => c.code.startsWith('C78') || c.code.startsWith('C79'));

    if (primaryCancerIndex !== -1 && metastasisIndex !== -1) {
        if (metastasisIndex < primaryCancerIndex) {
            errors.push('SEQUENCING ERROR: Primary cancer must precede metastasis per etiology-before-manifestation rule');
        }
    }
}

/**
 * Validates external cause codes are last
 */
function validateExternalCause(codes: SequencedCode[], errors: string[], warnings: string[]): void {
    const externalCauseIndices = codes
        .map((c, i) => ({ code: c, index: i }))
        .filter(({ code }) =>
            code.code.startsWith('W') ||
            code.code.startsWith('X') ||
            code.code.startsWith('Y')
        )
        .map(({ index }) => index);

    if (externalCauseIndices.length > 0) {
        const lastExternalIndex = Math.max(...externalCauseIndices);
        const lastCodeIndex = codes.length - 1;

        // Check if any non-external-cause codes come after external cause codes
        const hasCodesAfterExternal = codes.slice(lastExternalIndex + 1).some(c =>
            !c.code.startsWith('W') &&
            !c.code.startsWith('X') &&
            !c.code.startsWith('Y')
        );

        if (hasCodesAfterExternal) {
            errors.push('SEQUENCING ERROR: External cause codes (W, X, Y) must be sequenced last per ICD-10-CM Guideline I.C.20');
        }
    }
}
