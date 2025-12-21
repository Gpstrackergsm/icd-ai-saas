/**
 * LOCAL PARITY TEST - ADV-01
 * Tests that local audit engine produces expected output
 */

const { parserIntegration } = require('./dist/engine/audit/parserIntegration.js');

const narrative = '68-year-old admitted for dehydration and weakness. Creatinine was elevated on admission and improved after intravenous fluids. Renal function was monitored during hospitalization. There was no documented diagnosis of acute kidney injury or chronic kidney disease.';

const parserOutput = {
    providerTerms: {
        diagnoses: [], // NO renal diagnosis
        symptoms: [],
        procedures: [],
    },
    vitalSigns: {},
    labValues: {
        creatinine: { value: 1.8, baseline: 1.0 }
    },
    clinicalFindings: {},
    treatments: { medications: ['IV fluids'] },
    containsInferredDiagnosis: false,
};

console.log('='.repeat(80));
console.log('LOCAL PARITY TEST - ADV-01');
console.log('='.repeat(80));
console.log('');

parserIntegration.processCase(narrative, parserOutput, { caseId: 'ADV-01-LOCAL' })
    .then(result => {
        console.log('DECISION_STATE:', result.auditResult.decisionState);
        console.log('');

        console.log('AUTO_CODED_DIAGNOSES:');
        if (result.auditResult.autoCoded.length === 0) {
            console.log('- None');
        } else {
            result.auditResult.autoCoded.forEach(dx => {
                console.log(`- ${dx.code} — ${dx.description}`);
            });
        }
        console.log('');

        console.log('AUTO_EXCLUDED_DIAGNOSES:');
        if (result.auditResult.autoExcluded.length === 0) {
            console.log('- None');
        } else {
            result.auditResult.autoExcluded.forEach(ex => {
                console.log(`- ${ex.concept} — Reason: ${ex.reason}`);
            });
        }
        console.log('');

        console.log('QUERIES_GENERATED:', result.queriesGenerated.length);
        console.log('');

        console.log('RULES_TRIGGERED:');
        result.auditResult.rulesTriggered.forEach(rule => console.log(`- ${rule}`));
        console.log('');

        console.log('AUDIT_TRAIL_ID:', result.auditTrailId);
        console.log('');

        // Validation
        const EXPECTED_STATE = 'AUTO_EXCLUDE';
        const EXPECTED_RULE = 'Rule Group 3.3: Laboratory Values Alone';

        if (result.auditResult.decisionState === EXPECTED_STATE &&
            result.auditResult.rulesTriggered.includes(EXPECTED_RULE) &&
            result.auditResult.autoCoded.length === 0 &&
            result.queriesGenerated.length === 0) {
            console.log('✅ LOCAL PARITY TEST PASSED');
            console.log('');
            console.log('Expected behavior confirmed:');
            console.log(`- Decision: ${EXPECTED_STATE}`);
            console.log(`- Rule: ${EXPECTED_RULE}`);
            console.log('- No renal codes generated');
            console.log('- No queries generated');
        } else {
            console.log('❌ LOCAL PARITY TEST FAILED');
            console.log(`Expected: ${EXPECTED_STATE}, Rule: ${EXPECTED_RULE}`);
            console.log(`Got: ${result.auditResult.decisionState}, Rules: ${result.auditResult.rulesTriggered.join(', ')}`);
            process.exit(1);
        }

        console.log('');
        console.log('='.repeat(80));
    })
    .catch(error => {
        console.error('LOCAL TEST FAILED:', error);
        process.exit(1);
    });
