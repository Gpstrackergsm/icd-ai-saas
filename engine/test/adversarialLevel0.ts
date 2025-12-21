/**
 * ADVERSARIAL TEST SET - LEVEL 0
 * Plain Clinical Narratives Testing Renal Inference Protection
 * 
 * All cases have:
 * - Elevated renal labs
 * - Monitoring/risk discussion language
 * - NO provider diagnosis of AKI/CKD
 * 
 * Expected: ALL cases must AUTO_EXCLUDE renal codes
 */

import { parserIntegration, ParserOutput } from '../audit/parserIntegration';
import { DecisionState } from '../decision';

console.log('='.repeat(80));
console.log('ADVERSARIAL TEST SET — LEVEL 0');
console.log('Plain Clinical Narratives');
console.log('='.repeat(80));
console.log('');

let passedTests = 0;
let failedTests = 0;

interface AdversarialCase {
    id: string;
    narrative: string;
    creatinine?: { value: number; baseline?: number };
}

const adversarialCases: AdversarialCase[] = [
    {
        id: 'ADV-01',
        narrative: '68-year-old admitted for dehydration and weakness. Creatinine was elevated on admission and improved after intravenous fluids. Renal function was monitored during hospitalization. There was no documented diagnosis of acute kidney injury or chronic kidney disease.',
        creatinine: { value: 1.8, baseline: 1.0 }
    },
    {
        id: 'ADV-02',
        narrative: '72-year-old inpatient admitted with pneumonia. Blood urea nitrogen and creatinine were mildly elevated. Renal laboratory values were trended daily due to patient age. No renal diagnosis was documented by the provider.',
        creatinine: { value: 1.5 }
    },
    {
        id: 'ADV-03',
        narrative: '75-year-old patient with a history of congestive heart failure admitted for dyspnea. Creatinine was 2.0 on admission. Renal function was closely monitored. There was no mention of acute kidney injury or chronic kidney disease in the provider assessment.',
        creatinine: { value: 2.0 }
    },
    {
        id: 'ADV-04',
        narrative: '64-year-old treated for urinary tract infection. Initial creatinine was elevated and normalized after intravenous fluids. Provider documentation states "renal function improving." No diagnosis of kidney injury was documented.',
        creatinine: { value: 1.6, baseline: 1.0 }
    },
    {
        id: 'ADV-05',
        narrative: '70-year-old surgical patient. Risk of contrast-induced nephropathy was discussed prior to the procedure. No kidney injury occurred, and no diagnosis of acute or chronic kidney disease was documented.',
        creatinine: undefined // Risk discussion only
    },
    {
        id: 'ADV-06',
        narrative: '80-year-old admitted for sepsis evaluation. Lactate was elevated on admission and normalized after fluid resuscitation. Kidney function was monitored during hospitalization. No renal diagnosis was documented.',
        creatinine: { value: 1.4 }
    },
    {
        id: 'ADV-07',
        narrative: '67-year-old patient with diabetes admitted for cellulitis. Creatinine was elevated but stable compared to prior laboratory results. Renal function was followed during admission. No diagnosis of chronic kidney disease was documented.',
        creatinine: { value: 1.7, baseline: 1.6 }
    },
    {
        id: 'ADV-08',
        narrative: '73-year-old inpatient with chronic obstructive pulmonary disease exacerbation. Blood urea nitrogen was elevated and attributed to dehydration. Renal laboratory values were monitored. The provider did not diagnose acute kidney injury or chronic kidney disease.',
        creatinine: { value: 1.5 }
    },
    {
        id: 'ADV-09',
        narrative: '69-year-old admitted for syncope. Mild creatinine elevation was noted. Renal function was monitored only. No renal diagnosis was made.',
        creatinine: { value: 1.3 }
    },
    {
        id: 'ADV-10',
        narrative: '77-year-old patient admitted with gastrointestinal bleeding. Creatinine was elevated on admission and improved after transfusion and intravenous fluids. There was no documentation of acute or chronic kidney disease.',
        creatinine: { value: 1.9, baseline: 1.1 }
    },
    {
        id: 'ADV-11',
        narrative: '65-year-old admitted for abdominal pain. Laboratory studies showed an elevated BUN-to-creatinine ratio. Hydration was administered. No renal diagnosis was documented.',
        creatinine: { value: 1.4 }
    },
    {
        id: 'ADV-12',
        narrative: '82-year-old inpatient. Creatinine was elevated and attributed to poor oral intake. Renal function was monitored during hospitalization. No provider diagnosis of acute kidney injury or chronic kidney disease was documented.',
        creatinine: { value: 1.6 }
    }
];

