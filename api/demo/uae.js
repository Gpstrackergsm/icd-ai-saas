/**
 * UAE Demo Route
 * Public sales entry point for UAE market
 * Adapter layer - does NOT modify existing encode.js logic
 */

const encodeHandler = require('../encode.js');
const { normalize } = require('../../lib/uae/normalize.js');
const { exportToUAE } = require('../../lib/uae/export.js');
const { generateShafafiyaXML } = require('../../lib/uae/shafafiyaXml.js');

/**
 * UAE Demo Handler
 * Input: Clinical narrative + UAE metadata
 * Output: Standard JSON + UAE export + Shafafiya XML
 */
module.exports = async function handler(req, res) {
    // CORS headers for demo
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { text, metadata = {} } = req.body;

        if (!text) {
            return res.status(400).json({
                error: 'Missing required field: text',
                usage: {
                    endpoint: '/api/demo/uae',
                    method: 'POST',
                    body: {
                        text: 'Clinical narrative (required)',
                        metadata: {
                            facilityId: 'Facility ID',
                            payerId: 'Payer ID (DHA/DOH/DAMAN)',
                            encounterId: 'Encounter ID',
                            providerId: 'Provider ID',
                            patientId: 'Patient ID',
                            encounterDate: 'YYYY-MM-DD',
                            '...': 'Additional optional fields'
                        }
                    }
                }
            });
        }

        // Step 1: Normalize UAE input
        const normalized = normalize(text);

        // Step 2: Call existing audit engine with normalized text
        // NON-MODIFYING: Use existing encode.js as-is
        let auditEngineResult = null;

        await new Promise((resolve, reject) => {
            const mockReq = {
                method: 'POST',
                body: { text: normalized.normalizedText }
            };

            const mockRes = {
                status: (code) => ({
                    json: (data) => {
                        if (code === 200) {
                            auditEngineResult = data.data;
                            resolve();
                        } else {
                            reject(new Error(`Audit engine returned ${code}`));
                        }
                    }
                })
            };

            encodeHandler(mockReq, mockRes);
        });

        if (!auditEngineResult) {
            throw new Error('Audit engine did not return results');
        }

        // Step 3: Export to UAE format
        const uaeExport = exportToUAE(auditEngineResult, metadata);

        // Step 4: Generate Shafafiya XML
        const claimId = metadata.claimId || `UAE_DEMO_${Date.now()}`;
        const shafafiyaXml = generateShafafiyaXML(uaeExport, { claimId });

        // Step 5: Return comprehensive response
        return res.status(200).json({
            success: true,

            // Original audit engine result (unchanged)
            auditEngine: {
                primary: auditEngineResult.primary,
                primaryDescription: auditEngineResult.primaryDescription,
                primaryPOA: auditEngineResult.primaryPOA,
                secondary: auditEngineResult.secondary,
                queries: auditEngineResult.queries,
                validationErrors: auditEngineResult.validationErrors,
                auditDecision: auditEngineResult._debug?.decisionState
            },

            // UAE-specific exports
            uae: {
                export: uaeExport,
                xml: shafafiyaXml,
                normalization: {
                    hasTransformations: normalized.appliedTransformations.length > 0,
                    transformations: normalized.appliedTransformations
                }
            },

            // MVP disclaimer
            disclaimer: 'Diagnosis-only export. Procedures/DRG/NCCI not included in MVP.',

            // Metadata
            meta: {
                version: 'UAE_MVP_v1.0',
                processedAt: new Date().toISOString(),
                exportStatus: uaeExport.exportStatus,
                missingFields: uaeExport.missingFields || []
            }
        });

    } catch (error) {
        console.error('[UAE Demo Error]', error);

        return res.status(500).json({
            success: false,
            error: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
};
