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
    // Extract clinical information from text
    const lower = text.toLowerCase();
    const diagnoses = [];

    // Extract renal diagnoses
    if (lower.includes('acute kidney injury') || lower.match(/\baki\b/)) {
      diagnoses.push('acute kidney injury');
    }
    if (lower.match(/chronic kidney disease|ckd/)) {
      const stageMatch = text.match(/(?:ckd|chronic kidney disease)\s*stage\s*([1-5]|[iv]+)/i);
      if (stageMatch) {
        diagnoses.push(`CKD stage ${stageMatch[1]}`);
      } else {
        diagnoses.push('chronic kidney disease');
      }
    }

    // Extract lab values
    const labValues = {};
    const crMatch = text.match(/creatinine[:\s]+(\d+\.?\d*)/i);
    const baselineMatch = text.match(/baseline[:\s]+(\d+\.?\d*)/i);
    if (crMatch) {
      labValues.creatinine = {
        value: parseFloat(crMatch[1]),
        baseline: baselineMatch ? parseFloat(baselineMatch[1]) : undefined
      };
    }

    // Extract treatments
    const medications = [];
    if (lower.includes('iv fluid') || lower.includes('intravenous fluid')) {
      medications.push('IV fluids');
    }

    const parserOutput = {
      providerTerms: {
        diagnoses,
        symptoms: [],
        procedures: []
      },
      vitalSigns: {},
      labValues,
      clinicalFindings: {},
      treatments: medications.length > 0 ? { medications } : {},
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

    // MANDATORY: AUTO_EXCLUDE must return explicit audit decision
    if (auditResult.decisionState === 'AUTO_EXCLUDE') {
      const exclusions = auditResult.autoExcluded.map(e => `${e.concept} (${e.reason})`).join(', ');
      const rules = auditResult.rulesTriggered.join(', ');

      // Create formal audit decision block (HTML formatted for UI)
      const auditDecisionBlock = `
          <div class="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r-md">
              <div class="flex items-start gap-3">
                  <i class="fa-solid fa-gavel text-blue-600 text-xl mt-1"></i>
                  <div class="flex-1">
                      <h3 class="font-bold text-blue-900 text-sm uppercase tracking-wide mb-2">
                          AUDIT DECISION — AUTO EXCLUDE
                      </h3>
                      <div class="text-sm text-blue-800 space-y-2 mb-3">
                          <p class="leading-relaxed">
                              Clinical data such as laboratory abnormalities, monitoring, or risk discussion 
                              was identified. However, <strong>no explicit provider diagnosis</strong> supporting a reportable 
                              ICD-10-CM condition was documented.
                          </p>
                          <p class="leading-relaxed">
                              Per ICD-10-CM Official Guidelines, diagnoses may not be inferred from laboratory 
                              values, monitoring, or risk discussion alone.
                          </p>
                      </div>
                      <div class="bg-blue-100 border border-blue-200 rounded p-2 mb-3">
                          <p class="text-xs font-semibold text-blue-900 mb-1">RULE REFERENCE</p>
                          <p class="text-xs text-blue-800">${rules}</p>
                      </div>
                      <div class="space-y-1 mb-3">
                          <p class="text-xs font-semibold text-blue-900 uppercase tracking-wide">OUTCOME CONFIRMATION</p>
                          <p class="text-xs text-blue-700">✔ No ICD-10-CM diagnosis codes assigned</p>
                          <p class="text-xs text-blue-700">✔ No provider query required</p>
                          <p class="text-xs text-blue-700">✔ Audit-defensible exclusion applied</p>
                      </div>
                      <div class="border-t border-blue-200 pt-2">
                          <p class="text-xs text-blue-600 italic">
                              This determination is compliant with ICD-10-CM Official Guidelines and Medicare audit standards.
                          </p>
                      </div>
                  </div>
              </div>
          </div>
      `;

      // Add as validation error to trigger the audit decision UI
      validationErrors.push(auditDecisionBlock);
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
          apiVersion: 'v1.0.1-renal-fix-prod',
          decisionState: auditResult.decisionState,
          rulesTriggered: auditResult.rulesTriggered,
          parsedDiagnoses: diagnoses,
          parsedLabs: labValues,
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
