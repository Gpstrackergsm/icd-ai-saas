// FROZEN LEVEL 4 GUARD TEST - DO NOT MODIFY
// Golden snapshots for LEVEL 4 behavior - frozen at v1.4-level4-freeze (commit 3f9c63f)
// ANY change to these outputs indicates a regression and MUST be reverted

const handler = require('./api/encode.js');

const FROZEN_LEVEL4_SNAPSHOTS = [
    {
        id: 'L4-01',
        input: 'Admitted with sepsis due to pneumonia. Acute respiratory failure present on admission.',
        expectedPDX: 'A41.9',
        expectedCodes: ['A41.9', 'J18.9', 'J96.01'],
        expectedRoles: ['PRIMARY', 'SECONDARY', 'SECONDARY'],
        expectedPOA: ['Y', 'Y', 'Y'],
        expectedDecision: 'AUTO_SEQUENCE'
    },
    {
        id: 'L4-02',
        input: 'Admitted for acute respiratory failure due to pneumonia.',
        expectedPDX: 'J96.01',
        expectedCodes: ['J18.9', 'J96.01'],
        expectedRoles: ['SECONDARY', 'PRIMARY'],
        expectedPOA: ['Y', 'Y'],
        expectedDecision: 'AUTO_SEQUENCE'
    },
    {
        id: 'L4-03',
        input: 'Admitted with pneumonia. Developed sepsis on day 2.',
        expectedPDX: 'J18.9',
        expectedCodes: ['A41.9', 'J18.9'],
        expectedRoles: ['SECONDARY', 'PRIMARY'],
        expectedPOA: ['N', 'Y'],
        expectedDecision: 'PASS_THROUGH'
    },
    {
        id: 'L4-04',
        input: 'Admitted with severe sepsis due to urinary tract infection with acute kidney injury present on admission.',
        expectedPDX: 'A41.9',
        expectedCodes: ['A41.9', 'R65.20', 'N17.9'],
        expectedRoles: ['PRIMARY', 'SECONDARY', 'SECONDARY'],
        expectedPOA: ['Y', 'Y', 'Y'],
        expectedDecision: 'AUTO_SEQUENCE'
    },
    {
        id: 'L4-05',
        input: 'Admitted with diabetic foot ulcer and type 2 diabetes mellitus. Sepsis developed during hospitalization.',
        expectedPDX: 'E11.621',
        expectedCodes: ['A41.9', 'E11.621'],
        expectedRoles: ['SECONDARY', 'PRIMARY'],
        expectedPOA: ['N', 'Y'],
        expectedDecision: 'AUTO_SEQUENCE'
    },
    {
        id: 'L4-06',
        input: 'Admitted for chest pain. Acute myocardial infarction diagnosed on admission.',
        expectedPDX: 'I21.9',
        expectedCodes: ['I21.9', 'R07.9'],
        expectedRoles: ['PRIMARY', 'SECONDARY'],
        expectedPOA: ['Y', 'Y'],
        expectedDecision: 'AUTO_SEQUENCE'
    },
    {
        id: 'L4-07',
        input: 'Admitted with acute on chronic systolic heart failure and pulmonary edema.',
        expectedPDX: 'I50.23',
        expectedCodes: ['I50.23'],
        expectedRoles: ['PRIMARY'],
        expectedPOA: ['Y'],
        expectedDecision: 'PASS_THROUGH'
    },
    {
        id: 'L4-08',
        input: 'Admitted for COPD exacerbation with acute respiratory failure documented on admission.',
        expectedPDX: 'J96.01',
        expectedCodes: ['J96.01'],
        expectedRoles: ['PRIMARY'],
        expectedPOA: ['Y'],
        expectedDecision: 'PASS_THROUGH'
    },
    {
        id: 'L4-09',
        input: 'Admitted with gastrointestinal bleeding. Acute blood loss anemia documented as due to bleeding.',
        expectedPDX: 'K92.2',
        expectedCodes: ['K92.2', 'D62'],
        expectedRoles: ['PRIMARY', 'SECONDARY'],
        expectedPOA: ['Y', 'U'],
        expectedDecision: 'AUTO_SEQUENCE'
    },
    {
        id: 'L4-10',
        input: 'Admitted with stroke. Residual left-sided weakness from prior CVA documented.',
        expectedPDX: 'I69.3',
        expectedCodes: ['I69.3'],
        expectedRoles: ['PRIMARY'],
        expectedPOA: ['Y'],
        expectedDecision: 'PASS_THROUGH'
    },
    {
        id: 'L4-11',
        input: 'Admitted with trauma after fall. Femur fracture documented. Acute blood loss anemia documented.',
        expectedPDX: 'T14.90',
        expectedCodes: ['D62', 'S72.90XA', 'T14.90', 'W19.XXXA'],
        expectedRoles: ['SECONDARY', 'SECONDARY', 'PRIMARY', 'SECONDARY'],
        expectedPOA: ['U', 'U', 'Y', 'Y'],
        expectedDecision: 'AUTO_SEQUENCE'
    },
    {
        id: 'L4-12',
        input: 'Admitted with sepsis due to pneumonia. Septic shock developed after admission.',
        expectedPDX: 'A41.9',
        expectedCodes: ['A41.9', 'J18.9', 'R65.21'],
        expectedRoles: ['PRIMARY', 'SECONDARY', 'SECONDARY'],
        expectedPOA: ['Y', 'Y', 'Y'],
        expectedDecision: 'AUTO_SEQUENCE'
    }
];

