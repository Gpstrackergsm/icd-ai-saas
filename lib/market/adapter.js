/**
 * Market Jurisdiction Adapter
 * Post-engine layer that applies market-specific diagnostic admissibility rules
 * 
 * Markets:
 * - USA: Strict CMS/ICD-10-CM rules (current behavior)
 * - UAE: Daman/Shafafiya rules (allows procedure-derived diagnoses)
 */

// Anatomical site mappings for abscess specificity (L02.x series)
const ABSCESS_SITE_MAP = {
    finger: { base: 'L02.5', name: 'hand' },
    hand: { base: 'L02.5', name: 'hand' },
    thumb: { base: 'L02.5', name: 'hand' },
    foot: { base: 'L02.61', name: 'foot' },
    toe: { base: 'L02.61', name: 'foot' },
    arm: { base: 'L02.41', name: 'upper limb' },
    leg: { base: 'L02.41', name: 'lower limb' },
    axilla: { base: 'L02.41', name: 'axilla' },
    groin: { base: 'L02.21', name: 'trunk' },
    buttock: { base: 'L02.31', name: 'buttock' },
    head: { base: 'L02.01', name: 'head' },
    neck: { base: 'L02.11', name: 'neck' }
};

// Fracture site mappings (S00-S99 series) - Day 3
const FRACTURE_SITE_MAP = {
    // Upper extremity
    clavicle: { base: 'S42.0', laterality: true, name: 'clavicle' },
    collarbone: { base: 'S42.0', laterality: true, name: 'clavicle' },
    humerus: { base: 'S42.3', laterality: true, name: 'humerus' },
    'upper arm': { base: 'S42.3', laterality: true, name: 'humerus' },
    radius: { base: 'S52.5', laterality: true, name: 'radius' },
    ulna: { base: 'S52.2', laterality: true, name: 'ulna' },
    forearm: { base: 'S52.9', laterality: true, name: 'forearm' },
    wrist: { base: 'S62.1', laterality: true, name: 'wrist' },
    hand: { base: 'S62.3', laterality: true, name: 'hand' },
    finger: { base: 'S62.6', laterality: true, name: 'finger' },
    thumb: { base: 'S62.5', laterality: true, name: 'thumb' },

    // Lower extremity
    femur: { base: 'S72.3', laterality: true, name: 'femur' },
    'femur shaft': { base: 'S72.3', laterality: true, name: 'femur shaft' },
    hip: { base: 'S72.0', laterality: true, name: 'hip' },
    tibia: { base: 'S82.2', laterality: true, name: 'tibia' },
    fibula: { base: 'S82.4', laterality: true, name: 'fibula' },
    ankle: { base: 'S82.8', laterality: true, name: 'ankle' },
    foot: { base: 'S92.3', laterality: true, name: 'foot' },
    toe: { base: 'S92.5', laterality: true, name: 'toe' },
    patella: { base: 'S82.0', laterality: true, name: 'patella' },
    kneecap: { base: 'S82.0', laterality: true, name: 'patella' },

    // Axial skeleton
    skull: { base: 'S02.0', laterality: false, name: 'skull' },
    'cervical spine': { base: 'S12', laterality: false, name: 'cervical spine' },
    neck: { base: 'S12', laterality: false, name: 'cervical spine' },
    'thoracic spine': { base: 'S22.0', laterality: false, name: 'thoracic spine' },
    'lumbar spine': { base: 'S32.0', laterality: false, name: 'lumbar spine' },
    'lower back': { base: 'S32.0', laterality: false, name: 'lumbar spine' },
    rib: { base: 'S22.3', laterality: true, name: 'rib' },
    pelvis: { base: 'S32.5', laterality: false, name: 'pelvis' }
};

// Wound/Laceration site mappings - Day 3
const WOUND_SITE_MAP = {
    scalp: { base: 'S01.0', name: 'scalp' },
    face: { base: 'S01.81', name: 'face' },
    forehead: { base: 'S01.81', name: 'face' },
    cheek: { base: 'S01.41', name: 'cheek' },
    neck: { base: 'S11.81', name: 'neck' },
    chest: { base: 'S21.81', name: 'chest' },
    abdomen: { base: 'S31.11', name: 'abdomen' },
    back: { base: 'S31.01', name: 'back' },
    arm: { base: 'S41.11', name: 'upper arm' },
    forearm: { base: 'S51.81', name: 'forearm' },
    hand: { base: 'S61.41', name: 'hand' },
    finger: { base: 'S61.21', name: 'finger' },
    thigh: { base: 'S71.11', name: 'thigh' },
    leg: { base: 'S81.81', name: 'lower leg' },
    foot: { base: 'S91.31', name: 'foot' },
    toe: { base: 'S91.11', name: 'toe' }
};

// Joint site mappings (M00-M99 series) - Day 3
const JOINT_SITE_MAP = {
    shoulder: { base: 'M25.51', laterality: true, name: 'shoulder' },
    elbow: { base: 'M25.52', laterality: true, name: 'elbow' },
    wrist: { base: 'M25.53', laterality: true, name: 'wrist' },
    hand: { base: 'M25.54', laterality: true, name: 'hand' },
    hip: { base: 'M25.55', laterality: true, name: 'hip' },
    knee: { base: 'M25.56', laterality: true, name: 'knee' },
    ankle: { base: 'M25.57', laterality: true, name: 'ankle' },
    foot: { base: 'M25.57', laterality: true, name: 'foot' }
};

