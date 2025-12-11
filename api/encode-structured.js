const { parseInput } = require('../dist/lib/structured/parser.js');
const { validateContext } = require('../dist/lib/structured/validator.js');
const { runStructuredRules } = require('../dist/lib/structured/engine.js');
const { validateCodeSet } = require('../dist/lib/structured/validator-post.js');
const { requireAuth } = require('../dist/lib/auth/middleware.js');
// FORCE UPDATE CHECK v3.2
const { lookupDetail } = require('../lib/icd-dictionary.js');

module.exports = async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    // Authentication check
    const auth = await requireAuth(req, res);
    if (!auth) return; // requireAuth already sent error response

    try {
        const { text } = req.body;

        if (!text || typeof text !== 'string') {
            return res.status(400).json({ error: 'Missing or invalid "text" field' });
        }

        // Parse the structured input
        const { context, errors: parseErrors } = parseInput(text);

        if (parseErrors.length > 0) {
            return res.status(200).json({
                success: true,
                data: {
                    text,
                    primary: null,
                    secondary: [],
                    validationErrors: parseErrors,
                    warnings: []
                }
            });
        }

        // Validate the context
        const validation = validateContext(context);

        if (!validation.valid) {
            return res.status(200).json({
                success: true,
                data: {
                    text,
                    primary: null,
                    secondary: [],
                    validationErrors: validation.errors,
                    warnings: validation.warnings
                }
            });
        }

        // Run the rules engine
        const result = runStructuredRules(context);

        // CARDIOLOGY MODULE INTEGRATION (v3.3)
        // Detect cardiology keywords and augment results with domain-specific codes
        const cardiologyKeywords = /\b(htn|hypertension|heart failure|chf|hfref|hfpef|cad|coronary|angina|mi|myocardial|stemi|nstemi|afib|atrial fibrillation|cardiomyopathy|ckd|chronic kidney)\b/i;

        if (cardiologyKeywords.test(text)) {
            const { parseCardiology, resolveCardiologyCodes } = require('../dist/lib/domains/cardiology/module.js');
            const cardioAttrs = parseCardiology(text);
            const cardioCodes = resolveCardiologyCodes(cardioAttrs);

            if (cardioCodes.length > 0) {
                // SEQUENCING PATCH v3.3: Respect cardiology module's internal sequencing
                // The first code returned is the PRIMARY per ICD-10-CM/UHDDS
                const cardioPrimary = cardioCodes[0];
                const cardioSecondary = cardioCodes.slice(1);

                // If cardiology returns I13.x (HTN+CKD+HF combo), it MUST be PRIMARY
                if (cardioPrimary.code.startsWith('I13')) {
                    // Override any existing primary with I13.x
                    result.primary = {
                        code: cardioPrimary.code,
                        label: cardioPrimary.label,
                        rationale: `Cardiology domain: HTN+CKD+HF combination code (UHDDS principal)`,
                        trigger: cardioPrimary.triggeredBy,
                        rule: 'cardiology_module_primary'
                    };

                    // Add remaining cardiology codes to secondary
                    cardioSecondary.forEach(c => {
                        result.secondary.push({
                            code: c.code,
                            label: c.label,
                            rationale: `Cardiology domain module: ${c.triggeredBy}`,
                            trigger: c.triggeredBy,
                            rule: 'cardiology_module'
                        });
                    });

                    // ESRD SUPPRESSION: Remove N18.5 from secondary if cardiology provides codes
                    // (cardiology already handles ESRD suppression internally)
                    result.secondary = result.secondary.filter(c => c.code !== 'N18.5');

                } else {
                    // For other cardiology cases (MI, AF, etc.), add all to secondary
                    cardioCodes.forEach(c => {
                        result.secondary.push({
                            code: c.code,
                            label: c.label,
                            rationale: `Cardiology domain module: ${c.triggeredBy}`,
                            trigger: c.triggeredBy,
                            rule: 'cardiology_module'
                        });
                    });
                }
            }
        }

        // Apply ICD-10-CM validation for claim compliance
        const validated = validateCodeSet(result.primary, result.secondary, context);

        // --- ENFORCE OFFICIAL DESCRIPTIONS & SEPARATE METADATA ---
        const enhanceCode = (c) => {
            if (!c) return null;

            const detail = lookupDetail(c.code);

            // Use official details if available
            if (detail) {
                c.label = detail.description;
                c.description = detail.description; // Clean description
                c.annotations = detail.annotations || [];
                c.references = detail.references || [];
            } else {
                // Ensure array fields exist even if lookup failed
                c.annotations = [];
                c.references = [];
            }

            // FINAL SAFEGUARD: Check for missing description
            if (!c.label || c.label === 'No description' || c.label.trim() === '') {
                c.label = "Missing ICD Description (Data error)";
                c.description = "Missing ICD Description (Data error)";
                console.error(`ICD_MAPPING_ERROR: Missing description for code ${c.code}`);
                // Add to validation errors if strictly required by user
                result.validationErrors.push(`ICD_MAPPING_ERROR: Missing description for code ${c.code}`);
            }
            return c;
        };

        // Extract validated validated codes for checking
        const tempCodes = [validated.codes[0], ...validated.codes.slice(1)].filter(Boolean);

        // [STRICT RULE INJECTION] Run high-risk validation rules
        // This ensures audit-grade validation messages (e.g. O80 exclusivity) are returned
        const { runValidation } = require('../dist/lib/validation/validationEngine.js');

        // Map to SequencedCode format
        const sequencedCodes = tempCodes.map(c => ({
            code: c.code,
            label: c.label || '',
            triggeredBy: 'structured_engine',
            hcc: false
        }));

        const validationResults = runValidation(sequencedCodes, { text });

        // Add any strict validation failures
        if (validationResults.errors.length > 0) {
            result.validationErrors.push(...validationResults.errors);
        }

        // Add warnings if needed (optional, keeping strict for now)
        if (validationResults.warnings.length > 0) {
            result.warnings.push(...validationResults.warnings);
        }

        // Block if we have validation errors
        if (result.validationErrors.length > 0) {
            return res.status(200).json({
                success: true,
                data: {
                    text,
                    primary: null,
                    secondary: [],
                    validationErrors: result.validationErrors,
                    warnings: [...validation.warnings, ...result.warnings]
                }
            });
        }

        // Extract validated primary and secondary codes
        const validatedPrimary = enhanceCode(validated.codes[0] || null);
        const validatedSecondary = validated.codes.slice(1).map(enhanceCode);

        // Format response with claim-ready codes
        const response = {
            primary: validatedPrimary,
            secondary: validatedSecondary,
            procedures: result.procedures,
            warnings: [...validation.warnings, ...result.warnings],
            validationErrors: result.validationErrors,
            validationChanges: {
                removed: validated.removed,
                added: validated.added
            }
        };

        return res.status(200).json({ success: true, data: response });

    } catch (error) {
        console.error('Encoding error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
};