async function runFrozenLevel4Guard() {
    console.log('🔒 FROZEN LEVEL 4 GUARD TEST - v1.4-level4-freeze');
    console.log('Golden snapshots from commit 3f9c63f - IMMUTABLE\n');

    let passed = 0;
    let failed = 0;
    const regressions = [];

    for (const snapshot of FROZEN_LEVEL4_SNAPSHOTS) {
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

        const actualPDX = responseData.data?._debug?.principalDiagnosis;
        const actualCodes = responseData.data?._debug?.codesAssigned?.map(c => c.code) || [];
        const actualRoles = responseData.data?._debug?.codesAssigned?.map(c => c.role) || [];
        const actualPOA = responseData.data?._debug?.codesAssigned?.map(c => c.poa) || [];
        const actualDecision = responseData.data?._debug?.decisionState?.includes('AUTO_SEQUENCE') ? 'AUTO_SEQUENCE' :
            responseData.data?._debug?.decisionState?.includes('PASS_THROUGH') ? 'PASS_THROUGH' : 'OTHER';

        const pdxMatch = actualPDX === snapshot.expectedPDX;
        const codesMatch = JSON.stringify(actualCodes) === JSON.stringify(snapshot.expectedCodes);
        const rolesMatch = JSON.stringify(actualRoles) === JSON.stringify(snapshot.expectedRoles);
        const poaMatch = JSON.stringify(actualPOA) === JSON.stringify(snapshot.expectedPOA);
        const decisionMatch = actualDecision === snapshot.expectedDecision;

        const testPassed = pdxMatch && codesMatch && rolesMatch && poaMatch && decisionMatch;

        if (testPassed) {
            passed++;
            console.log(`✅ ${snapshot.id}: PASS`);
        } else {
            failed++;
            console.log(`❌ ${snapshot.id}: REGRESSION DETECTED`);
            regressions.push({
                id: snapshot.id,
                pdx: pdxMatch ? '✓' : `Expected ${snapshot.expectedPDX}, got ${actualPDX}`,
                codes: codesMatch ? '✓' : `Expected [${snapshot.expectedCodes}], got [${actualCodes}]`,
                roles: rolesMatch ? '✓' : `Expected [${snapshot.expectedRoles}], got [${actualRoles}]`,
                poa: poaMatch ? '✓' : `Expected [${snapshot.expectedPOA}], got [${actualPOA}]`,
                decision: decisionMatch ? '✓' : `Expected ${snapshot.expectedDecision}, got ${actualDecision}`
            });
        }
    }

    console.log(`\n${'='.repeat(70)}`);
    console.log('FROZEN LEVEL 4 GUARD RESULTS');
    console.log('='.repeat(70));
    console.log(`Total: ${FROZEN_LEVEL4_SNAPSHOTS.length}`);
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);

    if (failed > 0) {
        console.log('\n🚨 REGRESSION DETECTED - LEVEL 4 BEHAVIOR HAS CHANGED');
        console.log('Revert to v1.4-level4-freeze (commit 3f9c63f) immediately\n');
        regressions.forEach(r => {
            console.log(`${r.id}:`);
            console.log(`  PDX: ${r.pdx}`);
            console.log(`  Codes: ${r.codes}`);
            console.log(`  Roles: ${r.roles}`);
            console.log(`  POA: ${r.poa}`);
            console.log(`  Decision: ${r.decision}\n`);
        });
        process.exit(1);
    } else {
        console.log('\n✅ LEVEL 4 FROZEN BEHAVIOR VERIFIED - NO REGRESSIONS');
    }
}

runFrozenLevel4Guard().catch(console.error);
