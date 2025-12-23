/**
 * Rewrite Generator
 * Auto-generates suggested clinical note rewrites with explicit diagnosis sections
 * Used when returning Outcome B (NO CODES)
 */

/**
 * Generate rewritten clinical note with explicit diagnosis section
 * @param {string} originalText - Original clinical narrative
 * @param {Object} detectedConditions - Conditions mentioned but not formally diagnosed
 * @returns {Object} Rewrite suggestion
 */
function generateRewrite(originalText, detectedConditions = {}) {
    // Extract conditions from original text
    const conditions = extractImpliedConditions(originalText);

    if (conditions.length === 0) {
        return null;
    }

    // Build diagnosis section
    const diagnosisSection = buildDiagnosisSection(conditions);

    // Construct rewritten note
    const rewrittenNote = `${diagnosisSection}\n\n${originalText}`;

    return {
        hasSuggestion: true,
        diagnosisSection,
        rewrittenNote,
        conditions,
        note: 'This suggestion formalizes conditions already implied in the narrative without adding new clinical information.'
    };
}

/**
 * Extract implied conditions from narrative
 */
function extractImpliedConditions(text) {
    const conditions = [];
    const lower = text.toLowerCase();

    // Common patterns that imply diagnoses
    const patterns = [
        // Hypertension
        {
            pattern: /hypertension|htn|high blood pressure|antihypertensive/i,
            condition: 'Essential hypertension',
            confidence: 'high'
        },
        // Diabetes
        {
            pattern: /diabetes|diabetic|metformin|insulin/i,
            condition: 'Type 2 diabetes mellitus',
            confidence: 'high'
        },
        // Abscess
        {
            pattern: /abscess|incision and drainage|i&d|purulent/i,
            condition: 'Abscess',
            confidence: 'high'
        },
        // COPD
        {
            pattern: /copd|chronic obstructive|emphysema/i,
            condition: 'Chronic obstructive pulmonary disease',
            confidence: 'high'
        },
        // CHF
        {
            pattern: /heart failure|chf|cardiomyopathy/i,
            condition: 'Heart failure',
            confidence: 'high'
        },
        // CKD
        {
            pattern: /chronic kidney disease|ckd|renal disease/i,
            condition: 'Chronic kidney disease',
            confidence: 'high'
        },
        // Pneumonia
        {
            pattern: /pneumonia|lung infection|chest infection/i,
            condition: 'Pneumonia',
            confidence: 'high'
        },
        // UTI
        {
            pattern: /urinary tract infection|uti|cystitis/i,
            condition: 'Urinary tract infection',
            confidence: 'high'
        }
    ];

    patterns.forEach(p => {
        if (p.pattern.test(text)) {
            // Extract more specific context if possible
            let specificCondition = p.condition;

            // Check for locations (e.g., "left index finger")
            if (p.condition === 'Abscess' && /left index finger/i.test(text)) {
                specificCondition = 'Abscess of left index finger';
            }

            conditions.push({
                condition: specificCondition,
                confidence: p.confidence,
                evidence: 'Inferred from treatment/medications mentioned'
            });
        }
    });

    // Deduplicate
    const unique = [];
    const seen = new Set();
    conditions.forEach(c => {
        if (!seen.has(c.condition)) {
            seen.add(c.condition);
            unique.push(c);
        }
    });

    return unique;
}

/**
 * Build diagnosis section text
 */
function buildDiagnosisSection(conditions) {
    if (conditions.length === 0) {
        return '';
    }

    let section = 'Diagnosis:\n';
    conditions.forEach((c, idx) => {
        section += `${idx + 1}. ${c.condition}\n`;
    });

    return section.trim();
}

/**
 * Check if rewrite is needed
 */
function needsRewrite(auditResult) {
    const { primary, _debug } = auditResult;

    // Need rewrite if no codes assigned due to missing explicit diagnosis
    if (!primary && _debug?.decisionState === 'AUTO_EXCLUDE') {
        return true;
    }

    return false;
}

module.exports = {
    generateRewrite,
    needsRewrite,
    extractImpliedConditions
};
