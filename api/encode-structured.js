const { parseInput } = require('../dist/lib/structured/parser.js');
const { validateContext } = require('../dist/lib/structured/validator.js');
const { runStructuredRules } = require('../dist/lib/structured/engine.js');
const { validateCodeSet } = require('../dist/lib/structured/validator-post.js');
const { requireAuth } = require('../dist/lib/auth/middleware.js');

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
            return res.status(400).json({
                error: 'Parsing errors',
                details: parseErrors
            });
        }

        // Validate the context
        const validation = validateContext(context);

        if (!validation.valid) {
            return res.status(400).json({
                error: 'Validation failed',
                validationErrors: validation.errors,
                warnings: validation.warnings
            });
        }

        // Run the rules engine
        const result = runStructuredRules(context);

        // Apply ICD-10-CM validation for claim compliance
        const validated = validateCodeSet(result.primary, result.secondary, context);

        // Extract validated primary and secondary codes
        const validatedPrimary = validated.codes[0] || null;
        const validatedSecondary = validated.codes.slice(1);

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
