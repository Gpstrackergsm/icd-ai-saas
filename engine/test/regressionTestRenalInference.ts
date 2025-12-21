/**
 * STRICT REGRESSION TEST - Renal Inference Bug
 * 
 * Verifies that CKD/AKI are NOT created from labs/monitoring/risk discussion
 * without explicit provider diagnosis.
 */

import { parserIntegration, ParserOutput } from '../audit/parserIntegration';
import { formatAuditResult } from '../auditResult';
import { DecisionState } from '../decision';
import * as childProcess from 'child_process';

const COMMIT_HASH = childProcess.execSync('git rev-parse HEAD').toString().trim().substring(0, 7);

console.log('='.repeat(80));
console.log('STRICT REGRESSION TEST: RENAL INFERENCE BUG');
console.log('='.repeat(80));
console.log(`Engine Version: 1.0.0`);
console.log(`Commit Hash: ${COMMIT_HASH}`);
console.log('');

let passedCases = 0;
let failedCases = 0;

async function testCase(
    caseNumber: string,
    narrative: string,
    parserOutput: ParserOutput,
    expectedState: DecisionState | null,
    expectations: {
        shouldExcludeAKI?: boolean;
        shouldExcludeCKD?: boolean;
        shouldNotCodeRenal?: boolean;
        shouldNotQueryStaging?: boolean;
        shouldQueryAKICKD?: boolean;
        shouldBlockAndQuery?: boolean;
        allowedFallback?: string;
        shouldCodeCKDStage?: string;
    }
): Promise<void> {
    console.log(`CASE ${caseNumber}`);
    console.log('-'.repeat(80));
    console.log(`Narrative: ${narrative.substring(0, 100)}...`);
    console.log('');

    try {
        const result = await parserIntegration.processCase(narrative, parserOutput, { caseId: caseNumber });

        console.log(`DECISION_STATE: ${result.auditResult.decisionState}`);
        console.log('');

        console.log('AUTO_CODED_DIAGNOSES:');
        if (result.auditResult.autoCoded.length === 0) {
            console.log('- None');
        } else {
            result.auditResult.autoCoded.forEach(dx => {
                console.log(`- ${dx.code} — ${dx.description} (${dx.position})`);
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

        console.log('QUERY_REQUIRED:');
        if (result.queriesGenerated.length === 0) {
            console.log('- None');
        } else {
            result.queriesGenerated.forEach(q => {
                console.log(`- ${q.concept}`);
                console.log(`  Query: "${q.queryText.substring(0, 80)}..."`);
            });
        }
        console.log('');

        console.log(`AUDIT_RISK_LEVEL: ${result.auditResult.riskLevel}`);
        console.log(`RISK_RATIONALE: ${result.auditResult.riskRationale}`);
        console.log('');

        console.log('TRIGGERED_RULE_GROUPS:');
        result.auditResult.rulesTriggered.forEach(rule => console.log(`- ${rule}`));
        console.log('');

        console.log(`ENGINE_VERSION: ${COMMIT_HASH}`);
        console.log(`AUDIT_TRAIL_RECORD_ID: ${result.auditTrailId}`);
        console.log('');

        // Validation
        let passed = true;
        const failures: string[] = [];

        // Check decision state if specified
        if (expectedState !== null && result.auditResult.decisionState !== expectedState) {
            passed = false;
            failures.push(`Expected ${expectedState}, got ${result.auditResult.decisionState}`);
        }

        // Check exclusions
        if (expectations.shouldExcludeAKI) {
            const excludesAKI = result.auditResult.autoExcluded.some(ex =>
                ex.concept.toLowerCase().includes('aki') ||
                ex.concept.toLowerCase().includes('acute kidney') ||
                ex.concept.toLowerCase().includes('renal impairment')
            );
            if (!excludesAKI) {
                passed = false;
                failures.push('Should exclude AKI but did not');
            }
        }

        if (expectations.shouldExcludeCKD) {
            const excludesCKD = result.auditResult.autoExcluded.some(ex =>
                ex.concept.toLowerCase().includes('ckd') ||
                ex.concept.toLowerCase().includes('chronic kidney')
            );
            if (!excludesCKD) {
                passed = false;
                failures.push('Should exclude CKD but did not');
            }
        }

        // Check that no renal codes are generated
        if (expectations.shouldNotCodeRenal) {
            const renalCodes = result.auditResult.autoCoded.filter(dx =>
                dx.code.startsWith('N17') || dx.code.startsWith('N18') || dx.code === 'N28.9'
            );
            if (renalCodes.length > 0 && !expectations.allowedFallback) {
                passed = false;
                failures.push(`Should not code renal, but coded: ${renalCodes.map(c => c.code).join(', ')}`);
            }
        }

        // Check that CKD staging query is NOT generated when CKD not documented
        if (expectations.shouldNotQueryStaging) {
            const hasStagingQuery = result.queriesGenerated.some(q =>
                q.queryText.toLowerCase().includes('stage') &&
                q.queryText.toLowerCase().includes('ckd')
            );
            if (hasStagingQuery) {

                passed = false;
                failures.push('Should NOT query CKD staging when CKD not documented, but query generated');
            }
        }

        // Check that AKI/CKD clarification query IS generated for non-specific terms
        if (expectations.shouldQueryAKICKD) {
            const hasRenalQuery = result.queriesGenerated.some(q =>
                q.queryText.toLowerCase().includes('aki') ||
                q.queryText.toLowerCase().includes('ckd') ||
                q.queryText.toLowerCase().includes('acute kidney') ||
                q.queryText.toLowerCase().includes('chronic kidney')
            );
            if (!hasRenalQuery) {
                passed = false;
                failures.push('Should query for AKI vs CKD clarification but did not');
            }
        }

        // Check BLOCK_AND_QUERY state
        if (expectations.shouldBlockAndQuery && result.auditResult.decisionState !== DecisionState.BLOCK_AND_QUERY) {
            passed = false;
            failures.push(`Should BLOCK_AND_QUERY but got ${result.auditResult.decisionState}`);
        }

        // Check specific CKD stage coding
        if (expectations.shouldCodeCKDStage) {
            const hasStageCode = result.auditResult.autoCoded.some(dx => dx.code === expectations.shouldCodeCKDStage);
            if (!hasStageCode) {
                passed = false;
                failures.push(`Should code ${expectations.shouldCodeCKDStage} but did not`);
            }
        }

        if (passed) {
            console.log('✅ PASS');
            passedCases++;
        } else {
            console.log('❌ FAIL');
            console.log('Failures:');
            failures.forEach(f => console.log(`  - ${f}`));
            console.log('Expected rule groups: Rule Group 3.3 (Labs without diagnosis) or Rule Group 3.1 (Non-specific terms)');
            console.log('Likely location: engine/rules/ruleGroup3_renalDetermination.ts');
            failedCases++;
        }

    } catch (error: any) {
        console.log('❌ FAIL - Exception thrown');
        console.log(`Error: ${error.message}`);
        failedCases++;
    }

    console.log('');
    console.log('');
}

async function runRegressionTests() {
    // CASE R1: Labs improved, no diagnosis
    await testCase(
        'R1',
        '68-year-old admitted for dehydration and weakness. Creatinine elevated on admission, improved after IV fluids. No provider-documented diagnosis of acute kidney injury or chronic kidney disease. Discharged stable.',
        {
            providerTerms: {
                diagnoses: ['dehydration', 'weakness'],
                symptoms: [],
                procedures: [],
            },
            vitalSigns: {},
            labValues: {
                creatinine: { value: 1.5, baseline: 1.0 }, // Improved after fluids
            },
            clinicalFindings: {},
            treatments: { medications: ['IV fluids'] },
            containsInferredDiagnosis: false,
        },
        null, // Don't enforce specific decision state, just check no renal codes
        {
            shouldNotCodeRenal: true,
            shouldNotQueryStaging: true,
        }
    );

    // CASE R2: Monitoring ≠ CKD
    await testCase(
        'R2',
        '72-year-old inpatient with pneumonia. Renal function monitored due to age/comorbidities. No renal diagnosis documented; no nephrology consult.',
        {
            providerTerms: {
                diagnoses: ['pneumonia'],
                symptoms: [],
                procedures: [],
            },
            vitalSigns: {},
            labValues: {
                creatinine: { value: 1.2 },
            },
            clinicalFindings: {},
            treatments: {},
            containsInferredDiagnosis: false,
        },
        null,
        {
            shouldNotCodeRenal: true,
            shouldNotQueryStaging: true,
        }
    );

    // CASE R3: Risk discussion ≠ CKD
    await testCase(
        'R3',
        'Elective cardiac cath. Team discussed CKD risk prior to contrast. No kidney injury occurred. No CKD or AKI documented.',
        {
            providerTerms: {
                diagnoses: [],
                symptoms: [],
                procedures: ['cardiac catheterization'],
            },
            vitalSigns: {},
            labValues: {},
            clinicalFindings: {},
            treatments: {},
            containsInferredDiagnosis: false,
        },
        null,
        {
            shouldNotCodeRenal: true,
            shouldNotQueryStaging: true,
        }
    );

    // CASE R4: Borderline change, no AKI diagnosis
    await testCase(
        'R4',
        'UTI treated with antibiotics. Creatinine 1.0 to 1.2 during stay. Provider did not document AKI or renal failure.',
        {
            providerTerms: {
                diagnoses: ['urinary tract infection'],
                symptoms: [],
                procedures: [],
            },
            vitalSigns: {},
            labValues: {
                creatinine: { value: 1.2, baseline: 1.0 },
            },
            clinicalFindings: {},
            treatments: { medications: ['antibiotics'] },
            containsInferredDiagnosis: false,
        },
        null,
        {
            shouldNotCodeRenal: true,
        }
    );

    // CASE R5: CKD documented, no stage
    await testCase(
        'R5',
        'Pneumonia admission. Provider assessment: "chronic kidney disease." No stage stated.',
        {
            providerTerms: {
                diagnoses: ['pneumonia', 'chronic kidney disease'],
                symptoms: [],
                procedures: [],
            },
            vitalSigns: {},
            labValues: {},
            clinicalFindings: {},
            treatments: {},
            containsInferredDiagnosis: false,
        },
        DecisionState.AUTO_QUERY,
        {
            shouldQueryAKICKD: false, // Should query for STAGING, not AKI vs CKD
            allowedFallback: 'N18.9',
        }
    );

    // CASE R6: AKI documented but criteria not met
    await testCase(
        'R6',
        'UTI admission. Provider documents "acute kidney injury." Creatinine increased from 1.0 to 1.1. No renal treatment.',
        {
            providerTerms: {
                diagnoses: ['urinary tract infection', 'acute kidney injury'],
                symptoms: [],
                procedures: [],
            },
            vitalSigns: {},
            labValues: {
                creatinine: { value: 1.1, baseline: 1.0 },
            },
            clinicalFindings: {},
            treatments: {},
            containsInferredDiagnosis: false,
        },
        DecisionState.BLOCK_AND_QUERY,
        {
            shouldBlockAndQuery: true,
        }
    );

    // CASE R7: Non-specific renal term
    await testCase(
        'R7',
        'CHF exacerbation. Provider documents "renal insufficiency." Creatinine 2.1; baseline unavailable.',
        {
            providerTerms: {
                diagnoses: ['CHF exacerbation', 'renal insufficiency'],
                symptoms: [],
                procedures: [],
            },
            vitalSigns: {},
            labValues: {
                creatinine: { value: 2.1 },
            },
            clinicalFindings: {},
            treatments: {},
            containsInferredDiagnosis: false,
        },
        DecisionState.AUTO_QUERY,
        {
            shouldQueryAKICKD: true,
            allowedFallback: 'N28.9',
        }
    );

    // CASE R8: Explicit CKD stage documented
    await testCase(
        'R8',
        'Admitted for pneumonia. Provider documents: "CKD stage 4."',
        {
            providerTerms: {
                diagnoses: ['pneumonia', 'CKD stage 4'],
                symptoms: [],
                procedures: [],
            },
            vitalSigns: {},
            labValues: {},
            clinicalFindings: {},
            treatments: {},
            containsInferredDiagnosis: false,
        },
        DecisionState.AUTO_CODE,
        {
            shouldCodeCKDStage: 'N18.4',
            shouldNotQueryStaging: true,
        }
    );

    // SUMMARY
    console.log('='.repeat(80));
    console.log('REGRESSION TEST SUMMARY');
    console.log('='.repeat(80));
    console.log('');
    console.log(`Total Cases: ${passedCases + failedCases}`);
    console.log(`✅ Passed: ${passedCases}`);
    console.log(`❌ Failed: ${failedCases}`);
    console.log('');

    if (failedCases === 0) {
        console.log('🎉 REGRESSION PASS: CKD/AKI inference bug fixed');
        console.log(`All ${passedCases} cases correctly exclude renal diagnoses without provider documentation`);
    } else {
        console.log('❌ REGRESSION FAILED');
    }

    console.log('='.repeat(80));

    process.exit(failedCases === 0 ? 0 : 1);
}

runRegressionTests().catch(error => {
    console.error('Test suite failed with error:', error);
    process.exit(1);
});
