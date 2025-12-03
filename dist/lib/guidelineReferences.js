"use strict";
// ICD-10-CM Official Guidelines for Coding and Reporting
// This database maps code patterns to their corresponding guideline sections
Object.defineProperty(exports, "__esModule", { value: true });
exports.GUIDELINE_DATABASE = void 0;
exports.getGuidelineForCode = getGuidelineForCode;
exports.GUIDELINE_DATABASE = {
    // I.C.1 - Certain Infectious and Parasitic Diseases
    'sepsis': {
        section: 'I.C.1.d',
        title: 'Sepsis, Severe Sepsis, and Septic Shock',
        description: 'Code first the underlying systemic infection, followed by R65.21 for septic shock if present, then localized infection'
    },
    'post_procedural_sepsis': {
        section: 'I.C.1.d.5.b',
        title: 'Sepsis Due to a Postprocedural Infection',
        description: 'T81.44 must be sequenced first, followed by organ dysfunction, then sepsis code, then source infection'
    },
    'hiv': {
        section: 'I.C.1.a',
        title: 'Human Immunodeficiency Virus (HIV) Infections',
        description: 'B20 is assigned for confirmed HIV disease with manifestations'
    },
    // I.C.4 - Endocrine, Nutritional and Metabolic Diseases
    'diabetes': {
        section: 'I.C.4.a',
        title: 'Diabetes Mellitus',
        description: 'Use as many codes as necessary to identify all associated conditions. Assign combination codes when available.'
    },
    'diabetes_manifestation': {
        section: 'I.C.4.a.6',
        title: 'Secondary Diabetes Mellitus',
        description: 'Diabetes code must precede the manifestation code (e.g., E11.22 before N18.x for diabetic CKD)'
    },
    // I.C.9 - Diseases of the Circulatory System
    'hypertension': {
        section: 'I.C.9.a',
        title: 'Hypertension',
        description: 'Use combination codes (I11, I12, I13) when hypertension is documented with heart disease, CKD, or both'
    },
    'hypertensive_combination': {
        section: 'I.C.9.a.2',
        title: 'Hypertensive Heart and Chronic Kidney Disease',
        description: 'I13 requires additional codes for heart failure (I50.-) and CKD stage (N18.-)'
    },
    'mi': {
        section: 'I.C.9.e',
        title: 'Acute Myocardial Infarction (AMI)',
        description: 'I21 codes are for STEMI and NSTEMI within 4 weeks of onset'
    },
    // I.C.10 - Diseases of the Respiratory System
    'copd': {
        section: 'I.C.10.a',
        title: 'Chronic Obstructive Pulmonary Disease (COPD) and Asthma',
        description: 'J44.0 is assigned for COPD with acute lower respiratory infection. Code also the infection (J20-J22).'
    },
    'respiratory_failure': {
        section: 'I.C.10.b',
        title: 'Acute Respiratory Failure',
        description: 'Sequence based on circumstances of admission. May be principal or secondary diagnosis.'
    },
    // I.C.14 - Diseases of the Genitourinary System
    'ckd': {
        section: 'I.C.14.a',
        title: 'Chronic Kidney Disease',
        description: 'N18 codes require documentation of CKD stage. Use with causal condition codes when applicable.'
    },
    // I.C.15 - Pregnancy, Childbirth and the Puerperium
    'obstetrics': {
        section: 'I.C.15.a',
        title: 'General Rules for Obstetric Cases',
        description: 'O codes have sequencing priority. Use additional codes for weeks of gestation (Z3A) and outcome of delivery (Z37).'
    },
    'trimester': {
        section: 'I.C.15.a.4',
        title: 'Selection of Trimester',
        description: 'Final character indicates trimester. Default to unspecified if not documented.'
    },
    // I.C.16 - Certain Conditions Originating in the Perinatal Period
    'neoplasm': {
        section: 'I.C.2.a',
        title: 'Treatment Directed at the Malignancy',
        description: 'Primary malignancy is sequenced first unless treatment is directed at metastasis'
    },
    'metastatic': {
        section: 'I.C.2.d',
        title: 'Primary Malignancy Previously Excised',
        description: 'Sequence primary site followed by secondary site(s) for metastatic cancer'
    },
    // I.C.19 - Injury, Poisoning and Certain Other Consequences
    'injury_7th': {
        section: 'I.C.19.a',
        title: '7th Character for Injury Codes',
        description: 'A = initial encounter, D = subsequent encounter, S = sequela. Use placeholder X when needed.'
    },
    'fracture': {
        section: 'I.C.19.c',
        title: 'Coding of Traumatic Fractures',
        description: 'Assign separate codes for each fracture. 7th character indicates encounter type and healing status.'
    },
    'external_cause': {
        section: 'I.C.20',
        title: 'External Causes of Morbidity',
        description: 'External cause codes (V, W, X, Y) are sequenced after all diagnosis codes'
    },
    'pain': {
        section: 'I.C.6.a',
        title: 'Pain - Category G89',
        description: 'G89.11 (acute post-traumatic pain) is sequenced after the injury code'
    },
    // I.C.21 - Factors Influencing Health Status
    'z_codes': {
        section: 'I.C.21',
        title: 'Factors Influencing Health Status and Contact with Health Services',
        description: 'Z codes represent reasons for encounters and may be principal or secondary diagnoses'
    },
    'screening': {
        section: 'I.C.21.c.5',
        title: 'Screening',
        description: 'Z12 codes are for encounters for screening for malignant neoplasms'
    },
    'history': {
        section: 'I.C.21.c.4',
        title: 'History (of)',
        description: 'Z85 codes indicate personal history of malignant neoplasm'
    }
};
// Helper function to get guideline reference by code pattern
function getGuidelineForCode(code, context) {
    // Sepsis
    if (/^A4[01]/.test(code))
        return exports.GUIDELINE_DATABASE['sepsis'];
    if (/^T81\.44/.test(code))
        return exports.GUIDELINE_DATABASE['post_procedural_sepsis'];
    // Diabetes
    if (/^E(08|09|10|11|13)/.test(code)) {
        if (context === 'manifestation')
            return exports.GUIDELINE_DATABASE['diabetes_manifestation'];
        return exports.GUIDELINE_DATABASE['diabetes'];
    }
    // Hypertension
    if (/^I1[123]/.test(code)) {
        if (/^I13/.test(code))
            return exports.GUIDELINE_DATABASE['hypertensive_combination'];
        return exports.GUIDELINE_DATABASE['hypertension'];
    }
    // MI
    if (/^I21/.test(code))
        return exports.GUIDELINE_DATABASE['mi'];
    // COPD/Respiratory
    if (/^J44/.test(code))
        return exports.GUIDELINE_DATABASE['copd'];
    if (/^J96/.test(code))
        return exports.GUIDELINE_DATABASE['respiratory_failure'];
    // CKD
    if (/^N18/.test(code))
        return exports.GUIDELINE_DATABASE['ckd'];
    // Obstetrics
    if (/^O/.test(code))
        return exports.GUIDELINE_DATABASE['obstetrics'];
    // Neoplasm
    if (/^C/.test(code)) {
        if (/^C7[789]/.test(code))
            return exports.GUIDELINE_DATABASE['metastatic'];
        return exports.GUIDELINE_DATABASE['neoplasm'];
    }
    // Injury/Trauma
    if (/^[ST]/.test(code)) {
        if (/fracture/i.test(context || ''))
            return exports.GUIDELINE_DATABASE['fracture'];
        return exports.GUIDELINE_DATABASE['injury_7th'];
    }
    // Pain
    if (/^G89/.test(code))
        return exports.GUIDELINE_DATABASE['pain'];
    // External Cause
    if (/^[VWXY]/.test(code))
        return exports.GUIDELINE_DATABASE['external_cause'];
    // Z codes
    if (/^Z12/.test(code))
        return exports.GUIDELINE_DATABASE['screening'];
    if (/^Z85/.test(code))
        return exports.GUIDELINE_DATABASE['history'];
    if (/^Z/.test(code))
        return exports.GUIDELINE_DATABASE['z_codes'];
    return undefined;
}
