"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveDiabetes = resolveDiabetes;
function detectDiabetesFamily(text) {
    if (/type\s*1/.test(text))
        return 'E10';
    if (/type\s*2/.test(text))
        return 'E11';
    if (/(due to|secondary to|result of)\s+(pancreatitis|cystic fibrosis|malignancy|underlying|condition)/.test(text)) {
        return 'E08';
    }
    if (/(drug[- ]induced|steroid|medication|chemotherapy)/.test(text))
        return 'E09';
    if (/other specified/.test(text))
        return 'E13';
    if (/diabet/.test(text) || /\bdm\b/.test(text))
        return 'E11';
    return undefined;
}
function detectLaterality(text) {
    if (/bilateral/.test(text))
        return 'bilateral';
    if (/left/.test(text))
        return 'left';
    if (/right/.test(text))
        return 'right';
    return 'unspecified';
}
function detectRetinopathyStage(text) {
    if (/mild/.test(text) && /npdr/.test(text))
        return 'mild-npdr';
    if (/moderate/.test(text) && /npdr/.test(text))
        return 'moderate-npdr';
    if (/severe/.test(text) && /npdr/.test(text))
        return 'severe-npdr';
    if (/proliferative/.test(text))
        return 'pdr';
    if (/traction/.test(text) && /detachment/.test(text))
        return 'traction-detachment';
    if (/combined/.test(text) && /detachment/.test(text))
        return 'combined-detachment';
    if (/retinopathy/.test(text))
        return 'unspecified';
    return undefined;
}
function detectCkdStage(text) {
    if (/ckd\s*stage\s*5|esrd|end[- ]stage\s+renal/.test(text))
        return 'ESRD';
    if (/ckd\s*stage\s*4|stage\s*4\s+ckd/.test(text))
        return 4;
    if (/ckd\s*stage\s*3|stage\s*3\s+ckd/.test(text))
        return 3;
    if (/ckd\s*stage\s*2|stage\s*2\s+ckd/.test(text))
        return 2;
    if (/ckd\s*stage\s*1|stage\s*1\s+ckd/.test(text))
        return 1;
    if (/chronic kidney disease|ckd|chronic renal/.test(text))
        return 'ESRD'; // Default to unspecified
    return undefined;
}
function detectNeuropathyType(text) {
    if (/peripheral\s+neuropathy/.test(text))
        return 'peripheral';
    if (/autonomic\s+neuropathy/.test(text))
        return 'autonomic';
    if (/polyneuropathy/.test(text))
        return 'polyneuropathy';
    if (/neuropathy/.test(text))
        return 'unspecified';
    return undefined;
}
function detectCharcotJoint(text) {
    const hasCharcot = /charcot|neuropathic\s+arthropathy/.test(text);
    if (!hasCharcot)
        return { detected: false, laterality: 'unspecified' };
    const laterality = detectLaterality(text);
    return { detected: true, laterality };
}
function buildBaseCode(prefix) {
    return `${prefix}.9`;
}
function mapHypoglycemiaCode(prefix, coma) {
    if (prefix === 'none')
        return 'E15';
    return coma ? `${prefix}.641` : `${prefix}.649`;
}
function mapHyperglycemiaCode(prefix) {
    return `${prefix}.65`;
}
function resolveDiabetes(text) {
    const lower = text.toLowerCase();
    const warnings = [];
    const diabetesPresent = /diabet/.test(lower) || /\bdm\b/.test(lower) || /type\s*[12]/.test(lower) || /presymptomatic/.test(lower) || /due to underlying condition/.test(lower);
    const prefix = detectDiabetesFamily(lower);
    const diabetes_type = diabetesPresent ? prefix || 'E11' : 'none';
    const ckdStage = detectCkdStage(lower);
    const neuropathyType = detectNeuropathyType(lower);
    const charcotInfo = detectCharcotJoint(lower);
    const attributes = {
        diabetes_type,
        complication: 'none',
        cause: undefined,
        pump_failure: /insulin pump/.test(lower),
        overdose_or_underdose: 'none',
        laterality: detectLaterality(lower),
        stage: detectRetinopathyStage(lower),
        macular_edema: /macular edema/.test(lower),
        neuropathy_type: neuropathyType,
        ckd_stage: ckdStage,
        charcot_joint: charcotInfo.detected,
        charcot_laterality: charcotInfo.laterality,
    };
    if (prefix === 'E08')
        attributes.cause = 'underlying_condition';
    if (prefix === 'E09')
        attributes.cause = 'drug';
    if (!diabetesPresent) {
        if (/hypoglyc/.test(lower) && /coma/.test(lower)) {
            attributes.complication = 'hypoglycemia';
            return { code: 'E15', label: 'Nondiabetic hypoglycemic coma', attributes, warnings };
        }
        return undefined;
    }
    if (!prefix) {
        warnings.push('Diabetes mentioned without type; unable to assign family');
    }
    const presymptomaticStage1 = /stage\s*1/.test(lower) || (/presymptomatic/.test(lower) && /multiple autoantibodies/.test(lower)) || (/presymptomatic/.test(lower) && /normoglycemia/.test(lower));
    const presymptomaticStage2 = /stage\s*2/.test(lower) || (/presymptomatic/.test(lower) && /islet autoimmunity/.test(lower)) || (/presymptomatic/.test(lower) && /dysglycemia/.test(lower));
    if (presymptomaticStage1 && presymptomaticStage2) {
        warnings.push('Conflicting presymptomatic stages detected');
    }
    if (prefix === 'E10' && (presymptomaticStage1 || presymptomaticStage2)) {
        attributes.presymptomatic_stage = presymptomaticStage1 ? 'stage1' : 'stage2';
        if (/complication|hypoglyc|hyperglyc|retinopathy|ketoacidosis/.test(lower)) {
            warnings.push('Presymptomatic Type 1 diabetes cannot be reported with complications; complications ignored');
        }
        const code = presymptomaticStage1 ? 'E10.A1' : 'E10.A2';
        return { code, label: 'Presymptomatic Type 1 diabetes', attributes, warnings };
    }
    if (/ketoacidosis|\bdka\b/.test(lower)) {
        if (/coma/.test(lower)) {
            warnings.push('DKA with coma detected; coma not supported in current mapping');
        }
        attributes.complication = 'ketoacidosis';
        const code = prefix === 'E10' ? 'E10.10' : prefix === 'E11' ? 'E11.10' : `${diabetes_type}.10`;
        return { code, label: 'Diabetes with ketoacidosis', attributes, warnings };
    }
    if (/hypoglyc/.test(lower)) {
        attributes.complication = 'hypoglycemia';
        const coma = /coma/.test(lower);
        const code = prefix === 'E08' && coma ? 'E08.641' : mapHypoglycemiaCode(diabetes_type, coma);
        return { code, label: coma ? 'Diabetes with hypoglycemic coma' : 'Diabetes with hypoglycemia', attributes, warnings };
    }
    if (/hyperglyc/.test(lower)) {
        attributes.complication = 'hyperglycemia';
        return { code: mapHyperglycemiaCode(diabetes_type), label: 'Diabetes with hyperglycemia', attributes, warnings };
    }
    if (/retinopathy/.test(lower) || /npdr/.test(lower) || /pdr/.test(lower)) {
        attributes.complication = 'retinopathy';
    }
    // Charcot joint detection (highest priority for neuropathy)
    if (charcotInfo.detected) {
        attributes.complication = 'charcot';
        warnings.push('Charcot joint in diabetes context: using diabetes-specific code (E*.610), NOT M14.6*');
        const code = `${diabetes_type}.610`;
        return { code, label: 'Diabetes with diabetic neuropathic arthropathy (Charcot joint)', attributes, warnings };
    }
    const secondary_codes = [];
    // Diabetic Foot Ulcer
    if (/ulcer/.test(lower) && (/foot|heel|toe|ankle/.test(lower))) {
        attributes.complication = 'unspecified'; // Will be overridden by specific code
        const ulcerCode = `${diabetes_type}.621`;
        // Determine L97 code
        let l97Base = 'L97.5'; // Default to other part of foot
        let siteLabel = 'foot';
        if (/ankle/.test(lower)) {
            l97Base = 'L97.3';
            siteLabel = 'ankle';
        }
        else if (/heel/.test(lower)) {
            l97Base = 'L97.4';
            siteLabel = 'heel';
        }
        else if (/toe/.test(lower)) {
            l97Base = 'L97.5';
            siteLabel = 'toe';
        } // L97.5 covers toes too
        // Laterality
        let latDigit = '9';
        if (attributes.laterality === 'right')
            latDigit = '1';
        if (attributes.laterality === 'left')
            latDigit = '2';
        // Depth/Severity
        let depthDigit = '9'; // Unspecified
        if (/bone/.test(lower) && /necrosis|exposed/.test(lower))
            depthDigit = '4';
        else if (/muscle/.test(lower) && /necrosis|exposed/.test(lower))
            depthDigit = '3';
        else if (/fat/.test(lower) && /exposed/.test(lower))
            depthDigit = '2';
        else if (/skin/.test(lower) && /breakdown/.test(lower))
            depthDigit = '1';
        const l97Code = `${l97Base}${latDigit}${depthDigit}`;
        secondary_codes.push({
            code: l97Code,
            label: `Non-pressure chronic ulcer of ${siteLabel}`,
            type: 'manifestation'
        });
        // Check for other complications to add as secondary codes
        // 1. CKD
        if (ckdStage !== undefined || /nephropathy|kidney disease|renal/.test(lower)) {
            let ckdDiabetesCode = `${diabetes_type}.22`; // Default to CKD
            if (ckdStage === 1 || ckdStage === 2)
                ckdDiabetesCode = `${diabetes_type}.21`;
            else if (ckdStage === 3 || ckdStage === 4 || ckdStage === 5 || ckdStage === 'ESRD')
                ckdDiabetesCode = `${diabetes_type}.22`;
            else
                ckdDiabetesCode = `${diabetes_type}.29`;
            secondary_codes.push({ code: ckdDiabetesCode, label: 'Diabetes with diabetic chronic kidney disease', type: 'complication' });
            let n18Code = 'N18.9';
            if (ckdStage === 1)
                n18Code = 'N18.1';
            else if (ckdStage === 2)
                n18Code = 'N18.2';
            else if (ckdStage === 3)
                n18Code = 'N18.30';
            else if (ckdStage === 4)
                n18Code = 'N18.4';
            else if (ckdStage === 5 || ckdStage === 'ESRD')
                n18Code = 'N18.6';
            secondary_codes.push({ code: n18Code, label: `Chronic kidney disease, stage ${ckdStage || 'unspecified'}`, type: 'manifestation' });
        }
        // 2. Neuropathy
        if (neuropathyType !== undefined) {
            let neuroCode = `${diabetes_type}.40`;
            if (neuropathyType === 'peripheral')
                neuroCode = `${diabetes_type}.42`;
            else if (neuropathyType === 'autonomic')
                neuroCode = `${diabetes_type}.43`;
            else if (neuropathyType === 'polyneuropathy')
                neuroCode = `${diabetes_type}.42`;
            secondary_codes.push({ code: neuroCode, label: `Diabetes with diabetic ${neuropathyType} neuropathy`, type: 'complication' });
        }
        return {
            code: ulcerCode,
            label: 'Diabetes with foot ulcer',
            attributes,
            secondary_codes,
            warnings
        };
    }
    // Nephropathy/CKD detection
    if (ckdStage !== undefined || /nephropathy|kidney disease|renal/.test(lower)) {
        attributes.complication = 'nephropathy';
        let code;
        if (ckdStage === 1 || ckdStage === 2) {
            code = `${diabetes_type}.21`;
        }
        else if (ckdStage === 3 || ckdStage === 4 || ckdStage === 5 || ckdStage === 'ESRD') {
            code = `${diabetes_type}.22`;
        }
        else {
            code = `${diabetes_type}.29`;
        }
        // Add N18 code as secondary
        if (ckdStage) {
            let n18Code = 'N18.9';
            if (ckdStage === 1)
                n18Code = 'N18.1';
            else if (ckdStage === 2)
                n18Code = 'N18.2';
            else if (ckdStage === 3)
                n18Code = 'N18.30'; // Default to unspecified 3
            else if (ckdStage === 4)
                n18Code = 'N18.4';
            else if (ckdStage === 5 || ckdStage === 'ESRD')
                n18Code = 'N18.6'; // ESRD is N18.6
            secondary_codes.push({
                code: n18Code,
                label: `Chronic kidney disease, stage ${ckdStage}`,
                type: 'manifestation'
            });
        }
        return { code, label: 'Diabetes with diabetic chronic kidney disease', attributes, secondary_codes, warnings };
    }
    // Enhanced neuropathy detection
    if (neuropathyType !== undefined) {
        attributes.complication = 'neuropathy';
        let code;
        if (neuropathyType === 'peripheral') {
            code = `${diabetes_type}.42`;
        }
        else if (neuropathyType === 'autonomic') {
            code = `${diabetes_type}.43`;
        }
        else if (neuropathyType === 'polyneuropathy') {
            code = `${diabetes_type}.42`;
        }
        else {
            code = `${diabetes_type}.40`;
        }
        return { code, label: `Diabetes with diabetic ${neuropathyType} neuropathy`, attributes, warnings };
    }
    if (prefix === 'E10') {
        if (/neuropath/.test(lower)) {
            attributes.complication = 'neuropathy';
            return { code: 'E10.40', label: 'Type 1 diabetes with neuropathy', attributes, warnings };
        }
        if (/circulatory|angiopathy|pvd|vascular/.test(lower)) {
            attributes.complication = 'circulatory';
            return { code: 'E10.59', label: 'Type 1 diabetes with circulatory complications', attributes, warnings };
        }
        if (/oral|periodontal|gingivitis|dental/.test(lower)) {
            attributes.complication = 'oral';
            return { code: 'E10.638', label: 'Type 1 diabetes with oral complications', attributes, warnings };
        }
        if (/complication/.test(lower) && attributes.complication === 'none') {
            attributes.complication = 'unspecified';
            return { code: 'E10.8', label: 'Type 1 diabetes with unspecified complication', attributes, warnings };
        }
    }
    return { code: buildBaseCode(diabetes_type), label: 'Diabetes mellitus', attributes, warnings };
}
