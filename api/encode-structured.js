"use strict";
/**
 * ICD-10-CM AUDIT ENGINE API
 * Production endpoint using deterministic audit engine
 *
 * Single source of truth: TypeScript → JavaScript compilation
 * No legacy validation, no runtime TypeScript
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = handler;
const parserIntegration_1 = require("../engine/audit/parserIntegration");
const middleware_1 = require("../lib/auth/middleware");
const lookupDetail = require('../lib/icd-dictionary.js').lookupDetail;
async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }
    // Authentication check
    const auth = await (0, middleware_1.requireAuth)(req, res);
    if (!auth)
        return;
    try {
        const { text } = req.body;
        if (!text || typeof text !== 'string') {
            return res.status(400).json({ error: 'Missing or invalid "text" field' });
        }
        // Build parser output from text (extraction-only, no inference)
        const parserOutput = buildParserOutputFromText(text);
        // Run audit engine
        const result = await parserIntegration_1.parserIntegration.processCase(text, parserOutput, {
            caseId: `api_${Date.now()}`,
            facilityId: 'production',
            userId: auth.userId || auth.user?.id
        });
        // Enhance codes with official ICD-10-CM descriptions
        const enhanceCode = (code) => {
            if (!code || !code.code)
                return null;
            const detail = lookupDetail(code.code);
            return {
                code: code.code,
                label: detail?.description || code.description || 'No description',
                description: detail?.description || code.description || 'No description',
                position: code.position || 'Secondary',
                annotations: detail?.annotations || [],
                references: detail?.references || []
            };
        };
        // Map audit result to API response format
        const response = buildAPIResponse(result, enhanceCode);
        return res.status(200).json({ success: true, data: response });
    }
    catch (error) {
        console.error('Audit engine error:', error);
        return res.status(500).json({ error: 'Internal server error', details: error.message });
    }
}
/**
 * Build parser output from narrative text
 * Extraction-only - no inference
 */
function buildParserOutputFromText(text) {
    const lower = text.toLowerCase();
    // Extract provider-documented diagnoses (explicit terms only)
    const diagnoses = [];
    // Renal terms
    if (lower.includes('acute kidney injury') || lower.match(/\baki\b/)) {
        diagnoses.push('acute kidney injury');
    }
    if (lower.match(/chronic kidney disease|ckd/)) {
        const stageMatch = text.match(/(?:ckd|chronic kidney disease)\s*stage\s*([1-5]|[iv]+)/i);
        if (stageMatch) {
            diagnoses.push(`CKD stage ${stageMatch[1]}`);
        }
        else {
            diagnoses.push('chronic kidney disease');
        }
    }
    if (lower.includes('renal insufficiency')) {
        diagnoses.push('renal insufficiency');
    }
    // Sepsis terms
    if (lower.includes('septic shock')) {
        diagnoses.push('septic shock');
    }
    else if (lower.includes('severe sepsis')) {
        diagnoses.push('severe sepsis');
    }
    else if (lower.includes('sepsis')) {
        diagnoses.push('sepsis');
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
    const lactateMatch = text.match(/lactate[:\s]+(\d+\.?\d*)/i);
    if (lactateMatch) {
        labValues.lactate = parseFloat(lactateMatch[1]);
    }
    // Extract treatments
    const treatments = {};
    const medications = [];
    if (lower.includes('vasopressor') || lower.includes('norepinephrine') || lower.includes('levophed')) {
        medications.push('vasopressor');
    }
    if (lower.includes('iv fluid') || lower.includes('intravenous fluid')) {
        medications.push('IV fluids');
    }
    if (medications.length > 0) {
        treatments.medications = medications;
    }
    return {
        providerTerms: {
            diagnoses,
            symptoms: [],
            procedures: []
        },
        vitalSigns: {},
        labValues,
        clinicalFindings: {},
        treatments,
        containsInferredDiagnosis: false
    };
}
/**
 * Build API response from audit result
 */
function buildAPIResponse(result, enhanceCode) {
    const auditResult = result.auditResult;
    // Map decision state to response
    const primary = auditResult.autoCoded.length > 0
        ? enhanceCode(auditResult.autoCoded.find((c) => c.position === 'Primary') || auditResult.autoCoded[0])
        : null;
    const secondary = auditResult.autoCoded
        .filter((c) => c.position !== 'Primary')
        .map(enhanceCode)
        .filter(Boolean);
    // Build validation errors/warnings based on decision state
    const validationErrors = [];
    const warnings = [];
    if (auditResult.decisionState === 'BLOCK_AND_QUERY') {
        validationErrors.push(`COMPLIANCE GATE — ${auditResult.queriesRequired.length} ITEM(S) PENDING RESOLUTION`);
        auditResult.queriesRequired.forEach((q) => {
            validationErrors.push(`Query required: ${q.queryText.substring(0, 100)}...`);
        });
    }
    if (auditResult.decisionState === 'AUTO_EXCLUDE') {
        if (auditResult.autoExcluded.length > 0) {
            warnings.push(`AUTO_EXCLUDE: ${auditResult.autoExcluded.map((e) => e.concept).join(', ')}`);
        }
    }
    if (auditResult.decisionState === 'AUTO_QUERY') {
        auditResult.queriesRequired.forEach((q) => {
            warnings.push(`Query recommended: ${q.concept}`);
        });
    }
    // If BLOCK_AND_QUERY or AUTO_EXCLUDE, return no codes
    if (auditResult.decisionState === 'BLOCK_AND_QUERY' || auditResult.decisionState === 'AUTO_EXCLUDE') {
        return {
            primary: null,
            secondary: [],
            procedures: [],
            warnings,
            validationErrors,
            validationChanges: { removed: [], added: [] },
            _audit: {
                decisionState: auditResult.decisionState,
                riskLevel: auditResult.riskLevel,
                riskRationale: auditResult.riskRationale,
                rulesTriggered: auditResult.rulesTriggered,
                auditTrailId: result.auditTrailId,
                queriesGenerated: result.queriesGenerated.length,
                engineVersion: 'v1.0.1-renal-fix',
                buildTime: new Date().toISOString()
            }
        };
    }
    // AUTO_CODE or AUTO_QUERY with fallback codes
    return {
        primary,
        secondary,
        procedures: [],
        warnings,
        validationErrors,
        validationChanges: { removed: [], added: [] },
        _audit: {
            decisionState: auditResult.decisionState,
            riskLevel: auditResult.riskLevel,
            riskRationale: auditResult.riskRationale,
            rulesTriggered: auditResult.rulesTriggered,
            auditTrailId: result.auditTrailId,
            queriesGenerated: result.queriesGenerated.length,
            engineVersion: 'v1.0.1-renal-fix',
            buildTime: new Date().toISOString()
        }
    };
}