// Procedure → Diagnosis mapping for UAE market
const UAE_PROCEDURE_DIAGNOSIS_MAP = {
    // Existing (Phase 1)
    'incision and drainage': {
        requiredTerms: ['abscess', 'infected', 'purulent'],
        derivedDiagnosis: 'abscess',
        icdCode: 'L02.91',
        ruleReference: 'UAE-PROC-001: I&D procedure supports abscess diagnosis'
    },
    'i&d': {
        requiredTerms: ['abscess', 'infected', 'purulent'],
        derivedDiagnosis: 'abscess',
        icdCode: 'L02.91',
        ruleReference: 'UAE-PROC-001: I&D procedure supports abscess diagnosis'
    },
    'appendectomy': {
        requiredTerms: ['appendix', 'appendicitis', 'acute abdomen'],
        derivedDiagnosis: 'acute appendicitis',
        icdCode: 'K35.80',
        ruleReference: 'UAE-PROC-002: Appendectomy supports appendicitis diagnosis'
    },
    'laparoscopic appendectomy': {
        requiredTerms: ['appendix', 'appendicitis', 'acute abdomen'],
        derivedDiagnosis: 'acute appendicitis',
        icdCode: 'K35.80',
        ruleReference: 'UAE-PROC-002: Appendectomy supports appendicitis diagnosis'
    },

    // Day 1: High-Value Procedures (15)
    'colonoscopy': {
        requiredTerms: ['polyp', 'mass', 'lesion', 'adenoma', 'tumor'],
        derivedDiagnosis: 'colonic polyp',
        icdCode: 'K63.5',
        ruleReference: 'UAE-PROC-003: Colonoscopy finding supports diagnosis',
        optional: true  // Finding not always present
    },
    'cholecystectomy': {
        requiredTerms: ['gallbladder', 'cholecystitis', 'cholelithiasis', 'gallstones'],
        derivedDiagnosis: 'acute cholecystitis',
        icdCode: 'K81.0',
        ruleReference: 'UAE-PROC-004: Cholecystectomy supports cholecystitis diagnosis'
    },
    'laparoscopic cholecystectomy': {
        requiredTerms: ['gallbladder', 'cholecystitis', 'cholelithiasis', 'gallstones'],
        derivedDiagnosis: 'acute cholecystitis',
        icdCode: 'K81.0',
        ruleReference: 'UAE-PROC-004: Cholecystectomy supports cholecystitis diagnosis'
    },
    'hernia repair': {
        requiredTerms: ['hernia', 'inguinal', 'umbilical', 'ventral', 'incisional'],
        derivedDiagnosis: 'inguinal hernia',
        icdCode: 'K40.90',
        ruleReference: 'UAE-PROC-005: Hernia repair supports hernia diagnosis'
    },
    'herniorrhaphy': {
        requiredTerms: ['hernia', 'inguinal', 'umbilical', 'ventral'],
        derivedDiagnosis: 'inguinal hernia',
        icdCode: 'K40.90',
        ruleReference: 'UAE-PROC-005: Hernia repair supports hernia diagnosis'
    },
    'cardiac catheterization': {
        requiredTerms: ['coronary', 'stenosis', 'blockage', 'cad', 'ischemia'],
        derivedDiagnosis: 'coronary artery disease',
        icdCode: 'I25.10',
        ruleReference: 'UAE-PROC-006: Cardiac cath supports CAD diagnosis'
    },
    'joint injection': {
        requiredTerms: ['arthritis', 'pain', 'inflammation', 'effusion'],
        derivedDiagnosis: 'osteoarthritis',
        icdCode: 'M19.90',
        ruleReference: 'UAE-PROC-007: Joint injection supports arthritis diagnosis'
    },
    'intra-articular injection': {
        requiredTerms: ['arthritis', 'pain', 'inflammation'],
        derivedDiagnosis: 'osteoarthritis',
        icdCode: 'M19.90',
        ruleReference: 'UAE-PROC-007: Joint injection supports arthritis diagnosis'
    },
    'egd': {
        requiredTerms: ['gastritis', 'ulcer', 'gerd', 'esophagitis', 'polyp'],
        derivedDiagnosis: 'gastritis',
        icdCode: 'K29.70',
        ruleReference: 'UAE-PROC-008: EGD finding supports diagnosis',
        optional: true
    },
    'esophagogastroduodenoscopy': {
        requiredTerms: ['gastritis', 'ulcer', 'gerd', 'esophagitis'],
        derivedDiagnosis: 'gastritis',
        icdCode: 'K29.70',
        ruleReference: 'UAE-PROC-008: EGD finding supports diagnosis',
        optional: true
    },
    'wound debridement': {
        requiredTerms: ['ulcer', 'wound', 'necrotic', 'infected', 'diabetic foot'],
        derivedDiagnosis: 'chronic ulcer',
        icdCode: 'L97.909',
        ruleReference: 'UAE-PROC-009: Debridement supports ulcer diagnosis'
    },
    'excision of lesion': {
        requiredTerms: ['lesion', 'mass', 'cyst', 'lipoma', 'nevus'],
        derivedDiagnosis: 'skin lesion',
        icdCode: 'L98.9',
        ruleReference: 'UAE-PROC-010: Excision supports lesion diagnosis'
    },
    'hemorrhoidectomy': {
        requiredTerms: ['hemorrhoid', 'piles', 'rectal bleeding'],
        derivedDiagnosis: 'internal hemorrhoids',
        icdCode: 'K64.8',
        ruleReference: 'UAE-PROC-011: Hemorrhoidectomy supports hemorrhoid diagnosis'
    },
    'circumcision': {
        requiredTerms: ['phimosis', 'balanitis', 'foreskin'],
        derivedDiagnosis: 'phimosis',
        icdCode: 'N47.1',
        ruleReference: 'UAE-PROC-012: Circumcision supports phimosis diagnosis',
        optional: true  // Sometimes elective
    },
    'orif': {
        requiredTerms: ['fracture', 'broken'],
        derivedDiagnosis: 'fracture',
        icdCode: 'S00.00XA',  // Generic, will be refined by site
        ruleReference: 'UAE-PROC-013: ORIF supports fracture diagnosis'
    },
    'open reduction internal fixation': {
        requiredTerms: ['fracture', 'broken'],
        derivedDiagnosis: 'fracture',
        icdCode: 'S00.00XA',
        ruleReference: 'UAE-PROC-013: ORIF supports fracture diagnosis'
    },
    'bronchoscopy': {
        requiredTerms: ['mass', 'tumor', 'infection', 'pneumonia', 'lesion'],
        derivedDiagnosis: 'lung mass',
        icdCode: 'R91.8',
        ruleReference: 'UAE-PROC-014: Bronchoscopy finding supports diagnosis',
        optional: true
    },
    'cystoscopy': {
        requiredTerms: ['hematuria', 'bladder mass', 'tumor', 'stone'],
        derivedDiagnosis: 'hematuria',
        icdCode: 'R31.9',
        ruleReference: 'UAE-PROC-015: Cystoscopy indication supports diagnosis'
    },
    'av fistula': {
        requiredTerms: ['dialysis', 'renal failure', 'esrd', 'ckd'],
        derivedDiagnosis: 'end-stage renal disease',
        icdCode: 'N18.6',
        ruleReference: 'UAE-PROC-016: Fistula creation supports ESRD diagnosis'
    },
    'dialysis access': {
        requiredTerms: ['dialysis', 'renal failure', 'esrd'],
        derivedDiagnosis: 'end-stage renal disease',
        icdCode: 'N18.6',
        ruleReference: 'UAE-PROC-016: Dialysis access supports ESRD diagnosis'
    },
    'central line': {
        requiredTerms: ['chemotherapy', 'tpn', 'long-term', 'access'],
        derivedDiagnosis: 'need for vascular access',
        icdCode: 'Z45.2',
        ruleReference: 'UAE-PROC-017: Central line supports access need',
        optional: true  // Various indications
    },
    'picc line': {
        requiredTerms: ['antibiotics', 'chemotherapy', 'tpn'],
        derivedDiagnosis: 'need for vascular access',
        icdCode: 'Z45.2',
        ruleReference: 'UAE-PROC-017: PICC line supports access need',
        optional: true
    },

    // Day 2: Advanced Procedures (20)
    'thyroidectomy': {
        requiredTerms: ['thyroid', 'goiter', 'nodule', 'cancer', 'hyperthyroidism'],
        derivedDiagnosis: 'thyroid nodule',
        icdCode: 'E04.1',
        ruleReference: 'UAE-PROC-018: Thyroidectomy supports thyroid diagnosis'
    },
    'mastectomy': {
        requiredTerms: ['breast cancer', 'malignancy', 'carcinoma', 'mass'],
        derivedDiagnosis: 'breast carcinoma',
        icdCode: 'C50.919',
        ruleReference: 'UAE-PROC-019: Mastectomy supports breast cancer diagnosis'
    },
    'cesarean section': {
        requiredTerms: ['pregnancy', 'fetal distress', 'cephalopelvic disproportion', 'previous cesarean'],
        derivedDiagnosis: 'pregnancy with indication for cesarean',
        icdCode: 'O82',
        ruleReference: 'UAE-PROC-020: C-section delivery code'
    },
    'c-section': {
        requiredTerms: ['pregnancy', 'delivery'],
        derivedDiagnosis: 'pregnancy with cesarean delivery',
        icdCode: 'O82',
        ruleReference: 'UAE-PROC-020: C-section delivery code'
    },
    'hysterectomy': {
        requiredTerms: ['fibroids', 'menorrhagia', 'uterine', 'prolapse', 'cancer'],
        derivedDiagnosis: 'uterine fibroids',
        icdCode: 'D25.9',
        ruleReference: 'UAE-PROC-021: Hysterectomy supports uterine diagnosis'
    },
    'sigmoidoscopy': {
        requiredTerms: ['rectal bleeding', 'colitis', 'polyp', 'mass'],
        derivedDiagnosis: 'rectal bleeding',
        icdCode: 'K62.5',
        ruleReference: 'UAE-PROC-022: Sigmoidoscopy indication',
        optional: true
    },
    'arthroscopy': {
        requiredTerms: ['meniscal tear', 'cartilage', 'knee pain', 'shoulder pain'],
        derivedDiagnosis: 'joint derangement',
        icdCode: 'M23.90',
        ruleReference: 'UAE-PROC-023: Arthroscopy finding supports diagnosis',
        optional: true
    },
    'knee arthroscopy': {
        requiredTerms: ['meniscal', 'acl', 'cartilage', 'knee'],
        derivedDiagnosis: 'knee derangement',
        icdCode: 'M23.90',
        ruleReference: 'UAE-PROC-023: Knee arthroscopy supports diagnosis'
    },
    'shoulder arthroscopy': {
        requiredTerms: ['rotator cuff', 'labral tear', 'shoulder'],
        derivedDiagnosis: 'shoulder derangement',
        icdCode: 'M75.100',
        ruleReference: 'UAE-PROC-024: Shoulder arthroscopy supports diagnosis'
    },
    'diagnostic laparoscopy': {
        requiredTerms: ['abdominal pain', 'mass', 'ascites', 'adhesions'],
        derivedDiagnosis: 'abdominal pain',
        icdCode: 'R10.9',
        ruleReference: 'UAE-PROC-025: Laparoscopy indication',
        optional: true
    },
    'fine needle aspiration': {
        requiredTerms: ['thyroid', 'lymph node', 'mass', 'nodule'],
        derivedDiagnosis: 'mass requiring biopsy',
        icdCode: 'R22.9',
        ruleReference: 'UAE-PROC-026: FNA indication'
    },
    'fna': {
        requiredTerms: ['mass', 'nodule', 'lymph node'],
        derivedDiagnosis: 'mass requiring biopsy',
        icdCode: 'R22.9',
        ruleReference: 'UAE-PROC-026: FNA indication'
    },
    'ct-guided biopsy': {
        requiredTerms: ['lung', 'liver', 'kidney', 'mass', 'lesion'],
        derivedDiagnosis: 'organ mass',
        icdCode: 'R22.9',
        ruleReference: 'UAE-PROC-027: CT biopsy indication'
    },
    'angioplasty': {
        requiredTerms: ['stenosis', 'blockage', 'coronary', 'peripheral arterial disease'],
        derivedDiagnosis: 'coronary artery stenosis',
        icdCode: 'I25.10',
        ruleReference: 'UAE-PROC-028: Angioplasty supports stenosis diagnosis'
    },
    'pci': {
        requiredTerms: ['coronary', 'stenosis', 'stent'],
        derivedDiagnosis: 'coronary artery disease',
        icdCode: 'I25.10',
        ruleReference: 'UAE-PROC-028: PCI supports CAD diagnosis'
    },
    'pacemaker insertion': {
        requiredTerms: ['bradycardia', 'heart block', 'sick sinus', 'syncope'],
        derivedDiagnosis: 'bradycardia',
        icdCode: 'R00.1',
        ruleReference: 'UAE-PROC-029: Pacemaker supports arrhythmia diagnosis'
    },
    'cardioversion': {
        requiredTerms: ['atrial fibrillation', 'flutter', 'arrhythmia'],
        derivedDiagnosis: 'atrial fibrillation',
        icdCode: 'I48.91',
        ruleReference: 'UAE-PROC-030: Cardioversion supports afib diagnosis'
    },
    'meniscectomy': {
        requiredTerms: ['meniscal tear', 'knee'],
        derivedDiagnosis: 'meniscal tear',
        icdCode: 'M23.30',
        ruleReference: 'UAE-PROC-031: Meniscectomy supports tear diagnosis'
    },
    'acl reconstruction': {
        requiredTerms: ['acl tear', 'anterior cruciate', 'knee instability'],
        derivedDiagnosis: 'acl tear',
        icdCode: 'S83.511A',
        ruleReference: 'UAE-PROC-032: ACL reconstruction supports tear diagnosis'
    },
    'total knee replacement': {
        requiredTerms: ['severe arthritis', 'degenerative', 'osteoarthritis'],
        derivedDiagnosis: 'severe knee osteoarthritis',
        icdCode: 'M17.9',
        ruleReference: 'UAE-PROC-033: TKR supports severe arthritis'
    },
    'total hip replacement': {
        requiredTerms: ['severe arthritis', 'avascular necrosis', 'hip'],
        derivedDiagnosis: 'severe hip osteoarthritis',
        icdCode: 'M16.9',
        ruleReference: 'UAE-PROC-034: THR supports severe arthritis'
    },
    'spinal fusion': {
        requiredTerms: ['spondylolisthesis', 'stenosis', 'degenerative disc', 'instability'],
        derivedDiagnosis: 'spinal stenosis',
        icdCode: 'M48.06',
        ruleReference: 'UAE-PROC-035: Spinal fusion supports stenosis diagnosis'
    },
    'chest tube': {
        requiredTerms: ['pneumothorax', 'hemothorax', 'pleural effusion', 'empyema'],
        derivedDiagnosis: 'pneumothorax',
        icdCode: 'J93.9',
        ruleReference: 'UAE-PROC-036: Chest tube supports pneumothorax diagnosis'
    },
    'paracentesis': {
        requiredTerms: ['ascites', 'cirrhosis', 'peritoneal fluid'],
        derivedDiagnosis: 'ascites',
        icdCode: 'R18.8',
        ruleReference: 'UAE-PROC-037: Paracentesis supports ascites diagnosis'
    },
    'thoracentesis': {
        requiredTerms: ['pleural effusion', 'fluid'],
        derivedDiagnosis: 'pleural effusion',
        icdCode: 'J90',
        ruleReference: 'UAE-PROC-038: Thoracentesis supports effusion diagnosis'
    },
    'tracheostomy': {
        requiredTerms: ['respiratory failure', 'prolonged ventilation', 'airway obstruction'],
        derivedDiagnosis: 'respiratory failure',
        icdCode: 'J96.90',
        ruleReference: 'UAE-PROC-039: Tracheostomy supports respiratory failure diagnosis'
    }
};

