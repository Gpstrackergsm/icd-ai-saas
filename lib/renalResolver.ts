
export interface RenalAttributes {
    type: 'ckd' | 'esrd' | 'nephritis' | 'none';
    stage?: 1 | 2 | 3 | 4 | 5 | 'ESRD';
    on_dialysis?: boolean;
    transplant_status?: boolean;
    complication?: 'hypertension' | 'diabetes' | 'none';
}

export interface RenalResolution {
    code: string;
    label: string;
    attributes: RenalAttributes;
    warnings?: string[];
}

export function resolveRenal(text: string): RenalResolution | undefined {
    const lower = text.toLowerCase();
    const warnings: string[] = [];

    // Detect Stage
    let stage: RenalAttributes['stage'] = undefined;
    if (/stage 5/.test(lower)) stage = 5;
    else if (/stage 4/.test(lower)) stage = 4;
    else if (/stage 3/.test(lower)) stage = 3;
    else if (/stage 2/.test(lower)) stage = 2;
    else if (/stage 1/.test(lower)) stage = 1;

    if (/esrd|end stage renal/.test(lower)) stage = 'ESRD';

    const onDialysis = /dialysis/.test(lower);
    const hasHypertension = /hypertens|high blood pressure/.test(lower);
    const hasDiabetes = /diabet|dm/.test(lower);

    // 1. ESRD
    if (stage === 'ESRD') {
        return {
            code: 'N18.6',
            label: 'End stage renal disease',
            attributes: { type: 'esrd', stage: 'ESRD', on_dialysis: onDialysis, complication: hasHypertension ? 'hypertension' : 'none' },
            warnings: onDialysis ? ['Use Z99.2 for dialysis status'] : []
        };
    }

    // 2. CKD Stages
    if (/ckd|chronic kidney|renal disease|renal failure/.test(lower) || stage) {
        let code = 'N18.9';
        if (stage === 1) code = 'N18.1';
        if (stage === 2) code = 'N18.2';
        if (stage === 3) code = 'N18.30'; // Unspecified stage 3
        if (stage === 4) code = 'N18.4';
        if (stage === 5) code = 'N18.5';

        // Refine Stage 3
        if (stage === 3) {
            if (/3a/.test(lower)) code = 'N18.31';
            if (/3b/.test(lower)) code = 'N18.32';
        }

        // Interaction with Hypertension (I12/I13) is handled in Cardiovascular or Rules Engine via combination logic.
        // However, if this is the primary resolver, we should output the N code, and let the rules engine add I12 if HTN is present?
        // The prompt says "Enforce 'stage always secondary'".
        // If the user inputs "Hypertensive CKD", we want I12 as primary and N18 as secondary.
        // If we return N18 here, the rules engine needs to know to sequence it.

        return {
            code,
            label: `Chronic kidney disease, stage ${stage || 'unspecified'}`,
            attributes: { type: 'ckd', stage, on_dialysis: onDialysis, complication: hasHypertension ? 'hypertension' : 'none' },
            warnings
        };
    }

    // 3. Dialysis Status (Z99.2) - standalone if mentioned
    if (onDialysis) {
        return {
            code: 'Z99.2',
            label: 'Dependence on renal dialysis',
            attributes: { type: 'none', on_dialysis: true },
            warnings: ['Code also the underlying cause']
        };
    }

    return undefined;
}
