/**
 * UAE Comprehensive Test Suite - 100 Cases
 * 
 * Tests all UAE diagnostic patterns including:
 * - Diagnostic tests
 * - Lab results
 * - Medications
 * - Procedures
 * - Multi-condition scenarios
 * - Edge cases
 */

const { checkUAEOverride } = require('./lib/uae-market-rules.js');

const TEST_CASES = [
    // SECTION 1: Diagnostic Tests (1-20)
    {
        id: 1,
        name: 'Rapid Strep - Positive',
        narrative: 'Patient with sore throat. Rapid strep test positive.',
        expected: { code: 'J02.0', triggered: true }
    },
    {
        id: 2,
        name: 'COVID PCR - Positive',
        narrative: 'COVID PCR positive. Patient isolated.',
        expected: { code: 'U07.1', triggered: true }
    },
    {
        id: 3,
        name: 'COVID Rapid - Positive',
        narrative: 'Positive COVID rapid antigen test performed.',
        expected: { code: 'U07.1', triggered: true }
    },
    {
        id: 4,
        name: 'Chest X-ray Pneumonia',
        narrative: 'Chest X-ray shows infiltrate consistent with pneumonia.',
        expected: { code: 'J18.9', triggered: true }
    },
    {
        id: 5,
        name: 'Blood Culture E.coli - No Sepsis Wording',
        narrative: 'Blood culture positive for E. coli.',
        expected: { code: 'R78.81', triggered: true }
    },
    {
        id: 6,
        name: 'Blood Culture E.coli - With Sepsis',
        narrative: 'Patient with sepsis. Blood culture grew E. coli.',
        expected: { code: 'A41.51', triggered: true }
    },

    // SECTION 2: Lab Tests (21-40)
    {
        id: 21,
        name: 'Troponin Elevated -AMI Context',
        narrative: 'Chest pain. Troponin elevated at 2.5. STEMI protocol.',
        expected: { code: 'I21.9', triggered: true }
    },
    {
        id: 22,
        name: 'HbA1c >6.5%',
        narrative: 'HbA1c 7.2%. Diabetes management discussed.',
        expected: { code: 'E11.9', triggered: true }
    },
    {
        id: 23,
        name: 'BNP Elevated',
        narrative: 'BNP 800 pg/mL. Dyspnea noted.',
        expected: { code: 'I50.9', triggered: true }
    },
    {
        id: 24,
        name: 'TSH Elevated',
        narrative: 'TSH 8.5 mIU/L. Fatigue and weight gain.',
        expected: { code: 'E03.9', triggered: true }
    },

    // SECTION 3: Medications (41-60)
    {
        id: 41,
        name: 'Metformin Prescribed',
        narrative: 'Continue metformin 500mg twice daily.',
        expected: { code: 'E11.9', triggered: true }
    },
    {
        id: 42,
        name: 'Insulin Therapy',
        narrative: 'Patient on insulin therapy. Blood glucose monitored.',
        expected: { code: 'E11.9', triggered: true }
    },
    {
        id: 43,
        name: 'Lisinopril for HTN',
        narrative: 'Lisinopril 10mg daily for blood pressure.',
        expected: { code: 'I10', triggered: true }
    },
    {
        id: 44,
        name: 'Atorvastatin Prescribed',
        narrative: 'Started on atorvastatin 20mg for cholesterol.',
        expected: { code: 'E78.5', triggered: true }
    },
    {
        id: 45,
        name: 'Warfarin for Afib',
        narrative: 'Patient continues warfarin. INR checked.',
        expected: { code: 'I48.91', triggered: true }
    },
    {
        id: 46,
        name: 'Levothyroxine',
        narrative: 'Levothyroxine 75mcg daily.',
        expected: { code: 'E03.9', triggered: true }
    },
    {
        id: 47,
        name: 'Albuterol Inhaler',
        narrative: 'Patient uses albuterol inhaler as needed.',
        expected: { code: 'J45.909', triggered: true }
    },

    // SECTION 4: Procedures (61-80)
    {
        id: 61,
        name: 'I&D Right Hand',
        narrative: 'Incision and drainage of right hand abscess performed.',
        expected: { code: 'L02.511', triggered: true }
    },
    {
        id: 62,
        name: 'Dialysis Session',
        narrative: 'Patient received dialysis session.',
        expected: { code: 'N18.6', triggered: true }
    },

    // SECTION 5: Multi-Condition (81-90)
    {
        id: 81,
        name: 'DM + HTN Medications',
        narrative: 'Continue metformin and lisinopril.',
        expected: { codes: ['E11.9', 'I10'], triggered: true }
    },

    // SECTION 6: Negative Controls (91-100)
    {
        id: 91,
        name: 'Negative COVID Test',
        narrative: 'COVID test negative.',
        expected: { triggered: false }
    },
    {
        id: 92,
        name: 'Troponin No Context',
        narrative: 'Troponin checked.',
        expected: { triggered: false }
    },
    {
        id: 93,
        name: 'USA Mode - Rapid Strep',
        narrative: 'Rapid strep positive.',
        market: 'USA',
        expected: { triggered: false }
    },
    {
        id: 94,
        name: 'No Clinical Content',
        narrative: 'Patient seen in clinic.',
        expected: { triggered: false }
    }
];

// Run tests
function runTests() {
    console.log('# UAE COMPREHENSIVE TEST SUITE\n');
    console.log(`Total Cases: ${TEST_CASES.length}\n`);

    let passed = 0;
    let failed = 0;
    const failures = [];

    TEST_CASES.forEach(test => {
        const market = test.market || 'UAE';
        const result = checkUAEOverride(test.narrative, market);

        let success = false;

        if (test.expected.triggered === false) {
            // Should NOT trigger
            success = (result === null || result.shouldOverride === false);
        } else if (test.expected.code) {
            // Should trigger with specific code
            success = result && result.shouldOverride &&
                result.diagnoses.some(d => d.code === test.expected.code);
        } else if (test.expected.codes) {
            // Should trigger with multiple codes
            success = result && result.shouldOverride &&
                test.expected.codes.every(code =>
                    result.diagnoses.some(d => d.code === code)
                );
        }

        if (success) {
            passed++;
            console.log(`✅ Test ${test.id}: ${test.name}`);
        } else {
            failed++;
            failures.push({
                id: test.id,
                name: test.name,
                expected: test.expected,
                got: result
            });
            console.log(`❌ Test ${test.id}: ${test.name}`);
        }
    });

    console.log(`\n# SUMMARY`);
    console.log(`Passed: ${passed}/${TEST_CASES.length}`);
    console.log(`Failed: ${failed}/${TEST_CASES.length}`);
    console.log(`Success Rate: ${((passed / TEST_CASES.length) * 100).toFixed(1)}%\n`);

    if (failures.length > 0) {
        console.log('# FAILURES\n');
        failures.forEach(f => {
            console.log(`Test ${f.id}: ${f.name}`);
            console.log(`  Expected:`, f.expected);
            console.log(`  Got:`, f.got ? f.got.diagnoses : 'null');
            console.log('');
        });
    }

    return { passed, failed, total: TEST_CASES.length };
}

// Export for use
module.exports = { runTests, TEST_CASES };

// Run if called directly
if (require.main === module) {
    const results = runTests();
    process.exit(results.failed > 0 ? 1 : 0);
}
