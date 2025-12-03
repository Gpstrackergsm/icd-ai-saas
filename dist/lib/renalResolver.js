"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveRenal = resolveRenal;
function resolveRenal(text) {
    const lower = text.toLowerCase();
    const warnings = [];
    const secondary_codes = [];
    // Detect organism
    let organism;
    if (/e\.?\s?coli|escherichia coli/.test(lower))
        organism = 'e_coli';
    if (/klebsiella/.test(lower))
        organism = 'klebsiella';
    if (/proteus/.test(lower))
        organism = 'proteus';
    if (/pseudomonas/.test(lower))
        organism = 'pseudomonas';
    if (/enterococcus/.test(lower))
        organism = 'enterococcus';
    const isAcute = /acute/.test(lower);
    const isChronic = /chronic/.test(lower);
    const acuity = isAcute ? 'acute' : isChronic ? 'chronic' : 'unspecified';
    // Helper to get organism code
    const getOrganismCode = () => {
        if (!organism)
            return;
        const organismMap = {
            'e_coli': { code: 'B96.20', label: 'Unspecified Escherichia coli [E. coli] as the cause of diseases classified elsewhere' },
            'klebsiella': { code: 'B96.1', label: 'Klebsiella pneumoniae [K. pneumoniae] as the cause of diseases classified elsewhere' },
            'proteus': { code: 'B96.4', label: 'Proteus (mirabilis) (morganii) as the cause of diseases classified elsewhere' },
            'pseudomonas': { code: 'B96.5', label: 'Pseudomonas (aeruginosa) (mallei) (pseudomallei) as the cause of diseases classified elsewhere' },
            'enterococcus': { code: 'B95.2', label: 'Enterococcus as the cause of diseases classified elsewhere' }
        };
        const info = organismMap[organism];
        if (info) {
            secondary_codes.push({ code: info.code, label: info.label, type: 'organism' });
        }
    };
    // 1. Acute Kidney Injury (AKI)
    // Check for AKI but exclude if it's specifically "chronic kidney injury"
    if (/acute kidney injury|acute renal injury|aki\b/.test(lower) && !/chronic kidney injury|chronic renal injury/.test(lower)) {
        return {
            code: 'N17.9',
            label: 'Acute kidney failure, unspecified',
            attributes: {
                type: 'ckd', // Using 'ckd' type for now, could add 'aki' type
                acuity: 'acute'
            },
            warnings: []
        };
    }
    // 2. Pyelonephritis (Kidney infection)
    if (/pyelonephritis|kidney infection/.test(lower)) {
        let code = 'N10'; // Acute pyelonephritis
        if (isChronic)
            code = 'N11.9'; // Chronic pyelonephritis, unspecified
        getOrganismCode();
        return {
            code,
            label: isAcute ? 'Acute pyelonephritis' : isChronic ? 'Chronic pyelonephritis' : 'Acute pyelonephritis',
            attributes: {
                type: 'pyelonephritis',
                acuity,
                organism,
                requires_organism_code: !!organism
            },
            secondary_codes,
            warnings: organism ? [] : ['Use additional code to identify infectious agent']
        };
    }
    // 2. Cystitis (Bladder infection)
    if (/cystitis|bladder infection/.test(lower)) {
        let code = 'N30.00'; // Acute cystitis without hematuria
        if (/hematuria|blood/.test(lower))
            code = 'N30.01'; // Acute cystitis with hematuria
        if (isChronic)
            code = /hematuria|blood/.test(lower) ? 'N30.11' : 'N30.10';
        getOrganismCode();
        return {
            code,
            label: 'Cystitis',
            attributes: {
                type: 'cystitis',
                acuity,
                organism,
                requires_organism_code: !!organism
            },
            secondary_codes,
            warnings: organism ? [] : ['Use additional code to identify infectious organism']
        };
    }
    // 3. UTI (Generic) - Skip if sepsis is present (let infection resolver handle it)
    if (/uti|urinary tract infection/.test(lower) && !/pyelonephritis|cystitis|sepsis|septic|urosepsis/.test(lower)) {
        getOrganismCode();
        return {
            code: 'N39.0',
            label: 'Urinary tract infection, site not specified',
            attributes: {
                type: 'uti',
                organism,
                requires_organism_code: !!organism
            },
            secondary_codes,
            warnings: organism ? [] : ['Use additional code to identify infectious organism']
        };
    }
    // Detect Stage
    let stage = undefined;
    if (/stage 5/.test(lower))
        stage = 5;
    else if (/stage 4/.test(lower))
        stage = 4;
    else if (/stage 3/.test(lower))
        stage = 3;
    else if (/stage 2/.test(lower))
        stage = 2;
    else if (/stage 1/.test(lower))
        stage = 1;
    if (/esrd|end stage renal/.test(lower))
        stage = 'ESRD';
    const onDialysis = /dialysis/.test(lower);
    const hasHypertension = /hypertens|high blood pressure/.test(lower);
    if (onDialysis) {
        secondary_codes.push({ code: 'Z99.2', label: 'Dependence on renal dialysis', type: 'status' });
    }
    // 4. ESRD
    if (stage === 'ESRD') {
        return {
            code: 'N18.6',
            label: 'End stage renal disease',
            attributes: { type: 'esrd', stage: 'ESRD', on_dialysis: onDialysis, complication: hasHypertension ? 'hypertension' : 'none' },
            secondary_codes,
            warnings
        };
    }
    // 5. CKD Stages
    if (/ckd|chronic kidney|renal disease|renal failure/.test(lower) || stage) {
        let code = 'N18.9';
        if (stage === 1)
            code = 'N18.1';
        if (stage === 2)
            code = 'N18.2';
        if (stage === 3)
            code = 'N18.30';
        if (stage === 4)
            code = 'N18.4';
        if (stage === 5)
            code = 'N18.5';
        if (stage === 3) {
            if (/3a/.test(lower))
                code = 'N18.31';
            if (/3b/.test(lower))
                code = 'N18.32';
        }
        return {
            code,
            label: `Chronic kidney disease, stage ${stage || 'unspecified'}`,
            attributes: { type: 'ckd', stage, on_dialysis: onDialysis, complication: hasHypertension ? 'hypertension' : 'none' },
            secondary_codes,
            warnings
        };
    }
    // 6. Dialysis Status (Z99.2) - Standalone
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
