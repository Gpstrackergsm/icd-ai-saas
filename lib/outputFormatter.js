/**
 * Clean Output Formatter
 * Transforms internal audit results into user-facing decision format
 * 
 * Outputs ONLY:
 * - Outcome A: CODES ASSIGNED
 * - Outcome B: NO CODES ASSIGNED
 */

/**
 * Format audit result for clean user output
 * @param {Object} auditResult - Internal audit engine result
 * @returns {Object} Clean formatted output (Outcome A or B)
 */
function formatCleanOutput(auditResult) {
    const { primary, primaryDescription, secondary, _debug } = auditResult;

    // Determine if codes can be assigned
    const hasCodes = primary && primary !== null;
    const decisionState = _debug?.decisionState || 'UNKNOWN';

    // Outcome A: Codes can be assigned
    if (hasCodes && (decisionState === 'AUTO_CODE' || decisionState === 'EXPLICIT_DIAGNOSIS')) {
        return formatOutcomeA(auditResult);
    }

    // Outcome B: No codes assigned
    return formatOutcomeB(auditResult);
}

/**
 * Format Outcome A - CODES ASSIGNED
 */
function formatOutcomeA(auditResult) {
    const { primary, primaryDescription, secondary } = auditResult;

    const codes = [];

    // Primary diagnosis
    if (primary) {
        codes.push({
            code: primary,
            description: primaryDescription || 'No description available'
        });
    }

    // Secondary diagnoses
    if (secondary && secondary.length > 0) {
        secondary.forEach(diag => {
            codes.push({
                code: diag.code,
                description: diag.description
            });
        });
    }

    return {
        outcome: 'CODES_ASSIGNED',
        codes,
        why: 'The provider explicitly documented the diagnoses and treated them.',
        status: [
            '✔ Ready for coding',
            '✔ Audit-safe'
        ],
        display: {
            title: 'ICD-10-CM Codes',
            message: codes.map(c => `${c.code} — ${c.description}`).join('\n')
        }
    };
}

/**
 * Format Outcome B - NO CODES ASSIGNED
 */
function formatOutcomeB(auditResult) {
    const { queries, _debug } = auditResult;

    // Determine reason based on what was detected
    let reason = 'The provider treated or mentioned conditions, but no formal diagnosis was documented.';
    let whatToDo = [
        'Request documentation such as:',
        '• "Diagnosis: [condition]"',
        '• "Assessment: [condition]"'
    ];

    // If we have queries, extract specific missing documentation
    if (queries && queries.length > 0) {
        const queryReasons = queries.map(q => q.query).join(', ');
        reason = `Clinical data identified (${queryReasons}), but no explicit provider diagnosis documented.`;
    }

    return {
        outcome: 'NO_CODES_ASSIGNED',
        codes: [],
        why: reason,
        whatToDo: whatToDo.join('\n'),
        status: [
            '✔ Audit-safe',
            '✔ No inference made'
        ],
        display: {
            title: 'No ICD-10-CM codes assigned',
            message: reason
        }
    };
}

/**
 * Check if output should use clean format
 */
function shouldUseCleanFormat(req) {
    // Check query param
    if (req.query && req.query.format === 'clean') {
        return true;
    }

    // Check request body
    if (req.body && req.body.format === 'clean') {
        return true;
    }

    // Default: use clean format
    return true;
}

/**
 * Get legacy format (for backward compatibility)
 */
function getLegacyFormat(auditResult) {
    return {
        data: auditResult
    };
}

module.exports = {
    formatCleanOutput,
    shouldUseCleanFormat,
    getLegacyFormat
};
