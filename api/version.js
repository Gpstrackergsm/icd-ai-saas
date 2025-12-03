export default async function handler(req, res) {
    return res.status(200).json({
        version: '2.0.0',
        lastUpdate: '2025-12-03T22:13:00Z',
        features: [
            'Sepsis-first sequencing (R65.20 as primary)',
            'Organism-specific pneumonia (J15.5, J15.212)',
            'Postpartum coding (O82/O80)',
            'ICD-10 guideline compliance',
            'No redundant B96.x codes'
        ],
        status: 'Latest version deployed'
    });
}
