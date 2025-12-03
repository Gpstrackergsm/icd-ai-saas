
import { PatientContext } from './context';

export interface StructuredCode {
    code: string;
    label: string;
    rationale: string;
    guideline?: string;
    trigger?: string;
    rule?: string;
}

export interface EngineOutput {
    primary: StructuredCode | null;
    secondary: StructuredCode[];
    procedures: StructuredCode[];
    warnings: string[];
    validationErrors: string[];
}

export function runStructuredRules(ctx: PatientContext): EngineOutput {
    const codes: StructuredCode[] = [];
    const warnings: string[] = [];
    const validationErrors: string[] = [];
    const procedures: StructuredCode[] = [];

    // --- DIABETES RULES (DETERMINISTIC) ---
    if (ctx.conditions.diabetes) {
        const d = ctx.conditions.diabetes;
        const baseCode = d.type === 'type1' ? 'E10' : 'E11';
        const typeName = d.type === 'type1' ? 'Type 1' : 'Type 2';

        // IMPORTANT: A patient can have MULTIPLE complications
        // We need to code ALL of them, not just one

        // RULE: Foot Ulcer → E10.621 / E11.621 + L97.x
        if (d.complications.includes('foot_ulcer')) {
            codes.push({
                code: `${baseCode}.621`,
                label: `${typeName} diabetes mellitus with foot ulcer`,
                rationale: 'Diabetes with documented foot ulcer complication',
                guideline: 'ICD-10-CM I.C.4.a',
                trigger: 'Diabetes Type + Foot Ulcer complication',
                rule: 'Diabetes complication mapping'
            });

            // MANDATORY: Add L97.x ulcer code
            if (d.ulcerSite && d.ulcerSeverity) {
                const ulcerCode = mapUlcerToL97(d.ulcerSite, d.ulcerSeverity);
                codes.push({
                    code: ulcerCode,
                    label: 'Non-pressure chronic ulcer of foot',
                    rationale: 'Manifestation code for diabetic foot ulcer',
                    guideline: 'ICD-10-CM I.C.4.a',
                    trigger: 'Diabetes foot ulcer with site/severity',
                    rule: 'Ulcer manifestation code (use additional)'
                });
            } else {
                validationErrors.push('Foot ulcer requires site and severity specification');
            }
        }

        // RULE: CKD → E10.22 / E11.22 (separate from ulcer)
        if (d.complications.includes('ckd')) {
            codes.push({
                code: `${baseCode}.22`,
                label: `${typeName} diabetes mellitus with diabetic chronic kidney disease`,
                rationale: 'Diabetes with documented CKD complication',
                guideline: 'ICD-10-CM I.C.4.a.6(b)',
                trigger: 'Diabetes Type + Nephropathy/CKD complication',
                rule: 'Diabetes complication mapping'
            });
        }

        // RULE: Neuropathy → E10.42 / E11.42
        if (d.complications.includes('neuropathy')) {
            codes.push({
                code: `${baseCode}.42`,
                label: `${typeName} diabetes mellitus with diabetic polyneuropathy`,
                rationale: 'Diabetes with documented neuropathy complication',
                guideline: 'ICD-10-CM I.C.4.a',
                trigger: 'Diabetes Type + Neuropathy complication',
                rule: 'Diabetes complication mapping'
            });
        }

        // RULE: Retinopathy → E10.311 / E11.311
        if (d.complications.includes('retinopathy')) {
            codes.push({
                code: `${baseCode}.311`,
                label: `${typeName} diabetes mellitus with unspecified diabetic retinopathy with macular edema`,
                rationale: 'Diabetes with documented retinopathy complication',
                guideline: 'ICD-10-CM I.C.4.a',
                trigger: 'Diabetes Type + Retinopathy complication',
                rule: 'Diabetes complication mapping'
            });
        }

        // RULE: Hypoglycemia → E10.649 / E11.649
        if (d.complications.includes('hypoglycemia')) {
            codes.push({
                code: `${baseCode}.649`,
                label: `${typeName} diabetes mellitus with hypoglycemia without coma`,
                rationale: 'Diabetes with documented hypoglycemia complication',
                guideline: 'ICD-10-CM I.C.4.a',
                trigger: 'Diabetes Type + Hypoglycemia complication',
                rule: 'Diabetes complication mapping'
            });
        }

        // RULE: No complications → E10.9 / E11.9
        if (d.complications.length === 0) {
            codes.push({
                code: `${baseCode}.9`,
                label: `${typeName} diabetes mellitus without complications`,
                rationale: 'Uncomplicated diabetes',
                guideline: 'ICD-10-CM I.C.4.a',
                trigger: 'Diabetes Type only, no complications',
                rule: 'Uncomplicated diabetes code'
            });
        }
    }

    // --- CARDIOVASCULAR RULES ---
    if (ctx.conditions.cardiovascular) {
        const c = ctx.conditions.cardiovascular;
        const hasCKD = !!ctx.conditions.ckd;
        const hasHF = !!c.heartFailure;

        // RULE: HTN + HF + CKD → I13.0
        if (c.hypertension && hasHF && hasCKD) {
            codes.push({
                code: 'I13.0',
                label: 'Hypertensive heart and chronic kidney disease with heart failure and stage 1 through stage 4 CKD, or unspecified CKD',
                rationale: 'Combination code for HTN, HF, and CKD',
                guideline: 'ICD-10-CM I.C.9.a.2',
                trigger: 'Hypertension + Heart Failure + CKD',
                rule: 'HTN combination code logic'
            });
        }
        // RULE: HTN + CKD → I12.x
        else if (c.hypertension && hasCKD) {
            codes.push({
                code: 'I12.9',
                label: 'Hypertensive chronic kidney disease with stage 1 through stage 4 CKD, or unspecified CKD',
                rationale: 'Combination code for HTN and CKD',
                guideline: 'ICD-10-CM I.C.9.a.2',
                trigger: 'Hypertension + CKD',
                rule: 'HTN combination code logic'
            });
        }
        // RULE: HTN + HF → I11.0
        else if (c.hypertension && hasHF) {
            codes.push({
                code: 'I11.0',
                label: 'Hypertensive heart disease with heart failure',
                rationale: 'Combination code for HTN and HF',
                guideline: 'ICD-10-CM I.C.9.a.1',
                trigger: 'Hypertension + Heart Failure',
                rule: 'HTN combination code logic'
            });
        }
        // RULE: HTN only → I10
        else if (c.hypertension) {
            codes.push({
                code: 'I10',
                label: 'Essential (primary) hypertension',
                rationale: 'Uncomplicated hypertension',
                guideline: 'ICD-10-CM I.C.9.a',
                trigger: 'Hypertension documented',
                rule: 'Uncomplicated hypertension'
            });
        }

        // RULE: Heart Failure (detailed)
        if (c.heartFailure) {
            const hfCode = mapHeartFailureCode(c.heartFailure.type, c.heartFailure.acuity);
            codes.push({
                code: hfCode,
                label: `Heart failure, ${c.heartFailure.type}, ${c.heartFailure.acuity}`,
                rationale: 'Specific heart failure type and acuity',
                guideline: 'ICD-10-CM I.C.9',
                trigger: `Heart Failure Type: ${c.heartFailure.type}, Acuity: ${c.heartFailure.acuity}`,
                rule: 'Heart failure specificity mapping'
            });
        }
    }

    // --- RENAL RULES (DETERMINISTIC) ---
    if (ctx.conditions.ckd) {
        const k = ctx.conditions.ckd;

        // RULE: AKI → N17.9
        if (k.aki) {
            codes.push({
                code: 'N17.9',
                label: 'Acute kidney failure, unspecified',
                rationale: 'Acute kidney injury documented',
                guideline: 'ICD-10-CM I.C.14',
                trigger: 'AKI Present = Yes',
                rule: 'AKI coding'
            });
        }

        // RULE: CKD Stage → N18.x
        if (k.stage) {
            const ckdCode = mapCKDStage(k.stage);
            codes.push({
                code: ckdCode,
                label: `Chronic kidney disease, stage ${k.stage}`,
                rationale: 'CKD stage explicitly documented',
                guideline: 'ICD-10-CM I.C.14.a',
                trigger: `CKD Stage: ${k.stage}`,
                rule: 'CKD stage mapping'
            });
        }

        // RULE: Dialysis → Z99.2
        if (k.onDialysis) {
            codes.push({
                code: 'Z99.2',
                label: 'Dependence on renal dialysis',
                rationale: 'Patient on dialysis',
                guideline: 'ICD-10-CM I.C.21.c.3',
                trigger: 'Dialysis Status = Yes',
                rule: 'Dialysis status code'
            });
        }
    }

    // --- RESPIRATORY RULES ---
    if (ctx.conditions.respiratory?.pneumonia) {
        const r = ctx.conditions.respiratory;
        const p = r.pneumonia!; // Non-null assertion safe because of if condition
        const pCode = mapPneumoniaOrganism(p.organism);
        codes.push({
            code: pCode,
            label: 'Pneumonia',
            rationale: `Pneumonia${p.organism ? ' due to ' + p.organism : ''}`,
            guideline: 'ICD-10-CM I.C.10',
            trigger: 'Pneumonia + ' + (p.organism || 'unspecified organism'),
            rule: 'Organism-specific pneumonia code'
        });

        // Add organism code if specific
        if (p.organism === 'pseudomonas') {
            codes.push({
                code: 'B96.5',
                label: 'Pseudomonas (aeruginosa) (mallei) (pseudomallei) as the cause of diseases classified elsewhere',
                rationale: 'Bacterial organism code',
                guideline: 'ICD-10-CM I.C.1',
                trigger: 'Pneumonia Organism: Pseudomonas',
                rule: 'Use additional code for organism'
            });
        }
    }

    // --- SEQUENCING LOGIC ---
    // Primary: First code in the list (usually most specific condition)
    // Secondary: Remaining codes in logical order

    return {
        primary: codes.length > 0 ? codes[0] : null,
        secondary: codes.length > 1 ? codes.slice(1) : [],
        procedures,
        warnings,
        validationErrors
    };
}

