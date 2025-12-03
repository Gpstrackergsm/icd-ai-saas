import { parseInput } from '../dist/lib/structured/parser.js';
import { validateContext } from '../dist/lib/structured/validator.js';
import { runStructuredRules } from '../dist/lib/structured/engine.js';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

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

        // Format response
        const response = {
            primary: result.primary,
            secondary: result.secondary,
            procedures: result.procedures,
            warnings: [...validation.warnings, ...result.warnings],
            validationErrors: result.validationErrors,
            context: context // Include parsed context for debugging
        };

        return res.status(200).json(response);

    } catch (error) {
        console.error('Structured encoding error:', error);
        return res.status(500).json({
            error: 'Internal server error',
            message: error.message
        });
    }
}
