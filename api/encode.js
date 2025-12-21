// Production encode endpoint using compiled audit engine
// No TypeScript runtime - uses pre-compiled JavaScript from dist/

const lookupDetail = require('../lib/icd-dictionary.js').lookupDetail;

// Import compiled audit engine modules
let parserIntegration, auditEngine;

try {
  parserIntegration = require('../dist/engine/audit/parserIntegration.js').parserIntegration;
} catch (err) {
  console.error('Failed to load audit engine:', err.message);
  parserIntegration = null;
}

module.exports = async function handler(req, res) {
  try {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const { text } = req.body;

    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'Missing or invalid "text" field' });
    }

    // If audit engine not available, return simple response
    if (!parserIntegration) {
      return res.status(200).json({
        success: true,
        data: {
          text: text,
          primary: null,
          secondary: [],
          warnings: ['Audit engine not loaded - using fallback mode'],
          validationErrors: [],
          validationChanges: { removed: [], added: [] },
          _debug: {
            apiVersion: 'fallback-mode',
            timestamp: new Date().toISOString(),
            error: 'Audit engine modules not available'
          }
        }
      });
    }

    // Build simple parser output
    const parserOutput = {
      providerTerms: {
        diagnoses: [],
        symptoms: [],
        procedures: []
      },
      vitalSigns: {},
      labValues: {},
      clinicalFindings: {},
      treatments: {},
      containsInferredDiagnosis: false
    };

    // Run audit engine
    const result = await parserIntegration.processCase(text, parserOutput, {
      caseId: `api_${Date.now()}`,
      facilityId: 'production',
      userId: 'system'
    });

    const auditResult = result.auditResult;

    // Map to API response format
    const primary = auditResult.autoCoded.length > 0
      ? enhanceCode(auditResult.autoCoded.find(c => c.position === 'Primary') || auditResult.autoCoded[0])
      : null;

    const secondary = auditResult.autoCoded
      .filter(c => c.position !== 'Primary')
      .map(enhanceCode)
      .filter(Boolean);

    const warnings = [];
    const validationErrors = [];

    if (auditResult.decisionState === 'AUTO_EXCLUDE') {
      warnings.push(`No codes generated: ${auditResult.autoExcluded.map(e => e.concept).join(', ')}`);
    }

    return res.status(200).json({
      success: true,
      data: {
        text: text,
        primary,
        secondary,
        warnings,
        validationErrors,
        validationChanges: { removed: [], added: [] },
        _debug: {
          apiVersion: 'v1.0.1-renal-fix',
          decisionState: auditResult.decisionState,
          timestamp: new Date().toISOString()
        }
      }
    });

  } catch (error) {
    console.error('Encode error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      details: error.message
    });
  }
};

function enhanceCode(code) {
  if (!code || !code.code) return null;

  const detail = lookupDetail(code.code);

  return {
    code: code.code,
    label: detail?.description || code.description || 'No description',
    description: detail?.description || code.description || 'No description',
    rationale: code.description || 'Clinical audit engine determination',
    confidence: 0.95,
    billable: true
  };
}