async function testAdversarialCase(testCase: AdversarialCase): Promise<void> {
    console.log(`CASE ${testCase.id}`);
    console.log('-'.repeat(80));
    console.log(`Narrative: ${testCase.narrative.substring(0, 100)}...`);
    console.log('');

    const parserOutput: ParserOutput = {
        providerTerms: {
            diagnoses: [], // NO renal diagnosis
            symptoms: [],
            procedures: [],
        },
        vitalSigns: {},
        labValues: testCase.creatinine ? { creatinine: testCase.creatinine } : {},
        clinicalFindings: {},
        treatments: {},
        containsInferredDiagnosis: false,
    };

    try {
        const result = await parserIntegration.processCase(testCase.narrative, parserOutput, { caseId: testCase.id });

        console.log(`DECISION_STATE: ${result.auditResult.decisionState}`);
        console.log('');

        // Check for renal codes
        const hasRenalCode = result.auditResult.autoCoded.some(dx =>
            dx.code.startsWith('N17') || dx.code.startsWith('N18')
        );

        // Check for renal exclusion
        const hasRenalExclusion = result.auditResult.autoExcluded.some(ex =>
            ex.concept.toLowerCase().includes('renal') ||
            ex.concept.toLowerCase().includes('kidney')
        );

        // Validation
        let passed = true;
        const failures: string[] = [];

        if (hasRenalCode) {
            passed = false;
            const violatingCode = result.auditResult.autoCoded.find(dx =>
                dx.code.startsWith('N17') || dx.code.startsWith('N18')
            );
            failures.push(`❌ REGRESSION VIOLATION: Created renal code ${violatingCode?.code} without provider diagnosis`);
        }

        if (result.auditResult.decisionState !== DecisionState.AUTO_EXCLUDE) {
            passed = false;
            failures.push(`Expected AUTO_EXCLUDE, got ${result.auditResult.decisionState}`);
        }

        if (testCase.creatinine && !hasRenalExclusion) {
            passed = false;
            failures.push('Expected renal concept to be excluded but found none');
        }

        if (passed) {
            console.log('✅ PASS: Correctly excluded renal codes without provider diagnosis');
            console.log(`Rule Triggered: ${result.auditResult.rulesTriggered.join(', ')}`);
            passedTests++;
        } else {
            console.log('❌ FAIL');
            failures.forEach(f => console.log(f));
            failedTests++;
        }

    } catch (error: any) {
        console.log(`❌ FAIL: Exception thrown - ${error.message}`);
        failedTests++;
    }

    console.log('');
    console.log('');
}

async function runAdversarialTests() {
    for (const testCase of adversarialCases) {
        await testAdversarialCase(testCase);
    }

    // SUMMARY
    console.log('='.repeat(80));
    console.log('ADVERSARIAL TEST SUMMARY — LEVEL 0');
    console.log('='.repeat(80));
    console.log('');
    console.log(`Total Cases: ${passedTests + failedTests}`);
    console.log(`✅ Passed: ${passedTests}`);
    console.log(`❌ Failed: ${failedTests}`);
    console.log('');

    if (failedTests === 0) {
        console.log('🎉 ALL ADVERSARIAL TESTS PASSED');
        console.log('');
        console.log('Renal Inference Protection Verified:');
        console.log('- Labs + monitoring WITHOUT diagnosis → AUTO_EXCLUDE ✅');
        console.log('- Risk discussion WITHOUT diagnosis → AUTO_EXCLUDE ✅');
        console.log('- Elevated Cr improving WITHOUT diagnosis → AUTO_EXCLUDE ✅');
        console.log('- Cr attributed to dehydration WITHOUT diagnosis → AUTO_EXCLUDE ✅');
        console.log('');
        console.log('NO renal codes created from:');
        console.log('- Laboratory monitoring');
        console.log('- Risk discussions');
        console.log('- Trending renal values');
        console.log('- Attribution to non-renal causes');
        console.log('');
        console.log('Regression guards are OPERATIONAL and PROTECTING against inference.');
    } else {
        console.log('❌ ADVERSARIAL TESTS FAILED');
        console.log('REGRESSION VIOLATION DETECTED');
        console.log('Renal inference protections have been BYPASSED');
    }

    console.log('='.repeat(80));

    process.exit(failedTests === 0 ? 0 : 1);
}

runAdversarialTests().catch(error => {
    console.error('Adversarial test suite failed with error:', error);
    process.exit(1);
});
