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
    'need for vascular access': { code: 'Z45.2', description: 'Encounter for adjustment and management of vascular access device' }
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
