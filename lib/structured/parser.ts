
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
            // Demographics
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
            case 'complications':
                if (!context.conditions.diabetes) context.conditions.diabetes = { type: 'type2', complications: [] };
                const comps = lowerValue.split(',').map(c => c.trim());
                comps.forEach(c => {
                    if (c === 'neuropathy') context.conditions.diabetes!.complications.push('neuropathy');
                    else if (c.includes('nephropathy') || c.includes('ckd')) context.conditions.diabetes!.complications.push('ckd');
                    else if (c.includes('foot ulcer')) context.conditions.diabetes!.complications.push('foot_ulcer');
                    else if (c.includes('retinopathy')) context.conditions.diabetes!.complications.push('retinopathy');
                    else if (c.includes('hypoglycemia')) context.conditions.diabetes!.complications.push('hypoglycemia');
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
                if (!context.conditions.diabetes) context.conditions.diabetes = { type: 'type2', complications: [] };
                if (lowerValue.includes('muscle')) context.conditions.diabetes.ulcerSeverity = 'muscle';
                else if (lowerValue.includes('bone')) context.conditions.diabetes.ulcerSeverity = 'bone';
                else if (lowerValue.includes('fat')) context.conditions.diabetes.ulcerSeverity = 'fat';
                else if (lowerValue.includes('skin')) context.conditions.diabetes.ulcerSeverity = 'skin';
                else context.conditions.diabetes.ulcerSeverity = 'unspecified';
                break;

            // Renal
            case 'ckd present':
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
                } else {
                    // Legacy Yes/No format
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
                if (!context.conditions.cardiovascular) context.conditions.cardiovascular = { hypertension: false };
                if (parseBoolean(value)) {
                    context.conditions.cardiovascular.heartFailure = { type: 'unspecified', acuity: 'unspecified' };
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
                if (parseBoolean(value)) context.conditions.respiratory.pneumonia = { type: 'unspecified' };
                break;
            case 'pneumonia organism':
                if (!context.conditions.respiratory?.pneumonia) {
                    if (!context.conditions.respiratory) context.conditions.respiratory = {};
                    context.conditions.respiratory.pneumonia = { type: 'unspecified' };
                }
                if (lowerValue.includes('pseudomonas')) context.conditions.respiratory!.pneumonia!.organism = 'pseudomonas';
                else if (lowerValue.includes('mrsa')) context.conditions.respiratory!.pneumonia!.organism = 'mrsa';
                else if (lowerValue.includes('e. coli') || lowerValue.includes('e.coli')) context.conditions.respiratory!.pneumonia!.organism = 'e_coli';
                else if (lowerValue.includes('klebsiella')) context.conditions.respiratory!.pneumonia!.organism = 'klebsiella';
                else if (lowerValue.includes('influenza')) context.conditions.respiratory!.pneumonia!.organism = 'influenza';
                else if (lowerValue.includes('legionella')) context.conditions.respiratory!.pneumonia!.organism = 'legionella';
                else if (lowerValue.includes('streptococcus') || lowerValue.includes('strep')) context.conditions.respiratory!.pneumonia!.organism = 'streptococcus';
                else errors.push(`Unknown organism: ${value}`);
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
                else if (lowerValue.includes('staphylococcus') || lowerValue.includes('staph')) context.conditions.infection.organism = 'staphylococcus';
                else if (lowerValue.includes('streptococcus') || lowerValue.includes('strep')) context.conditions.infection.organism = 'streptococcus';
                else if (lowerValue.includes('klebsiella')) context.conditions.infection.organism = 'klebsiella';
                else if (lowerValue.includes('enterococcus')) context.conditions.infection.organism = 'enterococcus';
                else if (lowerValue.includes('proteus')) context.conditions.infection.organism = 'proteus';
                else if (lowerValue.includes('candida')) context.conditions.infection.organism = 'candida';
                else if (lowerValue.includes('bacteroides')) context.conditions.infection.organism = 'bacteroides';
                else if (lowerValue.includes('enterobacter')) context.conditions.infection.organism = 'enterobacter';
                else if (lowerValue.includes('serratia')) context.conditions.infection.organism = 'serratia';
                else if (lowerValue.includes('acinetobacter')) context.conditions.infection.organism = 'acinetobacter';
                else if (lowerValue.includes('legionella')) context.conditions.infection.organism = 'legionella';
                else if (lowerValue.includes('influenza')) context.conditions.infection.organism = 'influenza';
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
                if (!context.conditions.wounds) context.conditions.wounds = { present: false };
                context.conditions.wounds.present = parseBoolean(value);
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
            case 'metastatic':
                if (!context.conditions.neoplasm) context.conditions.neoplasm = { present: true };
                context.conditions.neoplasm.metastasis = parseBoolean(value);
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

    return { context, errors };
}
