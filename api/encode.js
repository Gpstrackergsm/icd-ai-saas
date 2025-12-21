// Simple test encode endpoint - no auth, no TypeScript, minimal deps
const lookupDetail = require('../lib/icd-dictionary.js').lookupDetail;

module.exports = async function handler(req, res) {
  try {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const { text } = req.body;

    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'Missing or invalid "text" field' });
    }

    // Simple mock response - just return the text
    return res.status(200).json({
      success: true,
      data: {
        text: text,
        primary: null,
        secondary: [],
        warnings: [],
        validationErrors: [],
        validationChanges: { removed: [], added: [] },
        _debug: {
          apiVersion: 'test-simple',
          timestamp: new Date().toISOString(),
          message: 'This is a test endpoint - no actual encoding'
        }
      }
    });

  } catch (error) {
    console.error('Encode error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      details: error.message,
      stack: error.stack
    });
  }
};
