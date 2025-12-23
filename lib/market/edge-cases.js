/**
 * Edge Case Validators for UAE Market
 * Day 5: Edge case detection and validation
 */

/**
 * Validate laterality when required
 */
function validateLaterality(code, text) {
    // Codes requiring laterality (bilateral structures)
    const requiresLaterality = /^(S[4-9]\d|M\d{2}\.[5-7])/;

    if (requiresLaterality.test(code)) {
        const hasLaterality = /\b(right|left|bilateral)\b/i.test(text);

        if (!hasLaterality) {
            return {
                isValid: false,
                issue: 'Missing laterality',
                code: code,
                recommendation: 'Query provider for right/left/bilateral specification',
                defaultAction: 'Use unspecified laterality code (code ending in 9)'
            };
        }
    }

    return { isValid: true };
}

/**
 * Detect conflicting documentation
 */
function detectConflictingDocumentation(text) {
    const conflicts = [];

    // Check for conflicting laterality
    const rightCount = (text.match(/\bright\b/gi) || []).length;
    const leftCount = (text.match(/\bleft\b/gi) || []).length;

    if (rightCount > 0 && leftCount > 0) {
        // Could be bilateral or conflicting
        const bilateralMention = /\bbilateral\b/i.test(text);

        if (!bilateralMention) {
            conflicts.push({
                type: 'laterality_conflict',
                severity: 'medium',
                details: 'Both right and left mentioned without bilateral clarification',
                recommendation: 'Review documentation for correct laterality'
            });
        }
    }

    // Check for conflicting acute/chronic
    const hasAcute = /\bacute\b/i.test(text);
    const hasChronic = /\bchronic\b/i.test(text);

    if (hasAcute && hasChronic) {
        conflicts.push({
            type: 'temporal_conflict',
            severity: 'low',
            details: 'Both acute and chronic mentioned',
            recommendation: 'Determine if acute exacerbation of chronic condition'
        });
    }

    return {
        hasConflicts: conflicts.length > 0,
        conflicts: conflicts
    };
}

/**
 * Validate procedure without diagnosis
 */
function validateProcedureWithoutDiagnosis(procedure, diagnosesFound) {
    const requiredTerms = procedure.mapping?.requiredTerms || [];

    if (requiredTerms.length === 0) {
        return { isValid: true };
    }

    if (diagnosesFound.length === 0) {
        return {
            isValid: false,
            issue: 'Procedure documented without supporting diagnosis',
            procedure: procedure.procedure,
            recommendation: 'Query provider for indication',
            allowedInUAE: procedure.mapping?.optional === true,
            note: procedure.mapping?.optional
                ? 'Procedure allowed without explicit diagnosis in UAE market'
                : 'Requires clinical indication for coding'
        };
    }

    return { isValid: true };
}

/**
 * Handle chronic condition exacerbations
 */
function handleExacerbation(diagnosis, text) {
    const chronicConditions = [
        'copd', 'asthma', 'heart failure', 'ckd', 'hepatitis',
        'depression', 'anxiety', 'arthritis'
    ];

    const lower = text.toLowerCase();
    const diagLower = diagnosis.toLowerCase();

    // Check if this is a chronic condition
    const isChronic = chronicConditions.some(cc => diagLower.includes(cc));

    if (!isChronic) {
        return { isExacerbation: false };
    }

    // Check for exacerbation indicators
    const exacerbationTerms = [
        'exacerbation', 'acute exacerbation', 'flare', 'flare-up',
        'worsening', 'decompensated', 'acute on chronic'
    ];

    const hasExacerbation = exacerbationTerms.some(term =>
        lower.includes(term)
    );

    if (hasExacerbation) {
        return {
            isExacerbation: true,
            baseCondition: diagnosis,
            recommendation: 'Use exacerbation-specific code',
            note: 'Code acute exacerbation, not baseline chronic condition',
            examples: {
                'copd': 'J44.1 (with exacerbation) instead of J44.9',
                'asthma': 'J45.x1 (with exacerbation) instead of J45.x0'
            }
        };
    }

    return { isExacerbation: false };
}

/**
 * Handle multiple sites of same condition
 */
function handleMultipleSites(condition, text) {
    const sites = [];
    const lower = text.toLowerCase();

    // Common anatomical sites
    const anatomicalTerms = [
        'right', 'left', 'bilateral',
        'hand', 'foot', 'arm', 'leg',
        'finger', 'toe', 'knee', 'hip'
    ];

    // Extract mentioned sites
    for (const term of anatomicalTerms) {
        if (lower.includes(term)) {
            sites.push(term);
        }
    }

    if (sites.length > 2) {
        return {
            hasMultipleSites: true,
            sites: sites,
            recommendation: 'Code each site separately if clinically distinct',
            note: `Multiple sites mentioned: ${sites.join(', ')}`,
            examples: 'Abscesses of right hand AND left foot = L02.51 + L02.62'
        };
    }

    return { hasMultipleSites: false };
}

/**
 * Validate missing required information
 */
function validateCompleteness(diagnosis, code, text) {
    const issues = [];

    // Check for placeholder codes
    if (code.includes('unspecified') || code.endsWith('9')) {
        issues.push({
            type: 'specificity',
            severity: 'low',
            message: 'Unspecified code - additional detail may be available',
            recommendation: 'Review documentation for more specific information'
        });
    }

    // Check for initial encounter codes needing context
    if (code.endsWith('A') && code.startsWith('S')) {
        const hasEncounterContext = /\b(initial|first|new)\b/i.test(text);

        if (!hasEncounterContext) {
            issues.push({
                type: 'encounter_context',
                severity: 'low',
                message: 'Initial encounter code used - verify this is first treatment',
                recommendation: 'Confirm encounter type (initial vs subsequent)'
            });
        }
    }

    return {
        isComplete: issues.length === 0,
        issues: issues
    };
}

module.exports = {
    validateLaterality,
    detectConflictingDocumentation,
    validateProcedureWithoutDiagnosis,
    handleExacerbation,
    handleMultipleSites,
    validateCompleteness
};
