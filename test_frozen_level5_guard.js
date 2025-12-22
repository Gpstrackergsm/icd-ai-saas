// FROZEN LEVEL 5 GUARD TEST - DO NOT MODIFY
// Golden snapshots for LEVEL 5 behavior - frozen at v1.5-level5-freeze (commit 85d7779)
// ANY change to these outputs indicates a regression and MUST be reverted

const handler = require('./api/encode.js');

const FROZEN_LEVEL5_SNAPSHOTS = [
    {
        id: 'L5-01',
        input: 'Admitted with sepsis. Blood culture positive for MRSA.',
        expectedCode: 'A41.9',
        expectedDenialRiskTier: 'MEDIUM',
        expectedDefensibilityScore: { min: 75, max: 85 },
        expectedHasAuditPlus: true
    },
    {
        id: 'L5-02',
        input: 'Admitted with sepsis due to pneumonia. Present on admission.',
        expectedCode: 'A41.9',
        expectedDenialRiskTier: 'LOW',
        expectedDefensibilityScore: { min: 75, max: 85 },
        expectedHasAuditPlus: true
    },
    {
        id: 'L5-03',
        input: 'Admitted with pneumonia. Acute respiratory failure documented.',
        expectedCode: 'J96.01',
        expectedDenialRiskTier: 'HIGH',
        expectedDefensibilityScore: { min: 65, max: 75 },
        expectedHasAuditPlus: true
    },
    {
        id: 'L5-04',
        input: 'Admitted with pneumonia. Sepsis developed on day 3.',
        expectedCode: 'A41.9',
        expectedDenialRiskTier: 'MEDIUM',
        expectedDefensibilityScore: { min: 75, max: 85 },
        expectedHasAuditPlus: true
    },
    {
        id: 'L5-05',
        input: 'Admitted with severe sepsis due to urinary tract infection with acute kidney injury.',
        expectedCode: 'R65.20',
        expectedDenialRiskTier: 'MEDIUM',
        expectedDefensibilityScore: { min: 80, max: 90 },
        expectedHasAuditPlus: true
    },
    {
        id: 'L5-06',
        input: 'Admitted with acute on chronic systolic heart failure.',
        expectedCode: 'I50.23',
        expectedDenialRiskTier: 'LOW',
        expectedDefensibilityScore: { min: 75, max: 85 },
        expectedHasAuditPlus: true
    },
    {
        id: 'L5-07',
        input: 'Admitted with chest pain. Acute myocardial infarction diagnosed. No documentation of timing.',
        expectedCode: 'I21.9',
        expectedDenialRiskTier: 'MEDIUM',
        expectedDefensibilityScore: { min: 65, max: 75 },
        expectedHasAuditPlus: true
    },
    {
        id: 'L5-08',
        input: 'Admitted with acute respiratory failure due to pneumonia.',
        expectedCode: 'J96.01',
        expectedDenialRiskTier: 'LOW',
        expectedDefensibilityScore: { min: 80, max: 90 },
        expectedHasAuditPlus: true
    },
    {
        id: 'L5-09',
        input: 'Admitted with gastrointestinal bleeding. Acute blood loss anemia documented.',
        expectedCode: 'K92.2',
        expectedDenialRiskTier: 'LOW',
        expectedDefensibilityScore: { min: 65, max: 85 },
        expectedHasAuditPlus: true
    },
    {
        id: 'L5-10',
        input: 'Admitted with trauma after fall. Femur fracture documented.',
        expectedCode: 'T14.90',
        expectedDenialRiskTier: 'LOW',
        expectedDefensibilityScore: { min: 75, max: 85 },
        expectedHasAuditPlus: true
    }
];

async function runFrozenLevel5Guard() {
    console.log('🔒 FROZEN LEVEL 5 GUARD TEST - v1.5-level5-freeze');
    console.log('Golden snapshots from commit 85d7779 - IMMUTABLE\n');

    let passed = 0;
    let failed = 0;
    const regressions = [];

    for (const snapshot of FROZEN_LEVEL5_SNAPSHOTS) {
        const mockReq = { method: 'POST', body: { text: snapshot.input } };
        let responseData = null;
        const mockRes = {
            status: function (code) {
                this.statusCode = code;
                return this;
            },
            json: function (data) {
                responseData = data;
                return this;
            }
        };

        await handler(mockReq, mockRes);

        const auditPlus = responseData?.data?.auditPlus;
        const codeAnalysis = auditPlus?.perCodeAnalysis?.find(c => c.code === snapshot.expectedCode);

        // Check if auditPlus exists
        const hasAuditPlus = !!auditPlus;
        const auditPlusMatch = hasAuditPlus === snapshot.expectedHasAuditPlus;

        // Check risk tier
        const riskTierMatch = codeAnalysis?.denialSimulation?.riskTier === snapshot.expectedDenialRiskTier;

        // Check defensibility score is in range
        const defScore = codeAnalysis?.defensibility?.defensibilityScore || 0;
        const defScoreMatch = defScore >= snapshot.expectedDefensibilityScore.min &&
            defScore <= snapshot.expectedDefensibilityScore.max;

        const testPassed = auditPlusMatch && riskTierMatch && defScoreMatch;

        if (testPassed) {
            passed++;
            console.log(`✅ ${snapshot.id}: PASS`);
        } else {
            failed++;
            console.log(`❌ ${snapshot.id}: REGRESSION DETECTED`);
            regressions.push({
                id: snapshot.id,
                auditPlus: auditPlusMatch ? '✓' : `Expected ${snapshot.expectedHasAuditPlus}, got ${hasAuditPlus}`,
                riskTier: riskTierMatch ? '✓' : `Expected ${snapshot.expectedDenialRiskTier}, got ${codeAnalysis?.denialSimulation?.riskTier || 'N/A'}`,
                defScore: defScoreMatch ? '✓' : `Expected ${snapshot.expectedDefensibilityScore.min}-${snapshot.expectedDefensibilityScore.max}, got ${defScore}`
            });
        }
    }

    console.log(`\n${'='.repeat(70)}`);
    console.log('FROZEN LEVEL 5 GUARD RESULTS');
    console.log('='.repeat(70));
    console.log(`Total: ${FROZEN_LEVEL5_SNAPSHOTS.length}`);
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);

    if (failed > 0) {
        console.log('\n🚨 REGRESSION DETECTED - LEVEL 5 BEHAVIOR HAS CHANGED');
        console.log('Revert to v1.5-level5-freeze (commit 85d7779) immediately\n');
        regressions.forEach(r => {
            console.log(`${r.id}:`);
            console.log(`  AuditPlus: ${r.auditPlus}`);
            console.log(`  Risk Tier: ${r.riskTier}`);
            console.log(`  Defensibility: ${r.defScore}\n`);
        });
        process.exit(1);
    } else {
        console.log('\n✅ LEVEL 5 FROZEN BEHAVIOR VERIFIED - NO REGRESSIONS');
    }
}

runFrozenLevel5Guard().catch(console.error);