/**
 * Detect procedures from clinical narrative
 * Automatically detects ALL procedures defined in UAE_PROCEDURE_DIAGNOSIS_MAP
 */
function detectProcedures(text) {
    const lower = text.toLowerCase();
    const detected = [];

    // Iterate through all mapped procedures
    for (const [procedureName, mapping] of Object.entries(UAE_PROCEDURE_DIAGNOSIS_MAP)) {
        // Build regex pattern for procedure name
        // Handle special characters and word boundaries
        const escapedName = procedureName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const pattern = new RegExp(`\\b${escapedName}\\b`, 'i');

        if (pattern.test(text)) {
            detected.push({
                procedure: procedureName,
                found: true,
                mapping: mapping
            });
        }
    }

    return detected;
}

/**
 * Check for required clinical terms
 */
function hasRequiredTerms(text, requiredTerms) {
    const lower = text.toLowerCase();
    return requiredTerms.some(term => {
        const pattern = new RegExp(`\\b${term}\\b`, 'i');
        return pattern.test(lower);
    });
}

/**
 * Check for negation (simple version for UAE mode)
 */
function isNegatedUAE(text, term) {
    const lower = text.toLowerCase();
    const termPattern = new RegExp(`\\b${term}\\b`, 'i');
    const match = termPattern.exec(lower);

    if (!match) return false;

    const before = lower.substring(Math.max(0, match.index - 50), match.index);
    const negationWords = ['no', 'denies', 'negative', 'ruled out', 'absent'];

    return negationWords.some(neg => before.includes(neg));
}

