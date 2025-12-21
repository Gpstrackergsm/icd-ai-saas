/**
 * NEGATIVE REGRESSION TESTS - RENAL INFERENCE GUARDS
 * 
 * These tests ensure no future code changes can:
 * 1. Create N17/N18 codes without provider diagnosis
 * 2. Trigger CKD staging query when stage explicitly documented
 */

import { parserIntegration, ParserOutput } from '../audit/parserIntegration';
import { DecisionState } from '../decision';

console.log('='.repeat(80));
console.log('NEGATIVE REGRESSION TESTS: RENAL INFERENCE GUARDS');
console.log('='.repeat(80));
console.log('');

let passedTests = 0;
let failedTests = 0;

async function testNegative(
    testName: string,
    narrative: string,
    parserOutput: ParserOutput,
    assertionFn: (result: any) => { passed: boolean; message: string }
): Promise<void> {
    console.log(`TEST: ${testName}`);
    console.log('-'.repeat(80));

    try {
        const result = await parserIntegration.processCase(narrative, parserOutput, { caseId: testName });
        const assertion = assertionFn(result);

        if (assertion.passed) {
            console.log(`✅ PASS: ${assertion.message}`);
            passedTests++;
        } else {
            console.log(`❌ FAIL: ${assertion.message}`);
            failedTests++;
        }
    } catch (error: any) {
        console.log(`❌ FAIL: Exception thrown - ${error.message}`);
        failedTests++;
    }

    console.log('');
}

async function runNegativeTests() {
    // NEGATIVE TEST 1: Labs + elevated Cr WITHOUT provider diagnosis → Must NOT code N17/N18
    await testNegative(
        'NEG-1: Labs alone must NEVER create renal codes',
        'Patient with elevated creatinine 2.5. No renal diagnosis documented.',
        {
            providerTerms: {
                diagnoses: [],
                symptoms: [],
                procedures: [],
            },
            vitalSigns: {},
            labValues: {
                creatinine: { value: 2.5, baseline: 1.0 },
            },
            clinicalFindings: {},
            treatments: {},
            containsInferredDiagnosis: false,
        },
        (result) => {
            const hasRenalCode = result.auditResult.autoCoded.some((dx: any) =>
                dx.code.startsWith('N17') || dx.code.startsWith('N18')
            );

            if (hasRenalCode) {
                return {
                    passed: false,
                    message: `REGRESSION VIOLATION: Created renal code ${result.auditResult.autoCoded.find((dx: any) => dx.code.startsWith('N17') || dx.code.startsWith('N18')).code} without provider diagnosis`
                };
            }

            if (result.auditResult.decisionState !== DecisionState.AUTO_EXCLUDE) {
                return {
                    passed: false,
                    message: `Expected AUTO_EXCLUDE, got ${result.auditResult.decisionState}`
                };
            }

            return {
                passed: true,
                message: 'Correctly excluded renal codes without provider diagnosis'
            };
        }
    );

    // NEGATIVE TEST 2: CKD stage explicitly documented → Must NOT query for staging
    await testNegative(
        'NEG-2: Explicit CKD stage must NEVER trigger staging query',
        'Patient with CKD stage 3.',
        {
            providerTerms: {
                diagnoses: ['CKD stage 3'],
                symptoms: [],
                procedures: [],
            },
            vitalSigns: {},
            labValues: {},
            clinicalFindings: {},
            treatments: {},
            containsInferredDiagnosis: false,
        },
        (result) => {
            const hasStagingQuery = result.queriesGenerated.some((q: any) =>
                q.queryText.toLowerCase().includes('stage') &&
                q.queryText.toLowerCase().includes('ckd')
            );

            if (hasStagingQuery) {
                return {
                    passed: false,
                    message: 'REGRESSION VIOLATION: Generated CKD staging query despite explicit stage documentation'
                };
            }

            if (result.auditResult.decisionState !== DecisionState.AUTO_CODE) {
                return {
                    passed: false,
                    message: `Expected AUTO_CODE, got ${result.auditResult.decisionState}`
                };
            }

            const hasN183 = result.auditResult.autoCoded.some((dx: any) => dx.code === 'N18.3');
            if (!hasN183) {
                return {
                    passed: false,
                    message: 'Expected N18.3 to be coded'
                };
            }

            return {
                passed: true,
                message: 'Correctly coded N18.3 without staging query'
            };
        }
    );

    // SUMMARY
    console.log('='.repeat(80));
    console.log('NEGATIVE REGRESSION TEST SUMMARY');
    console.log('='.repeat(80));
    console.log('');
    console.log(`Total Tests: ${passedTests + failedTests}`);
    console.log(`✅ Passed: ${passedTests}`);
    console.log(`❌ Failed: ${failedTests}`);
    console.log('');

    if (failedTests === 0) {
        console.log('🎉 ALL NEGATIVE GUARDS PASSED');
        console.log('Renal inference protections are LOCKED and operational');
    } else {
        console.log('❌ NEGATIVE GUARDS FAILED');
        console.log('REGRESSION VIOLATION DETECTED - DO NOT DEPLOY');
    }

    console.log('='.repeat(80));

    process.exit(failedTests === 0 ? 0 : 1);
}

runNegativeTests().catch(error => {
    console.error('Negative test suite failed with error:', error);
    process.exit(1);
});
