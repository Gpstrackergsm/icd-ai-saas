
import { PatientContext } from './context';

export interface ParseResult {
    context: PatientContext;
    errors: string[];
}

export function parseInput(text: string): ParseResult {
    const lines = text.split('\n').map(l => l.trim()).filter(l => l);
    const context: PatientContext = {
        demographics: {},
        encounter: { type: 'initial' },
        conditions: {}
    };
    const errors: string[] = [];

    const parseBoolean = (val: string) => ['yes', 'true', 'present'].includes(val.toLowerCase());

    lines.forEach(line => {
        const parts = line.split(':');
        if (parts.length < 2) {
            errors.push(`Invalid format (missing colon): "${line}"`);
            return;
        }

        const key = parts[0].trim().toLowerCase();
        const value = parts.slice(1).join(':').trim();
        const lowerValue = value.toLowerCase();

        switch (key) {
            // Generic Diagnosis/History Parsing
            case 'diagnosis':
            case 'history':
            case 'event':
            case 'condition':
            case 'conditions':
            case 'diagnosis':
                // Intelligent routing based on content
                // Hypertension
                if (lowerValue.includes('hypertension') || lowerValue.includes('hypertensive')) {
                    if (!context.conditions.cardiovascular) context.conditions.cardiovascular = { hypertension: false };
                    context.conditions.cardiovascular.hypertension = true;

                    // Detect heart disease
                    if (lowerValue.includes('heart')) {
                        context.conditions.cardiovascular.heartFailure = { type: 'unspecified', acuity: 'unspecified' };
                    }

                    // Detect CKD
                    if (lowerValue.includes('kidney') || lowerValue.includes('ckd')) {
                        if (!context.conditions.renal) context.conditions.renal = {};
                        context.conditions.renal.ckd = { stage: 'unspecified' };

                        // Extract stage
                        if (lowerValue.includes('stage 1')) context.conditions.renal.ckd.stage = '1';
                        else if (lowerValue.includes('stage 2')) context.conditions.renal.ckd.stage = '2';
                        else if (lowerValue.includes('stage 3')) context.conditions.renal.ckd.stage = '3';
                        else if (lowerValue.includes('stage 4')) context.conditions.renal.ckd.stage = '4';
                        else if (lowerValue.includes('stage 5')) context.conditions.renal.ckd.stage = '5';
                    }

                    // Detect secondary hypertension
                    if (lowerValue.includes('secondary')) {
                        context.conditions.cardiovascular.secondaryHypertension = true;
                        if (lowerValue.includes('renal')) context.conditions.cardiovascular.hypertensionCause = 'renal';
                    }
                }

                // COPD
                if (lowerValue.includes('copd')) {
                    if (!context.conditions.respiratory) context.conditions.respiratory = {};
                    const withExacerbation = lowerValue.includes('exacerbation');
                    const withInfection = lowerValue.includes('infection') || lowerValue.includes('respiratory infection');
                    context.conditions.respiratory.copd = {
                        present: true,
                        withExacerbation: withExacerbation && !withInfection,
                        withInfection: withInfection
                    };
                }

                // Asthma
                if (lowerValue.includes('asthma')) {
                    if (!context.conditions.respiratory) context.conditions.respiratory = {};
                    let severity: 'mild_intermittent' | 'mild_persistent' | 'moderate_persistent' | 'severe_persistent' | 'unspecified' = 'unspecified';
                    let status: 'uncomplicated' | 'exacerbation' | 'status_asthmaticus' = 'uncomplicated';

                    // Status first (to avoid confusing "acute severe" with "severe persistent")
                    if (lowerValue.includes('acute')) status = 'exacerbation';
                    else if (lowerValue.includes('exacerbation')) status = 'exacerbation';
                    else if (lowerValue.includes('status asthmaticus')) status = 'status_asthmaticus';

                    // Severity (only if not just "acute severe" which means unspecified with exacerbation)
                    if (lowerValue.includes('mild intermittent')) severity = 'mild_intermittent';
                    else if (lowerValue.includes('mild persistent')) severity = 'mild_persistent';
                    else if (lowerValue.includes('moderate')) severity = 'moderate_persistent';
                    else if (lowerValue.includes('severe persistent')) severity = 'severe_persistent';
                    // Don't set severity to severe_persistent for "acute severe" or just "severe"

                    context.conditions.respiratory.asthma = { severity, status };
                }

                // Pneumonia
                if (lowerValue.includes('pneumonia') || lowerValue.includes('pneumonitis')) {
                    if (!context.conditions.respiratory) context.conditions.respiratory = {};
                    let organism: 'strep_pneumoniae' | 'h_influenzae' | 'klebsiella' | 'pseudomonas' |
                        'mssa' | 'mrsa' | 'e_coli' | 'mycoplasma' | 'viral' | 'unspecified' | undefined;
                    let type: 'aspiration' | 'bacterial' | 'viral' | 'unspecified' | undefined;

                    // Organism
                    if (lowerValue.includes('streptococcus') || lowerValue.includes('strep')) organism = 'strep_pneumoniae';
                    else if (lowerValue.includes('bacterial')) {
                        type = 'bacterial';
                        organism = 'unspecified';
                    }
                    else if (lowerValue.includes('viral')) {
                        type = 'viral';
                        organism = 'viral';
                    }
                    else if (lowerValue.includes('aspiration')) type = 'aspiration';

                    // COVID-19
                    if (lowerValue.includes('covid')) {
                        if (!context.conditions.infection) context.conditions.infection = { present: true };
                        context.conditions.infection.covid19 = true;
                    }

                    // Sepsis
                    if (lowerValue.includes('sepsis')) {
                        if (!context.conditions.infection) context.conditions.infection = { present: true };
                        context.conditions.infection.sepsis = { present: true };
                    }

                    context.conditions.respiratory.pneumonia = { organism, type };
                }
                break;

            case 'source':
                // Infection source
                if (key === 'source' && lowerValue) {
                    if (!context.conditions.infection) context.conditions.infection = { present: true };
                    context.conditions.infection.source = value; // Store original value
                }
                break;

            case 'complication':
            case 'complications':
                // COPD exacerbation (skip if key is 'status' to avoid false positives)
                if ((lowerValue.includes('exacerbation') || lowerValue.includes('acute exacerbation')) && key.toLowerCase() !== 'status') {
                    if (!context.conditions.respiratory) context.conditions.respiratory = {};
                    if (!context.conditions.respiratory.copd) {
                        context.conditions.respiratory.copd = { present: true, withExacerbation: true };
                    } else {
                        context.conditions.respiratory.copd.withExacerbation = true;
                    }
                }

            // Sepsis/Infection complications':
            case 'diabetes complications':
            case 'current admission':
            case 'active disease':
            case 'cause':
                // Anemia cause
                if (key === 'cause' && lowerValue.includes('blood loss')) {
                    if (!context.conditions.hematology) context.conditions.hematology = {};
                    if (!context.conditions.hematology.anemia) context.conditions.hematology.anemia = { type: 'iron_deficiency' };
                    context.conditions.hematology.anemia.cause = 'chronic_blood_loss';
                }

                // Sepsis & Infection
                if (lowerValue.includes('sepsis')) {
                    if (!context.conditions.infection) context.conditions.infection = { present: true };
                    if (!context.conditions.infection.sepsis) context.conditions.infection.sepsis = { present: true };
                    if (lowerValue.includes('severe')) context.conditions.infection.sepsis.severe = true;
                    if (lowerValue.includes('shock')) context.conditions.infection.sepsis.shock = true;

                    // Organism extraction
                    if (lowerValue.includes('e. coli') || lowerValue.includes('escherichia coli')) context.conditions.infection.organism = 'e_coli';
                    else if (lowerValue.includes('mrsa')) context.conditions.infection.organism = 'mrsa';
                    else if (lowerValue.includes('mssa')) context.conditions.infection.organism = 'mssa';
                    else if (lowerValue.includes('pseudomonas')) context.conditions.infection.organism = 'pseudomonas';
                    else if (lowerValue.includes('klebsiella')) context.conditions.infection.organism = 'klebsiella';
                    else if (lowerValue.includes('streptococcus') || lowerValue.includes('strep')) context.conditions.infection.organism = 'strep';
                    else if (lowerValue.includes('proteus')) context.conditions.infection.organism = 'proteus';
                    else if (lowerValue.includes('enterococcus')) context.conditions.infection.organism = 'enterococcus';
                    else if (lowerValue.includes('candida')) context.conditions.infection.organism = 'candida';
                    else if (lowerValue.includes('bacteroides')) context.conditions.infection.organism = 'bacteroides';
                    else if (lowerValue.includes('enterobacter')) context.conditions.infection.organism = 'enterobacter';
                }
                if (lowerValue.includes('septic shock')) {
                    if (!context.conditions.infection) context.conditions.infection = { present: true };
                    if (!context.conditions.infection.sepsis) context.conditions.infection.sepsis = { present: true };
                    context.conditions.infection.sepsis.shock = true;
                }

                // Pneumonia
                if (lowerValue.includes('pneumonia')) {
                    if (!context.conditions.respiratory) context.conditions.respiratory = {};
                    context.conditions.respiratory.pneumonia = { type: 'unspecified' };
                    if (lowerValue.includes('mrsa')) context.conditions.respiratory.pneumonia.organism = 'mrsa';
                    else if (lowerValue.includes('mssa')) context.conditions.respiratory.pneumonia.organism = 'mssa';
                    else if (lowerValue.includes('pseudomonas')) context.conditions.respiratory.pneumonia.organism = 'pseudomonas';
                    else if (lowerValue.includes('klebsiella')) context.conditions.respiratory.pneumonia.organism = 'klebsiella';
                    else if (lowerValue.includes('e. coli')) context.conditions.respiratory.pneumonia.organism = 'e_coli';
                    else if (lowerValue.includes('mycoplasma')) context.conditions.respiratory.pneumonia.organism = 'mycoplasma';
                    else if (lowerValue.includes('viral')) context.conditions.respiratory.pneumonia.organism = 'viral';
                }

                // COPD
                if (lowerValue.includes('copd')) {
                    if (!context.conditions.respiratory) context.conditions.respiratory = {};
                    context.conditions.respiratory.copd = { present: true, withExacerbation: false };
                    if (lowerValue.includes('exacerbation') || lowerValue.includes('acute')) {
                        context.conditions.respiratory.copd.withExacerbation = true;
                    }
                }
                // Respiratory Failure
                if (lowerValue.includes('respiratory failure')) {
                    if (!context.conditions.respiratory) context.conditions.respiratory = {};
                    if (!context.conditions.respiratory.failure) context.conditions.respiratory.failure = { type: 'unspecified' };
                    if (lowerValue.includes('acute')) context.conditions.respiratory.failure.type = 'acute';
                    if (lowerValue.includes('chronic')) context.conditions.respiratory.failure.type = 'chronic';
                }

                // Renal / CKD / AKI
                if (lowerValue.includes('kidney failure') || lowerValue.includes('renal failure') || lowerValue.includes('aki') || lowerValue.includes('acute kidney injury')) {
                    if (!context.conditions.ckd) context.conditions.ckd = { stage: undefined as any, onDialysis: false, aki: false, transplantStatus: false };
                    if (lowerValue.includes('acute')) context.conditions.ckd.aki = true;
                }
                if (lowerValue.includes('ckd') || lowerValue.includes('chronic kidney disease')) {
                    if (!context.conditions.ckd) context.conditions.ckd = { stage: undefined as any, onDialysis: false, aki: false, transplantStatus: false };
                    if (lowerValue.includes('stage 4')) context.conditions.ckd.stage = 4;
                    if (lowerValue.includes('stage 5')) context.conditions.ckd.stage = 5;
                    if (lowerValue.includes('esrd')) context.conditions.ckd.stage = 'esrd';
                }
                if (lowerValue.includes('nephropathy')) {
                    if (!context.conditions.diabetes) context.conditions.diabetes = { type: 'type2', complications: [] };
                    context.conditions.diabetes.complications.push('nephropathy'); // Changed from 'ckd' to 'nephropathy'
                }

                // Gastro
                if (lowerValue.includes('cirrhosis')) {
                    if (!context.conditions.gastro) context.conditions.gastro = {};
                    context.conditions.gastro.cirrhosis = { type: 'unspecified' };
                    if (lowerValue.includes('alcoholic')) context.conditions.gastro.cirrhosis.type = 'alcoholic';
                }
                if (lowerValue.includes('ascites')) {
                    if (!context.conditions.gastro) context.conditions.gastro = {};
                    context.conditions.gastro.ascites = true;
                }

                // OB/GYN
                if (lowerValue.includes('preeclampsia')) {
                    if (!context.conditions.obstetric) context.conditions.obstetric = { pregnant: true };
                    context.conditions.obstetric.preeclampsia = true;
                    context.conditions.obstetric.pregnant = true;
                }
                if (lowerValue.includes('pregnant') || lowerValue.includes('pregnancy')) {
                    if (!context.conditions.obstetric) context.conditions.obstetric = { pregnant: true };
                    context.conditions.obstetric.pregnant = true;
                }

                // Cancer
                if (lowerValue.includes('cancer') || lowerValue.includes('carcinoma') || lowerValue.includes('neoplasm')) {
                    if (!context.conditions.neoplasm) context.conditions.neoplasm = { present: true, active: true };
                    // Check for history indicators
                    if (lowerValue.includes('history') || lowerValue.includes('no evidence') || lowerValue.includes('ned')) {
                        context.conditions.neoplasm.active = false;
                    }
                    if (lowerValue.includes('lung')) context.conditions.neoplasm.site = 'lung';
                    if (lowerValue.includes('breast')) context.conditions.neoplasm.site = 'breast';
                    if (lowerValue.includes('colon')) context.conditions.neoplasm.site = 'colon';
                    if (lowerValue.includes('prostate')) context.conditions.neoplasm.site = 'prostate';
                }
                if (lowerValue.includes('chemotherapy')) {
                    if (!context.conditions.neoplasm) context.conditions.neoplasm = { present: true };
                    context.conditions.neoplasm.chemotherapy = true;
                }

                // Neurology
                if (lowerValue.includes('alzheimer')) {
                    if (!context.conditions.neurology) context.conditions.neurology = {};
                    context.conditions.neurology.dementia = { type: 'alzheimer' };
                }
                if (lowerValue.includes('stroke')) {
                    if (!context.conditions.neurology) context.conditions.neurology = {};
                    context.conditions.neurology.stroke = true;
                }
                if (lowerValue.includes('hemiplegia')) {
                    if (!context.conditions.neurology) context.conditions.neurology = {};
                    context.conditions.neurology.hemiplegia = { side: 'unspecified' };
                    if (lowerValue.includes('right')) context.conditions.neurology.hemiplegia.side = 'right';
                    if (lowerValue.includes('left')) context.conditions.neurology.hemiplegia.side = 'left';
                }

                // Infection (HIV/TB)
                if (lowerValue.includes('hiv')) {
                    if (!context.conditions.infection) context.conditions.infection = { present: true };
                    context.conditions.infection.hiv = true;
                }
                if (lowerValue.includes('tuberculosis')) {
                    if (!context.conditions.infection) context.conditions.infection = { present: true };
                    context.conditions.infection.tuberculosis = true;
                }

                // Musculoskeletal
                if (lowerValue.includes('osteoporosis')) {
                    if (!context.conditions.musculoskeletal) context.conditions.musculoskeletal = {};
                    context.conditions.musculoskeletal.osteoporosis = true;
                }
                if (lowerValue.includes('fracture') && lowerValue.includes('pathological')) {
                    if (!context.conditions.musculoskeletal) context.conditions.musculoskeletal = {};
                    context.conditions.musculoskeletal.pathologicalFracture = { site: 'other' };
                    if (lowerValue.includes('femur')) context.conditions.musculoskeletal.pathologicalFracture.site = 'femur';
                }

                // Mental Health
                if (lowerValue.includes('depressive') || lowerValue.includes('depression')) {
                    if (!context.conditions.mental_health) context.conditions.mental_health = {};
                    context.conditions.mental_health.depression = { severity: 'moderate' }; // Default
                    if (lowerValue.includes('severe')) context.conditions.mental_health.depression.severity = 'severe';
                    if (lowerValue.includes('mild')) context.conditions.mental_health.depression.severity = 'mild';
                    if (lowerValue.includes('psychotic')) context.conditions.mental_health.depression.psychoticFeatures = true;
                    if (lowerValue.includes('without psychotic')) context.conditions.mental_health.depression.psychoticFeatures = false;
                }

                // COPD detection (skip if key is 'status' or COPD already exists)
                if (lowerValue.includes('copd') && key.toLowerCase() !== 'status' && !context.conditions.respiratory?.copd) {
                    if (!context.conditions.respiratory) context.conditions.respiratory = {};
                    const withExacerbation = lowerValue.includes('exacerbation') || lowerValue.includes('exacerbated');
                    const withInfection = lowerValue.includes('bronchitis') || lowerValue.includes('pneumonia') || lowerValue.includes('infection');

                    context.conditions.respiratory.copd = {
                        present: true,
                        withExacerbation: withExacerbation && !withInfection,
                        withInfection: withInfection
                    };
                }

                // Pneumonia detection (skip if key is 'status')
                if ((lowerValue.includes('pneumonia') || lowerValue.includes('pneumonitis')) && key.toLowerCase() !== 'status') {
                    if (!context.conditions.respiratory) context.conditions.respiratory = {};
                    if (!context.conditions.respiratory.pneumonia) {
                        let organism: 'strep_pneumoniae' | 'h_influenzae' | 'klebsiella' | 'pseudomonas' |
                            'mssa' | 'mrsa' | 'e_coli' | 'mycoplasma' | 'viral' | 'unspecified' | undefined;
                        let type: 'aspiration' | 'bacterial' | 'viral' | 'unspecified' | undefined;
                        let ventilatorAssociated = false;

                        // Organism detection
                        if (lowerValue.includes('streptococcus pneumoniae') || lowerValue.includes('strep pneumoniae')) organism = 'strep_pneumoniae';
                        else if (lowerValue.includes('haemophilus') || lowerValue.includes('h. influenzae')) organism = 'h_influenzae';
                        else if (lowerValue.includes('klebsiella')) organism = 'klebsiella';
                        else if (lowerValue.includes('pseudomonas')) organism = 'pseudomonas';
                        else if (lowerValue.includes('mssa')) organism = 'mssa';
                        else if (lowerValue.includes('mrsa')) organism = 'mrsa';
                        else if (lowerValue.includes('e. coli') || lowerValue.includes('e.coli')) organism = 'e_coli';
                        else if (lowerValue.includes('mycoplasma')) organism = 'mycoplasma';
                        else if (lowerValue.includes('viral')) organism = 'viral';

                        // Type detection
                        if (lowerValue.includes('aspiration')) type = 'aspiration';
                        else if (lowerValue.includes('bacterial')) {
                            type = 'bacterial';
                            if (!organism) organism = 'unspecified';
                        } else if (lowerValue.includes('viral')) {
                            type = 'viral';
                            if (!organism) organism = 'viral';
                        }

                        // VAP detection
                        if (lowerValue.includes('ventilator')) ventilatorAssociated = true;

                        context.conditions.respiratory.pneumonia = {
                            organism,
                            type,
                            ventilatorAssociated
                        };
                    }
                }

                // Asthma detection (skip if key is 'status' or asthma already exists)
                if (lowerValue.includes('asthma') && !lowerValue.includes('copd') && key.toLowerCase() !== 'status' && !context.conditions.respiratory?.asthma) {
                    if (!context.conditions.respiratory) context.conditions.respiratory = {};

                    // Parse severity
                    let severity: 'mild_intermittent' | 'mild_persistent' | 'moderate_persistent' | 'severe_persistent' | 'unspecified' = 'unspecified';
                    if (lowerValue.includes('mild intermittent')) severity = 'mild_intermittent';
                    else if (lowerValue.includes('mild persistent')) severity = 'mild_persistent';
                    else if (lowerValue.includes('moderate persistent') || lowerValue.includes('moderate')) severity = 'moderate_persistent';
                    else if (lowerValue.includes('severe persistent') || lowerValue.includes('severe')) severity = 'severe_persistent';

                    // Parse status
                    let status: 'uncomplicated' | 'exacerbation' | 'status_asthmaticus' = 'uncomplicated';
                    if (lowerValue.includes('status asthmaticus')) status = 'status_asthmaticus';
                    else if (lowerValue.includes('exacerbation')) status = 'exacerbation';

                    context.conditions.respiratory.asthma = {
                        severity,
                        status
                    };
                }

                if (lowerValue.includes('heart failure')) {
                    if (!context.conditions.cardiovascular) context.conditions.cardiovascular = { hypertension: false };
                    context.conditions.cardiovascular.heartFailure = { type: 'unspecified', acuity: 'unspecified' };
                }

                // Detect HTN from free text
                if (lowerValue.includes('high blood pressure') || lowerValue.includes('htn on medication') ||
                    lowerValue.includes('hypertensive urgency') || lowerValue.includes('hypertensive emergency')) {
                    if (!context.conditions.cardiovascular) context.conditions.cardiovascular = { hypertension: false };
                    context.conditions.cardiovascular.hypertension = true;
                }

                if (lowerValue.includes('hypertension') || lowerValue.includes('hypertensive')) {
                    if (!context.conditions.cardiovascular) context.conditions.cardiovascular = { hypertension: false };
                    context.conditions.cardiovascular.hypertension = true;
                }

                // Hematology
                if (lowerValue.includes('anemia')) {
                    if (!context.conditions.hematology) context.conditions.hematology = {};
                    context.conditions.hematology.anemia = { type: 'unspecified' };
                    if (lowerValue.includes('iron deficiency')) context.conditions.hematology.anemia.type = 'iron_deficiency';
                }

                // Diabetes Complications (Generic) - removed nephropathy/ckd as they're handled in complications section
                if (lowerValue.includes('diabetic') || lowerValue.includes('diabetes')) {
                    if (!context.conditions.diabetes) context.conditions.diabetes = { type: 'type2', complications: [] };
                    if (lowerValue.includes('neuropathy')) context.conditions.diabetes.complications.push('neuropathy');
                    if (lowerValue.includes('retinopathy')) context.conditions.diabetes.complications.push('retinopathy');
                    if (lowerValue.includes('ketoacidosis')) context.conditions.diabetes.complications.push('ketoacidosis');
                    if (lowerValue.includes('foot ulcer')) {
                        context.conditions.diabetes.complications.push('foot_ulcer');
                        // Don't set wounds.present - diabetic foot ulcers are handled in diabetes section
                    }
                }

                // Fallback to specific logic if key matches specific cases below
                if (key === 'complications' || key === 'diabetes complications') {
                    // Existing logic for complications key will run below if we don't break
                    // But we should probably let it fall through or handle it here.
                    // The switch case will execute this block for 'complications'.
                    // We need to ensure we don't double parse or skip the specific diabetes logic below.
                    // Actually, the specific 'complications' case below is unreachable if we match here.
                    // So we must include the specific logic here or merge them.
                    // Let's merge the specific diabetes logic here.
                    if (lowerValue.trim() === 'none') break;
                    const comps = lowerValue.split(',').map(c => c.trim());
                    comps.forEach(c => {
                        const lc = c.toLowerCase();
                        if (lc === 'neuropathy' || lc.includes('polyneuropathy')) {
                            if (!context.conditions.diabetes) context.conditions.diabetes = { type: 'type2', complications: [] };
                            context.conditions.diabetes.complications.push('neuropathy');
                        }
                        else if (lc.includes('nephropathy') || lc.includes('ckd') || lc.includes('chronic kidney disease')) {
                            if (!context.conditions.diabetes) context.conditions.diabetes = { type: 'type2', complications: [] };
                            // Distinguish: "Nephropathy" alone → nephropathy, "CKD" or "Chronic Kidney Disease" → ckd
                            if (lc.includes('ckd') || lc.includes('chronic kidney disease')) {
                                context.conditions.diabetes.complications.push('ckd');
                                // Create CKD object for explicit CKD
                                if (!context.conditions.ckd) context.conditions.ckd = { stage: undefined as any, onDialysis: false, aki: false, transplantStatus: false };
                            } else {
                                // Just "nephropathy" without CKD
                                context.conditions.diabetes.complications.push('nephropathy');
                            }
                        }
                        else if (lc.includes('foot ulcer')) {
                            if (!context.conditions.diabetes) context.conditions.diabetes = { type: 'type2', complications: [] };
                            context.conditions.diabetes.complications.push('foot_ulcer');
                            // Don't set wounds.present - handled in diabetes section
                        }
                        else if (lc.includes('retinopathy')) {
                            if (!context.conditions.diabetes) context.conditions.diabetes = { type: 'type2', complications: [] };
                            context.conditions.diabetes.complications.push('retinopathy');
                        }
                        else if (lc.includes('hypoglycemia')) {
                            if (!context.conditions.diabetes) context.conditions.diabetes = { type: 'type2', complications: [] };
                            context.conditions.diabetes.complications.push('hypoglycemia');
                        }
                        else if (lc.includes('ketoacidosis')) {
                            if (!context.conditions.diabetes) context.conditions.diabetes = { type: 'type2', complications: [] };
                            context.conditions.diabetes.complications.push('ketoacidosis');
                        }
                        else if (lc.includes('ascites')) { // Handle ascites in complications
                            if (!context.conditions.gastro) context.conditions.gastro = {};
                            context.conditions.gastro.ascites = true;
                        }
                        else if (lc.includes('respiratory failure')) {
                            if (!context.conditions.respiratory) context.conditions.respiratory = {};
                            context.conditions.respiratory.failure = { type: 'acute' }; // Default to acute if in complications
                        }
                        else if (lc.includes('kidney failure') || lc.includes('aki')) {
                            if (!context.conditions.ckd) context.conditions.ckd = { stage: undefined as any, onDialysis: false, aki: false, transplantStatus: false };
                            context.conditions.ckd.aki = true;
                        }
                        else if (lc.includes('heart failure')) {
                            if (!context.conditions.cardiovascular) context.conditions.cardiovascular = { hypertension: false };
                            context.conditions.cardiovascular.heartFailure = { type: 'unspecified', acuity: 'unspecified' };
                        }
                    });
                }
                break;

            // Demographics
            case 'inpatient':
            case 'icu':
                context.encounter.type = 'inpatient';
                break;
            case 'age':
                context.demographics.age = parseInt(value);
                break;
            case 'gender':
            case 'sex':
                context.demographics.gender = lowerValue === 'male' ? 'male' : 'female';
                break;
            case 'encounter type':
            case 'encounter':
                if (lowerValue === 'inpatient') context.encounter.type = 'inpatient';
                else if (lowerValue === 'outpatient') context.encounter.type = 'outpatient';
                else if (lowerValue === 'ed') context.encounter.type = 'ed';
                else if (lowerValue === 'initial') context.encounter.type = 'initial';
                else if (lowerValue === 'subsequent') context.encounter.type = 'subsequent';
                else if (lowerValue === 'sequela') context.encounter.type = 'sequela';
                else if (lowerValue === 'icu') context.encounter.type = 'inpatient';
                else errors.push(`Invalid encounter type: ${value}`);
                break;

            // Diabetes
            case 'diabetes type':
                if (!context.conditions.diabetes) context.conditions.diabetes = { type: 'type2', complications: [] };
                if (lowerValue === 'type 1') context.conditions.diabetes.type = 'type1';
                else if (lowerValue === 'type 2') context.conditions.diabetes.type = 'type2';
                else if (lowerValue.includes('drug')) context.conditions.diabetes.type = 'drug_induced';
                else if (lowerValue.includes('secondary')) context.conditions.diabetes.type = 'secondary';
                else errors.push(`Invalid diabetes type: ${value}`);
                break;
                // case 'complications': // Merged above
                // case 'diabetes complications': // Merged above
                if (!context.conditions.diabetes) context.conditions.diabetes = { type: 'type2', complications: [] };
                if (lowerValue.trim() === 'none') break; // Ignore 'none'
                const comps = lowerValue.split(',').map(c => c.trim());
                comps.forEach(c => {
                    if (c === 'neuropathy') context.conditions.diabetes!.complications.push('neuropathy');
                    else if (c.includes('nephropathy') || c.includes('ckd') || c.includes('chronic kidney disease')) {
                        // Distinguish: "Nephropathy" alone → nephropathy, "CKD" or "Chronic Kidney Disease" → ckd
                        if (c.includes('ckd') || c.includes('chronic kidney disease')) {
                            context.conditions.diabetes!.complications.push('ckd');
                            if (!context.conditions.ckd) context.conditions.ckd = { stage: undefined as any, onDialysis: false, aki: false, transplantStatus: false };
                        } else {
                            context.conditions.diabetes!.complications.push('nephropathy');
                        }
                    }
                    else if (c.includes('foot ulcer')) {
                        context.conditions.diabetes!.complications.push('foot_ulcer');
                        // Don't set wounds.present - handled in diabetes section
                    }
                    else if (c.includes('retinopathy')) context.conditions.diabetes!.complications.push('retinopathy');
                    else if (c.includes('hypoglycemia')) context.conditions.diabetes!.complications.push('hypoglycemia');
                    else if (c === 'ketoacidosis') context.conditions.diabetes!.complications.push('ketoacidosis');
                    else if (c === 'hyperosmolar') context.conditions.diabetes!.complications.push('hyperosmolar');
                    else if (c === 'gangrene') context.conditions.diabetes!.complications.push('gangrene');
                    else if (c === 'amputation') context.conditions.diabetes!.complications.push('amputation');
                    else if (c === 'unspecified') context.conditions.diabetes!.complications.push('unspecified');
                    else if (c) errors.push(`Unknown diabetes complication: ${c}`);
                });
                break;
            case 'insulin use':
                if (!context.conditions.diabetes) context.conditions.diabetes = { type: 'type2', complications: [] };
                context.conditions.diabetes.insulinUse = parseBoolean(value);
                break;
            case 'ulcer site':
                if (!context.conditions.diabetes) context.conditions.diabetes = { type: 'type2', complications: [] };
                if (lowerValue.includes('left') && lowerValue.includes('foot')) context.conditions.diabetes.ulcerSite = 'foot_left';
                else if (lowerValue.includes('right') && lowerValue.includes('foot')) context.conditions.diabetes.ulcerSite = 'foot_right';
                else context.conditions.diabetes.ulcerSite = 'other';
                break;
            case 'ulcer severity':
            case 'ulcer depth':
            case 'ulcer severity / ulcer depth':
            case 'wound depth':
                if (!context.conditions.diabetes) context.conditions.diabetes = { type: 'type2', complications: [] };
                if (lowerValue.includes('muscle')) context.conditions.diabetes.ulcerSeverity = 'muscle';
                else if (lowerValue.includes('bone')) context.conditions.diabetes.ulcerSeverity = 'bone';
                else if (lowerValue.includes('fat')) context.conditions.diabetes.ulcerSeverity = 'fat'; // Fat layer exposed = fat depth (L97.x12)
                else if (lowerValue.includes('skin')) context.conditions.diabetes.ulcerSeverity = 'skin';
                else context.conditions.diabetes.ulcerSeverity = 'unspecified';
                break;

            // Renal
            case 'ckd present':
            case 'chronic kidney disease':
                if (parseBoolean(value)) {
                    if (!context.conditions.ckd) {
                        // Create CKD object but DON'T set a default stage - let validation catch it
                        context.conditions.ckd = { stage: undefined as any, onDialysis: false, aki: false, transplantStatus: false };
                    }
                }
                break;
            case 'ckd stage':
                if (!context.conditions.ckd) context.conditions.ckd = { stage: undefined as any, onDialysis: false, aki: false, transplantStatus: false };
                if (value === '1') context.conditions.ckd.stage = 1;
                else if (value === '2') context.conditions.ckd.stage = 2;
                else if (value === '3') context.conditions.ckd.stage = 3;
                else if (value === '4') context.conditions.ckd.stage = 4;
                else if (value === '5') context.conditions.ckd.stage = 5;
                else if (lowerValue === 'esrd') context.conditions.ckd.stage = 'esrd';
                else errors.push(`Invalid CKD stage: ${value}`);
                break;
            case 'dialysis':
            case 'dialysis status':
            case 'dialysis / dialysis status':
            case 'on dialysis':
                if (!context.conditions.ckd) context.conditions.ckd = { stage: undefined as any, onDialysis: false, aki: false, transplantStatus: false };
                // Handle new format: None/Temporary/Chronic
                if (lowerValue === 'none') {
                    context.conditions.ckd.onDialysis = false;
                    context.conditions.ckd.dialysisType = 'none';
                } else if (lowerValue === 'temporary') {
                    context.conditions.ckd.onDialysis = true;
                    context.conditions.ckd.dialysisType = 'temporary';
                } else if (lowerValue === 'chronic') {
                    context.conditions.ckd.onDialysis = true;
                    context.conditions.ckd.dialysisType = 'chronic';
                } else if (key === 'on dialysis' && parseBoolean(value)) {
                    // "On dialysis: Yes" implies chronic in this context
                    context.conditions.ckd.onDialysis = true;
                    context.conditions.ckd.dialysisType = 'chronic';
                } else if (key !== 'on dialysis') {
                    // Legacy Yes/No format for 'dialysis' or 'dialysis status' keys
                    context.conditions.ckd.onDialysis = parseBoolean(value);
                }
                break;
            case 'acute kidney injury':
            case 'acute kidney injury / aki':
            case 'aki':
            case 'aki present':
                if (!context.conditions.ckd) context.conditions.ckd = { stage: undefined as any, onDialysis: false, aki: false, transplantStatus: false };
                context.conditions.ckd.aki = parseBoolean(value);
                break;
            case 'kidney transplant history':
            case 'transplant':
                if (!context.conditions.ckd) context.conditions.ckd = { stage: undefined as any, onDialysis: false, aki: false, transplantStatus: false };
                context.conditions.ckd.transplantStatus = parseBoolean(value);
                break;

            // Cardiovascular
            case 'hypertension':
                if (!context.conditions.cardiovascular) context.conditions.cardiovascular = { hypertension: false };
                context.conditions.cardiovascular.hypertension = parseBoolean(value);
                break;
            case 'heart failure':
            case 'hf':
            case 'chf':
                if (!context.conditions.cardiovascular) context.conditions.cardiovascular = { hypertension: false };
                if (parseBoolean(value) || value.toLowerCase() !== 'no') {
                    // Parse type and acuity from value
                    const lv = value.toLowerCase();
                    let type: 'systolic' | 'diastolic' | 'combined' | 'unspecified' = 'unspecified';
                    let acuity: 'acute' | 'chronic' | 'acute_on_chronic' | 'unspecified' = 'unspecified';

                    // Detect type
                    if (lv.includes('systolic')) type = 'systolic';
                    else if (lv.includes('diastolic')) type = 'diastolic';
                    else if (lv.includes('combined')) type = 'combined';

                    // Detect acuity
                    if (lv.includes('acute on chronic') || lv.includes('acute-on-chronic')) acuity = 'acute_on_chronic';
                    else if (lv.includes('acute')) acuity = 'acute';
                    else if (lv.includes('chronic')) acuity = 'chronic';

                    context.conditions.cardiovascular.heartFailure = { type, acuity };
                }
                break;
            case 'heart failure type':
                if (!context.conditions.cardiovascular?.heartFailure) {
                    if (!context.conditions.cardiovascular) context.conditions.cardiovascular = { hypertension: false };
                    context.conditions.cardiovascular.heartFailure = { type: 'unspecified', acuity: 'unspecified' };
                }
                if (['systolic', 'diastolic', 'combined'].includes(lowerValue)) context.conditions.cardiovascular!.heartFailure!.type = lowerValue as any;
                break;
            case 'heart failure acuity':
                if (!context.conditions.cardiovascular?.heartFailure) {
                    if (!context.conditions.cardiovascular) context.conditions.cardiovascular = { hypertension: false };
                    context.conditions.cardiovascular.heartFailure = { type: 'unspecified', acuity: 'unspecified' };
                }
                if (lowerValue.includes('acute on chronic')) context.conditions.cardiovascular!.heartFailure!.acuity = 'acute_on_chronic';
                else if (lowerValue === 'acute') context.conditions.cardiovascular!.heartFailure!.acuity = 'acute';
                else if (lowerValue === 'chronic') context.conditions.cardiovascular!.heartFailure!.acuity = 'chronic';
                break;

            // Respiratory
            case 'pneumonia':
                if (!context.conditions.respiratory) context.conditions.respiratory = {};

                // Parse organism and type from value
                let organism: 'strep_pneumoniae' | 'h_influenzae' | 'klebsiella' | 'pseudomonas' |
                    'mssa' | 'mrsa' | 'e_coli' | 'mycoplasma' | 'viral' | 'unspecified' | undefined;
                let type: 'aspiration' | 'bacterial' | 'viral' | 'unspecified' | undefined;
                let ventilatorAssociated = false;

                // Organism detection
                if (lowerValue.includes('streptococcus pneumoniae') || lowerValue.includes('strep pneumoniae')) {
                    organism = 'strep_pneumoniae';
                } else if (lowerValue.includes('haemophilus influenzae') || lowerValue.includes('h. influenzae') || lowerValue.includes('h influenzae')) {
                    organism = 'h_influenzae';
                } else if (lowerValue.includes('klebsiella')) {
                    organism = 'klebsiella';
                } else if (lowerValue.includes('pseudomonas')) {
                    organism = 'pseudomonas';
                } else if (lowerValue.includes('mssa') || lowerValue.includes('methicillin susceptible')) {
                    organism = 'mssa';
                } else if (lowerValue.includes('mrsa') || lowerValue.includes('methicillin resistant')) {
                    organism = 'mrsa';
                } else if (lowerValue.includes('e. coli') || lowerValue.includes('e.coli') || lowerValue.includes('escherichia coli')) {
                    organism = 'e_coli';
                } else if (lowerValue.includes('mycoplasma')) {
                    organism = 'mycoplasma';
                } else if (lowerValue.includes('viral')) {
                    organism = 'viral';
                }

                // Type detection
                if (lowerValue.includes('aspiration')) {
                    type = 'aspiration';
                } else if (lowerValue.includes('bacterial')) {
                    type = 'bacterial';
                    if (!organism) organism = 'unspecified';
                } else if (lowerValue.includes('viral')) {
                    type = 'viral';
                    if (!organism) organism = 'viral';
                }

                // Ventilator-associated detection
                if (lowerValue.includes('ventilator') || lowerValue.includes('vap')) {
                    ventilatorAssociated = true;
                }

                context.conditions.respiratory.pneumonia = {
                    organism,
                    type,
                    ventilatorAssociated
                };
                break;
            case 'pneumonia organism':
                if (!context.conditions.respiratory?.pneumonia) {
                    if (!context.conditions.respiratory) context.conditions.respiratory = {};
                    context.conditions.respiratory.pneumonia = { type: 'unspecified' };
                }
                if (lowerValue.includes('pseudomonas')) context.conditions.respiratory!.pneumonia!.organism = 'pseudomonas';
                else if (lowerValue.includes('mrsa')) context.conditions.respiratory!.pneumonia!.organism = 'mrsa';
                else if (lowerValue.includes('mssa')) context.conditions.respiratory!.pneumonia!.organism = 'mssa';
                else if (lowerValue.includes('e. coli') || lowerValue.includes('e.coli')) context.conditions.respiratory!.pneumonia!.organism = 'e_coli';
                else if (lowerValue.includes('klebsiella')) context.conditions.respiratory!.pneumonia!.organism = 'klebsiella';
                else if (lowerValue.includes('mycoplasma')) context.conditions.respiratory!.pneumonia!.organism = 'mycoplasma';
                else if (lowerValue.includes('viral')) context.conditions.respiratory!.pneumonia!.organism = 'viral';
                break;
            case 'copd':
            case 'chronic obstructive pulmonary disease':
                if (!context.conditions.respiratory) context.conditions.respiratory = {};
                // Always parse COPD field - check for exacerbation/infection in value
                const withExacerbation = lowerValue.includes('exacerbation') || lowerValue.includes('exacerbated');
                const withInfection = lowerValue.includes('bronchitis') || lowerValue.includes('pneumonia') || lowerValue.includes('infection');

                context.conditions.respiratory.copd = {
                    present: true,
                    withExacerbation: withExacerbation && !withInfection,
                    withInfection: withInfection
                };
                break;
            case 'asthma':
                if (!context.conditions.respiratory) context.conditions.respiratory = {};

                // Parse severity
                let severity: 'mild_intermittent' | 'mild_persistent' | 'moderate_persistent' | 'severe_persistent' | 'unspecified' = 'unspecified';
                if (lowerValue.includes('mild intermittent')) severity = 'mild_intermittent';
                else if (lowerValue.includes('mild persistent')) severity = 'mild_persistent';
                else if (lowerValue.includes('moderate persistent') || lowerValue.includes('moderate')) severity = 'moderate_persistent';
                else if (lowerValue.includes('severe persistent') || lowerValue.includes('severe')) severity = 'severe_persistent';

                // Parse status
                let status: 'uncomplicated' | 'exacerbation' | 'status_asthmaticus' = 'uncomplicated';

                context.conditions.respiratory.asthma = {
                    severity,
                    status
                };
                break;
            case 'status':
            case 'asthma status':
                if (!context.conditions.respiratory) context.conditions.respiratory = {};
                if (!context.conditions.respiratory.asthma) {
                    context.conditions.respiratory.asthma = { severity: 'unspecified', status: 'uncomplicated' };
                }

                // Update asthma status only
                if (lowerValue.includes('status asthmaticus')) {
                    context.conditions.respiratory.asthma.status = 'status_asthmaticus';
                } else if (lowerValue.includes('exacerbation')) {
                    context.conditions.respiratory.asthma.status = 'exacerbation';
                } else if (parseBoolean(value)) {
                    // "Status: Yes" means uncomplicated
                    context.conditions.respiratory.asthma.status = 'uncomplicated';
                }
                break;

            // Infections & Sepsis
            case 'infection present':
                if (!context.conditions.infection) context.conditions.infection = { present: false };
                context.conditions.infection.present = parseBoolean(value);
                break;
            case 'infection site':
                if (!context.conditions.infection) context.conditions.infection = { present: true };
                if (lowerValue.includes('lung') || lowerValue.includes('pneumonia')) context.conditions.infection.site = 'lung';
                else if (lowerValue.includes('urinary') || lowerValue.includes('uti')) context.conditions.infection.site = 'urinary';
                else if (lowerValue.includes('blood')) context.conditions.infection.site = 'blood';
                else if (lowerValue.includes('skin')) context.conditions.infection.site = 'skin';
                else context.conditions.infection.site = 'other';
                break;
            case 'organism':
                if (!context.conditions.infection) context.conditions.infection = { present: true };
                if (lowerValue.includes('mrsa')) context.conditions.infection.organism = 'mrsa';
                else if (lowerValue.includes('e. coli') || lowerValue.includes('e.coli')) context.conditions.infection.organism = 'e_coli';
                else if (lowerValue.includes('pseudomonas')) context.conditions.infection.organism = 'pseudomonas';
                else if (lowerValue.includes('staphylococcus aureus') || lowerValue.includes('staph aureus')) context.conditions.infection.organism = 'mssa';
                else if (lowerValue.includes('staphylococcus') || lowerValue.includes('staph')) context.conditions.infection.organism = 'staph';
                else if (lowerValue.includes('streptococcus') || lowerValue.includes('strep')) context.conditions.infection.organism = 'strep';
                else if (lowerValue.includes('klebsiella')) context.conditions.infection.organism = 'klebsiella';
                else if (lowerValue.includes('enterococcus')) context.conditions.infection.organism = 'enterococcus';
                else if (lowerValue.includes('proteus')) context.conditions.infection.organism = 'proteus';
                else if (lowerValue.includes('candida')) context.conditions.infection.organism = 'candida';
                else if (lowerValue.includes('bacteroides')) context.conditions.infection.organism = 'bacteroides';
                else if (lowerValue.includes('enterobacter')) context.conditions.infection.organism = 'enterobacter';
                else context.conditions.infection.organism = 'unspecified';
                break;
            case 'sepsis':
                if (!context.conditions.infection) context.conditions.infection = { present: true };
                if (!context.conditions.infection.sepsis) context.conditions.infection.sepsis = { present: false };
                context.conditions.infection.sepsis.present = parseBoolean(value);
                break;
            case 'severe sepsis':
                if (!context.conditions.infection) context.conditions.infection = { present: true };
                if (!context.conditions.infection.sepsis) context.conditions.infection.sepsis = { present: true };
                context.conditions.infection.sepsis.severe = parseBoolean(value);
                break;
            case 'septic shock':
                if (!context.conditions.infection) context.conditions.infection = { present: true };
                if (!context.conditions.infection.sepsis) context.conditions.infection.sepsis = { present: true };
                context.conditions.infection.sepsis.shock = parseBoolean(value);
                break;
            case 'hospital-acquired':
            case 'hai':
                if (!context.conditions.infection) context.conditions.infection = { present: true };
                context.conditions.infection.hospitalAcquired = parseBoolean(value);
                break;

            // Wounds & Ulcers
            case 'ulcer present':
            case 'wound present':
            case 'pressure ulcer':
                if (!context.conditions.wounds) context.conditions.wounds = { present: false };
                context.conditions.wounds.present = parseBoolean(value);
                if (key === 'pressure ulcer' && parseBoolean(value)) {
                    context.conditions.wounds.type = 'pressure';
                }
                break;
            case 'ulcer type':
            case 'wound type':
                if (!context.conditions.wounds) context.conditions.wounds = { present: true };
                if (lowerValue.includes('pressure')) context.conditions.wounds.type = 'pressure';
                else if (lowerValue.includes('diabetic')) context.conditions.wounds.type = 'diabetic';
                else if (lowerValue.includes('traumatic')) context.conditions.wounds.type = 'traumatic';
                else if (lowerValue.includes('venous')) context.conditions.wounds.type = 'venous';
                else if (lowerValue.includes('arterial')) context.conditions.wounds.type = 'arterial';
                break;
            case 'ulcer location':
            case 'wound location':
                if (!context.conditions.wounds) context.conditions.wounds = { present: true };
                if (lowerValue.includes('sacral') || lowerValue.includes('sacrum')) context.conditions.wounds.location = 'sacral';
                else if (lowerValue.includes('right') && lowerValue.includes('foot')) context.conditions.wounds.location = 'foot_right';
                else if (lowerValue.includes('left') && lowerValue.includes('foot')) context.conditions.wounds.location = 'foot_left';
                else if (lowerValue.includes('heel')) context.conditions.wounds.location = 'heel';
                else if (lowerValue.includes('buttock')) context.conditions.wounds.location = 'buttock';
                else context.conditions.wounds.location = 'other';
                break;
            case 'ulcer stage':
            case 'pressure ulcer stage':
            case 'stage':
                if (!context.conditions.wounds) context.conditions.wounds = { present: true };
                if (lowerValue.includes('1')) context.conditions.wounds.stage = 'stage1';
                else if (lowerValue.includes('2')) context.conditions.wounds.stage = 'stage2';
                else if (lowerValue.includes('3')) context.conditions.wounds.stage = 'stage3';
                else if (lowerValue.includes('4')) context.conditions.wounds.stage = 'stage4';
                else if (lowerValue.includes('unstageable')) context.conditions.wounds.stage = 'unstageable';
                else if (lowerValue.includes('deep tissue')) context.conditions.wounds.stage = 'deep_tissue';
                break;

            // Injury & Trauma
            case 'injury present':
            case 'trauma present':
                if (!context.conditions.injury) context.conditions.injury = { present: false };
                context.conditions.injury.present = parseBoolean(value);
                break;
            case 'injury type':
            case 'trauma type':
                if (!context.conditions.injury) context.conditions.injury = { present: true };
                if (lowerValue.includes('fracture')) context.conditions.injury.type = 'fracture';
                else if (lowerValue.includes('open wound') || lowerValue.includes('laceration')) context.conditions.injury.type = 'open_wound';
                else if (lowerValue.includes('burn')) context.conditions.injury.type = 'burn';
                else if (lowerValue.includes('contusion')) context.conditions.injury.type = 'contusion';
                break;
            case 'body region':
            case 'injury site':
                if (!context.conditions.injury) context.conditions.injury = { present: true };
                context.conditions.injury.bodyRegion = value; // Store as-is for flexibility
                break;
            case 'laterality':
                if (!context.conditions.injury) context.conditions.injury = { present: true };
                if (lowerValue.includes('left')) context.conditions.injury.laterality = 'left';
                else if (lowerValue.includes('right')) context.conditions.injury.laterality = 'right';
                else if (lowerValue.includes('bilateral')) context.conditions.injury.laterality = 'bilateral';
                break;
            case 'injury encounter type':
            case 'encounter type for injury':
                if (!context.conditions.injury) context.conditions.injury = { present: true };
                if (lowerValue.includes('initial')) context.conditions.injury.encounterType = 'initial';
                else if (lowerValue.includes('subsequent')) context.conditions.injury.encounterType = 'subsequent';
                else if (lowerValue.includes('sequela')) context.conditions.injury.encounterType = 'sequela';
                break;
            case 'external cause':
            case 'mechanism':
                if (!context.conditions.injury) context.conditions.injury = { present: true };
                if (!context.conditions.injury.externalCause) context.conditions.injury.externalCause = { present: true };
                if (lowerValue.includes('fall')) context.conditions.injury.externalCause.mechanism = 'fall';
                else if (lowerValue.includes('mvc') || lowerValue.includes('motor vehicle')) context.conditions.injury.externalCause.mechanism = 'mvc';
                else if (lowerValue.includes('assault')) context.conditions.injury.externalCause.mechanism = 'assault';
                else if (lowerValue.includes('sport')) context.conditions.injury.externalCause.mechanism = 'sports';
                else context.conditions.injury.externalCause.mechanism = 'other';
                break;

            // Neurology
            case 'altered mental status':
            case 'ams':
                if (!context.conditions.neurology) context.conditions.neurology = {};
                context.conditions.neurology.alteredMentalStatus = parseBoolean(value);
                break;
            case 'encephalopathy':
                if (!context.conditions.neurology) context.conditions.neurology = {};
                context.conditions.neurology.encephalopathy = { present: parseBoolean(value) };
                break;
            case 'encephalopathy type':
                if (!context.conditions.neurology) context.conditions.neurology = {};
                if (!context.conditions.neurology.encephalopathy) context.conditions.neurology.encephalopathy = { present: true };
                if (lowerValue.includes('metabolic')) context.conditions.neurology.encephalopathy.type = 'metabolic';
                else if (lowerValue.includes('toxic')) context.conditions.neurology.encephalopathy.type = 'toxic';
                else if (lowerValue.includes('hepatic')) context.conditions.neurology.encephalopathy.type = 'hepatic';
                else if (lowerValue.includes('hypoxic')) context.conditions.neurology.encephalopathy.type = 'hypoxic';
                break;
            case 'seizure':
            case 'seizure disorder':
                if (!context.conditions.neurology) context.conditions.neurology = {};
                context.conditions.neurology.seizure = parseBoolean(value);
                break;
            case 'dementia':
                if (!context.conditions.neurology) context.conditions.neurology = {};
                if (parseBoolean(value)) context.conditions.neurology.dementia = { type: 'unspecified' };
                break;
            case 'dementia type':
                if (!context.conditions.neurology) context.conditions.neurology = {};
                if (!context.conditions.neurology.dementia) context.conditions.neurology.dementia = { type: 'unspecified' };
                if (lowerValue.includes('alzheimer')) context.conditions.neurology.dementia.type = 'alzheimer';
                else if (lowerValue.includes('vascular')) context.conditions.neurology.dementia.type = 'vascular';
                break;
            case 'parkinson':
            case 'parkinsons':
                if (!context.conditions.neurology) context.conditions.neurology = {};
                context.conditions.neurology.parkinsons = parseBoolean(value);
                break;
            case 'coma':
                if (!context.conditions.neurology) context.conditions.neurology = {};
                context.conditions.neurology.coma = parseBoolean(value);
                break;
            case 'gcs':
            case 'glasgow coma scale':
                if (!context.conditions.neurology) context.conditions.neurology = {};
                const gcsValue = parseInt(value);
                if (!isNaN(gcsValue)) context.conditions.neurology.gcs = gcsValue;
                break;

            // Gastroenterology
            case 'liver disease':
                if (!context.conditions.gastro) context.conditions.gastro = {};
                context.conditions.gastro.liverDisease = parseBoolean(value);
                break;
            case 'cirrhosis':
                if (!context.conditions.gastro) context.conditions.gastro = {};
                if (parseBoolean(value)) context.conditions.gastro.cirrhosis = { type: 'unspecified' };
                break;
            case 'cirrhosis type':
                if (!context.conditions.gastro) context.conditions.gastro = {};
                if (!context.conditions.gastro.cirrhosis) context.conditions.gastro.cirrhosis = { type: 'unspecified' };
                if (lowerValue.includes('alcoholic')) context.conditions.gastro.cirrhosis.type = 'alcoholic';
                else if (lowerValue.includes('nash')) context.conditions.gastro.cirrhosis.type = 'nash';
                break;
            case 'hepatitis':
                if (!context.conditions.gastro) context.conditions.gastro = {};
                if (parseBoolean(value)) context.conditions.gastro.hepatitis = { type: 'unspecified' };
                break;
            case 'hepatitis type':
                if (!context.conditions.gastro) context.conditions.gastro = {};
                if (!context.conditions.gastro.hepatitis) context.conditions.gastro.hepatitis = { type: 'unspecified' };
                if (lowerValue === 'a') context.conditions.gastro.hepatitis.type = 'a';
                else if (lowerValue === 'b') context.conditions.gastro.hepatitis.type = 'b';
                else if (lowerValue === 'c') context.conditions.gastro.hepatitis.type = 'c';
                else if (lowerValue.includes('alcoholic')) context.conditions.gastro.hepatitis.type = 'alcoholic';
                break;
            case 'gi bleeding':
                if (!context.conditions.gastro) context.conditions.gastro = {};
                if (parseBoolean(value)) context.conditions.gastro.bleeding = { site: 'unspecified' };
                break;
            case 'bleeding site':
                if (!context.conditions.gastro) context.conditions.gastro = {};
                if (!context.conditions.gastro.bleeding) context.conditions.gastro.bleeding = { site: 'unspecified' };
                if (lowerValue.includes('upper')) context.conditions.gastro.bleeding.site = 'upper';
                else if (lowerValue.includes('lower')) context.conditions.gastro.bleeding.site = 'lower';
                break;
            case 'pancreatitis':
                if (!context.conditions.gastro) context.conditions.gastro = {};
                if (parseBoolean(value)) context.conditions.gastro.pancreatitis = { type: 'unspecified' };
                break;
            case 'pancreatitis type':
                if (!context.conditions.gastro) context.conditions.gastro = {};
                if (!context.conditions.gastro.pancreatitis) context.conditions.gastro.pancreatitis = { type: 'unspecified' };
                if (lowerValue.includes('acute')) context.conditions.gastro.pancreatitis.type = 'acute';
                else if (lowerValue.includes('chronic')) context.conditions.gastro.pancreatitis.type = 'chronic';
                break;
            case 'ascites':
                if (!context.conditions.gastro) context.conditions.gastro = {};
                context.conditions.gastro.ascites = parseBoolean(value);
                break;

            // Hematology/Oncology
            case 'cancer':
            case 'cancer present':
                if (!context.conditions.neoplasm) context.conditions.neoplasm = { present: false };
                context.conditions.neoplasm!.present = parseBoolean(value);
                break;
            case 'cancer site':
            case 'primary site':
                if (!context.conditions.neoplasm) context.conditions.neoplasm = { present: true };
                if (lowerValue.includes('lung')) context.conditions.neoplasm.site = 'lung';
                else if (lowerValue.includes('breast')) context.conditions.neoplasm.site = 'breast';
                else if (lowerValue.includes('colon')) context.conditions.neoplasm.site = 'colon';
                else if (lowerValue.includes('prostate')) context.conditions.neoplasm.site = 'prostate';
                else context.conditions.neoplasm.site = 'other';
                break;
            case 'metastasis':
            case 'active disease':
                if (!context.conditions.neoplasm) context.conditions.neoplasm = { present: true, active: true };
                // If "Active disease: No" then it's history
                if (lowerValue === 'no' || lowerValue === 'false') {
                    context.conditions.neoplasm.active = false;
                }
                break;
            case 'metastatic site':
                if (!context.conditions.neoplasm) context.conditions.neoplasm = { present: true, metastasis: true };
                if (lowerValue.includes('bone')) context.conditions.neoplasm.metastaticSite = 'bone';
                else if (lowerValue.includes('brain')) context.conditions.neoplasm.metastaticSite = 'brain';
                else if (lowerValue.includes('liver')) context.conditions.neoplasm.metastaticSite = 'liver';
                else if (lowerValue.includes('lung')) context.conditions.neoplasm.metastaticSite = 'lung';
                break;
            case 'chemotherapy':
                if (!context.conditions.neoplasm) context.conditions.neoplasm = { present: true };
                context.conditions.neoplasm.chemotherapy = parseBoolean(value);
                break;
            case 'anemia':
                if (!context.conditions.hematology) context.conditions.hematology = {};
                if (parseBoolean(value)) context.conditions.hematology.anemia = { type: 'unspecified' };
                break;
            case 'anemia type':
                if (!context.conditions.hematology) context.conditions.hematology = {};
                if (!context.conditions.hematology.anemia) context.conditions.hematology.anemia = { type: 'unspecified' };
                if (lowerValue.includes('iron')) context.conditions.hematology.anemia.type = 'iron_deficiency';
                else if (lowerValue.includes('b12')) context.conditions.hematology.anemia.type = 'b12_deficiency';
                else if (lowerValue.includes('chronic disease')) context.conditions.hematology.anemia.type = 'chronic_disease';
                else if (lowerValue.includes('blood loss')) context.conditions.hematology.anemia.type = 'acute_blood_loss';
                break;
            case 'coagulopathy':
                if (!context.conditions.hematology) context.conditions.hematology = {};
                context.conditions.hematology.coagulopathy = parseBoolean(value);
                break;

            // OB/GYN
            case 'pregnancy':
            case 'pregnant':
                if (!context.conditions.obstetric) context.conditions.obstetric = {};
                context.conditions.obstetric.pregnant = parseBoolean(value);
                break;
            case 'trimester':
                if (!context.conditions.obstetric) context.conditions.obstetric = { pregnant: true };
                if (lowerValue.includes('1') || lowerValue.includes('first')) context.conditions.obstetric.trimester = 1;
                else if (lowerValue.includes('2') || lowerValue.includes('second')) context.conditions.obstetric.trimester = 2;
                else if (lowerValue.includes('3') || lowerValue.includes('third')) context.conditions.obstetric.trimester = 3;
                break;
            case 'gestational age':
            case 'weeks':
                if (!context.conditions.obstetric) context.conditions.obstetric = { pregnant: true };
                const weeks = parseInt(value);
                if (!isNaN(weeks)) context.conditions.obstetric.gestationalAge = weeks;
                break;
            case 'delivery':
                if (!context.conditions.obstetric) context.conditions.obstetric = { pregnant: true };
                context.conditions.obstetric.delivery = { occurred: parseBoolean(value) };
                break;
            case 'delivery type':
                if (!context.conditions.obstetric) context.conditions.obstetric = { pregnant: true };
                if (!context.conditions.obstetric.delivery) context.conditions.obstetric.delivery = { occurred: true };
                if (lowerValue.includes('vaginal') || lowerValue.includes('normal')) context.conditions.obstetric.delivery.type = 'vaginal';
                else if (lowerValue.includes('cesarean') || lowerValue.includes('c-section')) context.conditions.obstetric.delivery.type = 'cesarean';
                break;
            case 'preeclampsia':
                if (!context.conditions.obstetric) context.conditions.obstetric = { pregnant: true };
                context.conditions.obstetric.preeclampsia = parseBoolean(value);
                break;
            case 'gestational diabetes':
                if (!context.conditions.obstetric) context.conditions.obstetric = { pregnant: true };
                context.conditions.obstetric.gestationalDiabetes = parseBoolean(value);
                break;
            case 'postpartum':
                if (!context.conditions.obstetric) context.conditions.obstetric = {};
                context.conditions.obstetric.postpartum = parseBoolean(value);
                break;

            // Social Status
            case 'smoking':
            case 'smoking status':
                if (!context.social) context.social = {};
                if (lowerValue.includes('current')) context.social.smoking = 'current';
                else if (lowerValue.includes('former')) context.social.smoking = 'former';
                else if (lowerValue.includes('never')) context.social.smoking = 'never';
                else if (parseBoolean(value)) context.social.smoking = 'current';
                break;
            case 'pack years':
                if (!context.social) context.social = {};
                const packYears = parseInt(value);
                if (!isNaN(packYears)) context.social.packYears = packYears;
                break;
            case 'alcohol use':
            case 'alcohol':
                if (!context.social) context.social = {};
                if (lowerValue.includes('abuse')) context.social.alcoholUse = 'abuse';
                else if (lowerValue.includes('dependence')) context.social.alcoholUse = 'dependence';
                else if (parseBoolean(value)) context.social.alcoholUse = 'use';
                break;
            case 'drug use':
                if (!context.social) context.social = {};
                if (parseBoolean(value)) context.social.drugUse = { present: true };
                break;
            case 'drug type':
                if (!context.social) context.social = {};
                if (!context.social.drugUse) context.social.drugUse = { present: true };
                if (lowerValue.includes('opioid')) context.social.drugUse.type = 'opioid';
                else if (lowerValue.includes('cocaine')) context.social.drugUse.type = 'cocaine';
                else if (lowerValue.includes('cannabis') || lowerValue.includes('marijuana')) context.social.drugUse.type = 'cannabis';
                break;
            case 'homelessness':
            case 'homeless':
                if (!context.social) context.social = {};
                context.social.homeless = parseBoolean(value);
                break;

            default:
                // Ignore unknown fields or log warning
                break;
        }
    });

    // POST-PROCESSING: Sync Infection Organism to Pneumonia if site is Lung
    if (context.conditions.infection?.site === 'lung' && context.conditions.infection.organism && context.conditions.infection.organism !== 'unspecified') {
        if (!context.conditions.respiratory) context.conditions.respiratory = {};
        if (!context.conditions.respiratory.pneumonia) context.conditions.respiratory.pneumonia = { type: 'unspecified' };

        // Only override if pneumonia organism is unspecified
        if (!context.conditions.respiratory.pneumonia.organism || context.conditions.respiratory.pneumonia.organism === 'unspecified') {
            // Cast is safe because we updated the types in context.ts
            context.conditions.respiratory.pneumonia.organism = context.conditions.infection.organism as any;
        }
    }

    // POST-PROCESSING: Sync Diabetic Ulcer Data
    if (context.conditions.wounds?.type === 'diabetic' && context.conditions.diabetes) {
        // Sync Location
        if (context.conditions.wounds.location) {
            const loc = context.conditions.wounds.location;
            if (loc === 'foot_right') context.conditions.diabetes.ulcerSite = 'foot_right';
            else if (loc === 'foot_left') context.conditions.diabetes.ulcerSite = 'foot_left';
            else if (loc === 'heel') context.conditions.diabetes.ulcerSite = 'foot_right'; // Default/Approximation, ideally check laterality
            else context.conditions.diabetes.ulcerSite = 'other';

            // Refine heel mapping if laterality is known
            if (loc === 'heel' && context.conditions.wounds.laterality === 'left') context.conditions.diabetes.ulcerSite = 'foot_left';
        }

        // Sync Depth/Severity
        if (context.conditions.wounds.depth) {
            context.conditions.diabetes.ulcerSeverity = context.conditions.wounds.depth;
        }
    }

    return { context, errors };
}
