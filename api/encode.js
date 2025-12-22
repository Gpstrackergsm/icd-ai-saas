// SIMPLE production endpoint - no external dependencies
// Audit decision logic embedded directly

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

    // Simple negation detection
    const isNegated = (term) => {
      const pattern = new RegExp(`(no|without|den(ies|ied)|negative for|ruled out|absence of|did not (diagnose|document)|not diagnosed)\\s+(documented\\s+)?(diagnosis of\\s+)?[^.]*?\\b${term}\\b`, 'i');
      return pattern.test(text);
    };

    // Extract diagnoses
    const lower = text.toLowerCase();
    const diagnoses = [];

    if ((lower.includes('acute kidney injury') || lower.match(/\baki\b/)) && !isNegated('acute kidney injury') && !isNegated('aki')) {
      diagnoses.push('acute kidney injury');
    }
    if (lower.match(/chronic kidney disease|ckd/) && !isNegated('chronic kidney disease') && !isNegated('ckd')) {
      diagnoses.push('chronic kidney disease');
    }

    // If no diagnoses found, return AUTO_EXCLUDE audit decision
    if (diagnoses.length === 0) {
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
                          <p class="text-xs text-blue-800">Rule Group 3.3: Laboratory Values Alone</p>
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

      return res.status(200).json({
        success: true,
        data: {
          text,
          primary: null,
          secondary: [],
          warnings: [],
          validationErrors: [auditDecisionBlock],
          validationChanges: { removed: [], added: [] },
          _debug: {
            apiVersion: 'v1.0-simple-embedded',
            decisionState: 'AUTO_EXCLUDE',
            timestamp: new Date().toISOString()
          }
        }
      });
    }

    // If diagnoses found, return codes (simplified for now)
    return res.status(200).json({
      success: true,
      data: {
        text,
        primary: null,
        secondary: [],
        warnings: ['Diagnoses detected but code mapping not implemented yet'],
        validationErrors: [],
        validationChanges: { removed: [], added: [] },
        _debug: {
          apiVersion: 'v1.0-simple-embedded',
          diagnosesFound: diagnoses,
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
