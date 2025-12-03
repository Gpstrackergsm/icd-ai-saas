
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

        // RULE: Dialysis → Z99.2 (ONLY IF CHRONIC)
        // COMMANDMENT: Never assume chronic dialysis
        if (k.dialysisType === 'chronic' || (k.onDialysis && k.dialysisType === undefined)) {
            // Only generate if explicitly chronic OR if onDialysis=true but no type specified (backward compat)
            if (k.dialysisType === 'chronic') {
                codes.push({
                    code: 'Z99.2',
                    label: 'Dependence on renal dialysis',
                    rationale: 'Patient on chronic dialysis',
                    guideline: 'ICD-10-CM I.C.21.c.3',
                    trigger: 'Dialysis Type = Chronic',
                    rule: 'Chronic dialysis status code'
                });
            }
        }

        // RULE: If dialysis is temporary, do NOT generate Z99.2
        // RULE: If dialysis is none, do NOT generate Z99.2
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

    // --- INFECTIONS & SEPSIS RULES ---
    if (ctx.conditions.infection) {
        const inf = ctx.conditions.infection;

        // RULE: Septic Shock → R65.21 (HIGHEST PRIORITY)
        if (inf.sepsis?.shock) {
            codes.push({
                code: 'R65.21',
                label: 'Severe sepsis with septic shock',
                rationale: 'Septic shock documented',
                guideline: 'ICD-10-CM I.C.1.d.1',
                trigger: 'Septic Shock = Yes',
                rule: 'Septic shock code (highest priority for sepsis)'
            });
        }
        // RULE: Severe Sepsis → R65.20
        else if (inf.sepsis?.severe) {
            codes.push({
                code: 'R65.20',
                label: 'Severe sepsis without septic shock',
                rationale: 'Severe sepsis documented without shock',
                guideline: 'ICD-10-CM I.C.1.d.1',
                trigger: 'Severe Sepsis = Yes',
                rule: 'Severe sepsis code'
            });
        }

        // RULE: Sepsis with organism → A41.x
        if (inf.sepsis?.present && inf.organism) {
            const sepsisCode = mapSepsisOrganism(inf.organism);
            codes.push({
                code: sepsisCode,
                label: `Sepsis due to ${inf.organism}`,
                rationale: 'Sepsis with documented organism',
                guideline: 'ICD-10-CM I.C.1.d',
                trigger: `Sepsis + Organism: ${inf.organism}`,
                rule: 'Organism-specific sepsis code'
            });
        }
        // RULE: Sepsis without organism → A41.9
        else if (inf.sepsis?.present) {
            codes.push({
                code: 'A41.9',
                label: 'Sepsis, unspecified organism',
                rationale: 'Sepsis documented without organism specification',
                guideline: 'ICD-10-CM I.C.1.d',
                trigger: 'Sepsis = Yes, Organism not specified',
                rule: 'Unspecified sepsis code'
            });
        }

        // RULE: Add organism code (B96.x) if specific
        if (inf.organism && inf.organism !== 'unspecified') {
            const organismCode = mapOrganismCode(inf.organism);
            if (organismCode) {
                codes.push({
                    code: organismCode,
                    label: `${inf.organism} as the cause of diseases classified elsewhere`,
                    rationale: 'Organism identification code',
                    guideline: 'ICD-10-CM I.C.1',
                    trigger: `Organism: ${inf.organism}`,
                    rule: 'Use additional code for organism'
                });
            }
        }
    }

    // --- WOUNDS & PRESSURE ULCERS RULES ---
    if (ctx.conditions.wounds?.present) {
        const w = ctx.conditions.wounds;

        // RULE: Pressure Ulcer → L89.xxx
        if (w.type === 'pressure' && w.location && w.stage) {
            const ulcerCode = mapPressureUlcer(w.location, w.stage);
            codes.push({
                code: ulcerCode,
                label: `Pressure ulcer of ${w.location}, ${w.stage}`,
                rationale: 'Pressure ulcer with documented location and stage',
                guideline: 'ICD-10-CM I.C.12.a',
                trigger: `Pressure Ulcer: ${w.location}, Stage: ${w.stage}`,
                rule: 'Pressure ulcer site and stage mapping'
            });
        }

        // NOTE: Diabetic ulcers are handled in diabetes domain (E11.621 + L97.x)
        // NOTE: Traumatic wounds are handled in injury domain (S codes)
    }

    // --- INJURY & TRAUMA RULES ---
    if (ctx.conditions.injury?.present) {
        const inj = ctx.conditions.injury;

        // RULE: Injury → S/T code with 7th character
        if (inj.type && inj.bodyRegion && inj.encounterType) {
            const injuryCode = mapInjuryCode(inj.type, inj.bodyRegion, inj.laterality, inj.encounterType);
            codes.push({
                code: injuryCode,
                label: `${inj.type} of ${inj.bodyRegion}`,
                rationale: `${inj.type} with encounter type: ${inj.encounterType}`,
                guideline: 'ICD-10-CM I.C.19',
                trigger: `Injury Type: ${inj.type}, Region: ${inj.bodyRegion}, Encounter: ${inj.encounterType}`,
                rule: 'Injury code with 7th character for encounter type'
            });
        }

        // RULE: External Cause → W/X/Y code
        if (inj.externalCause?.mechanism && inj.encounterType) {
            const externalCode = mapExternalCause(inj.externalCause.mechanism, inj.encounterType);
            codes.push({
                code: externalCode,
                label: `External cause: ${inj.externalCause.mechanism}`,
                rationale: 'External cause of injury',
                guideline: 'ICD-10-CM I.C.20',
                trigger: `External Cause: ${inj.externalCause.mechanism}`,
                rule: 'External cause code (use additional)'
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

// Sepsis organism mapping (A41.x codes)
function mapSepsisOrganism(organism: string): string {
    const lower = organism.toLowerCase();
    if (lower.includes('e. coli') || lower.includes('e.coli') || lower === 'e_coli') return 'A41.51';
    if (lower.includes('pseudomonas')) return 'A41.52';
    if (lower.includes('mrsa')) return 'A41.02';
    if (lower.includes('staph') || lower.includes('staphylococcus')) return 'A41.2';
    if (lower.includes('strep') || lower.includes('streptococcus')) return 'A40.9';
    return 'A41.9'; // Unspecified
}

// Organism code mapping (B96.x codes)
function mapOrganismCode(organism: string): string | null {
    const lower = organism.toLowerCase();
    if (lower.includes('e. coli') || lower.includes('e.coli') || lower === 'e_coli') return 'B96.20';
    if (lower.includes('pseudomonas')) return 'B96.5';
    if (lower.includes('mrsa')) return 'B95.62';
    if (lower.includes('staph')) return 'B95.8';
    if (lower.includes('strep')) return 'B95.5';
    return null; // No specific organism code
}

// Pressure ulcer mapping (L89.xxx codes)
function mapPressureUlcer(location: string, stage: string): string {
    let base = 'L89.';

    // Location mapping
    const lower = location.toLowerCase();
    if (lower.includes('sacral') || lower.includes('sacrum')) base += '15'; // Sacral
    else if (lower.includes('heel')) base += '6'; // Heel
    else if (lower.includes('buttock')) base += '3'; // Buttock
    else if (lower.includes('hip')) base += '2'; // Hip
    else if (lower.includes('ankle')) base += '5'; // Ankle
    else if (lower.includes('elbow')) base += '0'; // Elbow
    else base += '9'; // Other site

    // Stage mapping
    if (stage === 'stage1') return base + '1';
    else if (stage === 'stage2') return base + '2';
    else if (stage === 'stage3') return base + '3';
    else if (stage === 'stage4') return base + '4';
    else if (stage === 'unstageable') return base + '0';
    else if (stage === 'deep_tissue') return base + '6';
    else return base + '9'; // Unspecified
}

// Injury code mapping (S codes with 7th character)
function mapInjuryCode(type: string, bodyRegion: string, laterality?: string, encounterType?: string): string {
    let code = 'S00.00'; // Default unspecified
    const seventh = get7thCharacter(encounterType);

    // Simplified mapping - in production would need comprehensive body region mapping
    const lower = bodyRegion.toLowerCase();

    if (type === 'fracture') {
        if (lower.includes('femur')) {
            if (laterality === 'right') code = 'S72.301';
            else if (laterality === 'left') code = 'S72.302';
            else code = 'S72.309';
        } else if (lower.includes('tibia')) {
            if (laterality === 'right') code = 'S82.201';
            else if (laterality === 'left') code = 'S82.202';
            else code = 'S82.209';
        } else if (lower.includes('humerus')) {
            if (laterality === 'right') code = 'S42.301';
            else if (laterality === 'left') code = 'S42.302';
            else code = 'S42.309';
        } else {
            code = 'S02.0'; // Unspecified fracture
        }
    } else if (type === 'open_wound') {
        if (lower.includes('arm')) {
            if (laterality === 'right') code = 'S41.101';
            else if (laterality === 'left') code = 'S41.102';
            else code = 'S41.109';
        } else if (lower.includes('leg')) {
            if (laterality === 'right') code = 'S81.801';
            else if (laterality === 'left') code = 'S81.802';
            else code = 'S81.809';
        } else {
            code = 'S01.00'; // Unspecified open wound
        }
    } else if (type === 'burn') {
        code = 'T20.0'; // Burn unspecified
    }

    return code + seventh;
}

// External cause mapping (W/X/Y codes)
function mapExternalCause(mechanism: string, encounterType?: string): string {
    const seventh = get7thCharacter(encounterType);

    if (mechanism === 'fall') return 'W19.XXX' + seventh;
    else if (mechanism === 'mvc') return 'V89.2XX' + seventh;
    else if (mechanism === 'assault') return 'X99.9XX' + seventh;
    else if (mechanism === 'sports') return 'W00.0XX' + seventh;
    else return 'W00.0XX' + seventh; // Unspecified
}

// 7th character for encounter type
function get7thCharacter(encounterType?: string): string {
    if (encounterType === 'initial') return 'A';
    else if (encounterType === 'subsequent') return 'D';
    else if (encounterType === 'sequela') return 'S';
    else return 'A'; // Default to initial
}
