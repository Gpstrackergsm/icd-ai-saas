
import { PatientContext } from './context';

export interface StructuredCode {
    code: string;
    label: string;
    rationale: string;
    guideline?: string;
}

export interface EngineOutput {
    primary: StructuredCode | null;
    secondary: StructuredCode[];
    warnings: string[];
}

export function runStructuredRules(ctx: PatientContext): EngineOutput {
    const codes: StructuredCode[] = [];
    const warnings: string[] = [];

    // --- DIABETES RULES ---
    if (ctx.conditions.diabetes) {
        const d = ctx.conditions.diabetes;
        let baseCode = d.type === 'type1' ? 'E10' : 'E11';

        // Complications
        if (d.complications.includes('foot_ulcer')) {
            codes.push({
                code: `${baseCode}.621`,
                label: `Type ${d.type === 'type1' ? '1' : '2'} diabetes with foot ulcer`,
                rationale: 'Diabetes with specific complication (foot ulcer)',
                guideline: 'I.C.4.a'
            });

            // Add Ulcer Code
            let ulcerCode = 'L97.5'; // Foot
            // Site
            if (d.ulcerSite === 'foot_left') ulcerCode += '2';
            else if (d.ulcerSite === 'foot_right') ulcerCode += '1';
            else ulcerCode += '9'; // Unspecified

            // Severity
            if (d.ulcerSeverity === 'muscle') ulcerCode += '3';
            else if (d.ulcerSeverity === 'bone') ulcerCode += '4';
            else if (d.ulcerSeverity === 'fat') ulcerCode += '2';
            else if (d.ulcerSeverity === 'skin') ulcerCode += '1';
            else ulcerCode += '9';

            codes.push({
                code: ulcerCode,
                label: 'Non-pressure chronic ulcer of foot',
                rationale: 'Manifestation of diabetic ulcer',
                guideline: 'I.C.4.a'
            });

        } else if (d.complications.includes('ckd')) {
            codes.push({
                code: `${baseCode}.22`,
                label: `Type ${d.type === 'type1' ? '1' : '2'} diabetes with diabetic CKD`,
                rationale: 'Diabetes with kidney complication',
                guideline: 'I.C.4.a'
            });
        } else {
            codes.push({
                code: `${baseCode}.9`,
                label: `Type ${d.type === 'type1' ? '1' : '2'} diabetes without complications`,
                rationale: 'Uncomplicated diabetes',
                guideline: 'I.C.4.a'
            });
        }

        // Multiple complications logic
        if (d.complications.includes('ckd') && d.complications.includes('foot_ulcer')) {
            // If we already added .621 (ulcer), we need to add .22 (CKD) as secondary
            // The logic above was if/else. Let's fix for multiple.
            // Actually, let's use a "primary selection" logic.
            // For now, simple push.
            if (!codes.some(c => c.code.includes('.22'))) {
                codes.push({
                    code: `${baseCode}.22`,
                    label: `Type ${d.type === 'type1' ? '1' : '2'} diabetes with diabetic CKD`,
                    rationale: 'Additional diabetic complication',
                    guideline: 'I.C.4.a'
                });
            }
        }
    }

    // --- CARDIOVASCULAR RULES ---
    if (ctx.conditions.cardiovascular) {
        const c = ctx.conditions.cardiovascular;
        const hasCKD = !!ctx.conditions.ckd;
        const hasHF = !!c.heartFailure;

        if (c.hypertension) {
            if (hasCKD && hasHF) {
                codes.push({
                    code: 'I13.0',
                    label: 'Hypertensive heart and chronic kidney disease with heart failure and stage 1-4 CKD',
                    rationale: 'Combination code for HTN + HF + CKD',
                    guideline: 'I.C.9.a.2'
                });
            } else if (hasCKD) {
                codes.push({
                    code: 'I12.9',
                    label: 'Hypertensive chronic kidney disease',
                    rationale: 'Combination code for HTN + CKD',
                    guideline: 'I.C.9.a.2'
                });
            } else if (hasHF) {
                codes.push({
                    code: 'I11.0',
                    label: 'Hypertensive heart disease with heart failure',
                    rationale: 'Combination code for HTN + HF',
                    guideline: 'I.C.9.a.1'
                });
            } else {
                codes.push({
                    code: 'I10',
                    label: 'Essential (primary) hypertension',
                    rationale: 'Uncomplicated hypertension',
                    guideline: 'I.C.9.a'
                });
            }
        }

        if (c.heartFailure) {
            let hfCode = 'I50.9';
            if (c.heartFailure.type === 'systolic') {
                if (c.heartFailure.acuity === 'acute') hfCode = 'I50.21';
                else if (c.heartFailure.acuity === 'chronic') hfCode = 'I50.22';
                else if (c.heartFailure.acuity === 'acute_on_chronic') hfCode = 'I50.23';
                else hfCode = 'I50.20';
            }
            // ... other types

            codes.push({
                code: hfCode,
                label: 'Heart failure',
                rationale: 'Specific heart failure type/acuity',
                guideline: 'I.C.9'
            });
        }
    }

    // --- RENAL RULES ---
    if (ctx.conditions.ckd) {
        const k = ctx.conditions.ckd;
        if (k.aki) {
            codes.push({
                code: 'N17.9',
                label: 'Acute kidney failure, unspecified',
                rationale: 'Acute kidney injury documented',
                guideline: 'I.C.14'
            });
        }

        if (k.stage) {
            let ckdCode = 'N18.9';
            if (k.stage === 4) ckdCode = 'N18.4';
            else if (k.stage === 5) ckdCode = 'N18.5';
            else if (k.stage === 'esrd') ckdCode = 'N18.6';
            else if (k.stage === 3) ckdCode = 'N18.30'; // Simplify for now

            codes.push({
                code: ckdCode,
                label: `Chronic kidney disease, stage ${k.stage}`,
                rationale: 'CKD stage documented',
                guideline: 'I.C.14'
            });
        }

        if (k.onDialysis) {
            codes.push({
                code: 'Z99.2',
                label: 'Dependence on renal dialysis',
                rationale: 'Patient status: on dialysis',
                guideline: 'I.C.21'
            });
        }
    }

    // --- RESPIRATORY RULES ---
    if (ctx.conditions.respiratory) {
        const r = ctx.conditions.respiratory;
        if (r.pneumonia) {
            let pCode = 'J18.9';
            if (r.pneumonia.organism === 'pseudomonas') pCode = 'J15.1';
            else if (r.pneumonia.organism === 'e_coli') pCode = 'J15.5';

            codes.push({
                code: pCode,
                label: 'Pneumonia',
                rationale: 'Pneumonia with specific organism if known',
                guideline: 'I.C.10'
            });

            if (r.pneumonia.organism === 'pseudomonas') {
                codes.push({
                    code: 'B96.5',
                    label: 'Pseudomonas aeruginosa',
                    rationale: 'Organism code',
                    guideline: 'I.C.1'
                });
            }
        }
    }

    // --- SEQUENCING LOGIC (Simple) ---
    // 1. Etiology (Diabetes, HTN)
    // 2. Manifestations (CKD, Ulcer)
    // 3. Acute conditions (Pneumonia, AKI) often go first if reason for admission
    // For now, we just return the list.

    return {
        primary: codes.length > 0 ? codes[0] : null,
        secondary: codes.length > 1 ? codes.slice(1) : [],
        warnings
    };
}
