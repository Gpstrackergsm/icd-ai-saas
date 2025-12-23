/**
 * UAE Export Layer
 * Transforms existing ICD Audit Engine response into UAE-ready payload
 * NON-MODIFYING: Sits above Levels 0-5, preserves all existing outputs
 */

/**
 * Export existing diagnosis results to UAE format
 * @param {Object} auditEngineResult - Standard output from api/encode.js
 * @param {Object} metadata - UAE-specific metadata
 * @returns {Object} UAE-ready export payload
 */
function exportToUAE(auditEngineResult, metadata = {}) {
    // Validate required metadata fields
    const missingFields = [];

    const requiredFields = [
        'facilityId',
        'payerId',
        'encounterId',
        'providerId',
        'patientId',
        'encounterDate'
    ];

    requiredFields.forEach(field => {
        if (!metadata[field]) {
            missingFields.push(field);
        }
    });

    // Determine export status
    const exportStatus = missingFields.length > 0 ? 'QUERY_REQUIRED' : 'READY';

    // Build UAE export payload
    const uaeExport = {
        // Country profile
        countryProfile: 'UAE',
        submissionFormat: 'SHAFAFIYA_XML_V2',
        exportStatus,

        // Metadata wrapper
        facility: {
            id: metadata.facilityId || 'REQUIRED',
            name: metadata.facilityName || '',
            emirate: metadata.emirate || ''
        },

        payer: {
            id: metadata.payerId || 'REQUIRED',
            name: metadata.payerName || '',
            scheme: metadata.payerScheme || 'DHA' // DHA, DOH, DAMAN, etc.
        },

        encounter: {
            id: metadata.encounterId || 'REQUIRED',
            type: metadata.encounterType || 'OUTPATIENT', // INPATIENT, OUTPATIENT, EMERGENCY
            admitDate: metadata.admitDate || metadata.encounterDate,
            dischargeDate: metadata.dischargeDate || metadata.encounterDate,
            encounterDate: metadata.encounterDate || 'REQUIRED'
        },

        provider: {
            id: metadata.providerId || 'REQUIRED',
            name: metadata.providerName || '',
            specialty: metadata.providerSpecialty || '',
            licenseNumber: metadata.providerLicense || ''
        },

        patient: {
            id: metadata.patientId || 'REQUIRED',
            emiratesId: metadata.emiratesId || '',
            dateOfBirth: metadata.dateOfBirth || '',
            gender: metadata.gender || '',
            nationality: metadata.nationality || ''
        },

        // Diagnosis data (from existing engine)
        diagnoses: {
            primary: auditEngineResult.primary || null,
            primaryDescription: auditEngineResult.primaryDescription || '',
            primaryPOA: auditEngineResult.primaryPOA || null,

            secondary: (auditEngineResult.secondary || []).map(diag => ({
                code: diag.code,
                description: diag.description,
                poa: diag.poa || null
            })),

            // Include audit decision for transparency
            auditDecision: auditEngineResult._debug?.decisionState || 'AUTO_CODE',
            codingMethod: 'ICD-10-CM_2025'
        },

        // Query tracking
        ...(missingFields.length > 0 && {
            missingFields,
            queryMessage: `Required fields missing for UAE export: ${missingFields.join(', ')}`
        }),

        // Timestamp
        exportedAt: new Date().toISOString(),

        // Version
        exporterVersion: 'UAE_MVP_v1.0'
    };

    return uaeExport;
}

/**
 * Check if export is ready for submission
 */
function isExportReady(uaeExport) {
    return uaeExport.exportStatus === 'READY';
}

/**
 * Get missing fields from export
 */
function getMissingFields(uaeExport) {
    return uaeExport.missingFields || [];
}

module.exports = {
    exportToUAE,
    isExportReady,
    getMissingFields
};
