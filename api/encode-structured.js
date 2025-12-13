const { parseInput } = require('../dist/lib/structured/parser.js');
const { validateContext } = require('../dist/lib/structured/validator.js');
const { runStructuredRules } = require('../dist/lib/structured/engine.js');
const { validateCodeSet } = require('../dist/lib/structured/validator-post.js');
const { requireAuth } = require('../dist/lib/auth/middleware.js');
// FORCE UPDATE CHECK v3.4-FIXED (HF negation fix)
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

        // CARDIOLOGY HANDLING: Now fully integrated into lib/structured/engine.ts
        // The structured engine handles all cardiology sequencing correctly per UHDDS
        // No additional override needed here


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
        let validatedSecondary = validated.codes.slice(1).map(enhanceCode);

        // DEDUPLICATE: Remove duplicate codes from secondary
        const seenCodes = new Set([validatedPrimary?.code].filter(Boolean));
        validatedSecondary = validatedSecondary.filter(c => {
            if (!c || seenCodes.has(c.code)) return false;
            seenCodes.add(c.code);
            return true;
        });

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
            },
            _debug: {
                apiVersion: 'v3.6-CARDIO-OVERRIDE-REMOVED',
                buildTime: '2025-12-13T14:35:00Z',
                gitCommit: 'PENDING'
            }
        };

        return res.status(200).json({ success: true, data: response });

    } catch (error) {
        console.error('Encoding error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
};
