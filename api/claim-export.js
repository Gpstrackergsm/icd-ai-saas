const express = require('express');
const { validateClaim } = require('../lib/uae-validator');
const { generateShafafiyaXML, generateEClaimLinkXML } = require('../lib/xml-generator');

/**
 * Claim Export API
 * Validates and exports UAE-compliant XML
 */

/**
 * POST /api/claim-export/validate
 * Validate claim against UAE mandatory requirements
 */
const validateClaimEndpoint = (req, res) => {
    try {
        const claim = req.body;

        // Run validation
        const validationResult = validateClaim(claim);

        return res.status(200).json({
            success: true,
            validation: validationResult
        });
    } catch (error) {
        console.error('Validation error:', error);
        return res.status(500).json({
            success: false,
            error: 'Validation failed',
            details: error.message
        });
    }
};

/**
 * POST /api/claim-export/generate-xml
 * Generate XML for Abu Dhabi (Shafafiya) or Dubai (e-ClaimLink)
 */
const generateXMLEndpoint = (req, res) => {
    try {
        const { claims, region, isProduction } = req.body;

        if (!claims || !Array.isArray(claims) || claims.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Claims array is required'
            });
        }

        // Validate all claims first
        const validationResults = claims.map(claim => validateClaim(claim));
        const hasErrors = validationResults.some(result => !result.isValid);

        if (hasErrors) {
            return res.status(400).json({
                success: false,
                error: 'One or more claims failed validation',
                validationResults: validationResults
            });
        }

        // Generate XML based on region
        let xml;
        let filename;

        if (region === 'dubai' || region === 'eclaimlink') {
            xml = generateEClaimLinkXML(claims, { isProduction });
            filename = `eclaimlink_${Date.now()}.xml`;
        } else {
            // Default to Abu Dhabi (Shafafiya)
            xml = generateShafafiyaXML(claims, { isProduction });
            filename = `shafafiya_${Date.now()}.xml`;
        }

        // Log export event
        console.log(`[EXPORT] Generated ${region} XML for ${claims.length} claim(s) - ${isProduction ? 'PRODUCTION' : 'TEST'}`);

        return res.status(200).json({
            success: true,
            xml: xml,
            filename: filename,
            claimCount: claims.length,
            region: region || 'abudhabi',
            environment: isProduction ? 'PRODUCTION' : 'TEST'
        });
    } catch (error) {
        console.error('XML generation error:', error);
        return res.status(500).json({
            success: false,
            error: 'XML generation failed',
            details: error.message
        });
    }
};

/**
 * GET /api/claim-export/validate-emirates-id/:id
 * Quick Emirates ID validation endpoint
 */
const validateEmiratesIDEndpoint = (req, res) => {
    try {
        const { id } = req.params;
        const { validateEmiratesID } = require('../lib/uae-validator');

        const result = validateEmiratesID(id);

        return res.status(200).json({
            success: true,
            validation: result
        });
    } catch (error) {
        console.error('Emirates ID validation error:', error);
        return res.status(500).json({
            success: false,
            error: 'Validation failed',
            details: error.message
        });
    }
};

module.exports = (app) => {
    app.post('/api/claim-export/validate', validateClaimEndpoint);
    app.post('/api/claim-export/generate-xml', generateXMLEndpoint);
    app.get('/api/claim-export/validate-emirates-id/:id', validateEmiratesIDEndpoint);
};