// === HELPER MAPPING FUNCTIONS (DETERMINISTIC) ===

function mapUlcerToL97(site: string, severity: string): string {
    let base = 'L97.5'; // Foot

    // Site mapping
    if (site.toLowerCase().includes('left') && site.toLowerCase().includes('foot')) {
        base += '2'; // Left foot
    } else if (site.toLowerCase().includes('right') && site.toLowerCase().includes('foot')) {
        base += '1'; // Right foot
    } else if (site.toLowerCase().includes('left') && site.toLowerCase().includes('ankle')) {
        base = 'L97.32'; // Left ankle
    } else if (site.toLowerCase().includes('right') && site.toLowerCase().includes('ankle')) {
        base = 'L97.31'; // Right ankle
    } else {
        base += '9'; // Unspecified foot
    }

    // Severity mapping
    if (severity === 'bone' || severity.toLowerCase().includes('bone')) {
        return base + '4';
    } else if (severity === 'muscle' || severity.toLowerCase().includes('muscle')) {
        return base + '3';
    } else if (severity === 'fat' || severity.toLowerCase().includes('fat')) {
        return base + '2';
    } else if (severity === 'skin' || severity.toLowerCase().includes('skin')) {
        return base + '1';
    } else {
        return base + '9';
    }
}

function mapCKDStage(stage: number | string): string {
    if (stage === 'esrd' || stage === 6) return 'N18.6';
    if (stage === 5) return 'N18.5';
    if (stage === 4) return 'N18.4';
    if (stage === 3) return 'N18.30'; // Unspecified stage 3
    if (stage === 2) return 'N18.2';
    if (stage === 1) return 'N18.1';
    return 'N18.9';
}

function mapHeartFailureCode(type: string, acuity: string): string {
    if (type === 'systolic') {
        if (acuity === 'acute') return 'I50.21';
        if (acuity === 'chronic') return 'I50.22';
        if (acuity === 'acute_on_chronic') return 'I50.23';
        return 'I50.20';
    } else if (type === 'diastolic') {
        if (acuity === 'acute') return 'I50.31';
        if (acuity === 'chronic') return 'I50.32';
        if (acuity === 'acute_on_chronic') return 'I50.33';
        return 'I50.30';
    } else if (type === 'combined') {
        if (acuity === 'acute') return 'I50.41';
        if (acuity === 'chronic') return 'I50.42';
        if (acuity === 'acute_on_chronic') return 'I50.43';
        return 'I50.40';
    }
    return 'I50.9';
}

function mapPneumoniaOrganism(organism?: string): string {
    if (!organism) return 'J18.9';
    const lower = organism.toLowerCase();
    if (lower.includes('pseudomonas')) return 'J15.1';
    if (lower.includes('e. coli') || lower.includes('e.coli')) return 'J15.5';
    if (lower.includes('mrsa')) return 'J15.212';
    if (lower.includes('viral')) return 'J12.9';
    return 'J18.9';
}
