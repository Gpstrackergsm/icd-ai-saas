/**
 * UAE Pre-submission Scrubber
 * Validates and corrects Shafafiya XML before submission
 * 
 * Features:
 * - Activity-to-Diagnosis linkage validation
 * - Automatic modifier injection (25, 50, 51)
 * - Medical necessity audits
 */

// CPT Code to ICD-10 Medical Necessity Rules
const MEDICAL_NECESSITY_RULES = {
    // Surgical Procedures
    '10060': { // Incision and drainage of abscess
        justifiedBy: ['L02.', 'L03.', 'L05.'],  // Abscesses, cellulitis
        notJustifiedBy: ['I10', 'E11.9'],  // HTN, diabetes alone
        description: 'Incision and drainage of abscess'
    },
    '44970': { // Laparoscopic appendectomy
        justifiedBy: ['K35.', 'K36', 'K37'],  // Acute appendicitis
        notJustifiedBy: ['I10', 'J44.'],
        description: 'Laparoscopic appendectomy'
    },

    // E&M Codes
    '99213': { // Office visit established patient
        justifiedBy: ['*'],  // Can justify any diagnosis
        description: 'Office/outpatient visit, established patient, level 3'
    },
    '99214': {
        justifiedBy: ['*'],
        description: 'Office/outpatient visit, established patient, level 4'
    },
    '99203': {
        justifiedBy: ['*'],
        description: 'Office/outpatient visit, new patient, level 3'
    },

    // Diagnostic Procedures
    '87880': { // Strep test
        justifiedBy: ['J02.', 'J03.'],  // Pharyngitis, tonsillitis
        description: 'Infectious agent antigen detection, streptococcus'
    },
    '45385': { // Colonoscopy with lesion removal
        justifiedBy: ['K63.5', 'K51.', 'K50.', 'Z12.11'],  // Polyp, IBD, screening
        description: 'Colonoscopy with lesion removal'
    }
};

// Modifier injection rules
const MODIFIER_RULES = {
    '25': { // Significant, separately identifiable E&M
        condition: (activities) => {
            const hasEM = activities.some(a => isEMCode(a.cptCode));
            const hasSurgery = activities.some(a => isSurgicalCode(a.cptCode));
            const sameDay = activities.every(a => a.serviceDate === activities[0].serviceDate);
            return hasEM && hasSurgery && sameDay;
        },
        applyTo: (activities) => activities.filter(a => isEMCode(a.cptCode)),
        description: 'Significant, separately identifiable E&M service'
    },

    '50': { // Bilateral procedure
        condition: (activities, narrative) => {
            return /bilateral/i.test(narrative);
        },
        applyTo: (activities, narrative) => {
            // Apply to procedures that can be bilateral
            return activities.filter(a => isBilateralCapable(a.cptCode));
        },
        description: 'Bilateral procedure'
    },

    '51': { // Multiple procedures
        condition: (activities) => {
            const surgicalActivities = activities.filter(a => isSurgicalCode(a.cptCode));
            return surgicalActivities.length > 1;
        },
        applyTo: (activities) => {
            const surgical = activities.filter(a => isSurgicalCode(a.cptCode));
            // Apply to all except primary (highest RVU, but simplified: skip first)
            return surgical.slice(1);
        },
        description: 'Multiple procedures'
    }
};

/**
 * Check if CPT code is E&M
 */
function isEMCode(cptCode) {
    return /^99[0-9]{3}$/.test(cptCode);
}

/**
 * Check if CPT code is surgical
 */
function isSurgicalCode(cptCode) {
    const surgicalRanges = [
        [10000, 69999]  // Surgical procedures range
    ];
    const code = parseInt(cptCode);
    return surgicalRanges.some(([min, max]) => code >= min && code <= max);
}

/**
 * Check if procedure can be bilateral
 */
function isBilateralCapable(cptCode) {
    // Simplified: procedures on paired organs
    const bilateralProcedures = ['69436', '27447', '27130'];  // Ear, knee, hip examples
    return bilateralProcedures.includes(cptCode);
}

/**
 * Validate Activity-to-Diagnosis linkage
 */