/**
 * ICD-10 Code Mapping (subset for common conditions)
 * Full mapping is in encode.js, this is a lightweight version for adapter
 */
const ICD10_MAPPING = {
    // Existing Phase 1
    'hypertension': { code: 'I10', description: 'Essential (primary) hypertension' },
    'essential hypertension': { code: 'I10', description: 'Essential (primary) hypertension' },
    'type 2 diabetes': { code: 'E11.9', description: 'Type 2 diabetes mellitus without complications' },
    'diabetes': { code: 'E11.9', description: 'Type 2 diabetes mellitus without complications' },
    'copd': { code: 'J44.9', description: 'Chronic obstructive pulmonary disease, unspecified' },
    'copd exacerbation': { code: 'J44.1', description: 'Chronic obstructive pulmonary disease with (acute) exacerbation' },
    'chronic obstructive pulmonary disease': { code: 'J44.9', description: 'Chronic obstructive pulmonary disease, unspecified' },
    'atrial fibrillation': { code: 'I48.91', description: 'Unspecified atrial fibrillation' },
    'atrial fibrillation, permanent': { code: 'I48.21', description: 'Permanent atrial fibrillation' },
    'ckd stage 3': { code: 'N18.30', description: 'Chronic kidney disease, stage 3 unspecified' },
    'ckd stage 4': { code: 'N18.4', description: 'Chronic kidney disease, stage 4 (severe)' },
    'chronic kidney disease stage 3': { code: 'N18.30', description: 'Chronic kidney disease, stage 3 unspecified' },
    'chronic kidney disease stage 4': { code: 'N18.4', description: 'Chronic kidney disease, stage 4 (severe)' },
    'pneumonia': { code: 'J18.9', description: 'Pneumonia, unspecified organism' },
    'uti': { code: 'N39.0', description: 'Urinary tract infection, site not specified' },
    'urinary tract infection': { code: 'N39.0', description: 'Urinary tract infection, site not specified' },

    // Day 1: GI/Hepatobiliary
    'colonic polyp': { code: 'K63.5', description: 'Polyp of colon' },
    'colon polyp': { code: 'K63.5', description: 'Polyp of colon' },
    'acute cholecystitis': { code: 'K81.0', description: 'Acute cholecystitis' },
    'cholecystitis': { code: 'K81.9', description: 'Cholecystitis, unspecified' },
    'cholelithiasis': { code: 'K80.20', description: 'Calculus of gallbladder without cholecystitis' },
    'gallstones': { code: 'K80.20', description: 'Calculus of gallbladder without cholecystitis' },
    'gastritis': { code: 'K29.70', description: 'Gastritis, unspecified' },
    'gerd': { code: 'K21.9', description: 'Gastro-esophageal reflux disease without esophagitis' },
    'esophagitis': { code: 'K20.9', description: 'Esophagitis, unspecified' },
    'peptic ulcer': { code: 'K27.9', description: 'Peptic ulcer, unspecified' },
    'internal hemorrhoids': { code: 'K64.8', description: 'Other hemorrhoids' },
    'hemorrhoids': { code: 'K64.9', description: 'Unspecified hemorrhoids' },

    // Day 1: Hernias
    'inguinal hernia': { code: 'K40.90', description: 'Unilateral inguinal hernia, without obstruction or gangrene, not specified as recurrent' },
    'umbilical hernia': { code: 'K42.9', description: 'Umbilical hernia without obstruction or gangrene' },
    'ventral hernia': { code: 'K43.9', description: 'Ventral hernia without obstruction or gangrene' },
    'incisional hernia': { code: 'K43.2', description: 'Incisional hernia without obstruction or gangrene' },

    // Day 1: Cardiac
    'coronary artery disease': { code: 'I25.10', description: 'Atherosclerotic heart disease of native coronary artery without angina pectoris' },
    'cad': { code: 'I25.10', description: 'Atherosclerotic heart disease of native coronary artery without angina pectoris' },
    'angina': { code: 'I20.9', description: 'Angina pectoris, unspecified' },
    'myocardial ischemia': { code: 'I25.5', description: 'Ischemic cardiomyopathy' },

    // Day 1: Musculoskeletal
    'osteoarthritis': { code: 'M19.90', description: 'Unspecified osteoarthritis, unspecified site' },
    'arthritis': { code: 'M19.90', description: 'Unspecified osteoarthritis, unspecified site' },
    'joint pain': { code: 'M25.50', description: 'Pain in unspecified joint' },
    'fracture': { code: 'S00.00XA', description: 'Unspecified fracture' },  // Will be refined by site

    // Day 1: Dermatologic
    'chronic ulcer': { code: 'L97.909', description: 'Non-pressure chronic ulcer of unspecified part of unspecified lower leg' },
    'diabetic foot ulcer': { code: 'E11.621', description: 'Type 2 diabetes mellitus with foot ulcer' },
    'skin lesion': { code: 'L98.9', description: 'Disorder of the skin and subcutaneous tissue, unspecified' },
    'cyst': { code: 'L72.9', description: 'Follicular cyst of skin and subcutaneous tissue, unspecified' },
    'lipoma': { code: 'D17.9', description: 'Benign lipomatous neoplasm, unspecified' },

    // Day 1: Genitourinary
    'phimosis': { code: 'N47.1', description: 'Phimosis' },
    'balanitis': { code: 'N48.1', description: 'Balanoposthitis' },
    'end-stage renal disease': { code: 'N18.6', description: 'End stage renal disease' },
    'esrd': { code: 'N18.6', description: 'End stage renal disease' },
    'hematuria': { code: 'R31.9', description: 'Hematuria, unspecified' },

    // Day 1: Respiratory
    'lung mass': { code: 'R91.8', description: 'Other nonspecific abnormal finding of lung field' },
    'pulmonary nodule': { code: 'R91.1', description: 'Solitary pulmonary nodule' },

    // Day 1: Administrative/Other
    'need for vascular access': { code: 'Z45.2', description: 'Encounter for adjustment and management of vascular access device' },

    // Day 2: Endocrine/Oncology
    'thyroid nodule': { code: 'E04.1', description: 'Nontoxic single thyroid nodule' },
    'goiter': { code: 'E04.9', description: 'Nontoxic goiter, unspecified' },
    'hyperthyroidism': { code: 'E05.90', description: 'Thyrotoxicosis, unspecified' },
    'breast carcinoma': { code: 'C50.919', description: 'Malignant neoplasm of unspecified site of unspecified female breast' },
    'breast cancer': { code: 'C50.919', description: 'Malignant neoplasm of unspecified site of unspecified female breast' },
    'breast mass': { code: 'N63.10', description: 'Unspecified lump in the unspecified breast' },

    // Day 2: OB/GYN
    'pregnancy with cesarean delivery': { code: 'O82', description: 'Encounter for cesarean delivery without indication' },
    'pregnancy with indication for cesarean': { code: 'O82', description: 'Encounter for cesarean delivery without indication' },
    'uterine fibroids': { code: 'D25.9', description: 'Leiomyoma of uterus, unspecified' },
    'menorrhagia': { code: 'N92.0', description: 'Excessive and frequent menstruation with regular cycle' },
    'uterine prolapse': { code: 'N81.4', description: 'Uterovaginal prolapse, unspecified' },

    // Day 2: GI Additional
    'rectal bleeding': { code: 'K62.5', description: 'Hemorrhage of anus and rectum' },
    'colitis': { code: 'K52.9', description: 'Noninfective gastroenteritis and colitis, unspecified' },
    'abdominal pain': { code: 'R10.9', description: 'Unspecified abdominal pain' },
    'ascites': { code: 'R18.8', description: 'Other ascites' },
    'cirrhosis': { code: 'K74.60', description: 'Unspecified cirrhosis of liver' },

    // Day 2: Orthopedic Advanced
    'joint derangement': { code: 'M23.90', description: 'Unspecified internal derangement of knee, unspecified knee' },
    'knee derangement': { code: 'M23.90', description: 'Unspecified internal derangement of knee, unspecified knee' },
    'meniscal tear': { code: 'M23.30', description: 'Other meniscus derangements, unspecified meniscus' },
    'acl tear': { code: 'S83.511A', description: 'Sprain of anterior cruciate ligament of right knee, initial encounter' },
    'rotator cuff tear': { code: 'M75.100', description: 'Unspecified rotator cuff tear or rupture of unspecified shoulder, not specified as traumatic' },
    'shoulder derangement': { code: 'M75.100', description: 'Unspecified rotator cuff tear or rupture' },
    'labral tear': { code: 'M24.819', description: 'Other specific joint derangements of unspecified shoulder' },
    'severe knee osteoarthritis': { code: 'M17.9', description: 'Osteoarthritis of knee, unspecified' },
    'severe hip osteoarthritis': { code: 'M16.9', description: 'Osteoarthritis of hip, unspecified' },
    'avascular necrosis': { code: 'M87.9', description: 'Osteonecrosis, unspecified' },
    'spinal stenosis': { code: 'M48.06', description: 'Spinal stenosis, lumbar region' },
    'spondylolisthesis': { code: 'M43.16', description: 'Spondylolisthesis, lumbar region' },
    'degenerative disc disease': { code: 'M51.36', description: 'Other intervertebral disc degeneration, lumbar region' },

    // Day 2: Cardiac/Arrhythmias
    'bradycardia': { code: 'R00.1', description: 'Bradycardia, unspecified' },
    'heart block': { code: 'I44.9', description: 'Atrioventricular block, unspecified' },
    'sick sinus syndrome': { code: 'I49.5', description: 'Sick sinus syndrome' },
    'atrial flutter': { code: 'I48.92', description: 'Unspecified atrial flutter' },
    'peripheral arterial disease': { code: 'I73.9', description: 'Peripheral vascular disease, unspecified' },

    // Day 2: Thoracic/Pulmonary
    'pneumothorax': { code: 'J93.9', description: 'Pneumothorax, unspecified' },
    'hemothorax': { code: 'J94.2', description: 'Hemothorax' },
    'pleural effusion': { code: 'J90', description: 'Pleural effusion, not elsewhere classified' },
    'empyema': { code: 'J86.9', description: 'Pyothorax without fistula' },
    'respiratory failure': { code: 'J96.90', description: 'Respiratory failure, unspecified' },

    // Day 2: Miscellaneous
    'mass requiring biopsy': { code: 'R22.9', description: 'Localized swelling, mass and lump, unspecified' },
    'organ mass': { code: 'R22.9', description: 'Localized swelling, mass and lump, unspecified' },
    'lymph node enlargement': { code: 'R59.9', description: 'Enlarged lymph nodes, unspecified' },
    'syncope': { code: 'R55', description: 'Syncope and collapse' },

    // Day 3: Infectious Diseases (A00-B99) - 50 codes
    'sepsis': { code: 'A41.9', description: 'Sepsis, unspecified organism' },
    'severe sepsis': { code: 'R65.20', description: 'Severe sepsis without septic shock' },
    'septic shock': { code: 'R65.21', description: 'Severe sepsis with septic shock' },
    'cellulitis': { code: 'L03.90', description: 'Cellulitis, unspecified' },
    'mrsa': { code: 'A49.02', description: 'Methicillin resistant Staphylococcus aureus infection' },
    'c diff': { code: 'A04.72', description: 'Enterocolitis due to Clostridium difficile, not specified as recurrent' },
    'herpes zoster': { code: 'B02.9', description: 'Zoster without complications' },
    'shingles': { code: 'B02.9', description: 'Zoster without complications' },
    'influenza': { code: 'J11.1', description: 'Influenza due to unidentified influenza virus with other respiratory manifestations' },
    'flu': { code: 'J11.1', description: 'Influenza due to unidentified influenza virus' },
    'covid-19': { code: 'U07.1', description: 'COVID-19' },
    'tuberculosis': { code: 'A15.9', description: 'Respiratory tuberculosis unspecified' },
    'tb': { code: 'A15.9', description: 'Respiratory tuberculosis unspecified' },
    'hepatitis b': { code: 'B18.1', description: 'Chronic viral hepatitis B without delta-agent' },
    'hepatitis c': { code: 'B18.2', description: 'Chronic viral hepatitis C' },
    'hiv': { code: 'B20', description: 'Human immunodeficiency virus [HIV] disease' },

    // Day 3: Neoplasms (C00-D49) - 30 codes
    'colon cancer': { code: 'C18.9', description: 'Malignant neoplasm of colon, unspecified' },
    'lung cancer': { code: 'C34.90', description: 'Malignant neoplasm of unspecified part of unspecified bronchus or lung' },
    'prostate cancer': { code: 'C61', description: 'Malignant neoplasm of prostate' },
    'bladder cancer': { code: 'C67.9', description: 'Malignant neoplasm of bladder, unspecified' },
    'melanoma': { code: 'C43.9', description: 'Malignant melanoma of skin, unspecified' },
    'lymphoma': { code: 'C85.90', description: 'Non-Hodgkin lymphoma, unspecified' },
    'leukemia': { code: 'C95.90', description: 'Leukemia, unspecified' },
    'brain tumor': { code: 'C71.9', description: 'Malignant neoplasm of brain, unspecified' },
    'liver cancer': { code: 'C22.9', description: 'Malignant neoplasm of liver, unspecified' },
    'pancreatic cancer': { code: 'C25.9', description: 'Malignant neoplasm of pancreas, unspecified' },
    'ovarian cancer': { code: 'C56.9', description: 'Malignant neoplasm of unspecified ovary' },
    'cervical cancer': { code: 'C53.9', description: 'Malignant neoplasm of cervix uteri, unspecified' },
    'renal cell carcinoma': { code: 'C64.9', description: 'Malignant neoplasm of unspecified kidney' },

    // Day 3: Respiratory (J00-J99) - Additional 40 codes
    'asthma': { code: 'J45.909', description: 'Unspecified asthma, uncomplicated' },
    'asthma exacerbation': { code: 'J45.901', description: 'Unspecified asthma with (acute) exacerbation' },
    'bronchitis': { code: 'J40', description: 'Bronchitis, not specified as acute or chronic' },
    'acute bronchitis': { code: 'J20.9', description: 'Acute bronchitis, unspecified' },
    'chronic bronchitis': { code: 'J42', description: 'Unspecified chronic bronchitis' },
    'pulmonary embolism': { code: 'I26.99', description: 'Other pulmonary embolism without acute cor pulmonale' },
    'pe': { code: 'I26.99', description: 'Pulmonary embolism' },
    'dvt': { code: 'I82.40', description: 'Acute embolism and thrombosis of unspecified deep veins of lower extremity' },
    'sleep apnea': { code: 'G47.33', description: 'Obstructive sleep apnea' },
    'pulmonary fibrosis': { code: 'J84.10', description: 'Pulmonary fibrosis, unspecified' },
    'sarcoidosis': { code: 'D86.9', description: 'Sarcoidosis, unspecified' },

    // Day 3: Digestive (K00-K95) - Additional 40 codes
    'pancreatitis': { code: 'K85.90', description: 'Acute pancreatitis without necrosis or infection, unspecified' },
    'acute pancreatitis': { code: 'K85.90', description: 'Acute pancreatitis' },
    'chronic pancreatitis': { code: 'K86.1', description: 'Other chronic pancreatitis' },
    'diverticulitis': { code: 'K57.92', description: 'Diverticulitis of intestine, part unspecified, without perforation or abscess without bleeding' },
    'diverticulosis': { code: 'K57.90', description: 'Diverticulosis of intestine, part unspecified, without perforation or abscess without bleeding' },
    'inflammatory bowel disease': { code: 'K51.90', description: 'Ulcerative colitis, unspecified' },
    'crohns disease': { code: 'K50.90', description: "Crohn's disease, unspecified, without complications" },
    'ulcerative colitis': { code: 'K51.90', description: 'Ulcerative colitis, unspecified' },
    'irritable bowel syndrome': { code: 'K58.9', description: 'Irritable bowel syndrome without diarrhea' },
    'ibs': { code: 'K58.9', description: 'Irritable bowel syndrome' },
    'bowel obstruction': { code: 'K56.60', description: 'Unspecified intestinal obstruction' },
    'gi bleed': { code: 'K92.2', description: 'Gastrointestinal hemorrhage, unspecified' },
    'upper gi bleed': { code: 'K92.2', description: 'Gastrointestinal hemorrhage, unspecified' },
    'lower gi bleed': { code: 'K92.1', description: 'Melena' },

    // Day 3: Metabolic/Endocrine (E00-E89) - Additional 30 codes
    'diabetic ketoacidosis': { code: 'E11.10', description: 'Type 2 diabetes mellitus with ketoacidosis without coma' },
    'dka': { code: 'E11.10', description: 'Diabetic ketoacidosis' },
    'hypoglycemia': { code: 'E16.2', description: 'Hypoglycemia, unspecified' },
    'hyperglycemia': { code: 'R73.9', description: 'Hyperglycemia, unspecified' },
    'hypothyroidism': { code: 'E03.9', description: 'Hypothyroidism, unspecified' },
    'hyperparathyroidism': { code: 'E21.3', description: 'Hyperparathyroidism, unspecified' },
    'addisons disease': { code: 'E27.1', description: 'Primary adrenocortical insufficiency' },
    'cushings syndrome': { code: 'E24.9', description: "Cushing's syndrome, unspecified" },
    'metabolic syndrome': { code: 'E88.81', description: 'Metabolic syndrome' },
    'obesity': { code: 'E66.9', description: 'Obesity, unspecified' },
    'morbid obesity': { code: 'E66.01', description: 'Morbid (severe) obesity due to excess calories' },
    'malnutrition': { code: 'E46', description: 'Unspecified protein-calorie malnutrition' },
    'dehydration': { code: 'E86.0', description: 'Dehydration' },
    'hyperlipidemia': { code: 'E78.5', description: 'Hyperlipidemia, unspecified' },
    'hypercholesterolemia': { code: 'E78.00', description: 'Pure hypercholesterolemia, unspecified' },

    // Day 3: Injury/Poisoning (S00-T88) - Additional 50 codes
    'head injury': { code: 'S09.90XA', description: 'Unspecified injury of head, initial encounter' },
    'concussion': { code: 'S06.0X0A', description: 'Concussion without loss of consciousness, initial encounter' },
    'traumatic brain injury': { code: 'S06.9X0A', description: 'Unspecified intracranial injury without loss of consciousness' },
    'tbi': { code: 'S06.9X0A', description: 'Traumatic brain injury' },
    'spinal cord injury': { code: 'S14.109A', description: 'Unspecified injury at unspecified level of cervical spinal cord' },
    'burn': { code: 'T30.0', description: 'Burn of unspecified body region, unspecified degree' },
    'second degree burn': { code: 'T30.20', description: 'Burn of second degree, body region unspecified' },
    'third degree burn': { code: 'T30.30', description: 'Burn of third degree, body region unspecified' },
    'contusion': { code: 'T14.0', description: 'Superficial injury of unspecified body region' },
    'sprain': { code: 'T14.3', description: 'Dislocation, sprain and strain of unspecified body region' },
    'dislocation': { code: 'T14.3', description: 'Dislocation of unspecified body region' },
    'amputation': { code: 'T14.0', description: 'Injury of unspecified body region' },
    'drug overdose': { code: 'T50.901A', description: 'Poisoning by unspecified drugs, accidental, initial' },
    'alcohol intoxication': { code: 'F10.129', description: 'Alcohol use disorder, mild, with intoxication' },

    // Day 3: Neurological (G00-G99) - 30 codes 
    'stroke': { code: 'I63.9', description: 'Cerebral infarction, unspecified' },
    'ischemic stroke': { code: 'I63.9', description: 'Cerebral infarction, unspecified' },
    'hemorrhagic stroke': { code: 'I61.9', description: 'Nontraumatic intracerebral hemorrhage, unspecified' },
    'tia': { code: 'G45.9', description: 'Transient cerebral ischemic attack, unspecified' },
    'seizure': { code: 'R56.9', description: 'Unspecified convulsions' },
    'epilepsy': { code: 'G40.909', description: 'Epilepsy, unspecified, not intractable, without status epilepticus' },
    'migraine': { code: 'G43.909', description: 'Migraine, unspecified, not intractable, without status migrainosus' },
    'headache': { code: 'R51.9', description: 'Headache, unspecified' },
    'parkinsons disease': { code: 'G20', description: "Parkinson's disease" },
    'alzheimers disease': { code: 'G30.9', description: "Alzheimer's disease, unspecified" },
    'dementia': { code: 'F03.90', description: 'Unspecified dementia without behavioral disturbance' },
    'multiple sclerosis': { code: 'G35', description: 'Multiple sclerosis' },
    'neuropathy': { code: 'G62.9', description: 'Polyneuropathy, unspecified' },
    'carpal tunnel syndrome': { code: 'G56.00', description: 'Carpal tunnel syndrome, unspecified upper limb' },
    'vertigo': { code: 'R42', description: 'Dizziness and giddiness' },
    'bell palsy': { code: "G51.0", description: "Bell's palsy" },

    // Day 3: Mental Health (F01-F99) - 20 codes
    'depression': { code: 'F32.9', description: 'Major depressive disorder, single episode, unspecified' },
    'major depression': { code: 'F32.9', description: 'Major depressive disorder' },
    'anxiety': { code: 'F41.9', description: 'Anxiety disorder, unspecified' },
    'generalized anxiety disorder': { code: 'F41.1', description: 'Generalized anxiety disorder' },
    'panic disorder': { code: 'F41.0', description: 'Panic disorder without agoraphobia' },
    'bipolar disorder': { code: 'F31.9', description: 'Bipolar disorder, unspecified' },
    'schizophrenia': { code: 'F20.9', description: 'Schizophrenia, unspecified' },
    'ptsd': { code: 'F43.10', description: 'Post-traumatic stress disorder, unspecified' },
    'ocd': { code: 'F42.9', description: 'Obsessive-compulsive disorder, unspecified' },
    'adhd': { code: 'F90.9', description: 'Attention-deficit hyperactivity disorder, unspecified type' },
    'substance abuse': { code: 'F19.10', description: 'Other psychoactive substance abuse, uncomplicated' },
    'alcohol abuse': { code: 'F10.10', description: 'Alcohol abuse, uncomplicated' },
    'alcohol dependence': { code: 'F10.20', description: 'Alcohol dependence, uncomplicated' },

    // Day 3: Renal/GU (N00-N99) - Additional 30 codes
    'acute kidney injury': { code: 'N17.9', description: 'Acute kidney failure, unspecified' },
    'aki': { code: 'N17.9', description: 'Acute kidney injury' },
    'chronic kidney disease': { code: 'N18.9', description: 'Chronic kidney disease, unspecified' },
    'ckd': { code: 'N18.9', description: 'Chronic kidney disease' },
    'ckd stage 5': { code: 'N18.5', description: 'Chronic kidney disease, stage 5' },
    'kidney stone': { code: 'N20.0', description: 'Calculus of kidney' },
    'nephrolithiasis': { code: 'N20.0', description: 'Calculus of kidney' },
    'pyelonephritis': { code: 'N10', description: 'Acute pyelonephritis' },
    'glomerulonephritis': { code: 'N05.9', description: 'Unspecified nephritic syndrome' },
    'nephrotic syndrome': { code: 'N04.9', description: 'Nephrotic syndrome' },
    'benign prostatic hyperplasia': { code: 'N40.0', description: 'Benign prostatic hyperplasia without lower urinary tract symptoms' },
    'bph': { code: 'N40.0', description: 'Benign prostatic hyperplasia' },
    'prostatitis': { code: 'N41.9', description: 'Inflammatory disease of prostate, unspecified' },
    'erectile dysfunction': { code: 'N52.9', description: 'Male erectile dysfunction, unspecified' },
    'urinary incontinence': { code: 'N39.3', description: 'Stress incontinence' },
    'urinary retention': { code: 'R33.9', description: 'Retention of urine, unspecified' },
    'overactive bladder': { code: 'N32.81', description: 'Overactive bladder' },

    // Day 3: Pregnancy/OB (O00-O9A) - Additional 20 codes
    'ectopic pregnancy': { code: 'O00.90', description: 'Unspecified ectopic pregnancy without intrauterine pregnancy' },
    'miscarriage': { code: 'O03.9', description: 'Complete or unspecified spontaneous abortion' },
    'preeclampsia': { code: 'O14.90', description: 'Unspecified pre-eclampsia' },
    'gestational diabetes': { code: 'O24.419', description: 'Gestational diabetes mellitus in pregnancy' },
    'placenta previa': { code: 'O44.10', description: 'Placenta previa with hemorrhage, unspecified trimester' },
    'placental abruption': { code: 'O45.90', description: 'Premature separation of placenta, unspecified' },
    'preterm labor': { code: 'O60.10X0', description: 'Preterm labor with preterm delivery' },
    'postpartum hemorrhage': { code: 'O72.1', description: 'Other immediate postpartum hemorrhage' },
    'hyperemesis gravidarum': { code: 'O21.0', description: 'Mild hyperemesis gravidarum' }
};

