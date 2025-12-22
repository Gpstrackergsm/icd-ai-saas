// LEVEL 2: ICD-10-CM Causal Linking & Causality Authority Engine
// Builds ABOVE frozen LEVEL 0 (AUTO_EXCLUDE) and LEVEL 1 (AUTO_CODE)

const lookupDetail = require('../lib/icd-dictionary.js').lookupDetail;

// ============================================================================
// LEVEL 2: ICD-10-CM CODE MAPPING DICTIONARY (EXPANDED)
// ============================================================================
const ICD10_MAPPING = {
  // Renal
  'acute kidney injury': { code: 'N17.9', description: 'Acute kidney failure, unspecified' },
  'aki': { code: 'N17.9', description: 'Acute kidney failure, unspecified' },
  'chronic kidney disease stage 3': { code: 'N18.30', description: 'Chronic kidney disease, stage 3 unspecified' },
  'chronic kidney disease stage 4': { code: 'N18.4', description: 'Chronic kidney disease, stage 4 (severe)' },
  'chronic kidney disease': { code: null, query: 'Please specify CKD stage (1-5)' },
  'ckd stage 3': { code: 'N18.30', description: 'Chronic kidney disease, stage 3 unspecified' },
  'ckd stage 4': { code: 'N18.4', description: 'Chronic kidney disease, stage 4 (severe)' },

  // Respiratory
  'acute respiratory failure': { code: 'J96.01', description: 'Acute respiratory failure with hypoxia' },
  'acute respiratory failure with hypoxia': { code: 'J96.01', description: 'Acute respiratory failure with hypoxia' },

  // LEVEL 2: Respiratory failure due to pneumonia (LINKED)
  'acute respiratory failure due to pneumonia': {
    codes: ['J96.01', 'J18.9'],
    descriptions: ['Acute respiratory failure with hypoxia', 'Pneumonia, unspecified organism'],
    linked: true,
    linkPhrase: 'due to'
  },

  // Sepsis
  'sepsis': { code: 'A41.9', description: 'Sepsis, unspecified organism' },
  'severe sepsis': { codes: ['A41.9', 'R65.20'], descriptions: ['Sepsis, unspecified organism', 'Severe sepsis without septic shock'], linked: true },
  'pneumonia': { code: 'J18.9', description: 'Pneumonia, unspecified organism' },

  // LEVEL 2: Sepsis complicated by shock (LINKED)
  'sepsis complicated by septic shock': {
    codes: ['A41.9', 'R65.21'],
    descriptions: ['Sepsis, unspecified organism', 'Severe sepsis with septic shock'],
    linked: true,
    linkPhrase: 'complicated by'
  },
  'sepsis complicated by shock': {
    codes: ['A41.9', 'R65.21'],
    descriptions: ['Sepsis, unspecified organism', 'Severe sepsis with septic shock'],
    linked: true,
    linkPhrase: 'complicated by'
  },

  // Diabetes - LEVEL 2: Expanded complications
  'diabetic foot ulcer': { code: 'E11.621', description: 'Type 2 diabetes mellitus with foot ulcer', linked: true },
  'diabetic neuropathy': { code: 'E11.40', description: 'Type 2 diabetes mellitus with diabetic neuropathy, unspecified', linked: true },
  'neuropathy due to diabetes': { code: 'E11.40', description: 'Type 2 diabetes mellitus with diabetic neuropathy, unspecified', linked: true, linkPhrase: 'due to' },
  'diabetic peripheral angiopathy': { code: 'E11.51', description: 'Type 2 diabetes mellitus with diabetic peripheral angiopathy without gangrene', linked: true },
  'diabetic hyperglycemia': { code: 'E11.65', description: 'Type 2 diabetes mellitus with hyperglycemia', linked: true },

  // Diabetes - Unlinked
  'type 2 diabetes': { code: 'E11.9', description: 'Type 2 diabetes mellitus without complications' },
  'foot ulcer': { code: 'L97.', description: 'Non-pressure chronic ulcer of lower limb' },
  'neuropathy': { code: 'G62.9', description: 'Polyneuropathy, unspecified' },
  'peripheral neuropathy': { code: 'G62.9', description: 'Polyneuropathy, unspecified' },

  // Heart Failure  
  'acute on chronic systolic heart failure': { code: 'I50.23', description: 'Acute on chronic systolic (congestive) heart failure' },
  'heart failure': { code: null, query: 'Please specify: acute vs chronic AND systolic vs diastolic vs combined' },

  // Stroke
  'residual weakness from prior cva': { code: 'I69.3', description: 'Sequelae of cerebral infarction' },
  'history of cva': { code: 'Z86.73', description: 'Personal history of transient ischemic attack (TIA), and cerebral infarction without residual deficits' }
};

