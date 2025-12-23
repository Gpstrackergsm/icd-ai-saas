/**
 * Complex Scenario Handlers for UAE Market
 * Day 4: Advanced clinical scenario logic
 */

/**
 * Handle multi-procedure encounters
 * Example: Colonoscopy + Polypectomy + Biopsy
 */
function handleMultiProcedure(procedures, text) {
    const procedureCodes = [];
    const diagnosisCodes = [];

    for (const proc of procedures) {
        // Each procedure may derive its own diagnosis
        // Prioritize by clinical significance
        procedureCodes.push({
            procedure: proc.procedure,
            priority: proc.mapping.priority || 'standard',
            derivedDiagnosis: proc.mapping.derivedDiagnosis
        });
    }

    // Sort by priority (therapeutic > diagnostic)
    procedureCodes.sort((a, b) => {
        const priorityOrder = { 'therapeutic': 1, 'diagnostic': 2, 'standard': 3 };
        return priorityOrder[a.priority] - priorityOrder[b.priority];
    });

    return {
        primaryProcedure: procedureCodes[0],
        additionalProcedures: procedureCodes.slice(1),
        note: 'Multi-procedure encounter - codes sequenced by clinical priority'
    };
}

/**
 * Handle surgical complications
 * Example: Post-op infection after appendectomy
 */
function handleComplication(text, originalProcedure) {
    const complications = {
        'wound infection': { code: 'T81.4XXA', description: 'Infection following a procedure' },
        'postoperative infection': { code: 'T81.4XXA', description: 'Infection following a procedure' },
        'wound dehiscence': { code: 'T81.31XA', description: 'Disruption of external operation wound' },
        'hemorrhage': { code: 'T81.0XXA', description: 'Hemorrhage and hematoma complicating a procedure' },
        'post-op bleeding': { code: 'T81.0XXA', description: 'Hemorrhage complicating a procedure' },
        'seroma': { code: 'T81.89XA', description: 'Other complications of procedures' },
        'anastomotic leak': { code: 'T81.83XA', description: 'Persistent postprocedural fistula' }
    };

    const lower = text.toLowerCase();

    for (const [term, mapping] of Object.entries(complications)) {
        if (lower.includes(term)) {
            return {
                isComplication: true,
                complicationCode: mapping.code,
                complicationDescription: mapping.description,
                relatedProcedure: originalProcedure,
                note: `Complication of ${originalProcedure}: ${term}`
            };
        }
    }

    return { isComplication: false };
}

/**
 * Handle intraoperative findings
 * Example: Unexpected perforation during cholecystectomy
 */
function handleIntraoperativeFindings(text, procedure) {
    const findings = {
        'perforation': { upgrade: 'with perforation', severity: 'high' },
        'perforated': { upgrade: 'with perforation', severity: 'high' },
        'gangrenous': { upgrade: 'with gangrene', severity: 'high' },
        'abscess': { upgrade: 'with abscess', severity: 'high' },
        'adhesions': { upgrade: 'with adhesions', severity: 'medium' },
        'severe': { upgrade: 'severe', severity: 'medium' }
    };

    const lower = text.toLowerCase();

    for (const [finding, details] of Object.entries(findings)) {
        if (lower.includes(finding)) {
            return {
                hasIntraopFinding: true,
                finding: finding,
                codeUpgrade: details.upgrade,
                severity: details.severity,
                note: `Intraoperative finding: ${finding} - code specificity upgraded`
            };
        }
    }

    return { hasIntraopFinding: false };
}

/**
 * Handle failed procedures
 * Example: Attempted colonoscopy but patient couldn't tolerate
 */
function handleFailedProcedure(text) {
    const failurePatterns = [
        /attempt(ed)?\s+\w+\s+but\s+(unable|could\s*not|failed)/i,
        /procedure\s+(aborted|discontinued|incomplete)/i,
        /(unable|could\s*not)\s+to\s+(complete|tolerate)/i
    ];

    for (const pattern of failurePatterns) {
        if (pattern.test(text)) {
            return {
                isProcedureFailed: true,
                note: 'Procedure attempted but not completed - code indication only, not completion',
                recommendedAction: 'Code indication for procedure, not the procedure itself'
            };
        }
    }

    return { isProcedureFailed: false };
}

/**
 * Handle negative findings
 * Example: Normal colonoscopy with no abnormalities
 */
function handleNegativeFindings(text) {
    const negativePatterns = [
        /no\s+(polyp|mass|lesion|abnormalit)/i,
        /normal\s+(colonoscopy|endoscopy|findings)/i,
        /unremarkable/i,
        /within\s+normal\s+limits/i
    ];

    for (const pattern of negativePatterns) {
        if (pattern.test(text)) {
            return {
                hasNegativeFindings: true,
                note: 'Negative findings - code screening/indication, not pathology',
                recommendedApproach: 'Use screening code (Z12.x) or indication for procedure'
            };
        }
    }

    return { hasNegativeFindings: false };
}

/**
 * Handle staged procedures
 * Example: Stage 1 of bilateral hernia repair
 */
function handleStagedProcedure(text) {
    const stagedPatterns = [
        /stage\s+(\d+)\s+of/i,
        /first\s+of\s+(\d+)\s+staged/i,
        /planned\s+staged/i,
        /bilateral.*today.*(right|left)/i
    ];

    for (const pattern of stagedPatterns) {
        const match = pattern.exec(text);
        if (match) {
            return {
                isStagedProcedure: true,
                stage: match[1] || 'unknown',
                note: 'Staged procedure - additional procedures planned',
                recommendedAction: 'Document completed procedure + note planned stages'
            };
        }
    }

    return { isStagedProcedure: false };
}

module.exports = {
    handleMultiProcedure,
    handleComplication,
    handleIntraoperativeFindings,
    handleFailedProcedure,
    handleNegativeFindings,
    handleStagedProcedure
};