/**
 * Convert detected diagnoses to ICD code objects
 */
function convertDiagnosesToCodes(detectedDiagnoses) {
    const codes = [];

    for (const diagnosis of detectedDiagnoses) {
        const mapping = ICD10_MAPPING[diagnosis.toLowerCase()];

        if (mapping) {
            codes.push({
                code: mapping.code,
                description: mapping.description,
                poa: 'Y',  // Assume present on admission unless specified otherwise
                rationale: 'Provider-documented diagnosis',
                references: [],
                source: 'provider-documented'
            });
        }
    }

    return codes;
}

/**
 * Extract laterality from clinical text
 */
function extractLaterality(text) {
    const lower = text.toLowerCase();
    if (/\bright\b/.test(lower)) return { side: 'right', code: '1' };
    if (/\bleft\b/.test(lower)) return { side: 'left', code: '2' };
    if (/\bbilateral\b/.test(lower)) return { side: 'bilateral', code: '9' };
    return { side: 'unspecified', code: '9' };
}

/**
 * Resolve anatomical site for abscess
 */
function resolveAnatomicalSite(text) {
    const lower = text.toLowerCase();

    // Check for anatomical sites
    for (const [site, mapping] of Object.entries(ABSCESS_SITE_MAP)) {
        if (lower.includes(site)) {
            return {
                site: site,
                baseCode: mapping.base,
                siteName: mapping.name,
                found: true
            };
        }
    }

    return {
        site: 'unspecified',
        baseCode: 'L02.91',
        siteName: 'unspecified',
        found: false
    };
}

