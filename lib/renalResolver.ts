export interface RenalAttributes {
    type: 'ckd' | 'esrd' | 'nephritis' | 'pyelonephritis' | 'cystitis' | 'uti' | 'none';
    stage?: 1 | 2 | 3 | 4 | 5 | 'ESRD';
    on_dialysis?: boolean;
    transplant_status?: boolean;
    complication?: 'hypertension' | 'diabetes' | 'none';
    acuity?: 'acute' | 'chronic' | 'unspecified';
    organism?: string;
    requires_organism_code?: boolean;
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

    // Detect organism
    let organism: string | undefined;
    if (/e\.?\s?coli|escherichia coli/.test(lower)) organism = 'e_coli';
    if (/klebsiella/.test(lower)) organism = 'klebsiella';
    if (/proteus/.test(lower)) organism = 'proteus';
    if (/pseudomonas/.test(lower)) organism = 'pseudomonas';
    if (/enterococcus/.test(lower)) organism = 'enterococcus';

    const isAcute = /acute/.test(lower);
    const isChronic = /chronic/.test(lower);
    const acuity = isAcute ? 'acute' : isChronic ? 'chronic' : 'unspecified';

    // 1. Pyelonephritis (Kidney infection)
    if (/pyelonephritis|kidney infection/.test(lower)) {
        let code = 'N10'; // Acute pyelonephritis
        if (isChronic) code = 'N11.9'; // Chronic pyelonephritis, unspecified

        return {
            code,
            label: isAcute ? 'Acute pyelonephritis' : isChronic ? 'Chronic pyelonephritis' : 'Acute pyelonephritis',
            attributes: {
                type: 'pyelonephritis',
                acuity,
                organism,
                requires_organism_code: !!organism
            },
            warnings: organism ? ['Use additional code B96.20 to identify E. coli as causative organism'] : ['Use additional code to identify infectious agent']
        };
    }

    // 2. Cystitis (Bladder infection)
    if (/cystitis|bladder infection/.test(lower)) {
        let code = 'N30.00'; // Acute cystitis without hematuria
        if (/hematuria|blood/.test(lower)) code = 'N30.01'; // Acute cystitis with hematuria
        if (isChronic) code = /hematuria|blood/.test(lower) ? 'N30.11' : 'N30.10';

        return {
            code,
            label: 'Cystitis',
            attributes: {
                type: 'cystitis',
                acuity,
                organism,
                requires_organism_code: !!organism
            },
            warnings: organism ? ['Use additional code to identify infectious organism'] : []
        };
    }

    // 3. UTI (Generic)
    if (/uti|urinary tract infection/.test(lower) && !/pyelonephritis|cystitis/.test(lower)) {
        return {
            code: 'N39.0',
            label: 'Urinary tract infection, site not specified',
            attributes: {
                type: 'uti',
                organism,
                requires_organism_code: !!organism
            },
            warnings: organism ? ['Use additional code to identify infectious organism'] : []
        };
    }

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

    // 4. ESRD
    if (stage === 'ESRD') {
        return {
            code: 'N18.6',
            label: 'End stage renal disease',
            attributes: { type: 'esrd', stage: 'ESRD', on_dialysis: onDialysis, complication: hasHypertension ? 'hypertension' : 'none' },
            warnings: onDialysis ? ['Use Z99.2 for dialysis status'] : []
        };
    }

    // 5. CKD Stages
    if (/ckd|chronic kidney|renal disease|renal failure/.test(lower) || stage) {
        let code = 'N18.9';
        if (stage === 1) code = 'N18.1';
        if (stage === 2) code = 'N18.2';
        if (stage === 3) code = 'N18.30';
        if (stage === 4) code = 'N18.4';
        if (stage === 5) code = 'N18.5';

        if (stage === 3) {
            if (/3a/.test(lower)) code = 'N18.31';
            if (/3b/.test(lower)) code = 'N18.32';
        }

        return {
            code,
            label: `Chronic kidney disease, stage ${stage || 'unspecified'}`,
            attributes: { type: 'ckd', stage, on_dialysis: onDialysis, complication: hasHypertension ? 'hypertension' : 'none' },
            warnings
        };
    }

    // 6. Dialysis Status (Z99.2)
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
