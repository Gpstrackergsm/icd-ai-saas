"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runStructuredRules = runStructuredRules;
function runStructuredRules(ctx) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _u, _v, _w, _x, _y, _z, _0, _1, _2, _3, _4, _5, _6, _7, _8, _9;
    const codes = [];
    const warnings = [];
    const validationErrors = [];
    const procedures = [];
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
            }
            else {
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
        // RULE: Retinopathy → E10.319 / E11.319 (without macular edema unless explicitly documented)
        if (d.complications.includes('retinopathy')) {
            codes.push({
                code: `${baseCode}.319`,
                label: `${typeName} diabetes mellitus with unspecified diabetic retinopathy without macular edema`,
                rationale: 'Diabetes with documented retinopathy complication (macular edema not specified)',
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
        // RULE: HTN + HF + CKD → I13.x
        if (c.hypertension && hasHF && hasCKD) {
            const ckdStage = (_a = ctx.conditions.ckd) === null || _a === void 0 ? void 0 : _a.stage;
            const isStage5OrESRD = ckdStage === 5 || ckdStage === 'esrd';
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
        }
        // RULE: HTN + CKD → I12.x
        else if (c.hypertension && hasCKD) {
            // I12.0 = with stage 5 CKD or ESRD
            // I12.9 = with stage 1-4 or unspecified CKD
            const ckdStage = (_b = ctx.conditions.ckd) === null || _b === void 0 ? void 0 : _b.stage;
            const code = (ckdStage === 5 || ckdStage === 'esrd') ? 'I12.0' : 'I12.9';
            const label = (ckdStage === 5 || ckdStage === 'esrd')
                ? 'Hypertensive chronic kidney disease with stage 5 chronic kidney disease or end stage renal disease'
                : 'Hypertensive chronic kidney disease with stage 1 through stage 4 chronic kidney disease, or unspecified chronic kidney disease';
            codes.push({
                code: code,
                label: label,
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
        // RULE: HTN only → I10 (UNLESS patient is pregnant/postpartum - then use O10-O16)
        else if (c.hypertension) {
            // Check if patient is pregnant OR postpartum - if so, skip I10 (will be handled in OB/GYN section)
            const isPregnantOrPostpartum = !!(((_c = ctx.conditions.obstetric) === null || _c === void 0 ? void 0 : _c.pregnant) || ((_d = ctx.conditions.obstetric) === null || _d === void 0 ? void 0 : _d.postpartum));
            if (!isPregnantOrPostpartum) {
                codes.push({
                    code: 'I10',
                    label: 'Essential (primary) hypertension',
                    rationale: 'Uncomplicated hypertension',
                    guideline: 'ICD-10-CM I.C.9.a',
                    trigger: 'Hypertension documented',
                    rule: 'Uncomplicated hypertension'
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
    if ((_e = ctx.conditions.respiratory) === null || _e === void 0 ? void 0 : _e.pneumonia) {
        const r = ctx.conditions.respiratory;
        const p = r.pneumonia; // Non-null assertion safe because of if condition
        const pCode = mapPneumoniaOrganism(p.organism);
        let pLabel = 'Pneumonia';
        if (pCode === 'J15.212')
            pLabel = 'Pneumonia due to Methicillin resistant Staphylococcus aureus';
        else if (pCode === 'J15.5')
            pLabel = 'Pneumonia due to E. coli';
        else if (pCode === 'J15.1')
            pLabel = 'Pneumonia due to Pseudomonas';
        codes.push({
            code: pCode,
            label: pLabel,
            rationale: `Pneumonia${p.organism ? ' due to ' + p.organism : ''}`,
            guideline: 'ICD-10-CM I.C.10',
            trigger: 'Pneumonia + ' + (p.organism || 'unspecified organism'),
            rule: 'Organism-specific pneumonia code'
        });
    }
    // --- INFECTIONS & SEPSIS RULES ---
    if (ctx.conditions.infection) {
        const inf = ctx.conditions.infection;
        // RULE: Septic Shock → R65.21 (HIGHEST PRIORITY)
        if ((_f = inf.sepsis) === null || _f === void 0 ? void 0 : _f.shock) {
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
        else if ((_g = inf.sepsis) === null || _g === void 0 ? void 0 : _g.severe) {
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
        if (((_h = inf.sepsis) === null || _h === void 0 ? void 0 : _h.present) && inf.organism) {
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
        else if ((_j = inf.sepsis) === null || _j === void 0 ? void 0 : _j.present) {
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
        if (inf.organism && inf.organism !== 'unspecified' && !((_k = inf.sepsis) === null || _k === void 0 ? void 0 : _k.present)) {
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
    }
    // --- WOUNDS & PRESSURE ULCERS RULES ---
    if ((_l = ctx.conditions.wounds) === null || _l === void 0 ? void 0 : _l.present) {
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
    if ((_m = ctx.conditions.injury) === null || _m === void 0 ? void 0 : _m.present) {
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
        if (((_o = inj.externalCause) === null || _o === void 0 ? void 0 : _o.mechanism) && inj.encounterType) {
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
        if ((_p = n.encephalopathy) === null || _p === void 0 ? void 0 : _p.present) {
            let code = 'G93.40'; // Unspecified
            if (n.encephalopathy.type === 'metabolic')
                code = 'G93.41';
            else if (n.encephalopathy.type === 'toxic')
                code = 'G92.8';
            else if (n.encephalopathy.type === 'hepatic')
                code = 'K72.90'; // Hepatic failure without coma (often used for hepatic encephalopathy)
            else if (n.encephalopathy.type === 'hypoxic')
                code = 'G93.1';
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
        if (n.alteredMentalStatus && !((_q = n.encephalopathy) === null || _q === void 0 ? void 0 : _q.present)) {
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
            }
            else if (n.dementia.type === 'vascular') {
                codes.push({
                    code: 'F01.50',
                    label: 'Vascular dementia without behavioral disturbance',
                    rationale: 'Vascular dementia documented',
                    guideline: 'ICD-10-CM F01',
                    trigger: 'Dementia Type: Vascular',
                    rule: 'Vascular dementia code'
                });
            }
            else {
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
    // --- GASTROENTEROLOGY RULES ---
    if (ctx.conditions.gastro) {
        const g = ctx.conditions.gastro;
        // RULE: Liver Disease & Cirrhosis
        if (g.cirrhosis) {
            let code = 'K74.60'; // Unspecified cirrhosis
            if (g.cirrhosis.type === 'alcoholic')
                code = 'K70.30';
            else if (g.cirrhosis.type === 'nash')
                code = 'K75.81'; // NASH
            codes.push({
                code: code,
                label: `Cirrhosis of liver, ${g.cirrhosis.type || 'unspecified'}`,
                rationale: 'Cirrhosis documented',
                guideline: 'ICD-10-CM K74/K70',
                trigger: `Cirrhosis Type: ${g.cirrhosis.type}`,
                rule: 'Cirrhosis mapping'
            });
        }
        else if (g.liverDisease) {
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
            if (g.hepatitis.type === 'a')
                code = 'B15.9';
            else if (g.hepatitis.type === 'b')
                code = 'B18.1'; // Chronic B (assuming chronic for history)
            else if (g.hepatitis.type === 'c')
                code = 'B18.2'; // Chronic C
            else if (g.hepatitis.type === 'alcoholic')
                code = 'K70.10';
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
            if (g.bleeding.site === 'upper')
                code = 'K92.0'; // Hematemesis (proxy for upper) - or K92.2 if not specified. K92.0 is Hematemesis, K92.1 is Melena.
            // Better mapping:
            // Upper GI Bleed -> K92.2 (often used if not specific) or K92.0/K92.1
            // Let's use K92.2 for general GI bleed, but if site is upper, maybe K92.2 is still best unless we know hematemesis/melena.
            // Actually K92.2 is "Gastrointestinal hemorrhage, unspecified".
            // If "Upper GI Bleeding" is stated, it's often coded as K92.2 in absence of specific lesion, but clinically K92.0/1 are signs.
            // Let's stick to K92.2 for unspecified, and maybe specific codes if we had them.
            // For now:
            if (g.bleeding.site === 'upper')
                code = 'K92.2'; // K92.2 is often used for "GI Bleed" even if upper is suspected but source unknown.
            // Actually, let's use K92.2 for all unless we have more info.
            // Wait, K92.1 is Melena, K92.0 is Hematemesis.
            // If just "GI Bleeding", K92.2.
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
            if (g.pancreatitis.type === 'chronic')
                code = 'K86.1';
            else if (g.pancreatitis.type === 'acute')
                code = 'K85.90';
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
    if ((_r = ctx.conditions.neoplasm) === null || _r === void 0 ? void 0 : _r.present) {
        const neo = ctx.conditions.neoplasm;
        // RULE: Primary Malignancy
        if (neo.site) {
            let code = 'C80.1'; // Malignant neoplasm, unspecified site
            if (neo.site === 'lung')
                code = 'C34.90';
            else if (neo.site === 'breast')
                code = 'C50.919'; // Breast, unspecified
            else if (neo.site === 'colon')
                code = 'C18.9';
            else if (neo.site === 'prostate')
                code = 'C61';
            codes.push({
                code: code,
                label: `Malignant neoplasm of ${neo.site || 'unspecified site'}`,
                rationale: 'Primary malignancy documented',
                guideline: 'ICD-10-CM C00-C96',
                trigger: `Cancer Site: ${neo.site}`,
                rule: 'Primary neoplasm mapping'
            });
        }
        // RULE: Metastasis
        if (neo.metastasis) {
            if (neo.metastaticSite) {
                let code = 'C79.9'; // Secondary malignant neoplasm of unspecified site
                if (neo.metastaticSite === 'bone')
                    code = 'C79.51';
                else if (neo.metastaticSite === 'brain')
                    code = 'C79.31';
                else if (neo.metastaticSite === 'liver')
                    code = 'C78.7';
                else if (neo.metastaticSite === 'lung')
                    code = 'C78.00';
                codes.push({
                    code: code,
                    label: `Secondary malignant neoplasm of ${neo.metastaticSite}`,
                    rationale: 'Metastatic cancer documented',
                    guideline: 'ICD-10-CM C77-C79',
                    trigger: `Metastatic Site: ${neo.metastaticSite}`,
                    rule: 'Secondary neoplasm mapping'
                });
            }
            else {
                codes.push({
                    code: 'C79.9',
                    label: 'Secondary malignant neoplasm of unspecified site',
                    rationale: 'Metastasis documented without site',
                    guideline: 'ICD-10-CM C79.9',
                    trigger: 'Metastasis = Yes',
                    rule: 'Unspecified metastasis'
                });
            }
        }
    }
    if (ctx.conditions.hematology) {
        const h = ctx.conditions.hematology;
        // RULE: Anemia
        if (h.anemia) {
            let code = 'D64.9'; // Anemia, unspecified
            if (h.anemia.type === 'iron_deficiency')
                code = 'D50.9';
            else if (h.anemia.type === 'b12_deficiency')
                code = 'D51.9';
            else if (h.anemia.type === 'acute_blood_loss')
                code = 'D62';
            else if (h.anemia.type === 'chronic_disease') {
                code = 'D63.8'; // Anemia in other chronic diseases classified elsewhere
                // Note: D63.1 if CKD, D63.0 if Neoplasm. 
                // We could refine this if we have access to other conditions here.
                if ((_s = ctx.conditions.ckd) === null || _s === void 0 ? void 0 : _s.stage)
                    code = 'D63.1';
                else if ((_t = ctx.conditions.neoplasm) === null || _t === void 0 ? void 0 : _t.present)
                    code = 'D63.0';
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
    if ((_u = ctx.conditions.obstetric) === null || _u === void 0 ? void 0 : _u.pregnant) {
        const ob = ctx.conditions.obstetric;
        const hasOCode = !!(ob.preeclampsia || ob.gestationalDiabetes || ((_v = ob.delivery) === null || _v === void 0 ? void 0 : _v.occurred));
        // Calculate trimester if weeks are known
        let trimester = ob.trimester;
        if (!trimester && ob.gestationalAge) {
            if (ob.gestationalAge < 14)
                trimester = 1;
            else if (ob.gestationalAge < 28)
                trimester = 2;
            else
                trimester = 3;
        }
        // RULE: Hypertension in Pregnancy (O10-O16 range per ICD-10-CM I.C.15.b.1)
        // Check if patient has hypertension documented
        const hasHTN = !!((_w = ctx.conditions.cardiovascular) === null || _w === void 0 ? void 0 : _w.hypertension);
        if (hasHTN && !ob.preeclampsia) {
            // Use O13.x for gestational hypertension (new-onset during pregnancy)
            // In absence of documentation stating "pre-existing", default to gestational
            let htnCode = 'O13.9'; // Unspecified trimester
            if (trimester === 1)
                htnCode = 'O13.1';
            else if (trimester === 2)
                htnCode = 'O13.2';
            else if (trimester === 3)
                htnCode = 'O13.3';
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
            if (trimester === 1)
                code = 'O14.91';
            else if (trimester === 2)
                code = 'O14.92';
            else if (trimester === 3)
                code = 'O14.93';
            else
                code = 'O14.90';
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
        if ((_x = ob.delivery) === null || _x === void 0 ? void 0 : _x.occurred) {
            if (ob.delivery.type === 'cesarean') {
                codes.push({
                    code: 'O82',
                    label: 'Encounter for cesarean delivery without indication',
                    rationale: 'Cesarean delivery',
                    guideline: 'ICD-10-CM O82',
                    trigger: 'Delivery Type: Cesarean',
                    rule: 'Delivery encounter code'
                });
            }
            else {
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
            }
            else {
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
    if ((_y = ctx.conditions.obstetric) === null || _y === void 0 ? void 0 : _y.postpartum) {
        const ob = ctx.conditions.obstetric;
        // RULE: Delivery codes (if delivery occurred)
        if ((_z = ob.delivery) === null || _z === void 0 ? void 0 : _z.occurred) {
            if (ob.delivery.type === 'cesarean') {
                codes.push({
                    code: 'O82',
                    label: 'Encounter for cesarean delivery without indication',
                    rationale: 'Cesarean delivery (postpartum encounter)',
                    guideline: 'ICD-10-CM O82',
                    trigger: 'Postpartum + Delivery Type: Cesarean',
                    rule: 'Delivery encounter code'
                });
            }
            else {
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
        const hasHTN = !!((_0 = ctx.conditions.cardiovascular) === null || _0 === void 0 ? void 0 : _0.hypertension);
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
        }
        else if (s.smoking === 'former') {
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
            if (s.alcoholUse === 'abuse')
                code = 'F10.10';
            else if (s.alcoholUse === 'dependence')
                code = 'F10.20';
            else if (s.alcoholUse === 'use')
                code = 'Z72.89'; // Or Z72.89? Z72.89 is "Other problems related to lifestyle". 
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
        if ((_1 = s.drugUse) === null || _1 === void 0 ? void 0 : _1.present) {
            let code = 'F19.10'; // Other drug abuse, uncomplicated
            if (s.drugUse.type === 'opioid')
                code = 'F11.10';
            else if (s.drugUse.type === 'cocaine')
                code = 'F14.10';
            else if (s.drugUse.type === 'cannabis')
                code = 'F12.10';
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
    const uniqueCodes = new Map();
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
    const isChronicDialysis = ((_2 = ctx.conditions.ckd) === null || _2 === void 0 ? void 0 : _2.dialysisType) === 'chronic';
    if (hasZ992 && !isChronicDialysis) {
        // Violation: Z99.2 without chronic dialysis
        // Remove Z99.2
        finalCodes = finalCodes.filter(c => c.code !== 'Z99.2');
        validationErrors.push('Invariant Violation: Z99.2 removed because Dialysis Status is not Chronic');
    }
    else if (!hasZ992 && isChronicDialysis) {
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
    const isAKIPresent = !!((_3 = ctx.conditions.ckd) === null || _3 === void 0 ? void 0 : _3.aki);
    if (hasN179 && !isAKIPresent) {
        finalCodes = finalCodes.filter(c => c.code !== 'N17.9');
        validationErrors.push('Invariant Violation: N17.9 removed because AKI is not present');
    }
    // RULE B2: Encephalopathy (G93.x)
    // G93.x allowed ONLY if Encephalopathy = Yes
    const hasEncephalopathyCode = finalCodes.some(c => c.code.startsWith('G93') || c.code === 'G92.8' || c.code === 'K72.90');
    const isEncephalopathyPresent = !!((_5 = (_4 = ctx.conditions.neurology) === null || _4 === void 0 ? void 0 : _4.encephalopathy) === null || _5 === void 0 ? void 0 : _5.present);
    if (hasEncephalopathyCode && !isEncephalopathyPresent) {
        finalCodes = finalCodes.filter(c => !(c.code.startsWith('G93') || c.code === 'G92.8' || c.code === 'K72.90'));
        validationErrors.push('Invariant Violation: Encephalopathy code removed because Encephalopathy is not present');
    }
    // RULE C1: Sepsis Severity & R65.x
    // R65.2x allowed ONLY if Severe Sepsis = Yes OR Septic Shock = Yes
    const hasR65 = finalCodes.some(c => c.code.startsWith('R65.2'));
    const isSevere = !!((_7 = (_6 = ctx.conditions.infection) === null || _6 === void 0 ? void 0 : _6.sepsis) === null || _7 === void 0 ? void 0 : _7.severe);
    const isShock = !!((_9 = (_8 = ctx.conditions.infection) === null || _8 === void 0 ? void 0 : _8.sepsis) === null || _9 === void 0 ? void 0 : _9.shock);
    if (hasR65 && !isSevere && !isShock) {
        finalCodes = finalCodes.filter(c => !c.code.startsWith('R65.2'));
        validationErrors.push('Invariant Violation: R65.2x removed because neither Severe Sepsis nor Septic Shock is present');
    }
    // --- SEQUENCING LOGIC (PRIORITY SORT) ---
    // 1. Primary infection / sepsis code (A40, A41, B37.7, A48.1, A41.89)
    // 2. R65.2x (if present)
    // 3. Organ dysfunction codes (N17.9, G93.x, J96.x, etc.)
    // 4. Local infection source (pneumonia, UTI, skin, etc.)
    // 5. Diabetes with complications (E08–E13)
    // 6. CKD staging (N18.x)
    // 7. Status codes (Z99.2, etc.)
    // 8. Other chronic conditions
    const getPriority = (c) => {
        const code = c.code;
        // 1. Primary Sepsis
        if (code.startsWith('A40') || code.startsWith('A41') || code === 'B37.7' || code === 'A48.1')
            return 10;
        // 2. Severe Sepsis
        if (code.startsWith('R65.2'))
            return 20;
        // 3. Organ Dysfunction
        if (code.startsWith('N17') || code.startsWith('G93') || code.startsWith('J96') || code === 'G92.8' || code === 'K72.90')
            return 30;
        // 4. Local Infection (Pneumonia J13-J18, UTI N39, Skin L00-L08, etc.)
        if (code.startsWith('J13') || code.startsWith('J14') || code.startsWith('J15') || code.startsWith('J16') || code.startsWith('J18') || code.startsWith('J11'))
            return 40; // Pneumonia/Flu
        if (code.startsWith('N30') || code.startsWith('N39'))
            return 40; // UTI
        if (code.startsWith('L0') || code.startsWith('L89'))
            return 45; // Skin/Ulcer (L97 is handled after diabetes)
        // Wait, L97 is diabetic ulcer manifestation. User said "Diabetes with complications ... E08-E13". L97 usually goes with E code.
        // Let's put L97 with Diabetes group or slightly after. User list: "Diabetes with complications...".
        // Actually, L97 is a "manifestation" code, usually sequenced after the etiology (E11).
        // So L97 should be > Diabetes.
        // 5. Diabetes
        if (code.startsWith('E08') || code.startsWith('E09') || code.startsWith('E10') || code.startsWith('E11') || code.startsWith('E13'))
            return 50;
        // 5.5 Diabetic Ulcer Manifestation (L97) - sequenced after Diabetes
        if (code.startsWith('L97'))
            return 55;
        // 6. CKD
        if (code.startsWith('N18'))
            return 60;
        // 7. Status Codes
        if (code.startsWith('Z99'))
            return 70;
        // 8. Others
        return 80;
    };
    finalCodes.sort((a, b) => {
        const pA = getPriority(a);
        const pB = getPriority(b);
        if (pA !== pB)
            return pA - pB;
        return 0; // Keep original order if same priority
    });
    let primary = null;
    let secondary = [];
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
function mapUlcerToL97(site, severity) {
    let base = 'L97.5'; // Foot
    // Site mapping
    if (site.toLowerCase().includes('left') && site.toLowerCase().includes('foot')) {
        base += '2'; // Left foot
    }
    else if (site.toLowerCase().includes('right') && site.toLowerCase().includes('foot')) {
        base += '1'; // Right foot
    }
    else if (site.toLowerCase().includes('left') && site.toLowerCase().includes('ankle')) {
        base = 'L97.32'; // Left ankle
    }
    else if (site.toLowerCase().includes('right') && site.toLowerCase().includes('ankle')) {
        base = 'L97.31'; // Right ankle
    }
    else {
        base += '9'; // Unspecified foot
    }
    // Severity mapping
    if (severity === 'bone' || severity.toLowerCase().includes('bone')) {
        return base + '4';
    }
    else if (severity === 'muscle' || severity.toLowerCase().includes('muscle')) {
        return base + '3';
    }
    else if (severity === 'fat' || severity.toLowerCase().includes('fat')) {
        return base + '2';
    }
    else if (severity === 'skin' || severity.toLowerCase().includes('skin')) {
        return base + '1';
    }
    else {
        return base + '9';
    }
}
function mapCKDStage(stage) {
    if (stage === 'esrd' || stage === 6)
        return 'N18.6';
    if (stage === 5)
        return 'N18.5';
    if (stage === 4)
        return 'N18.4';
    if (stage === 3)
        return 'N18.30'; // Unspecified stage 3
    if (stage === 2)
        return 'N18.2';
    if (stage === 1)
        return 'N18.1';
    return 'N18.9';
}
function mapHeartFailureCode(type, acuity) {
    if (type === 'systolic') {
        if (acuity === 'acute')
            return 'I50.21';
        if (acuity === 'chronic')
            return 'I50.22';
        if (acuity === 'acute_on_chronic')
            return 'I50.23';
        return 'I50.20';
    }
    else if (type === 'diastolic') {
        if (acuity === 'acute')
            return 'I50.31';
        if (acuity === 'chronic')
            return 'I50.32';
        if (acuity === 'acute_on_chronic')
            return 'I50.33';
        return 'I50.30';
    }
    else if (type === 'combined') {
        if (acuity === 'acute')
            return 'I50.41';
        if (acuity === 'chronic')
            return 'I50.42';
        if (acuity === 'acute_on_chronic')
            return 'I50.43';
        return 'I50.40';
    }
    return 'I50.9';
}
function mapPneumoniaOrganism(organism) {
    if (!organism)
        return 'J18.9';
    const lower = organism.toLowerCase().replace('_', ' ');
    if (lower.includes('pseudomonas'))
        return 'J15.1';
    if (lower.includes('e. coli') || lower.includes('e.coli') || lower.includes('e coli'))
        return 'J15.5';
    if (lower.includes('mrsa'))
        return 'J15.212';
    if (lower.includes('klebsiella'))
        return 'J15.0';
    if (lower.includes('influenza'))
        return 'J11.0'; // Influenza with pneumonia, virus not identified
    if (lower.includes('legionella'))
        return 'A48.1'; // Legionnaires' disease
    if (lower.includes('streptococcus') || lower.includes('strep'))
        return 'J15.4'; // Other streptococcal pneumonia
    if (lower.includes('haemophilus'))
        return 'J15.2';
    if (lower.includes('viral'))
        return 'J12.9';
    return 'J18.9';
}
// Sepsis organism mapping (A41.x codes)
function mapSepsisOrganism(organism) {
    const lower = organism.toLowerCase();
    // console.log(`DEBUG: mapSepsisOrganism('${organism}') -> lower: '${lower}'`);
    if (lower.includes('e. coli') || lower.includes('e.coli') || lower === 'e_coli')
        return 'A41.51';
    if (lower.includes('pseudomonas'))
        return 'A41.52';
    if (lower.includes('mrsa'))
        return 'A41.02';
    if (lower.includes('mssa'))
        return 'A41.01';
    if (lower.includes('staphylococcus aureus') || lower.includes('staph aureus'))
        return 'A41.01'; // Default to MSSA if not specified as MRSA
    if (lower.includes('staph') || lower.includes('staphylococcus'))
        return 'A41.2'; // Other/Unspecified Staph
    if (lower.includes('strep') || lower.includes('streptococcus'))
        return 'A40.9'; // Streptococcal sepsis, unspecified
    if (lower.includes('klebsiella'))
        return 'A41.59'; // Other Gram-negative sepsis
    if (lower.includes('enterococcus'))
        return 'A41.81';
    if (lower.includes('proteus'))
        return 'A41.59'; // Other Gram-negative sepsis
    if (lower.includes('candida'))
        return 'B37.7'; // Candidal sepsis
    if (lower.includes('bacteroides') || lower.includes('anaerobe'))
        return 'A41.4'; // Sepsis due to anaerobes
    if (lower.includes('enterobacter'))
        return 'A41.59'; // Other Gram-negative sepsis
    if (lower.includes('serratia'))
        return 'A41.53';
    if (lower.includes('acinetobacter'))
        return 'A41.59';
    if (lower.includes('legionella'))
        return 'A48.1'; // Legionnaires' disease
    if (lower.includes('influenza') || lower.includes('viral'))
        return 'A41.89'; // Other specified sepsis
    return 'A41.9'; // Unspecified
}
// Organism code mapping (B96.x codes)
function mapOrganismCode(organism) {
    const lower = organism.toLowerCase();
    if (lower.includes('e. coli') || lower.includes('e.coli') || lower === 'e_coli')
        return 'B96.20';
    if (lower.includes('pseudomonas'))
        return 'B96.5';
    if (lower.includes('mrsa'))
        return 'B95.62';
    if (lower.includes('staph'))
        return 'B95.8';
    if (lower.includes('strep'))
        return 'B95.5';
    return null; // No specific organism code
}
// Pressure ulcer mapping (L89.xxx codes)
function mapPressureUlcer(location, stage) {
    let base = 'L89.';
    // Location mapping
    const lower = location.toLowerCase();
    if (lower.includes('sacral') || lower.includes('sacrum'))
        base += '15'; // Sacral
    else if (lower.includes('heel'))
        base += '6'; // Heel
    else if (lower.includes('buttock'))
        base += '3'; // Buttock
    else if (lower.includes('hip'))
        base += '2'; // Hip
    else if (lower.includes('ankle'))
        base += '5'; // Ankle
    else if (lower.includes('elbow'))
        base += '0'; // Elbow
    else
        base += '9'; // Other site
    // Stage mapping
    if (stage === 'stage1')
        return base + '1';
    else if (stage === 'stage2')
        return base + '2';
    else if (stage === 'stage3')
        return base + '3';
    else if (stage === 'stage4')
        return base + '4';
    else if (stage === 'unstageable')
        return base + '0';
    else if (stage === 'deep_tissue')
        return base + '6';
    else
        return base + '9'; // Unspecified
}
// Injury code mapping (S codes with 7th character)
function mapInjuryCode(type, bodyRegion, laterality, encounterType) {
    let code = 'S00.00'; // Default unspecified
    const seventh = get7thCharacter(encounterType);
    // Simplified mapping - in production would need comprehensive body region mapping
    const lower = bodyRegion.toLowerCase();
    if (type === 'fracture') {
        if (lower.includes('femur')) {
            if (laterality === 'right')
                code = 'S72.301';
            else if (laterality === 'left')
                code = 'S72.302';
            else
                code = 'S72.309';
        }
        else if (lower.includes('tibia')) {
            if (laterality === 'right')
                code = 'S82.201';
            else if (laterality === 'left')
                code = 'S82.202';
            else
                code = 'S82.209';
        }
        else if (lower.includes('humerus')) {
            if (laterality === 'right')
                code = 'S42.301';
            else if (laterality === 'left')
                code = 'S42.302';
            else
                code = 'S42.309';
        }
        else {
            code = 'S02.0'; // Unspecified fracture
        }
    }
    else if (type === 'open_wound') {
        if (lower.includes('arm')) {
            if (laterality === 'right')
                code = 'S41.101';
            else if (laterality === 'left')
                code = 'S41.102';
            else
                code = 'S41.109';
        }
        else if (lower.includes('leg')) {
            if (laterality === 'right')
                code = 'S81.801';
            else if (laterality === 'left')
                code = 'S81.802';
            else
                code = 'S81.809';
        }
        else {
            code = 'S01.00'; // Unspecified open wound
        }
    }
    else if (type === 'burn') {
        code = 'T20.0'; // Burn unspecified
    }
    return code + seventh;
}
// External cause mapping (W/X/Y codes)
function mapExternalCause(mechanism, encounterType) {
    const seventh = get7thCharacter(encounterType);
    if (mechanism === 'fall')
        return 'W19.XXX' + seventh;
    else if (mechanism === 'mvc')
        return 'V89.2XX' + seventh;
    else if (mechanism === 'assault')
        return 'X99.9XX' + seventh;
    else if (mechanism === 'sports')
        return 'W00.0XX' + seventh;
    else
        return 'W00.0XX' + seventh; // Unspecified
}
// 7th character for encounter type
function get7thCharacter(encounterType) {
    if (encounterType === 'initial')
        return 'A';
    else if (encounterType === 'subsequent')
        return 'D';
    else if (encounterType === 'sequela')
        return 'S';
    else
        return 'A'; // Default to initial
}
// GCS mapping (R40.2xx)
function mapGCS(score) {
    // This is a simplified mapping. In reality, GCS is split into Eyes, Verbal, Motor.
    // R40.24- is Glasgow coma scale, total score.
    // R40.241 = 13-15
    // R40.242 = 9-12
    // R40.243 = 3-8
    // R40.244 = Other
    // Note: ICD-10-CM 2025 might have specific codes, but R40.24x is the "Total Score" category.
    // Let's use R40.24x codes.
    if (score >= 13 && score <= 15)
        return 'R40.241';
    if (score >= 9 && score <= 12)
        return 'R40.242';
    if (score >= 3 && score <= 8)
        return 'R40.243';
    return null;
}