/**
 * Apply site-specific code resolution
 */
function applySiteResolution(baseMapping, text) {
    const siteInfo = resolveAnatomicalSite(text);
    const laterality = extractLaterality(text);

    // If no specific site found, return unspecified
    if (!siteInfo.found) {
        return {
            code: 'L02.91',
            description: 'Cutaneous abscess, unspecified site',
            specificity: 'generic'
        };
    }

    // Build specific code with laterality
    const lateralityCode = laterality.code;
    const specificCode = `${siteInfo.baseCode}${lateralityCode}`;

    // Build description
    let description = `Cutaneous abscess of ${siteInfo.siteName}`;
    if (laterality.side !== 'unspecified') {
        description = `Cutaneous abscess of ${laterality.side} ${siteInfo.siteName}`;
    }

    return {
        code: specificCode,
        description: description,
        specificity: laterality.side !== 'unspecified' ? 'complete' : 'partial',
        anatomicalSite: siteInfo.site,
        laterality: laterality.side
    };
}

/**
 * Apply market-specific adapter rules
 * @param {Object} params - { marketProfile, coreDecision, text }
 * @returns {Object} - Final decision with market metadata
 */
function applyMarketAdapter(params) {
    const {
        marketProfile = 'USA',
        coreDecision,  // { primary, secondary, decisionState }
        text
    } = params;

    // USA Mode: Preserve strict CMS behavior
    if (marketProfile === 'USA') {
        return {
            ...coreDecision,
            marketProfile: 'USA',
            marketRuleApplied: false,
            marketNote: 'Strict CMS/ICD-10-CM rules applied'
        };
    }

    // UAE Mode: Check for procedure-derived diagnoses
    if (marketProfile === 'UAE') {
        // ARCHITECTURAL CHANGE: Always check for procedures
        // Augment existing diagnoses with procedure-derived codes
        // (Don't skip just because core found some diagnoses)

        // Detect procedures
        const procedures = detectProcedures(text);

        // Check each procedure for matching terms
        for (const proc of procedures) {
            const mapping = UAE_PROCEDURE_DIAGNOSIS_MAP[proc.procedure];

            if (!mapping) continue;

            // Check if required clinical terms present
            if (hasRequiredTerms(text, mapping.requiredTerms)) {
                // Check for negation
                if (isNegatedUAE(text, mapping.derivedDiagnosis)) {
                    continue;
                }

                // ALL CONDITIONS MET: Add procedure-derived diagnosis

                // Convert explicit diagnoses to secondary codes
                const explicitDiagnoses = coreDecision.detectedDiagnoses || [];
                let secondaryCodes = convertDiagnosesToCodes(explicitDiagnoses);

                // Apply site resolution for abscess (Gap 1)
                let finalCode, finalDescription;
                if (mapping.derivedDiagnosis === 'abscess') {
                    const siteResolution = applySiteResolution(mapping, text);
                    finalCode = siteResolution.code;
                    finalDescription = siteResolution.description;
                } else {
                    finalCode = mapping.icdCode;
                    finalDescription = mapping.derivedDiagnosis;
                }

                // Build procedure-derived diagnosis
                const procedureDerivedCode = {
                    code: finalCode,
                    description: finalDescription,
                    poa: 'Y',
                    rationale: `Procedure-supported diagnosis per UAE market rules (${proc.procedure})`,
                    references: [],
                    source: 'procedure-derived'
                };

                // Get existing codes from core decision
                const existingPrimary = coreDecision.primary || coreDecision.primaryDescription;
                const existingSecondary = coreDecision.secondary || [];

                // If core decision had codes (AUTO_CODE), augment them
                // Procedure-derived becomes PRIMARY (reason for visit/procedure)
                // Existing codes become SECONDARY
                const shouldAugment = coreDecision.decisionState !== 'AUTO_EXCLUDE';

                if (shouldAugment && existingPrimary) {
                    // AUTO_CODE path: Added procedure code + existing codes
                    const existingAsSecondary = [{
                        code: typeof existingPrimary === 'string' ? existingPrimary : existingPrimary.code,
                        description: coreDecision.primaryDescription,
                        poa: coreDecision.primaryPOA || 'Y',
                        rationale: 'Provider-documented diagnosis',
                        source: 'provider-documented'
                    }];

                    secondaryCodes = [...existingAsSecondary, ...existingSecondary, ...secondaryCodes];
                }

                return {
                    primary: procedureDerivedCode,
                    primaryDescription: finalDescription,  // For backward compatibility
                    primaryPOA: 'Y',  // For backward compatibility
                    secondary: secondaryCodes,  // Include all diagnoses
                    decisionState: 'AUTO_CODE',
                    marketProfile: 'UAE',
                    marketRuleApplied: true,
                    derivedByMarketRule: true,
                    marketNote: 'Diagnosis derived per UAE market rules',
                    ruleReference: mapping.ruleReference,
                    primarySelectionRationale: {
                        code: finalCode,
                        reason: 'Principal diagnosis selected based on surgical management during encounter',
                        criteria: 'UAE (Daman/Shafafiya) Market Rule: Procedure-supported diagnosis',
                        supportingFactors: [
                            `Surgical procedure performed: ${proc.procedure}`,
                            `Clinical evidence documented: ${mapping.requiredTerms.join(', ')}`,
                            `Diagnosis represents primary reason for encounter`,
                            `Active treatment required and provided`,
                            `Meets Daman/Shafafiya procedure-derived diagnosis criteria`
                        ],
                        ruleReference: mapping.ruleReference,
                        marketJurisdiction: 'UAE (Daman/Shafafiya)',
                        auditDefense: 'Procedure documentation supports diagnosis per UAE market standards'
                    },
                    diagnosisSourceMap: {
                        [finalCode]: {
                            source: 'procedure-derived',
                            procedure: proc.procedure,
                            supportingEvidence: `Procedure performed: ${proc.procedure}. Clinical terms documented: ${mapping.requiredTerms.join(', ')}`,
                            anatomicalSite: finalDescription.includes('right') || finalDescription.includes('left') ?
                                finalDescription : 'See diagnosis description',
                            marketRule: mapping.ruleReference
                        },
                        ...Object.fromEntries(
                            secondaryCodes.map(sc => [
                                sc.code,
                                {
                                    source: sc.source || 'provider-documented',
                                    supportingEvidence: `Explicit diagnosis documented in clinical narrative`,
                                    detectedFrom: explicitDiagnoses.find(d =>
                                        ICD10_MAPPING[d.toLowerCase()]?.code === sc.code
                                    ) || 'clinical documentation'
                                }
                            ])
                        )
                    },
                    derivationDetails: {
                        procedure: proc.procedure,
                        derivedDiagnosis: finalDescription,
                        supportingTerms: mapping.requiredTerms.filter(t =>
                            hasRequiredTerms(text, [t])
                        ),
                        explicitDiagnoses: explicitDiagnoses,
                        secondaryCodesFromExplicit: secondaryCodes.length,
                        augmentedExistingCodes: shouldAugment
                    }
                };
            }
        }

        // No procedure-diagnosis derivation applicable
        return {
            ...coreDecision,
            marketProfile: 'UAE',
            marketRuleApplied: false,
            marketNote: 'No procedure-derived diagnosis applicable'
        };
    }

    // Unknown market profile - default to USA (strict)
    return {
        ...coreDecision,
        marketProfile: 'USA',
        marketRuleApplied: false,
        marketNote: 'Unknown market profile - defaulting to strict CMS rules'
    };
}

module.exports = {
    applyMarketAdapter,
    detectProcedures,
    UAE_PROCEDURE_DIAGNOSIS_MAP
};
