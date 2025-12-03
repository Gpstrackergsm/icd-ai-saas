"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const rulesEngine_1 = require("./lib/rulesEngine");
const testCases = [
    {
        name: 'Rationale: Diabetes with CKD',
        input: 'Type 2 diabetes with CKD stage 3',
        expectedRationale: ['diabetes', 'manifestation', 'guideline'],
        expectedConfidence: { min: 70, max: 100 }
    },
    {
        name: 'Rationale: Sepsis with Shock',
        input: 'Urosepsis with septic shock',
        expectedRationale: ['sepsis', 'shock', 'source'],
        expectedConfidence: { min: 75, max: 100 }
    },
    {
        name: 'Confidence: Missing Laterality',
        input: 'Fracture of femur',
        expectedRationale: ['injury', 'laterality'],
        expectedConfidence: { min: 40, max: 75 } // Lower due to missing laterality
    },
    {
        name: 'Confidence: High Specificity',
        input: 'Closed fracture of right distal radius, initial encounter',
        expectedRationale: ['injury', 'specific'],
        expectedConfidence: { min: 80, max: 100 } // High due to full specificity
    },
    {
        name: 'Guideline: Hypertensive Heart Disease',
        input: 'Hypertensive heart disease with heart failure and CKD stage 4',
        expectedRationale: ['hypertension', 'combination', 'guideline'],
        expectedConfidence: { min: 75, max: 100 }
    }
];
async function runTests() {
    console.log('Running Rationale & Confidence Tests...\n');
    let passed = 0;
    let failed = 0;
    for (const test of testCases) {
        console.log(`TEST: ${test.name}`);
        console.log(`Input: "${test.input}"`);
        const result = (0, rulesEngine_1.runRulesEngine)(test.input);
        console.log(`\nConfidence: ${result.confidence.overallConfidence}%`);
        console.log(`Explanation: ${result.confidence.explanation}`);
        console.log(`\nRationale Summary: ${result.rationale.length} code(s) with rationale`);
        result.rationale.forEach(r => {
            console.log(`  - ${r.code}: ${r.clinicalJustification}`);
            if (r.guidelineReference) {
                console.log(`    Guideline: ${r.guidelineReference.section} - ${r.guidelineReference.title}`);
            }
            if (r.sequencingReason) {
                console.log(`    Sequencing: ${r.sequencingReason}`);
            }
        });
        let testPassed = true;
        // Check confidence range
        if (result.confidence.overallConfidence < test.expectedConfidence.min ||
            result.confidence.overallConfidence > test.expectedConfidence.max) {
            console.log(`\n❌ FAIL: Confidence ${result.confidence.overallConfidence}% outside expected range [${test.expectedConfidence.min}-${test.expectedConfidence.max}]`);
            testPassed = false;
        }
        // Check rationale completeness
        if (result.rationale.length === 0) {
            console.log(`\n❌ FAIL: No rationale generated`);
            testPassed = false;
        }
        // Check for expected rationale keywords
        const rationaleText = JSON.stringify(result.rationale).toLowerCase();
        for (const keyword of test.expectedRationale) {
            if (!rationaleText.includes(keyword.toLowerCase())) {
                console.log(`\n❌ FAIL: Missing expected rationale keyword: "${keyword}"`);
                testPassed = false;
            }
        }
        if (testPassed) {
            console.log(`\n✅ PASS`);
            passed++;
        }
        else {
            failed++;
        }
        console.log('--------------------------------------------------');
    }
    console.log(`\nSummary: ${passed} Passed, ${failed} Failed`);
}
runTests();