function validateActivityDiagnosisLink(activity, diagnoses) {
    const rule = MEDICAL_NECESSITY_RULES[activity.cptCode];

    if (!rule) {
        // No rule defined - assume acceptable
        return { valid: true, suggestedDiagnosis: activity.diagnosisCodeReference };
    }

    const currentDiagnosis = activity.diagnosisCodeReference;

    // Check if current diagnosis is justified
    if (rule.justifiedBy.includes('*')) {
        return { valid: true, suggestedDiagnosis: currentDiagnosis };
    }

    // Check if current diagnosis matches justification patterns
    const isJustified = rule.justifiedBy.some(pattern => {
        if (pattern.endsWith('.')) {
            // Prefix match (e.g., "K35." matches "K35.30")
            return currentDiagnosis.startsWith(pattern.slice(0, -1));
        }
        return currentDiagnosis === pattern;
    });

    // Check if explicitly not justified
    const isNotJustified = rule.notJustifiedBy && rule.notJustifiedBy.some(pattern => {
        if (pattern.endsWith('.')) {
            return currentDiagnosis.startsWith(pattern.slice(0, -1));
        }
        return currentDiagnosis === pattern;
    });

    if (isNotJustified) {
        // Find better diagnosis from available diagnoses
        const betterDiagnosis = diagnoses.find(diag => {
            return rule.justifiedBy.some(pattern => {
                if (pattern.endsWith('.')) {
                    return diag.code.startsWith(pattern.slice(0, -1));
                }
                return diag.code === pattern;
            });
        });

        return {
            valid: false,
            currentDiagnosis,
            suggestedDiagnosis: betterDiagnosis ? betterDiagnosis.code : null,
            reason: `${activity.cptCode} (${rule.description}) not medically necessary for ${currentDiagnosis}`
        };
    }

    return { valid: isJustified, suggestedDiagnosis: currentDiagnosis };
}

/**
 * Inject modifiers into activities
 */
function injectModifiers(activities, narrative) {
    const fixes = [];
    const updatedActivities = activities.map(activity => ({ ...activity, modifiers: activity.modifiers || [] }));

    // Check each modifier rule
    for (const [modifierCode, rule] of Object.entries(MODIFIER_RULES)) {
        if (rule.condition(updatedActivities, narrative)) {
            const targetActivities = rule.applyTo(updatedActivities, narrative);

            targetActivities.forEach(activity => {
                if (!activity.modifiers.includes(modifierCode)) {
                    activity.modifiers.push(modifierCode);
                    fixes.push({
                        type: 'MODIFIER_INJECTED',
                        activityId: activity.id,
                        cptCode: activity.cptCode,
                        modifier: modifierCode,
                        reason: rule.description
                    });
                }
            });
        }
    }

    return { activities: updatedActivities, fixes };
}

/**
 * Scrub Shafafiya XML for UAE submission
 */
function scrubShafafiyaXML(uaeExport, activities, narrative) {
    const fixes = [];
    let exportStatus = 'READY';
    const queries = [];

    // Step 1: Validate activity-diagnosis linkages
    const validatedActivities = activities.map(activity => {
        const validation = validateActivityDiagnosisLink(activity, [
            { code: uaeExport.diagnoses.primary, description: uaeExport.diagnoses.primaryDescription },
            ...uaeExport.diagnoses.secondary
        ]);

        if (!validation.valid) {
            if (validation.suggestedDiagnosis) {
                // Auto-fix: remap to suggested diagnosis
                fixes.push({
                    type: 'DIAGNOSIS_REMAPPED',
                    activityId: activity.id,
                    cptCode: activity.cptCode,
                    originalDiagnosis: validation.currentDiagnosis,
                    newDiagnosis: validation.suggestedDiagnosis,
                    reason: validation.reason
                });

                return {
                    ...activity,
                    diagnosisCodeReference: validation.suggestedDiagnosis
                };
            } else {
                // Cannot auto-fix: require query
                exportStatus = 'QUERY_REQUIRED';
                queries.push({
                    field: `Activity_${activity.id}_DiagnosisLink`,
                    issue: validation.reason,
                    currentValue: validation.currentDiagnosis,
                    requiredAction: 'Provider must specify medically necessary diagnosis'
                });

                return activity;
            }
        }

        return activity;
    });

    // Step 2: Inject modifiers
    const modifierResult = injectModifiers(validatedActivities, narrative);
    fixes.push(...modifierResult.fixes);

    // Step 3: Check for missing bilateral modifiers
    if (/bilateral/i.test(narrative)) {
        const bilateralCapable = modifierResult.activities.filter(a => isBilateralCapable(a.cptCode));
        bilateralCapable.forEach(activity => {
            if (!activity.modifiers.includes('50')) {
                queries.push({
                    field: `Activity_${activity.id}_BilateralModifier`,
                    issue: 'Narrative mentions bilateral but modifier 50 not applied',
                    suggestedFix: 'Add modifier 50 if procedure was bilateral'
                });
            }
        });
    }

    return {
        scrubbedActivities: modifierResult.activities,
        exportStatus,
        fixes,
        queries
    };
}

module.exports = {
    scrubShafafiyaXML,
    validateActivityDiagnosisLink,
    injectModifiers,
    MEDICAL_NECESSITY_RULES,
    MODIFIER_RULES
};