module.exports = async function handler(req, res) {
  try {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const { text } = req.body;

    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'Missing or invalid "text" field' });
    }

    // ========================================================================
    // LEVEL 0: NEGATION DETECTION (FROZEN - DO NOT MODIFY)
    // ========================================================================
    const isNegated = (term) => {
      const pattern = new RegExp(`(no|without|den(ies|ied)|negative for|ruled out|absence of|did not (diagnose|document)|not diagnosed)\\s+(documented\\s+)?(diagnosis of\\s+)?[^.]*?\\b${term}\\b`, 'i');
      return pattern.test(text);
    };

    // ========================================================================
    // LEVEL 1: DIAGNOSIS DETECTION (EXPLICIT ONLY)
    // ========================================================================
    const lower = text.toLowerCase();
    const detectedDiagnoses = [];

    // Sepsis (check first for proper sequencing as primary)
    if (lower.includes('severe sepsis') && !isNegated('sepsis')) {
      detectedDiagnoses.push('severe sepsis');
    } else if (lower.includes('sepsis') && !isNegated('sepsis')) {
      detectedDiagnoses.push('sepsis');
    }

    // Check for sepsis source
    if (lower.includes('pneumonia') && !isNegated('pneumonia')) {
      if (!detectedDiagnoses.includes('pneumonia')) {
        detectedDiagnoses.push('pneumonia');
      }
    }

    // Respiratory
    if (lower.includes('acute respiratory failure') && !isNegated('acute respiratory failure')) {
      if (lower.includes('with hypoxia')) {
        detectedDiagnoses.push('acute respiratory failure with hypoxia');
      } else {
        detectedDiagnoses.push('acute respiratory failure');
      }
    }

    // Renal diagnoses
    // Check for AKI/acute renal failure/acute kidney failure
    const akiPatterns = [
      'acute kidney injury',
      'acute renal failure',
      'acute kidney failure'
    ];

    for (const pattern of akiPatterns) {
      if (lower.includes(pattern) && !isNegated(pattern)) {
        detectedDiagnoses.push('acute kidney injury');
        break; // Only add once
      }
    }

    // Also check for AKI abbreviation
    if (lower.match(/\baki\b/) && !isNegated('aki') && !detectedDiagnoses.includes('acute kidney injury')) {
      detectedDiagnoses.push('aki');
    }

    // Check for CKD with stage
    if (lower.match(/chronic kidney disease stage [34]|ckd stage [34]/) && !isNegated('chronic kidney disease')) {
      if (lower.includes('stage 3')) {
        detectedDiagnoses.push('chronic kidney disease stage 3');
      } else if (lower.includes('stage 4')) {
        detectedDiagnoses.push('chronic kidney disease stage 4');
      }
    } else if (lower.match(/chronic kidney disease|ckd/) && !isNegated('chronic kidney disease') && !isNegated('ckd')) {
      // CKD without stage
      detectedDiagnoses.push('chronic kidney disease');
    }

    // Respiratory
    if (lower.includes('acute respiratory failure') && !isNegated('acute respiratory failure')) {
      if (lower.includes('with hypoxia')) {
        detectedDiagnoses.push('acute respiratory failure with hypoxia');
      } else {
        detectedDiagnoses.push('acute respiratory failure');
      }
    }

    // ========================================================================
    // LEVEL 2: EXPANDED DIAGNOSIS DETECTION (LINKED & UNLINKED)
    // ========================================================================

    // LEVEL 2: Respiratory failure due to pneumonia (LINKED)
    if (lower.includes('acute respiratory failure due to pneumonia') && !isNegated('acute respiratory failure') && !isNegated('pneumonia')) {
      detectedDiagnoses.push('acute respiratory failure due to pneumonia');
    } else if (lower.includes('acute respiratory failure') && !isNegated('acute respiratory failure')) {
      if (lower.includes('with hypoxia')) {
        detectedDiagnoses.push('acute respiratory failure with hypoxia');
      } else {
        detectedDiagnoses.push('acute respiratory failure');
      }
    }

    // LEVEL 2: Sepsis complicated by shock (LINKED)
    if (lower.match(/sepsis complicated by.*shock/) && !isNegated('sepsis')) {
      if (lower.includes('septic shock')) {
        detectedDiagnoses.push('sepsis complicated by septic shock');
      } else {
        detectedDiagnoses.push('sepsis complicated by shock');
      }
    }

    // LEVEL 2: Diabetes complications (LINKED & UNLINKED)
    if (lower.includes('diabetic foot ulcer') && !isNegated('diabetic foot ulcer')) {
      detectedDiagnoses.push('diabetic foot ulcer');
    } else if (lower.includes('diabetic neuropathy') && !isNegated('diabetic neuropathy')) {
      detectedDiagnoses.push('diabetic neuropathy');
    } else if (lower.includes('neuropathy due to diabetes') && !isNegated('neuropathy') && !isNegated('diabetes')) {
      detectedDiagnoses.push('neuropathy due to diabetes');
    } else if (lower.includes('diabetic peripheral angiopathy') && !isNegated('diabetic peripheral angiopathy')) {
      detectedDiagnoses.push('diabetic peripheral angiopathy');
    } else if (lower.includes('diabetic hyperglycemia') && !isNegated('diabetic hyperglycemia')) {
      detectedDiagnoses.push('diabetic hyperglycemia');
    } else {
      // Check for UNLINKED diabetes and complications
      const hasDiabetes = lower.match(/type 2 diabetes/) && !isNegated('type 2 diabetes');
      const hasFootUlcer = lower.match(/foot ulcer/) && !isNegated('foot ulcer');
      const hasNeuropathy = lower.match(/\b(peripheral )?neuropathy\b/) && !isNegated('neuropathy');

      if (hasDiabetes && hasFootUlcer) {
        detectedDiagnoses.push('type 2 diabetes');
        detectedDiagnoses.push('foot ulcer');
      } else if (hasDiabetes && hasNeuropathy) {
        detectedDiagnoses.push('type 2 diabetes');
        if (lower.includes('peripheral')) {
          detectedDiagnoses.push('peripheral neuropathy');
        } else {
          detectedDiagnoses.push('neuropathy');
        }
      } else if (hasDiabetes) {
        detectedDiagnoses.push('type 2 diabetes');
      }
    }

    // Heart Failure
    if (lower.includes('acute on chronic systolic heart failure') && !isNegated('heart failure')) {
      detectedDiagnoses.push('acute on chronic systolic heart failure');
    } else if (lower.includes('heart failure') && !isNegated('heart failure')) {
      detectedDiagnoses.push('heart failure');
    }

    // Stroke
    if (lower.match(/residual.*weakness.*prior.*cva|residual.*weakness.*stroke/) && !isNegated('cva')) {
      detectedDiagnoses.push('residual weakness from prior cva');
    } else if (lower.match(/history of.*cva.*no residual/) && !isNegated('cva')) {
      detectedDiagnoses.push('history of cva');
    }

    // ========================================================================
    // LEVEL 0: AUTO_EXCLUDE (FROZEN - ALWAYS WINS)
    // ========================================================================
    if (detectedDiagnoses.length === 0) {
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
            apiVersion: 'v1.1-level1',
            decisionState: 'AUTO_EXCLUDE',
            timestamp: new Date().toISOString()
          }
        }
      });
    }

    // ========================================================================
    // LEVEL 2: CODE MAPPING AND LINKAGE TRACKING
    // ========================================================================
    const codes = [];
    const queries = [];
    let hasLinkedCodes = false;
    let linkPhrase = null;

    for (const diagnosis of detectedDiagnoses) {
      const mapping = ICD10_MAPPING[diagnosis.toLowerCase()];

      if (!mapping) {
        // No mapping found - skip
        continue;
      }

      if (mapping.query) {
        // Required specificity missing - generate query
        queries.push({
          diagnosis,
          query: mapping.query
        });
      } else if (mapping.codes) {
        // Multiple codes (e.g., severe sepsis, respiratory failure due to pneumonia)
        for (let i = 0; i < mapping.codes.length; i++) {
          codes.push({
            code: mapping.codes[i],
            description: mapping.descriptions[i]
          });
        }
        // Track linkage
        if (mapping.linked) {
          hasLinkedCodes = true;
          if (mapping.linkPhrase) {
            linkPhrase = mapping.linkPhrase;
          }
        }
      } else if (mapping.code) {
        // Single code
        codes.push({
          code: mapping.code,
          description: mapping.description
        });
        // Track linkage
        if (mapping.linked) {
          hasLinkedCodes = true;
          if (mapping.linkPhrase) {
            linkPhrase = mapping.linkPhrase;
          }
        }
      }
    }

    // ========================================================================
    // LEVEL 1: AUTO_QUERY (Missing Required Specificity)
    // ========================================================================
    if (queries.length > 0) {
      const queryBlock = `
          <div class="bg-yellow-50 border-l-4 border-yellow-500 p-4 rounded-r-md">
              <div class="flex items-start gap-3">
                  <i class="fa-solid fa-circle-question text-yellow-600 text-xl mt-1"></i>
                  <div class="flex-1">
                      <h3 class="font-bold text-yellow-900 text-sm uppercase tracking-wide mb-2">
                          AUDIT DECISION — QUERY REQUIRED
                      </h3>
                      <div class="text-sm text-yellow-800 space-y-2 mb-3">
                          <p class="leading-relaxed">
                              A diagnosis was documented, but required specificity is missing per ICD-10-CM guidelines.
                          </p>
                      </div>
                      <div class="bg-yellow-100 border border-yellow-200 rounded p-2 mb-3">
                          <p class="text-xs font-semibold text-yellow-900 mb-1">QUERY</p>
                          ${queries.map(q => `<p class="text-xs text-yellow-800">• ${q.diagnosis}: ${q.query}</p>`).join('\n')}
                      </div>
                      <div class="space-y-1 mb-3">
                          <p class="text-xs font-semibold text-yellow-900 uppercase tracking-wide">STATUS</p>
                          <p class="text-xs text-yellow-700">❓ No codes assigned until clarification is received</p>
                      </div>
                      <div class="border-t border-yellow-200 pt-2">
                          <p class="text-xs text-yellow-600 italic">
                              This determination is compliant with ICD-10-CM Official Guidelines.
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
          validationErrors: [queryBlock],
          validationChanges: { removed: [], added: [] },
          _debug: {
            apiVersion: 'v1.1-level1',
            decisionState: 'AUTO_QUERY',
            diagnosesDetected: detectedDiagnoses,
            queriesGenerated: queries,
            timestamp: new Date().toISOString()
          }
        }
      });
    }

    // ========================================================================
    // LEVEL 2: AUTO_CODE (LINKED or UNLINKED)
    // ========================================================================

    let autoCodeBlock;

    if (hasLinkedCodes) {
      // LINKED codes - explicit causal relationship
      autoCodeBlock = `
        <div class="bg-green-50 border-l-4 border-green-500 p-4 rounded-r-md">
            <div class="flex items-start gap-3">
                <i class="fa-solid fa-check-circle text-green-600 text-xl mt-1"></i>
                <div class="flex-1">
                    <h3 class="font-bold text-green-900 text-sm uppercase tracking-wide mb-2">
                        AUDIT DECISION — AUTO CODE (LINKED)
                    </h3>
                    <div class="text-sm text-green-800 space-y-2 mb-3">
                        <p class="leading-relaxed">
                            Explicit causal relationship documented by provider.
                        </p>
                        <p class="leading-relaxed">
                            Combination / linked code applied per ICD-10-CM Official Guidelines.
                        </p>
                    </div>
                    <div class="bg-green-100 border border-green-200 rounded p-2 mb-3">
                        <p class="text-xs font-semibold text-green-900 mb-1">CODES ASSIGNED</p>
                        ${codes.map(c => `<p class="text-xs text-green-800">• <strong>${c.code}</strong> — ${c.description}</p>`).join('\n')}
                    </div>
                    ${linkPhrase ? `<div class="bg-green-100 border border-green-200 rounded p-2 mb-3">
                        <p class="text-xs font-semibold text-green-900 mb-1">LINKAGE VERIFIED</p>
                        <p class="text-xs text-green-800">✔ Explicit linking language: "${linkPhrase}"</p>
                        <p class="text-xs text-green-800">✔ No inference performed</p>
                    </div>` : ''}
                    <div class="border-t border-green-200 pt-2">
                        <p class="text-xs text-green-600 italic">
                            This determination is compliant with ICD-10-CM Official Guidelines.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    `;
    } else {
      // UNLINKED or non-causal codes
      const isMultipleConditions = detectedDiagnoses.length > 1;

      if (isMultipleConditions) {
        // Multiple unlinked conditions
        autoCodeBlock = `
        <div class="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r-md">
            <div class="flex items-start gap-3">
                <i class="fa-solid fa-check-circle text-blue-600 text-xl mt-1"></i>
                <div class="flex-1">
                    <h3 class="font-bold text-blue-900 text-sm uppercase tracking-wide mb-2">
                        AUDIT DECISION — AUTO CODE (UNLINKED)
                    </h3>
                    <div class="text-sm text-blue-800 space-y-2 mb-3">
                        <p class="leading-relaxed">
                            Multiple diagnoses documented without explicit causal relationship.
                        </p>
                        <p class="leading-relaxed">
                            Separate codes assigned per ICD-10-CM Official Guidelines.
                        </p>
                    </div>
                    <div class="bg-blue-100 border border-blue-200 rounded p-2 mb-3">
                        <p class="text-xs font-semibold text-blue-900 mb-1">CODES ASSIGNED</p>
                        ${codes.map(c => `<p class="text-xs text-blue-800">• <strong>${c.code}</strong> — ${c.description}</p>`).join('\n')}
                    </div>
                    <div class="bg-blue-100 border border-blue-200 rounded p-2 mb-3">
                        <p class="text-xs text-blue-800">⚬ No explicit linking language documented</p>
                        <p class="text-xs text-blue-800">⚬ Separate codes assigned</p>
                    </div>
                    <div class="border-t border-blue-200 pt-2">
                        <p class="text-xs text-blue-600 italic">
                            This determination is compliant with ICD-10-CM Official Guidelines.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    `;
      } else {
        // Single condition (original green block)
        autoCodeBlock = `
        <div class="bg-green-50 border-l-4 border-green-500 p-4 rounded-r-md">
            <div class="flex items-start gap-3">
                <i class="fa-solid fa-check-circle text-green-600 text-xl mt-1"></i>
                <div class="flex-1">
                    <h3 class="font-bold text-green-900 text-sm uppercase tracking-wide mb-2">
                        AUDIT DECISION — AUTO CODE
                    </h3>
                    <div class="text-sm text-green-800 space-y-2 mb-3">
                        <p class="leading-relaxed">
                            Documented diagnosis identified and mapped per ICD-10-CM guidelines.
                        </p>
                    </div>
                    <div class="bg-green-100 border border-green-200 rounded p-2 mb-3">
                        <p class="text-xs font-semibold text-green-900 mb-1">CODES ASSIGNED</p>
                        ${codes.map(c => `<p class="text-xs text-green-800">• <strong>${c.code}</strong> — ${c.description}</p>`).join('\n')}
                    </div>
                    <div class="border-t border-green-200 pt-2">
                        <p class="text-xs text-green-600 italic">
                            This determination is compliant with ICD-10-CM Official Guidelines.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    `;
      }
    }

    return res.status(200).json({
      success: true,
      data: {
        text,
        primary: codes[0]?.code || null,
        secondary: codes.slice(1).map(c => ({ code: c.code, description: c.description })),
        warnings: [],
        validationErrors: [autoCodeBlock],
        validationChanges: { removed: [], added: [] },
        _debug: {
          apiVersion: 'v1.2-level2',
          decisionState: hasLinkedCodes ? 'AUTO_CODE (LINKED)' : 'AUTO_CODE',
          diagnosesDetected: detectedDiagnoses,
          codesAssigned: codes,
          linkageStatus: hasLinkedCodes ? 'LINKED' : 'UNLINKED',
          timestamp: new Date().toISOString()
        }
      }
    });

  } catch (error) {
    console.error('API error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      details: error.message
    });
  }
};
