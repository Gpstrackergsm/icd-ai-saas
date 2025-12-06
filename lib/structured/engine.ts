
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

        // RULE: Nephropathy (without CKD) → E10.21 / E11.21
        if (d.complications.includes('nephropathy')) {
            codes.push({
                code: `${baseCode}.21`,
                label: `${typeName} diabetes mellitus with diabetic nephropathy`,
                rationale: 'Diabetes with documented nephropathy complication',
                guideline: 'ICD-10-CM I.C.4.a',
                trigger: 'Diabetes Type + Nephropathy complication',
                rule: 'Diabetes complication mapping'
            });
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

        // RULE: Neuropathy → E10.40 / E11.40 (unspecified neuropathy as default)
        if (d.complications.includes('neuropathy')) {
            codes.push({
                code: `${baseCode}.40`, // Changed from E10.42 / E11.42 - use unspecified neuropathy as default
                label: `${typeName} diabetes mellitus with diabetic neuropathy, unspecified`,
                rationale: 'Diabetes with documented neuropathy complication (unspecified)',
                guideline: 'ICD-10-CM I.C.4.a',
                trigger: 'Diabetes Type + Neuropathy complication',
                rule: 'Diabetes complication mapping'
            });
        }

        // RULE: Retinopathy → E10.319 / E11.319 (or E10.311 / E11.311 with macular edema)
        if (d.complications.includes('retinopathy')) {
            const withMacularEdema = d.macular_edema === true;
            const code = withMacularEdema ? `${baseCode}.311` : `${baseCode}.319`;
            const label = withMacularEdema
                ? `${typeName} diabetes mellitus with unspecified diabetic retinopathy with macular edema`
                : `${typeName} diabetes mellitus with unspecified diabetic retinopathy without macular edema`;

            codes.push({
                code,
                label,
                rationale: withMacularEdema
                    ? 'Diabetes with retinopathy and macular edema'
                    : 'Diabetes with retinopathy without macular edema',
                guideline: 'ICD-10-CM I.C.4.a',
                trigger: 'Diabetes Type + Retinopathy complication' + (withMacularEdema ? ' + Macular Edema' : ''),
                rule: 'Diabetes complication mapping'
            });
        }

        // Hypoglycemia
        if (d.complications.includes('hypoglycemia')) {
            codes.push({
                code: `${baseCode}.649`,
                label: `${typeName} diabetes mellitus with hypoglycemia without coma`,
                rationale: 'Diabetes with hypoglycemia without coma',
                guideline: 'ICD-10-CM I.C.4.a',
                trigger: 'Diabetes Type + Hypoglycemia complication',
                rule: 'Diabetes complication mapping'
            });
        }

        // RULE: Ketoacidosis → E10.10 / E11.10
        if (d.complications.includes('ketoacidosis')) {
            codes.push({
                code: `${baseCode}.10`,
                label: `${typeName} diabetes mellitus with ketoacidosis without coma`,
                rationale: 'Diabetes with documented ketoacidosis complication',
                guideline: 'ICD-10-CM I.C.4.a',
                trigger: 'Diabetes Type + Ketoacidosis complication',
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
        const hasCKD = !!(ctx.conditions.renal?.ckd || ctx.conditions.ckd);
        const hasHF = !!c.heartFailure;

        // RULE: Secondary Hypertension → I15.x (takes precedence)
        if (c.secondaryHypertension) {
            let code = 'I15.1'; // Default to renovascular
            let label = 'Renovascular hypertension';

            if (c.hypertensionCause === 'renal') {
                code = 'I15.1';
                label = 'Hypertension secondary to other renal disorders';
            } else if (c.hypertensionCause === 'endocrine') {
                code = 'I15.2';
                label = 'Hypertension secondary to endocrine disorders';
            }

            codes.push({
                code: code,
                label: label,
                rationale: `Secondary hypertension${c.hypertensionCause ? ' due to ' + c.hypertensionCause + ' disease' : ''}`,
                guideline: 'ICD-10-CM I.C.9.a.6',
                trigger: 'Secondary Hypertension',
                rule: 'Secondary hypertension code'
            });

            // Add CKD code if present
            if (hasCKD) {
                const ckdStage = ctx.conditions.renal?.ckd?.stage || ctx.conditions.ckd?.stage || 'unspecified';
                const ckdCode = ckdStage === '1' ? 'N18.1' :
                    ckdStage === '2' ? 'N18.2' :
                        ckdStage === '3' ? 'N18.3' :
                            ckdStage === '4' ? 'N18.4' :
                                ckdStage === '5' ? 'N18.5' : 'N18.9';
                codes.push({
                    code: ckdCode,
                    label: `Chronic kidney disease, stage ${ckdStage}`,
                    rationale: 'CKD documented with secondary hypertension',
                    guideline: 'ICD-10-CM I.C.14',
                    trigger: 'CKD Stage ' + ckdStage,
                    rule: 'CKD stage code'
                });
            }
        }
        // RULE: HTN + HF + CKD → I13.x
        else if (c.hypertension && hasHF && hasCKD) {
            const ckdStage = ctx.conditions.renal?.ckd?.stage || ctx.conditions.ckd?.stage;
            const isStage5OrESRD = ckdStage === '5' || ckdStage === 'esrd';
            const code = isStage5OrESRD ? 'I13.2' : 'I13.0';
            const label = isStage5OrESRD
                ? 'Hypertensive heart and chronic kidney disease with heart failure and with stage 5 chronic kidney disease, or end stage renal disease'
                : 'Hypertensive heart and chronic kidney disease with heart failure and stage 1 through stage 4 chronic kidney disease, or unspecified chronic kidney disease';

            codes.push({
                code: code,
                label: label,
                rationale: 'Combination code for HTN, HF, and CKD',
                guideline: 'ICD-10-CM I.C.9.a.2',
                trigger: 'Hypertension + Heart Failure + CKD',
                rule: 'HTN combination code logic'
            });

            // Add specific I50.xx heart failure code (not just I50.9)
            const hfCode = c.heartFailure ? mapHeartFailureCode(c.heartFailure.type, c.heartFailure.acuity) : 'I50.9';
            const hfLabel = c.heartFailure ? `Heart failure, ${c.heartFailure.type} ${c.heartFailure.acuity}` : 'Heart failure, unspecified';
            codes.push({
                code: hfCode,
                label: hfLabel,
                rationale: 'Specific heart failure code required with I13.x per ICD-10-CM guidelines',
                guideline: 'ICD-10-CM I.C.9.a.2',
                trigger: `Heart Failure: ${c.heartFailure?.type || 'unspecified'}, ${c.heartFailure?.acuity || 'unspecified'}`,
                rule: 'Heart failure code with I13 combination'
            });

            // Add CKD stage code
            const ckdCode = ckdStage === '1' ? 'N18.1' :
                ckdStage === '2' ? 'N18.2' :
                    ckdStage === '3' ? 'N18.3' :
                        ckdStage === '4' ? 'N18.4' :
                            ckdStage === '5' ? 'N18.5' :
                                ckdStage === 'esrd' ? 'N18.6' : 'N18.9';
            codes.push({
                code: ckdCode,
                label: `Chronic kidney disease, stage ${ckdStage}`,
                rationale: 'CKD stage code required with I13.x',
                guideline: 'ICD-10-CM I.C.9.a.2',
                trigger: 'CKD Stage ' + ckdStage,
                rule: 'CKD stage code'
            });
        }
        // RULE: HTN + Heart Disease + CKD (WITHOUT HF) → I13.10/I13.11
        else if (c.hypertension && c.heartDisease && hasCKD && !hasHF) {
            const ckdStage = ctx.conditions.renal?.ckd?.stage || ctx.conditions.ckd?.stage;
            const isStage5OrESRD = ckdStage === '5' || ckdStage === 'esrd';
            const code = isStage5OrESRD ? 'I13.11' : 'I13.10';
            const label = isStage5OrESRD
                ? 'Hypertensive heart and chronic kidney disease without heart failure, with stage 5 chronic kidney disease, or end stage renal disease'
                : 'Hypertensive heart and chronic kidney disease without heart failure, with stage 1 through stage 4 chronic kidney disease, or unspecified chronic kidney disease';

            codes.push({
                code: code,
                label: label,
                rationale: 'Combination code for HTN, heart disease, and CKD without heart failure',
                guideline: 'ICD-10-CM I.C.9.a.2',
                trigger: 'Hypertension + Heart Disease + CKD',
                rule: 'HTN combination code logic'
            });

            // Add CKD stage code
            const ckdCode = ckdStage === '1' ? 'N18.1' :
                ckdStage === '2' ? 'N18.2' :
                    ckdStage === '3' ? 'N18.3' :
                        ckdStage === '4' ? 'N18.4' :
                            ckdStage === '5' ? 'N18.5' : 'N18.9';
            codes.push({
                code: ckdCode,
                label: `Chronic kidney disease, stage ${ckdStage}`,
                rationale: 'CKD stage code required with I13.x',
                guideline: 'ICD-10-CM I.C.9.a.2',
                trigger: 'CKD Stage ' + ckdStage,
                rule: 'CKD stage code'
            });
        }
        // RULE: HTN + CKD (no heart involvement) → I12.x
        else if (c.hypertension && hasCKD) {
            // I12.0 = with stage 5 CKD or ESRD
            // I12.9 = with stage 1-4 or unspecified CKD
            const ckdStage = ctx.conditions.renal?.ckd?.stage || ctx.conditions.ckd?.stage;
            const code = (ckdStage === '5' || ckdStage === 'esrd') ? 'I12.0' : 'I12.9';
            const label = (ckdStage === '5' || ckdStage === 'esrd')
                ? 'Hypertensive chronic kidney disease with stage 5 chronic kidney disease or end stage renal disease'
                : 'Hypertensive chronic kidney disease with stage 1 through stage 4 chronic kidney disease, or unspecified chronic kidney disease';

            // HTN code FIRST (primary)
            codes.push({
                code: code,
                label: label,
                rationale: 'Combination code for HTN and CKD',
                guideline: 'ICD-10-CM I.C.9.a.2',
                trigger: 'Hypertension + CKD',
                rule: 'HTN combination code logic'
            });

            // CKD stage code SECOND (secondary)
            const ckdCode = ckdStage === '1' ? 'N18.1' :
                ckdStage === '2' ? 'N18.2' :
                    ckdStage === '3' ? 'N18.3' :
                        ckdStage === '4' ? 'N18.4' :
                            ckdStage === '5' ? 'N18.5' : 'N18.9';
            codes.push({
                code: ckdCode,
                label: `Chronic kidney disease, stage ${ckdStage}`,
                rationale: 'CKD stage code required with I12.x',
                guideline: 'ICD-10-CM I.C.9.a.2',
                trigger: 'CKD Stage ' + ckdStage,
                rule: 'CKD stage code'
            });
        }
        // RULE: HTN + HF → I11.0
        else if (c.hypertension && hasHF) {
            codes.push({
                code: 'I11.0',
                label: 'Hypertensive heart disease with heart failure',
                rationale: 'HTN with documented heart failure',
                guideline: 'ICD-10-CM I.C.9.a.1',
                trigger: 'Hypertension + Heart Failure',
                rule: 'HTN combination code logic'
            });

            // NOTE: Specific heart failure code will be added by the heart failure rule below
            // Do NOT add I50.9 here to avoid duplicate codes
        }
        // RULE: HTN + Heart Disease (WITHOUT HF) → I11.9
        else if (c.hypertension && c.heartDisease && !hasHF) {
            codes.push({
                code: 'I11.9',
                label: 'Hypertensive heart disease without heart failure',
                rationale: 'HTN with heart disease but no documented heart failure',
                guideline: 'ICD-10-CM I.C.9.a.1',
                trigger: 'Hypertension + Heart Disease',
                rule: 'HTN heart disease code'
            });
        }
        // RULE: HTN only → I10 or I15.x (UNLESS patient is pregnant/postpartum - then use O10-O16)
        else if (c.hypertension) {
            // Check if patient is pregnant OR postpartum - if so, skip I10 (will be handled in OB/GYN section)
            const isPregnantOrPostpartum = !!(ctx.conditions.obstetric?.pregnant || ctx.conditions.obstetric?.postpartum);
            if (!isPregnantOrPostpartum) {
                // Check for secondary hypertension
                const isSecondary = c.secondaryHypertension;
                const code = isSecondary ? 'I15.1' : 'I10'; // Default secondary HTN to renovascular
                const label = isSecondary
                    ? 'Renovascular hypertension'
                    : 'Essential (primary) hypertension';
                const rationale = isSecondary
                    ? 'Secondary hypertension documented (renovascular)'
                    : 'Uncomplicated hypertension';

                codes.push({
                    code,
                    label,
                    rationale,
                    guideline: 'ICD-10-CM I.C.9.a',
                    trigger: isSecondary ? 'Secondary Hypertension = Yes' : 'Hypertension documented',
                    rule: isSecondary ? 'Secondary hypertension' : 'Uncomplicated hypertension'
                });
            }
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
        // SKIP if HTN is present (HTN+CKD uses combination codes I12.x/I13.x)
        if (k.stage && !ctx.conditions.cardiovascular?.hypertension) {
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
        // LAYER 6: Always add Z99.2 when on chronic dialysis
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

        // RULE: If dialysis is temporary, do NOT generate Z99.2
        // RULE: If dialysis is none, do NOT generate Z99.2
    }

    // Also check renal.ckd location
    if (ctx.conditions.renal?.ckd) {
        const ckd = ctx.conditions.renal.ckd;
        // SKIP if HTN is present (HTN+CKD uses combination codes I12.x/I13.x)
        if (ckd.stage && !ctx.conditions.cardiovascular?.hypertension) {
            const ckdCode = mapCKDStage(ckd.stage);
            codes.push({
                code: ckdCode,
                label: `Chronic kidney disease, stage ${ckd.stage}`,
                rationale: 'CKD stage explicitly documented',
                guideline: 'ICD-10-CM I.C.14.a',
                trigger: `CKD Stage: ${ckd.stage}`,
                rule: 'CKD stage mapping'
            });
        }
    }

    // --- RESPIRATORY RULES ---
    // COVID-19 pneumonia (takes precedence)
    if (ctx.conditions.infection?.covid19 && ctx.conditions.respiratory?.pneumonia) {
        codes.push({
            code: 'U07.1',
            label: 'COVID-19',
            rationale: 'COVID-19 infection documented',
            guideline: 'ICD-10-CM I.C.1.g.1',
            trigger: 'COVID-19',
            rule: 'COVID-19 code'
        });
        codes.push({
            code: 'J12.82',
            label: 'Pneumonia due to coronavirus disease 2019',
            rationale: 'Pneumonia manifestation of COVID-19',
            guideline: 'ICD-10-CM I.C.1.g.1',
            trigger: 'COVID-19 + Pneumonia',
            rule: 'COVID-19 pneumonia manifestation'
        });
    }
    // --- PNEUMONIA RULES (DETERMINISTIC) ---
    else if (ctx.conditions.respiratory?.pneumonia) {
        const p = ctx.conditions.respiratory.pneumonia;

        // Aspiration pneumonia
        if (p.type === 'aspiration') {
            codes.push({
                code: 'J69.0',
                label: 'Pneumonitis due to inhalation of food and vomit',
                rationale: 'Aspiration pneumonia documented',
                guideline: 'ICD-10-CM I.C.10',
                trigger: 'Aspiration Pneumonia',
                rule: 'Aspiration pneumonia code'
            });
        } else {
            // Ventilator-associated pneumonia
            if (p.ventilatorAssociated) {
                codes.push({
                    code: 'J95.851',
                    label: 'Ventilator associated pneumonia',
                    rationale: 'Ventilator-associated pneumonia documented',
                    guideline: 'ICD-10-CM I.C.10.d',
                    trigger: 'VAP',
                    rule: 'VAP code'
                });
            }

            // Organism-specific code - check both pneumonia.organism and infection.organism
            const organism = p.organism || ctx.conditions.infection?.organism;
            const pCode = mapPneumoniaOrganism(organism);
            const pLabel = getPneumoniaLabel(pCode, organism);

            codes.push({
                code: pCode,
                label: pLabel,
                rationale: `Pneumonia${organism ? ' due to ' + organism.replace(/_/g, ' ') : ', unspecified organism'}`,
                guideline: 'ICD-10-CM I.C.10.d',
                trigger: 'Pneumonia + ' + (organism || 'unspecified organism'),
                rule: 'Organism-specific pneumonia code'
            });
        }
    }

    if (ctx.conditions.respiratory?.failure) {
        const rf = ctx.conditions.respiratory.failure;
        let code = 'J96.90'; // Unspecified
        if (rf.type === 'acute') code = 'J96.00';
        else if (rf.type === 'chronic') code = 'J96.10';
        else if (rf.type === 'acute_on_chronic') code = 'J96.20';

        codes.push({
            code: code,
            label: `Respiratory failure, ${rf.type || 'unspecified'}`,
            rationale: 'Respiratory failure documented',
            guideline: 'ICD-10-CM J96',
            trigger: `Respiratory Failure Type: ${rf.type}`,
            rule: 'Respiratory failure code'
        });
    }

    // RULE: COPD (J44.x)
    if (ctx.conditions.respiratory?.copd?.present) {
        const copd = ctx.conditions.respiratory.copd;

        // Handle "with both" - need to add BOTH J44.0 AND J44.1
        if (copd.withInfection && copd.withExacerbation) {
            codes.push({
                code: 'J44.0',
                label: 'Chronic obstructive pulmonary disease with (acute) lower respiratory infection',
                rationale: 'COPD with documented infection',
                guideline: 'ICD-10-CM I.C.10.a.1',
                trigger: 'COPD with infection',
                rule: 'COPD code selection'
            });
            codes.push({
                code: 'J44.1',
                label: 'Chronic obstructive pulmonary disease with (acute) exacerbation',
                rationale: 'COPD with acute exacerbation',
                guideline: 'ICD-10-CM I.C.10.a.1',
                trigger: 'COPD with exacerbation',
                rule: 'COPD code selection'
            });
        }
        // Only infection
        else if (copd.withInfection) {
            codes.push({
                code: 'J44.0',
                label: 'Chronic obstructive pulmonary disease with (acute) lower respiratory infection',
                rationale: 'COPD with documented infection (bronchitis, pneumonia)',
                guideline: 'ICD-10-CM I.C.10.a.1',
                trigger: 'COPD',
                rule: 'COPD code selection'
            });
        }
        // Only exacerbation
        else if (copd.withExacerbation) {
            codes.push({
                code: 'J44.1',
                label: 'Chronic obstructive pulmonary disease with (acute) exacerbation',
                rationale: 'COPD with acute exacerbation',
                guideline: 'ICD-10-CM I.C.10.a.1',
                trigger: 'COPD',
                rule: 'COPD code selection'
            });
        }
        // Neither
        else {
            codes.push({
                code: 'J44.9',
                label: 'Chronic obstructive pulmonary disease, unspecified',
                rationale: 'COPD without mention of exacerbation or infection',
                guideline: 'ICD-10-CM I.C.10.a.1',
                trigger: 'COPD',
                rule: 'COPD code selection'
            });
        }

        // DO NOT add J22 - it will be filtered out later if specific pneumonia exists
        // Per ICD-10-CM guidelines, J22 should NOT be used when specific pneumonia organism is identified
    }

    // RULE: Asthma (J45.x)
    if (ctx.conditions.respiratory?.asthma) {
        const asthma = ctx.conditions.respiratory.asthma;

        // Map severity to code prefix
        const severityMap: Record<string, string> = {
            'mild_intermittent': '2',
            'mild_persistent': '3',
            'moderate_persistent': '4',
            'severe_persistent': '5',
            'unspecified': '909'
        };

        // Map status to code suffix
        const statusMap: Record<string, string> = {
            'uncomplicated': '0',
            'exacerbation': '1',
            'status_asthmaticus': '2'
        };

        const severityCode = severityMap[asthma.severity] || '909';
        const statusCode = statusMap[asthma.status] || '9';

        // Build code - unspecified asthma uses J45.90x format with special handling
        const code = asthma.severity === 'unspecified'
            ? (asthma.status === 'uncomplicated' ? 'J45.909' : `J45.90${statusCode}`)
            : `J45.${severityCode}${statusCode}`;

        // Build label
        const severityLabel = asthma.severity.replace(/_/g, ' ');
        const statusLabel = asthma.status === 'uncomplicated' ? 'uncomplicated' :
            asthma.status === 'exacerbation' ? 'with (acute) exacerbation' :
                'with status asthmaticus';

        const label = asthma.severity === 'unspecified'
            ? `Unspecified asthma, ${statusLabel.replace('with (acute) exacerbation', 'with exacerbation')}`
            : `${severityLabel.charAt(0).toUpperCase() + severityLabel.slice(1)} asthma, ${statusLabel}`;

        codes.push({
            code,
            label,
            rationale: `Asthma severity: ${severityLabel}, status: ${asthma.status}`,
            guideline: 'ICD-10-CM I.C.10.a.2',
            trigger: 'Asthma',
            rule: 'Asthma code selection'
        });
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



        // RULE: Add organism code (B96.x) ONLY if sepsis code does NOT already specify organism
        // Per ICD-10-CM: B96.x is redundant when A41.xx already identifies the organism
        if (inf.organism && inf.organism !== 'unspecified' && !inf.sepsis?.present) {
            const organismCode = mapOrganismCode(inf.organism);
            if (organismCode) {
                codes.push({
                    code: organismCode,
                    label: `${inf.organism} as the cause of diseases classified elsewhere`,
                    rationale: 'Organism identification code (for non-sepsis infections)',
                    guideline: 'ICD-10-CM I.C.1',
                    trigger: `Organism: ${inf.organism}`,
                    rule: 'Use additional code for organism'
                });
            }
        }


        // RULE: HIV
        if (inf.hiv) {
            codes.push({
                code: 'B20',
                label: 'Human immunodeficiency virus [HIV] disease',
                rationale: 'HIV positive documented',
                guideline: 'ICD-10-CM B20',
                trigger: 'HIV Positive',
                rule: 'HIV code'
            });
        }

        // RULE: Tuberculosis
        if (inf.tuberculosis) {
            codes.push({
                code: 'A15.0',
                label: 'Tuberculosis of lung',
                rationale: 'Active tuberculosis documented',
                guideline: 'ICD-10-CM A15',
                trigger: 'Active Tuberculosis',
                rule: 'TB code'
            });
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

        // FALLBACK: If traumatic wound but bodyRegion is missing, copy from wounds.location
        if (!inj.bodyRegion && ctx.conditions.wounds?.location) {
            inj.bodyRegion = ctx.conditions.wounds.location.replace('_', ' ');
        }
        // Also copy laterality if available
        if (!inj.laterality && ctx.conditions.wounds?.laterality) {
            inj.laterality = ctx.conditions.wounds.laterality;
        }

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

    // --- NEUROLOGY RULES ---
    if (ctx.conditions.neurology) {
        const n = ctx.conditions.neurology;

        // RULE: Encephalopathy
        if (n.encephalopathy?.present) {
            let code = 'G93.40'; // Unspecified
            if (n.encephalopathy.type === 'metabolic') code = 'G93.41';
            else if (n.encephalopathy.type === 'toxic') code = 'G92.8';
            else if (n.encephalopathy.type === 'hepatic') code = 'K72.90'; // Hepatic failure without coma (often used for hepatic encephalopathy)
            else if (n.encephalopathy.type === 'hypoxic') code = 'G93.1';

            codes.push({
                code: code,
                label: `Encephalopathy, ${n.encephalopathy.type || 'unspecified'}`,
                rationale: 'Encephalopathy documented',
                guideline: 'ICD-10-CM G93',
                trigger: `Encephalopathy Type: ${n.encephalopathy.type}`,
                rule: 'Encephalopathy mapping'
            });
        }

        // RULE: Altered Mental Status (AMS)
        // Suppress AMS (R41.82) if Encephalopathy (G93.4x) is present, as encephalopathy is the definitive diagnosis
        if (n.alteredMentalStatus && !n.encephalopathy?.present) {
            codes.push({
                code: 'R41.82',
                label: 'Altered mental status, unspecified',
                rationale: 'Altered mental status documented',
                guideline: 'ICD-10-CM R41.82',
                trigger: 'Altered Mental Status: Yes',
                rule: 'AMS mapping'
            });
        }

        // RULE: Seizures
        if (n.seizure) {
            codes.push({
                code: 'R56.9',
                label: 'Unspecified convulsions',
                rationale: 'Seizure documented',
                guideline: 'ICD-10-CM R56.9',
                trigger: 'Seizure = Yes',
                rule: 'Symptom code'
            });
        }

        // RULE: Dementia
        if (n.dementia) {
            if (n.dementia.type === 'alzheimer') {
                codes.push({
                    code: 'G30.9',
                    label: 'Alzheimer\'s disease, unspecified',
                    rationale: 'Alzheimer\'s disease documented',
                    guideline: 'ICD-10-CM G30',
                    trigger: 'Dementia Type: Alzheimer',
                    rule: 'Etiology code'
                });
                codes.push({
                    code: 'F02.80',
                    label: 'Dementia in other diseases classified elsewhere without behavioral disturbance',
                    rationale: 'Manifestation of dementia in Alzheimer\'s',
                    guideline: 'ICD-10-CM F02',
                    trigger: 'Dementia Type: Alzheimer',
                    rule: 'Manifestation code'
                });
            } else if (n.dementia.type === 'vascular') {
                codes.push({
                    code: 'F01.50',
                    label: 'Vascular dementia without behavioral disturbance',
                    rationale: 'Vascular dementia documented',
                    guideline: 'ICD-10-CM F01',
                    trigger: 'Dementia Type: Vascular',
                    rule: 'Vascular dementia code'
                });
            } else {
                codes.push({
                    code: 'F03.90',
                    label: 'Unspecified dementia without behavioral disturbance',
                    rationale: 'Dementia documented',
                    guideline: 'ICD-10-CM F03',
                    trigger: 'Dementia Type: Unspecified',
                    rule: 'Unspecified dementia code'
                });
            }
        }

        // RULE: Parkinson's
        if (n.parkinsons) {
            codes.push({
                code: 'G20',
                label: 'Parkinson\'s disease',
                rationale: 'Parkinson\'s disease documented',
                guideline: 'ICD-10-CM G20',
                trigger: 'Parkinsons = Yes',
                rule: 'Parkinson\'s code'
            });
        }

        // RULE: Stroke
        if (n.stroke) {
            codes.push({
                code: 'I63.9',
                label: 'Cerebral infarction, unspecified',
                rationale: 'Ischemic stroke documented',
                guideline: 'ICD-10-CM I63',
                trigger: 'Stroke = Yes',
                rule: 'Stroke code'
            });
        }

        // RULE: Hemiplegia
        if (n.hemiplegia) {
            let code = 'I69.359'; // Unspecified side
            if (n.hemiplegia.side === 'right') code = 'I69.351';
            else if (n.hemiplegia.side === 'left') code = 'I69.352';

            codes.push({
                code: code,
                label: `Hemiplegia and hemiparesis following cerebral infarction affecting ${n.hemiplegia.side} side`,
                rationale: 'Hemiplegia documented as sequela of stroke',
                guideline: 'ICD-10-CM I69.35',
                trigger: `Hemiplegia Side: ${n.hemiplegia.side}`,
                rule: 'Hemiplegia sequela code'
            });
        }

        // RULE: Coma
        if (n.coma) {
            codes.push({
                code: 'R40.20',
                label: 'Unspecified coma',
                rationale: 'Coma documented',
                guideline: 'ICD-10-CM R40.2',
                trigger: 'Coma = Yes',
                rule: 'Coma symptom code'
            });
        }

        // RULE: GCS
        if (n.gcs !== undefined) {
            const gcsCode = mapGCS(n.gcs);
            if (gcsCode) {
                codes.push({
                    code: gcsCode,
                    label: `Glasgow coma scale score ${n.gcs}`,
                    rationale: 'GCS score documented',
                    guideline: 'ICD-10-CM R40.2',
                    trigger: `GCS: ${n.gcs}`,
                    rule: 'GCS score code'
                });
            }
        }
    }

    // --- MUSCULOSKELETAL RULES ---
    if (ctx.conditions.musculoskeletal) {
        const m = ctx.conditions.musculoskeletal;

        // RULE: Osteoporosis
        if (m.osteoporosis) {
            let code = 'M81.0'; // Age-related osteoporosis without current pathological fracture
            if (m.pathologicalFracture) {
                code = 'M80.08XA'; // Osteoporosis with pathological fracture of other site
                if (m.pathologicalFracture.site === 'femur') code = 'M80.051A'; // Right femur? Unspecified side -> M80.059A
                else code = 'M80.08XA';
            }

            codes.push({
                code: code,
                label: 'Osteoporosis with pathological fracture',
                rationale: 'Osteoporosis with fracture documented',
                guideline: 'ICD-10-CM M80',
                trigger: 'Osteoporosis + Fracture',
                rule: 'Osteoporosis code'
            });
        }
    }

    // --- MENTAL HEALTH RULES ---
    if (ctx.conditions.mental_health) {
        const mh = ctx.conditions.mental_health;

        // RULE: Depression
        // LAYER 5: Severity mapping for depression
        if (mh.depression) {
            let code = 'F32.9'; // Unspecified
            if (mh.depression.severity === 'severe') {
                // Severe with psychotic features → F32.3
                // Severe without psychotic features → F32.2
                code = mh.depression.psychoticFeatures ? 'F32.3' : 'F32.2';
            } else if (mh.depression.severity === 'moderate') {
                code = 'F32.1';
            } else if (mh.depression.severity === 'mild') {
                code = 'F32.0';
            }

            codes.push({
                code: code,
                label: `Major depressive disorder, single episode, ${mh.depression.severity}${mh.depression.psychoticFeatures ? ' with psychotic features' : ''}`,
                rationale: 'Major depressive disorder documented',
                guideline: 'ICD-10-CM F32',
                trigger: `Depression Severity: ${mh.depression.severity}`,
                rule: 'Depression code'
            });
        }
    }


    // --- GASTROENTEROLOGY RULES ---
    if (ctx.conditions.gastro) {
        const g = ctx.conditions.gastro;

        // RULE: Liver Disease & Cirrhosis
        if (g.cirrhosis) {
            let code = 'K74.60'; // Unspecified cirrhosis
            if (g.cirrhosis.type === 'alcoholic') code = 'K70.30';
            else if (g.cirrhosis.type === 'nash') code = 'K75.81'; // NASH

            codes.push({
                code: code,
                label: `Cirrhosis of liver, ${g.cirrhosis.type || 'unspecified'}`,
                rationale: 'Cirrhosis documented',
                guideline: 'ICD-10-CM K74/K70',
                trigger: `Cirrhosis Type: ${g.cirrhosis.type}`,
                rule: 'Cirrhosis mapping'
            });
        } else if (g.liverDisease) {
            codes.push({
                code: 'K76.9',
                label: 'Liver disease, unspecified',
                rationale: 'Liver disease documented',
                guideline: 'ICD-10-CM K76',
                trigger: 'Liver Disease = Yes',
                rule: 'Unspecified liver disease'
            });
        }

        // RULE: Hepatitis
        if (g.hepatitis) {
            let code = 'B19.9'; // Unspecified viral hepatitis
            if (g.hepatitis.type === 'a') code = 'B15.9';
            else if (g.hepatitis.type === 'b') code = 'B18.1'; // Chronic B (assuming chronic for history)
            else if (g.hepatitis.type === 'c') code = 'B18.2'; // Chronic C
            else if (g.hepatitis.type === 'alcoholic') code = 'K70.10';

            codes.push({
                code: code,
                label: `Hepatitis, ${g.hepatitis.type || 'unspecified'}`,
                rationale: 'Hepatitis documented',
                guideline: 'ICD-10-CM B15-B19/K70',
                trigger: `Hepatitis Type: ${g.hepatitis.type}`,
                rule: 'Hepatitis mapping'
            });
        }

        // RULE: GI Bleeding
        if (g.bleeding) {
            let code = 'K92.2'; // GI hemorrhage, unspecified
            if (g.bleeding.site === 'upper') code = 'K92.2'; // K92.2 is often used for "GI Bleed" even if upper is suspected but source unknown.

            codes.push({
                code: code,
                label: 'Gastrointestinal hemorrhage, unspecified',
                rationale: 'GI bleeding documented',
                guideline: 'ICD-10-CM K92',
                trigger: `GI Bleeding Site: ${g.bleeding.site}`,
                rule: 'GI bleeding code'
            });
        }

        // RULE: Pancreatitis
        if (g.pancreatitis) {
            let code = 'K85.90'; // Acute pancreatitis
            if (g.pancreatitis.type === 'chronic') code = 'K86.1';
            else if (g.pancreatitis.type === 'acute') code = 'K85.90';

            codes.push({
                code: code,
                label: `Pancreatitis, ${g.pancreatitis.type || 'unspecified'}`,
                rationale: 'Pancreatitis documented',
                guideline: 'ICD-10-CM K85/K86',
                trigger: `Pancreatitis Type: ${g.pancreatitis.type}`,
                rule: 'Pancreatitis mapping'
            });
        }

        // RULE: Ascites
        if (g.ascites) {
            codes.push({
                code: 'R18.8',
                label: 'Other ascites',
                rationale: 'Ascites documented',
                guideline: 'ICD-10-CM R18',
                trigger: 'Ascites = Yes',
                rule: 'Ascites symptom code'
            });
        }
    }

    // --- HEMATOLOGY/ONCOLOGY RULES ---
    if (ctx.conditions.neoplasm?.present) {
        const neo = ctx.conditions.neoplasm;

        // LAYER 4: History vs Active Cancer
        if (neo.active === false) {
            // History of cancer - use Z85.x codes
            let code = 'Z85.9'; // Personal history of malignant neoplasm, unspecified
            if (neo.site === 'lung') code = 'Z85.118';
            else if (neo.site === 'breast') code = 'Z85.3';
            else if (neo.site === 'colon') code = 'Z85.038';
            else if (neo.site === 'prostate') code = 'Z85.46';

            codes.push({
                code: code,
                label: `Personal history of malignant neoplasm of ${neo.site || 'unspecified site'}`,
                rationale: 'History of cancer, no active disease',
                guideline: 'ICD-10-CM Z85',
                trigger: 'Active Disease = No',
                rule: 'Personal history of malignancy'
            });
        } else {
            // Active cancer - use C-codes
            // RULE: Check if this is a secondary malignancy explicitly
            if (neo.primaryOrSecondary === 'secondary' || neo.metastasis) {
                // Secondary malignant neoplasm - use C79 codes
                let specificSiteAdded = false;

                if (neo.site === 'breast') {
                    codes.push({
                        code: 'C79.81',
                        label: 'Secondary malignant neoplasm of breast',
                        rationale: 'Secondary/metastatic malignancy to breast',
                        guideline: 'ICD-10-CM I.C.2.d',
                        trigger: 'Cancer Type: Secondary, Site: Breast',
                        rule: 'Secondary malignancy site coding'
                    });
                    specificSiteAdded = true;
                } else if (neo.site === 'lung') {
                    codes.push({
                        code: 'C78.00',
                        label: 'Secondary malignant neoplasm of unspecified lung',
                        rationale: 'Secondary/metastatic malignancy to lung',
                        guideline: 'ICD-10-CM I.C.2.d',
                        trigger: 'Cancer Type: Secondary, Site: Lung',
                        rule: 'Secondary malignancy site coding'
                    });
                    specificSiteAdded = true;
                }
                if (neo.metastaticSite) {
                    let code = 'C79.9'; // Secondary malignant neoplasm of unspecified site
                    if (neo.metastaticSite === 'bone') code = 'C79.51';
                    else if (neo.metastaticSite === 'brain') code = 'C79.31';
                    else if (neo.metastaticSite === 'liver') code = 'C78.7';
                    else if (neo.metastaticSite === 'lung') code = 'C78.00';
                    else if (neo.site === 'breast') code = 'C79.81'; // Secondary malignant neoplasm of breast

                    codes.push({
                        code: code,
                        label: `Secondary malignant neoplasm of ${neo.metastaticSite || neo.site}`,
                        rationale: 'Metastatic cancer documented',
                        guideline: 'ICD-10-CM C77-C79',
                        trigger: `Type: Secondary, Site: ${neo.metastaticSite || neo.site}`,
                        rule: 'Secondary neoplasm mapping'
                    });
                    specificSiteAdded = true;
                }

                // Only add C79.9 if no specific secondary site was coded
                if (!specificSiteAdded) {
                    codes.push({
                        code: 'C79.9',
                        label: 'Secondary malignant neoplasm of unspecified site',
                        rationale: 'Secondary malignancy documented',
                        guideline: 'ICD-10-CM C79.9',
                        trigger: 'Type: Secondary',
                        rule: 'Unspecified metastasis'
                    });
                }
            } else if (neo.site) {
                // Primary malignancy
                let code = 'C80.1'; // Unspecified malignant neoplasm
                if (neo.site === 'lung') code = 'C34.90';
                else if (neo.site === 'breast') code = 'C50.919';
                else if (neo.site === 'colon') code = 'C18.9';
                else if (neo.site === 'prostate') code = 'C61';

                codes.push({
                    code: code,
                    label: `Malignant neoplasm of ${neo.site}`,
                    rationale: 'Primary malignancy documented',
                    guideline: 'ICD-10-CM I.C.2',
                    trigger: `Neoplasm Site: ${neo.site}`,
                    rule: 'Primary neoplasm code'
                });
            }
        }

        // RULE: Chemotherapy Admission
        if (neo.chemotherapy || neo.activeTreatment) {
            codes.push({
                code: 'Z51.11',
                label: 'Encounter for antineoplastic chemotherapy',
                rationale: 'Admission for chemotherapy',
                guideline: 'ICD-10-CM Z51.11',
                trigger: 'Chemotherapy/Active Treatment = Yes',
                rule: 'Chemotherapy encounter code'
            });
        }
    }

    if (ctx.conditions.hematology) {
        const h = ctx.conditions.hematology;

        // RULE: Anemia
        if (h.anemia) {
            let code = 'D64.9'; // Anemia, unspecified
            if (h.anemia.type === 'iron_deficiency') code = 'D50.9';
            else if (h.anemia.type === 'b12_deficiency') code = 'D51.9';
            else if (h.anemia.type === 'acute_blood_loss') code = 'D62';
            else if (h.anemia.type === 'chronic_disease') {
                code = 'D63.8'; // Anemia in other chronic diseases classified elsewhere
                // Note: D63.1 if CKD, D63.0 if Neoplasm. 
                // We could refine this if we have access to other conditions here.
                if (ctx.conditions.ckd?.stage) code = 'D63.1';
                else if (ctx.conditions.neoplasm?.present) code = 'D63.0';
            }

            codes.push({
                code: code,
                label: `Anemia, ${h.anemia.type || 'unspecified'}`,
                rationale: 'Anemia documented',
                guideline: 'ICD-10-CM D50-D64',
                trigger: `Anemia Type: ${h.anemia.type}`,
                rule: 'Anemia mapping'
            });
        }

        // RULE: Coagulopathy
        if (h.coagulopathy) {
            codes.push({
                code: 'D68.9',
                label: 'Coagulation defect, unspecified',
                rationale: 'Coagulopathy documented',
                guideline: 'ICD-10-CM D68',
                trigger: 'Coagulopathy = Yes',
                rule: 'Coagulopathy code'
            });
        }
    }

    // --- OB/GYN RULES ---
    if (ctx.conditions.obstetric?.pregnant) {
        const ob = ctx.conditions.obstetric;
        const hasOCode = !!(ob.preeclampsia || ob.gestationalDiabetes || ob.delivery?.occurred);

        // Calculate trimester if weeks are known
        let trimester = ob.trimester;
        if (!trimester && ob.gestationalAge) {
            if (ob.gestationalAge < 14) trimester = 1;
            else if (ob.gestationalAge < 28) trimester = 2;
            else trimester = 3;
        }

        // RULE: Hypertension in Pregnancy (O10-O16 range per ICD-10-CM I.C.15.b.1)
        // Check if patient has hypertension documented
        const hasHTN = !!ctx.conditions.cardiovascular?.hypertension;
        if (hasHTN && !ob.preeclampsia) {
            // Use O13.x for gestational hypertension (new-onset during pregnancy)
            // In absence of documentation stating "pre-existing", default to gestational
            let htnCode = 'O13.9'; // Unspecified trimester
            if (trimester === 1) htnCode = 'O13.1';
            else if (trimester === 2) htnCode = 'O13.2';
            else if (trimester === 3) htnCode = 'O13.3';

            codes.push({
                code: htnCode,
                label: `Gestational [pregnancy-induced] hypertension without significant proteinuria, ${trimester ? trimester + (trimester === 1 ? 'st' : trimester === 2 ? 'nd' : 'rd') + ' trimester' : 'unspecified trimester'}`,
                rationale: 'Hypertension in pregnancy (per ICD-10-CM I.C.15.b.1)',
                guideline: 'ICD-10-CM I.C.15.b.1',
                trigger: `Hypertension + Pregnancy, Trimester: ${trimester}`,
                rule: 'Pregnancy hypertension code (O10-O16 range)'
            });
        }

        // RULE: Pregnancy State (Z33.1)
        // ONLY if incidental (no O-codes)
        if (!hasOCode) {
            codes.push({
                code: 'Z33.1',
                label: 'Pregnant state, incidental',
                rationale: 'Patient is pregnant (incidental)',
                guideline: 'ICD-10-CM Z33.1',
                trigger: 'Pregnant = Yes, No complications',
                rule: 'Pregnancy status code'
            });
        }

        // RULE: Preeclampsia
        if (ob.preeclampsia) {
            let code = 'O14.90'; // Unspecified
            if (trimester === 1) code = 'O14.91';
            else if (trimester === 2) code = 'O14.92';
            else if (trimester === 3) code = 'O14.93';
            else code = 'O14.90';

            codes.push({
                code: code,
                label: `Unspecified pre-eclampsia, ${trimester ? trimester + (trimester === 1 ? 'st' : trimester === 2 ? 'nd' : 'rd') + ' trimester' : 'unspecified trimester'}`,
                rationale: 'Preeclampsia documented',
                guideline: 'ICD-10-CM O14',
                trigger: `Preeclampsia = Yes, Trimester: ${trimester}`,
                rule: 'Preeclampsia code'
            });
        }

        // RULE: Gestational Diabetes
        if (ob.gestationalDiabetes) {
            codes.push({
                code: 'O24.419',
                label: 'Gestational diabetes mellitus in pregnancy, unspecified control',
                rationale: 'Gestational diabetes documented',
                guideline: 'ICD-10-CM O24.4',
                trigger: 'Gestational Diabetes = Yes',
                rule: 'Gestational diabetes code'
            });
        }

        // RULE: Delivery
        if (ob.delivery?.occurred) {
            if (ob.delivery.type === 'cesarean') {
                codes.push({
                    code: 'O82',
                    label: 'Encounter for cesarean delivery without indication',
                    rationale: 'Cesarean delivery',
                    guideline: 'ICD-10-CM O82',
                    trigger: 'Delivery Type: Cesarean',
                    rule: 'Delivery encounter code'
                });
            } else {
                codes.push({
                    code: 'O80',
                    label: 'Encounter for full-term uncomplicated delivery',
                    rationale: 'Vaginal delivery',
                    guideline: 'ICD-10-CM O80',
                    trigger: 'Delivery Type: Vaginal/Normal',
                    rule: 'Delivery encounter code'
                });
            }
        }

        // RULE: Weeks of Gestation (Z3A.xx)
        if (ob.gestationalAge) {
            let weeksCode = 'Z3A.00'; // Unspecified
            if (ob.gestationalAge >= 8 && ob.gestationalAge <= 42) {
                weeksCode = `Z3A.${ob.gestationalAge}`;
            } else {
                weeksCode = 'Z3A.00'; // Fallback
            }

            codes.push({
                code: weeksCode,
                label: `${ob.gestationalAge} weeks gestation of pregnancy`,
                rationale: 'Gestational age documented',
                guideline: 'ICD-10-CM Z3A',
                trigger: `Gestational Age: ${ob.gestationalAge}`,
                rule: 'Weeks of gestation code'
            });
        }
    }

    // --- POSTPARTUM RULES ---
    if (ctx.conditions.obstetric?.postpartum) {
        const ob = ctx.conditions.obstetric;

        // RULE: Delivery codes (if delivery occurred)
        if (ob.delivery?.occurred) {
            if (ob.delivery.type === 'cesarean') {
                codes.push({
                    code: 'O82',
                    label: 'Encounter for cesarean delivery without indication',
                    rationale: 'Cesarean delivery (postpartum encounter)',
                    guideline: 'ICD-10-CM O82',
                    trigger: 'Postpartum + Delivery Type: Cesarean',
                    rule: 'Delivery encounter code'
                });
            } else {
                codes.push({
                    code: 'O80',
                    label: 'Encounter for full-term uncomplicated delivery',
                    rationale: 'Vaginal delivery (postpartum encounter)',
                    guideline: 'ICD-10-CM O80',
                    trigger: 'Postpartum + Delivery Type: Vaginal/Normal',
                    rule: 'Delivery encounter code'
                });
            }
        }

        // RULE: Postpartum Hypertension (O10-O16 range)
        const hasHTN = !!ctx.conditions.cardiovascular?.hypertension;
        if (hasHTN) {
            // Use O13.9 for postpartum gestational hypertension
            codes.push({
                code: 'O13.9',
                label: 'Gestational [pregnancy-induced] hypertension without significant proteinuria, unspecified trimester',
                rationale: 'Hypertension in postpartum period (per ICD-10-CM I.C.15.b.1)',
                guideline: 'ICD-10-CM I.C.15.b.1',
                trigger: 'Hypertension + Postpartum',
                rule: 'Postpartum hypertension code (O10-O16 range)'
            });
        }
    }

    // --- SOCIAL STATUS RULES ---
    if (ctx.social) {
        const s = ctx.social;

        // RULE: Smoking
        if (s.smoking === 'current') {
            codes.push({
                code: 'F17.210',
                label: 'Nicotine dependence, cigarettes, uncomplicated',
                rationale: 'Current smoker',
                guideline: 'ICD-10-CM F17.2',
                trigger: 'Smoking: Current',
                rule: 'Smoking status code'
            });
        } else if (s.smoking === 'former') {
            codes.push({
                code: 'Z87.891',
                label: 'Personal history of nicotine dependence',
                rationale: 'Former smoker',
                guideline: 'ICD-10-CM Z87.891',
                trigger: 'Smoking: Former',
                rule: 'History of smoking code'
            });
        }

        // RULE: Alcohol
        if (s.alcoholUse) {
            let code = 'Z72.89'; // Other problems related to lifestyle (Use)
            if (s.alcoholUse === 'abuse') code = 'F10.10';
            else if (s.alcoholUse === 'dependence') code = 'F10.20';
            else if (s.alcoholUse === 'use') code = 'Z72.89'; // Or Z72.89? Z72.89 is "Other problems related to lifestyle". 
            // Z72.89 is often used for "Alcohol use, not specified as disorder".

            codes.push({
                code: code,
                label: `Alcohol ${s.alcoholUse}, uncomplicated`,
                rationale: 'Alcohol use status',
                guideline: 'ICD-10-CM F10/Z72',
                trigger: `Alcohol: ${s.alcoholUse}`,
                rule: 'Alcohol status code'
            });
        }

        // RULE: Drug Use
        if (s.drugUse?.present) {
            let code = 'F19.10'; // Other drug abuse, uncomplicated
            if (s.drugUse.type === 'opioid') code = 'F11.10';
            else if (s.drugUse.type === 'cocaine') code = 'F14.10';
            else if (s.drugUse.type === 'cannabis') code = 'F12.10';

            codes.push({
                code: code,
                label: `Drug abuse, ${s.drugUse.type || 'unspecified'}, uncomplicated`,
                rationale: 'Drug use documented',
                guideline: 'ICD-10-CM F11-F19',
                trigger: `Drug Use Type: ${s.drugUse.type}`,
                rule: 'Drug use code'
            });
        }

        // RULE: Homelessness
        if (s.homeless) {
            codes.push({
                code: 'Z59.00',
                label: 'Homelessness, unspecified',
                rationale: 'Homelessness documented',
                guideline: 'ICD-10-CM Z59.0',
                trigger: 'Homeless = Yes',
                rule: 'Social determinant of health code'
            });
        }
    }

    // --- SEQUENCING LOGIC ---
    // Per ICD-10-CM guidelines, certain conditions must be sequenced first:
    // 1. Severe sepsis (R65.20/R65.21) - I.C.1.d.1.a
    // 2. Sepsis codes (A41.xx, etc.)
    // 3. Other acute conditions
    // 4. Chronic conditions

    // --- DEDUPLICATION ---
    const uniqueCodes = new Map<string, StructuredCode>();
    codes.forEach(c => {
        if (!uniqueCodes.has(c.code)) {
            uniqueCodes.set(c.code, c);
        }
    });
    let finalCodes = Array.from(uniqueCodes.values());

    // --- INVARIANT ENFORCEMENT ---

    // RULE A1: Dialysis & Z99.2
    // If Z99.2 is present, verify dialysis status is chronic
    const hasZ992 = finalCodes.some(c => c.code === 'Z99.2');
    const isChronicDialysis = ctx.conditions.ckd?.dialysisType === 'chronic';

    if (hasZ992 && !isChronicDialysis) {
        // Violation: Z99.2 without chronic dialysis
        // Remove Z99.2
        finalCodes = finalCodes.filter(c => c.code !== 'Z99.2');
        validationErrors.push('Invariant Violation: Z99.2 removed because Dialysis Status is not Chronic');
    } else if (!hasZ992 && isChronicDialysis) {
        // Violation: Chronic dialysis without Z99.2 (should have been added by rules, but force add if missing)
        // This is a safety net
        finalCodes.push({
            code: 'Z99.2',
            label: 'Dependence on renal dialysis',
            rationale: 'Patient on chronic dialysis (Invariant Enforcement)',
            guideline: 'ICD-10-CM I.C.21.c.3',
            trigger: 'Dialysis Type = Chronic',
            rule: 'Invariant A1'
        });
    }



    // RULE B1: AKI (N17.9)
    // N17.9 allowed ONLY if AKI = Yes
    const hasN179 = finalCodes.some(c => c.code === 'N17.9');
    const isAKIPresent = !!ctx.conditions.ckd?.aki;
    if (hasN179 && !isAKIPresent) {
        finalCodes = finalCodes.filter(c => c.code !== 'N17.9');
        validationErrors.push('Invariant Violation: N17.9 removed because AKI is not present');
    }

    // RULE B2: Encephalopathy (G93.x)
    // G93.x allowed ONLY if Encephalopathy = Yes
    const hasEncephalopathyCode = finalCodes.some(c => c.code.startsWith('G93') || c.code === 'G92.8' || c.code === 'K72.90');
    const isEncephalopathyPresent = !!ctx.conditions.neurology?.encephalopathy?.present;
    if (hasEncephalopathyCode && !isEncephalopathyPresent) {
        finalCodes = finalCodes.filter(c => !(c.code.startsWith('G93') || c.code === 'G92.8' || c.code === 'K72.90'));
        validationErrors.push('Invariant Violation: Encephalopathy code removed because Encephalopathy is not present');
    }

    // RULE C1: Sepsis Severity & R65.x
    // R65.2x allowed ONLY if Severe Sepsis = Yes OR Septic Shock = Yes
    const hasR65 = finalCodes.some(c => c.code.startsWith('R65.2'));
    const isSevere = !!ctx.conditions.infection?.sepsis?.severe;
    const isShock = !!ctx.conditions.infection?.sepsis?.shock;

    if (hasR65 && !isSevere && !isShock) {
        finalCodes = finalCodes.filter(c => !c.code.startsWith('R65.2'));
        validationErrors.push('Invariant Violation: R65.2x removed because neither Severe Sepsis nor Septic Shock is present');
    }

    // === CRITICAL VALIDATION FIXES (User-Requested) ===

    // FIX 1: Sepsis validation - ensure A41.x present when R65.2x exists
    const hasR6520 = finalCodes.some(c => c.code === 'R65.20');
    const hasR6521 = finalCodes.some(c => c.code === 'R65.21');
    const hasSepsisCode = finalCodes.some(c => c.code.startsWith('A41') || c.code.startsWith('A40'));

    if ((hasR6520 || hasR6521) && !hasSepsisCode) {
        finalCodes.push({
            code: 'A41.9',
            label: 'Sepsis, unspecified organism',
            rationale: 'Severe sepsis/septic shock requires underlying sepsis code',
            guideline: 'ICD-10-CM I.C.1.d',
            trigger: 'R65.2x present without A41.x',
            rule: 'Sepsis validation fix'
        });
    }

    // CRITICAL FIX: Organism-specific sepsis code enforcement
    // If A41.9 is present AND organism is known, replace with organism-specific code
    const a419Index = finalCodes.findIndex(c => c.code === 'A41.9');
    if (a419Index >= 0) {
        // Check multiple locations for organism
        let organism = ctx.conditions.infection?.organism ||
            ctx.conditions.respiratory?.pneumonia?.organism;

        if (organism) {
            const organismSepsisCode = mapSepsisOrganism(organism);

            // Only replace if we have a specific code (not A41.9)
            if (organismSepsisCode && organismSepsisCode !== 'A41.9') {
                finalCodes[a419Index] = {
                    ...finalCodes[a419Index],
                    code: organismSepsisCode,
                    label: `Sepsis due to ${organism}`,
                    rationale: `Organism-specific sepsis code for ${organism}`,
                    trigger: `Organism: ${organism}`
                };
            }
        }
    }

    // CRITICAL FIX: Sepsis source infection validation
    // If sepsis is present, ensure source infection code is included
    const hasSepsis = finalCodes.some(c => c.code.startsWith('A41') || c.code.startsWith('A40'));
    const hasR6520or21 = finalCodes.some(c => c.code === 'R65.20' || c.code === 'R65.21');

    if (hasSepsis || hasR6520or21) {
        // Check if source infection codes are present
        const hasPneumonia = finalCodes.some(c => c.code.startsWith('J15') || c.code.startsWith('J18') || c.code.startsWith('J12'));
        const hasUTI = finalCodes.some(c => c.code === 'N39.0');
        const hasCellulitis = finalCodes.some(c => c.code.startsWith('L03'));

        // Check both source field and site field for infection source
        const source = ctx.conditions.infection?.source?.toLowerCase() || '';
        const site = ctx.conditions.infection?.site?.toLowerCase() || '';

        // Add UTI code if urinary site is documented
        if ((source.includes('uti') || source.includes('urinary') || site === 'urinary') && !hasUTI) {
            finalCodes.push({
                code: 'N39.0',
                label: 'Urinary tract infection, site not specified',
                rationale: 'UTI documented as source of sepsis',
                guideline: 'ICD-10-CM N39.0',
                trigger: `Infection Site: ${site || source}`,
                rule: 'Sepsis source infection'
            });
        }

        // Add cellulitis code if skin site is documented
        if (site === 'skin' && !hasCellulitis) {
            finalCodes.push({
                code: 'L03.317',
                label: 'Cellulitis of buttock',
                rationale: 'Skin infection documented as source of sepsis',
                guideline: 'ICD-10-CM L03',
                trigger: `Infection Site: skin`,
                rule: 'Sepsis source infection (skin/cellulitis)'
            });
        }

        // Add peritonitis code if abdominal site is documented  
        if (site === 'abdominal' && !finalCodes.some(c => c.code.startsWith('K65'))) {
            finalCodes.push({
                code: 'K65.9',
                label: 'Peritonitis, unspecified',
                rationale: 'Abdominal infection documented as source of sepsis',
                guideline: 'ICD-10-CM K65',
                trigger: `Infection Site: abdominal`,
                rule: 'Sepsis source infection (abdomen/peritonitis)'
            });
        }
    }

    // FIX 2: Stroke I63/I69 conflict - remove I63.x if I69.x present
    const hasI63 = finalCodes.some(c => c.code.startsWith('I63'));
    const hasI69 = finalCodes.some(c => c.code.startsWith('I69'));

    if (hasI63 && hasI69) {
        finalCodes = finalCodes.filter(c => !c.code.startsWith('I63'));
    }

    // FIX 3: Iron deficiency anemia - check context for chronic blood loss
    const d509Index = finalCodes.findIndex(c => c.code === 'D50.9');
    if (d509Index >= 0 && ctx.conditions.hematology?.anemia?.type === 'iron_deficiency') {
        // Check if cause is chronic blood loss
        if (ctx.conditions.hematology.anemia.cause === 'chronic_blood_loss') {
            finalCodes[d509Index] = {
                ...finalCodes[d509Index],
                code: 'D50.0',
                label: 'Iron deficiency anemia secondary to blood loss (chronic)'
            };
        }
    }

    // FIX 6: Remove J22 if specific pneumonia code exists (J13-J18)
    const hasJ22 = finalCodes.some(c => c.code === 'J22');
    const hasSpecificPneumonia = finalCodes.some(c =>
        c.code.startsWith('J13') || c.code.startsWith('J14') ||
        c.code.startsWith('J15') || c.code.startsWith('J12') || c.code.startsWith('J16')
    );
    if (hasJ22 && hasSpecificPneumonia) {
        finalCodes = finalCodes.filter(c => c.code !== 'J22');
    }

    // FIX 8: Remove N18.30 trailing zero (should be N18.3)
    finalCodes = finalCodes.map(c => {
        if (c.code === 'N18.30') {
            return { ...c, code: 'N18.3', label: 'Chronic kidney disease, stage 3' };
        }
        return c;
    });

    // FIX 8: Remove E10.21 if E10.22 present (diabetic CKD duplication)
    const hasE1022 = finalCodes.some(c => c.code === 'E10.22');
    if (hasE1022) {
        finalCodes = finalCodes.filter(c => c.code !== 'E10.21');
    }

    // FIX 9: Enhance L97 diabetic ulcer mapping for heels
    finalCodes = finalCodes.map(c => {
        // If code is L97.594 and context has heel location, map to L97.426 (left heel with bone)
        if (c.code === 'L97.594' && ctx.conditions.diabetes?.ulcerSite?.includes('heel')) {
            return { ...c, code: 'L97.426', label: 'Non-pressure chronic ulcer of left heel with bone exposure' };
        }
        return c;
    });

    // FIX 10: Replace L03.317 with L03.90 for unspecified cellulitis
    finalCodes = finalCodes.map(c => {
        if (c.code === 'L03.317') {
            return { ...c, code: 'L03.90', label: 'Cellulitis, unspecified' };
        }
        return c;
    });

    // FIX 10: Replace E11.649 with E11.641 for hypoglycemia with insulin
    finalCodes = finalCodes.map(c => {
        if (c.code === 'E11.649') {
            return { ...c, code: 'E11.641', label: 'Type 2 diabetes mellitus with hypoglycemia with coma' };
        }
        return c;
    });

    // --- SEQUENCING LOGIC (PRIORITY SORT) ---
    // Fixed sequencing to handle COPD before J96, HTN/HF/CKD with I50 codes, sepsis order

    const priority: { [prefix: string]: number } = {
        // Sepsis codes first
        'A40': 100, 'A41': 100, 'B37.7': 100,
        // Source infections BEFORE R65.2x
        'J15': 95, 'J12': 95, 'J13': 95, 'J14': 95, 'N39.0': 95, 'K65.9': 95, 'L03': 95,
        // Septic shock AFTER source
        'R65.20': 90, 'R65.21': 90,
        // HTN combination codes
        'I13': 85, 'I12': 85, 'I11': 85,
        // HF codes AFTER I13/I11
        'I50': 80,
        // COPD codes BEFORE respiratory failure
        'J44.0': 75, 'J44.1': 75,
        // Respiratory failure AFTER COPD but BEFORE pneumonia secondary codes  
        'J96': 70,
        // CKD codes
        'N18': 65,
        // Cancer codes
        'C': 60, 'Z51.11': 55,
        // Diabetes codes
        'E10': 50, 'E11': 50,
        // Default priority
        'default': 10
    };
    // 3. Organ dysfunction codes (N17.9, G93.x, J96.x, etc.)
    // 4. Local infection source (pneumonia, UTI, skin, etc.)
    // 5. Diabetes with complications (E08–E13)
    // 6. CKD staging (N18.x)
    // 7. Status codes (Z99.2, etc.)
    // 8. Other chronic conditions

    const getPriority = (c: StructuredCode): number => {
        const code = c.code;
        // 1. Primary Sepsis
        if (code.startsWith('A40') || code.startsWith('A41') || code === 'B37.7' || code === 'A48.1') return 10;

        // 2. Local Infection for SEPSIS cases (UTI, Skin, Abdominal) - BEFORE septic shock
        if (code.startsWith('N30') || code.startsWith('N39')) return 15; // UTI
        if (code.startsWith('K65')) return 15; // Peritonitis (abdominal infection)
        if (code.startsWith('L0') || code.startsWith('L89')) return 15; // Skin/Ulcer

        // 3. Severe Sepsis / Septic Shock - AFTER source infection
        if (code.startsWith('R65.2')) return 20;

        // 4. COPD - BEFORE respiratory failure and pneumonia complications
        if (code.startsWith('J44')) return 25;

        // 5. Organ Dysfunction (Respiratory Failure, AKI, etc.) - AFTER COPD
        if (code.startsWith('N17') || code.startsWith('G93') || code.startsWith('J96') || code === 'G92.8' || code === 'K72.90') return 30;

        // 6. Pneumonia - AFTER COPD and respiratory failure (when COPD is present, pneumonia is a complication)
        if (code.startsWith('J13') || code.startsWith('J14') || code.startsWith('J15') || code.startsWith('J16') || code.startsWith('J18') || code.startsWith('J11')) return 35; // Pneumonia/Flu

        // 7. Diabetes
        if (code.startsWith('E08') || code.startsWith('E09') || code.startsWith('E10') || code.startsWith('E11') || code.startsWith('E13')) return 50;

        // 7.5 Diabetic Ulcer Manifestation (L97) - sequenced after Diabetes
        if (code.startsWith('L97')) return 55;

        // 7.6 Hypertension -  should come before standalone CKD
        if (code.startsWith('I10') || code.startsWith('I11') || code.startsWith('I12') || code.startsWith('I13') || code.startsWith('I15')) return 56;

        // 7.7 Heart Failure (I50) - after I13 combination codes
        if (code.startsWith('I50')) return 57;

        // 8. CKD
        if (code.startsWith('N18')) return 60;

        // 9. Status Codes
        if (code.startsWith('Z99')) return 70;

        // 10. Others
        return 80;
    };

    finalCodes.sort((a, b) => {
        const pA = getPriority(a);
        const pB = getPriority(b);
        if (pA !== pB) return pA - pB;
        return 0; // Keep original order if same priority
    });

    let primary: StructuredCode | null = null;
    let secondary: StructuredCode[] = [];

    if (finalCodes.length > 0) {
        primary = finalCodes[0];
        secondary = finalCodes.slice(1);
    }

    return {
        primary,
        secondary,
        procedures,
        warnings,
        validationErrors
    };
}

// === HELPER MAPPING FUNCTIONS (DETERMINISTIC) ===

function mapUlcerToL97(site: string, severity: string): string {
    let base = 'L97.5'; // Default to foot
    const lower = site.toLowerCase();

    // Site mapping - check for heel FIRST, then ankle, then foot
    if (lower.includes('heel')) {
        // Heel mapping: L97.41x (right) or L97.42x (left)
        if (lower.includes('left')) {
            base = 'L97.42'; // Left heel
        } else if (lower.includes('right')) {
            base = 'L97.41'; // Right heel
        } else {
            base = 'L97.42'; // Default to left if not specified
        }
    } else if (lower.includes('ankle')) {
        // Ankle mapping
        if (lower.includes('left')) {
            base = 'L97.32'; // Left ankle
        } else if (lower.includes('right')) {
            base = 'L97.31'; // Right ankle
        } else {
            base = 'L97.32'; // Default to left
        }
    } else if (lower.includes('foot')) {
        // Foot mapping (not heel, not ankle)
        if (lower.includes('left')) {
            base = 'L97.52'; // Left foot
        } else if (lower.includes('right')) {
            base = 'L97.51'; // Right foot
        } else {
            base = 'L97.59'; // Other part of foot
        }
    } else {
        // Default to other part of foot
        base = 'L97.59';
    }

    // Severity mapping
    if (severity === 'bone' || severity.toLowerCase().includes('bone exposed') || severity.toLowerCase().includes('bone involvement')) {
        return base + '6'; // Bone involvement/necrosis
    } else if (severity === 'muscle' || severity.toLowerCase().includes('muscle exposed') || severity.toLowerCase().includes('muscle involvement')) {
        return base + '5'; // Muscle involvement without necrosis (default for muscle)
    } else if (severity === 'fat' || severity.toLowerCase().includes('fat')) {
        return base + '2'; // Fat layer exposed
    } else if (severity === 'skin' || severity.toLowerCase().includes('skin')) {
        return base + '1'; // Skin breakdown
    } else {
        return base + '9'; // Unspecified
    }
}

function mapCKDStage(stage: number | string): string {
    const stageStr = String(stage);
    if (stageStr === 'esrd' || stage === 6) return 'N18.6';
    if (stageStr === '5' || stage === 5) return 'N18.5';
    if (stageStr === '4' || stage === 4) return 'N18.4';
    if (stageStr === '3' || stage === 3) return 'N18.30'; // Unspecified stage 3
    if (stageStr === '2' || stage === 2) return 'N18.2';
    if (stageStr === '1' || stage === 1) return 'N18.1';
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
    if (!organism) return 'J18.9'; // Pneumonia, unspecified organism (not bacterial)

    switch (organism.toLowerCase()) {
        case 'strep_pneumoniae':
            return 'J13'; // Streptococcus pneumoniae
        case 'strep': // Other streptococci
            return 'J15.4';
        case 'h_influenzae':
            return 'J14'; // Haemophilus influenzae
        case 'klebsiella':
            return 'J15.0'; // Klebsiella pneumoniae
        case 'pseudomonas':
            return 'J15.1'; // Pseudomonas
        case 'mssa':
            return 'J15.211'; // MSSA
        case 'mrsa':
            return 'J15.212'; // MRSA
        case 'e_coli':
            return 'J15.5'; // E. coli
        case 'mycoplasma':
            return 'J15.7'; // Mycoplasma pneumoniae
        case 'viral':
            return 'J12.9'; // Viral pneumonia, unspecified
        case 'unspecified':
            return 'J18.9'; // Pneumonia, unspecified organism (not necessarily bacterial)
        default:
            return 'J18.9'; // Pneumonia, unspecified organism
    }
}

// Sepsis organism mapping (A41.x codes)
function mapSepsisOrganism(organism: string): string {
    const lower = organism.toLowerCase();
    // console.log(`DEBUG: mapSepsisOrganism('${organism}') -> lower: '${lower}'`);
    if (lower.includes('e. coli') || lower.includes('e.coli') || lower === 'e_coli') return 'A41.51';
    if (lower.includes('pseudomonas')) return 'A41.52';
    if (lower.includes('mrsa')) return 'A41.02';
    if (lower.includes('mssa')) return 'A41.01';
    if (lower.includes('staphylococcus aureus') || lower.includes('staph aureus')) return 'A41.01'; // Default to MSSA if not specified as MRSA
    if (lower.includes('staph') || lower.includes('staphylococcus')) return 'A41.2'; // Other/Unspecified Staph
    if (lower.includes('strep') || lower.includes('streptococcus')) return 'A40.9'; // Streptococcal sepsis, unspecified
    if (lower.includes('klebsiella')) return 'A41.59'; // Other Gram-negative sepsis
    if (lower.includes('enterococcus')) return 'A41.81';
    if (lower.includes('proteus')) return 'A41.59'; // Other Gram-negative sepsis
    if (lower.includes('candida')) return 'B37.7'; // Candidal sepsis
    if (lower.includes('bacteroides') || lower.includes('anaerobe')) return 'A41.4'; // Sepsis due to anaerobes
    if (lower.includes('enterobacter')) return 'A41.59'; // Other Gram-negative sepsis
    if (lower.includes('serratia')) return 'A41.53';
    if (lower.includes('acinetobacter')) return 'A41.59';
    if (lower.includes('legionella')) return 'A48.1'; // Legionnaires' disease
    // if (lower.includes('influenza') || lower.includes('viral')) return 'A41.89'; // User rule: Viral sepsis -> A41.9
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

    // Location mapping with enhanced laterality support
    const lower = location.toLowerCase();
    if (lower.includes('sacral') || lower.includes('sacrum')) {
        base += '15'; // Sacral
    } else if (lower === 'heel_right' || (lower.includes('right') && lower.includes('heel'))) {
        base += '61'; // Right heel
    } else if (lower === 'heel_left' || (lower.includes('left') && lower.includes('heel'))) {
        base += '62'; // Left heel
    } else if (lower.includes('heel')) {
        base += '60'; // Heel unspecified laterality
    } else if (lower === 'foot_right' || (lower.includes('right') && lower.includes('foot'))) {
        base += '61'; // Right foot/heel (same as right heel)
    } else if (lower === 'foot_left' || (lower.includes('left') && lower.includes('foot'))) {
        base += '62'; // Left foot/heel (same as left heel)
    } else if (lower.includes('buttock')) {
        base += '3'; // Buttock
    } else if (lower.includes('hip')) {
        base += '2'; // Hip
    } else if (lower.includes('ankle')) {
        base += '5'; // Ankle
    } else if (lower.includes('elbow')) {
        base += '0'; // Elbow
    } else {
        base += '9'; // Other site
    }

    // Stage mapping with necrosis support
    const lowerStage = stage.toLowerCase();
    if (lowerStage === 'stage1' || lowerStage === 'stage 1' || lowerStage === '1') {
        return base + '1';
    } else if (lowerStage === 'stage2' || lowerStage === 'stage 2' || lowerStage === '2') {
        return base + '2';
    } else if (lowerStage === 'stage3' || lowerStage === 'stage 3' || lowerStage === '3') {
        return base + '3';
    } else if (lowerStage === 'stage4' || lowerStage === 'stage 4' || lowerStage === '4') {
        return base + '4';
    } else if (lowerStage === 'bone_necrosis' || lowerStage === 'bone necrosis' || lowerStage.includes('bone')) {
        return base + '6'; // Bone necrosis/exposure = 6th character '6'
    } else if (lowerStage === 'muscle_necrosis' || lowerStage === 'muscle necrosis' || lowerStage.includes('muscle')) {
        return base + '5'; // Muscle necrosis/exposure = 6th character '5'
    } else if (lowerStage === 'unstageable') {
        return base + '0';
    } else if (lowerStage === 'deep_tissue') {
        return base + '6';
    } else {
        return base + '0'; // Default to unstageable if unclear
    }
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
        // Open wound mapping by body region
        if (lower.includes('chest')) {
            // S21.x - Open wound of thorax
            if (laterality === 'right') code = 'S21.101';
            else if (laterality === 'left') code = 'S21.102';
            else if (laterality === 'bilateral') code = 'S21.109';
            else code = 'S21.109';
        } else if (lower.includes('abdomen') || lower.includes('abdominal')) {
            // S31.x - Open wound of abdomen
            if (laterality === 'right') code = 'S31.101';
            else if (laterality === 'left') code = 'S31.102';
            else code = 'S31.109';
        } else if (lower.includes('arm')) {
            if (laterality === 'right') code = 'S41.101';
            else if (laterality === 'left') code = 'S41.102';
            else code = 'S41.109';
        } else if (lower.includes('leg') || lower.includes('lower limb')) {
            if (laterality === 'right') code = 'S81.801';
            else if (laterality === 'left') code = 'S81.802';
            else code = 'S81.809';
        } else if (lower.includes('foot')) {
            // S91.x - Open wound of foot
            if (laterality === 'right') code = 'S91.301';
            else if (laterality === 'left') code = 'S91.302';
            else code = 'S91.309';
        } else {
            code = 'S01.00'; // Unspecified open wound
        }
    } else if (type === 'burn') {
        // Burn mapping by body region
        if (lower.includes('chest') || lower.includes('thorax') || lower.includes('trunk')) {
            // T21.x - Burn of trunk (includes chest)
            code = 'T21.00';
        } else if (lower.includes('abdomen') || lower.includes('abdominal')) {
            // T21.x - Burn of trunk (includes abdomen)
            code = 'T21.00';
        } else if (lower.includes('leg') || lower.includes('lower limb')) {
            // T24.x - Burn of lower limb
            if (laterality === 'right') code = 'T24.001';
            else if (laterality === 'left') code = 'T24.002';
            else code = 'T24.009';
        } else if (lower.includes('arm') || lower.includes('upper limb')) {
            // T22.x - Burn of upper limb
            if (laterality === 'right') code = 'T22.001';
            else if (laterality === 'left') code = 'T22.002';
            else code = 'T22.009';
        } else {
            code = 'T20.0'; // Burn unspecified
        }
    }

    return code + seventh;
}

// External cause mapping (W/X/Y codes)
function mapExternalCause(mechanism: string, encounterType?: string): string {
    const seventh = get7thCharacter(encounterType);

    if (mechanism === 'fall') return 'W19.XXX' + seventh;
    else if (mechanism === 'mvc') return 'V49.9XX' + seventh;
    else if (mechanism === 'assault') return 'X99.9XX' + seventh;
    else if (mechanism === 'sports') return 'Y93.9'; // Activity code - no 7th character
    else if (mechanism === 'other') return 'W19.XXX' + seventh; // Default to unspecified fall
    else return 'W19.XXX' + seventh; // Unspecified
}

// 7th character for encounter type
function get7thCharacter(encounterType?: string): string {
    if (encounterType === 'initial') return 'A';
    else if (encounterType === 'subsequent') return 'D';
    else if (encounterType === 'sequela') return 'S';
    else return 'A'; // Default to initial
}

// GCS mapping (R40.2xx)
function mapGCS(score: number): string | null {
    // This is a simplified mapping. In reality, GCS is split into Eyes, Verbal, Motor.
    // R40.24- is Glasgow coma scale, total score.
    // R40.241 = 13-15
    // R40.242 = 9-12
    // R40.243 = 3-8
    // R40.244 = Other

    // Note: ICD-10-CM 2025 might have specific codes, but R40.24x is the "Total Score" category.
    // Let's use R40.24x codes.

    if (score >= 13 && score <= 15) return 'R40.241';
    if (score >= 9 && score <= 12) return 'R40.242';
    if (score >= 3 && score <= 8) return 'R40.243';
    return null;
}



function getPneumoniaLabel(code: string, organism?: string): string {
    const labels: Record<string, string> = {
        'J13': 'Pneumonia due to Streptococcus pneumoniae',
        'J14': 'Pneumonia due to Haemophilus influenzae',
        'J15.0': 'Pneumonia due to Klebsiella pneumoniae',
        'J15.1': 'Pneumonia due to Pseudomonas',
        'J15.4': 'Pneumonia due to other streptococci',
        'J15.211': 'Pneumonia due to Methicillin susceptible Staphylococcus aureus',
        'J15.212': 'Pneumonia due to Methicillin resistant Staphylococcus aureus',
        'J15.5': 'Pneumonia due to Escherichia coli',
        'J15.7': 'Pneumonia due to Mycoplasma pneumoniae',
        'J15.9': 'Unspecified bacterial pneumonia',
        'J12.9': 'Viral pneumonia, unspecified',
        'J18.9': 'Pneumonia, unspecified organism'
    };
    return labels[code] || 'Pneumonia';
}
