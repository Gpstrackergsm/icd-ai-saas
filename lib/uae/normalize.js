/**
 * UAE Input Normalizer
 * Maps UAE-style clinical notes to standard English phrases
 * Preserves existing Level 0 explicit diagnosis override behavior
 */

// UAE common abbreviations dictionary
const UAE_ABBREVIATIONS = {
    // Respiratory
    'SOB': 'shortness of breath',
    'SOB on exertion': 'shortness of breath on exertion',
    'SOBO': 'shortness of breath',
    'SOBOE': 'shortness of breath on exertion',
    'CAP': 'community acquired pneumonia',
    'HAP': 'hospital acquired pneumonia',
    'AECB': 'COPD exacerbation',
    'AECOPD': 'COPD exacerbation',

    // Renal
    'AKI': 'acute kidney injury',
    'ESRD': 'end stage renal disease',
    'CKD': 'chronic kidney disease',
    'UTI': 'urinary tract infection',

    // Cardiac
    'MI': 'myocardial infarction',
    'AMI': 'acute myocardial infarction',
    'STEMI': 'ST elevation myocardial infarction',
    'NSTEMI': 'non-ST elevation myocardial infarction',
    'CHF': 'congestive heart failure',
    'HF': 'heart failure',
    'AF': 'atrial fibrillation',
    'AFib': 'atrial fibrillation',
    'HTN': 'hypertension',
    'HBP': 'hypertension',

    // Endocrine
    'DM': 'diabetes mellitus',
    'T2DM': 'type 2 diabetes',
    'T1DM': 'type 1 diabetes',
    'DMT2': 'type 2 diabetes',

    // Infectious
    'MRSA': 'methicillin resistant staphylococcus aureus',

    // GI
    'GERD': 'gastroesophageal reflux disease',
    'IBS': 'irritable bowel syndrome',

    // Neuro
    'CVA': 'cerebrovascular accident',
    'TIA': 'transient ischemic attack',

    // General
    'Pt': 'patient',
    'Hx': 'history',
    'Dx': 'diagnosis',
    'Tx': 'treatment'
};

/**
 * Normalize UAE-style clinical text
 * @param {string} text - Raw clinical text
 * @param {Object} options - Normalization options
 * @returns {Object} { normalizedText, appliedTransformations }
 */
function normalize(text, options = {}) {
    if (!text) {
        return { normalizedText: '', appliedTransformations: [] };
    }

    let normalizedText = text;
    const appliedTransformations = [];

    // 1. Normalize UAE section headers (preserve Level 0 explicit diagnosis override)
    const sectionMappings = [
        { from: /Assessment:/gi, to: 'Diagnosis:' },
        { from: /Impression:/gi, to: 'Diagnosis:' },
        { from: /Clinical Impression:/gi, to: 'Diagnosis:' },
        { from: /Working Diagnosis:/gi, to: 'Diagnosis:' },
        { from: /Final Diagnosis:/gi, to: 'Diagnosis:' }
    ];

    sectionMappings.forEach(mapping => {
        if (mapping.from.test(normalizedText)) {
            normalizedText = normalizedText.replace(mapping.from, mapping.to);
            appliedTransformations.push({
                type: 'section_header',
                from: mapping.from.source,
                to: mapping.to
            });
        }
    });

    // 2. Expand UAE abbreviations (word-boundary aware)
    Object.entries(UAE_ABBREVIATIONS).forEach(([abbrev, expansion]) => {
        // Create word-boundary regex for the abbreviation
        const regex = new RegExp(`\\b${escapeRegex(abbrev)}\\b`, 'g');

        if (regex.test(normalizedText)) {
            const beforeCount = (normalizedText.match(regex) || []).length;
            normalizedText = normalizedText.replace(regex, expansion);

            if (beforeCount > 0) {
                appliedTransformations.push({
                    type: 'abbreviation',
                    from: abbrev,
                    to: expansion,
                    occurrences: beforeCount
                });
            }
        }
    });

    // 3. Normalize common UAE phrasing patterns
    const phraseMappings = [
        // "Patient is known case of HTN" -> "Patient has HTN"
        { from: /is known case of/gi, to: 'has' },
        { from: /known case of/gi, to: 'has' },
        { from: /is a case of/gi, to: 'has' },

        // "Patient came with complaint of" -> "Patient presenting with"
        { from: /came with complaint of/gi, to: 'presenting with' },
        { from: /presented with complaint of/gi, to: 'presenting with' },
        { from: /presents with complaint of/gi, to: 'presenting with' }
    ];

    phraseMappings.forEach(mapping => {
        if (mapping.from.test(normalizedText)) {
            normalizedText = normalizedText.replace(mapping.from, mapping.to);
            appliedTransformations.push({
                type: 'phrase',
                from: mapping.from.source,
                to: mapping.to
            });
        }
    });

    return {
        normalizedText,
        appliedTransformations,
        originalText: text
    };
}

/**
 * Escape special regex characters
 */
function escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Check if text contains UAE-style abbreviations
 */
function hasUAEAbbreviations(text) {
    for (const abbrev of Object.keys(UAE_ABBREVIATIONS)) {
        const regex = new RegExp(`\\b${escapeRegex(abbrev)}\\b`, 'i');
        if (regex.test(text)) {
            return true;
        }
    }
    return false;
}

/**
 * Get list of detected UAE abbreviations in text
 */
function detectUAEAbbreviations(text) {
    const detected = [];
    for (const [abbrev, expansion] of Object.entries(UAE_ABBREVIATIONS)) {
        const regex = new RegExp(`\\b${escapeRegex(abbrev)}\\b`, 'gi');
        const matches = text.match(regex);
        if (matches) {
            detected.push({
                abbreviation: abbrev,
                expansion,
                count: matches.length
            });
        }
    }
    return detected;
}

module.exports = {
    normalize,
    hasUAEAbbreviations,
    detectUAEAbbreviations,
    UAE_ABBREVIATIONS
};
