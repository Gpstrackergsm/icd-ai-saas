/**
 * UAE AUDIT CERTIFICATION SUITE
 * 
 * CRITICAL: Any single test failure BLOCKS DEPLOYMENT
 * 
 * This suite is the final authority for UAE code readiness.
 * 100 adversarial test cases covering:
 * - Negative cases (must AUTO_EXCLUDE)
 * - Positive UAE overrides (must AUTO_CODE)
 * - Adversarial edge cases
 * - Jurisdiction isolation (UAE vs USA)
 */

const { checkUAEOverride, ALLOWED_REASON_TYPES } = require('../lib/uae-market-rules.js');

// ============================================================================
// CERTIFICATION TEST CASES
// ============================================================================

const CERTIFICATION_TESTS = [
    // ========================================================================
    // SECTION A: NEGATIVE / REFUSAL TESTS (40 tests)
    // Must AUTO_EXCLUDE - no AUTO_CODE allowed
    // ========================================================================

    // A1-A10: Lab values only (NO AUTO_CODE)
    {
        id: 'A1',
        category: 'NEGATIVE_LAB',
        narrative: 'Troponin elevated at 2.5 ng/mL.',
        market: 'UAE',
        expected: { autoCode: false, reason: 'Lab value only - no explicit diagnosis' }
    },
    {
        id: 'A2',
        category: 'NEGATIVE_LAB',
        narrative: 'HbA1c 7.2%. Patient counseled on diet.',
        market: 'UAE',
        expected: { autoCode: false, reason: 'Lab value only' }
    },
    {
        id: 'A3',
        category: 'NEGATIVE_LAB',
        narrative: 'BNP 850 pg/mL. Repeat in 6 months.',
        market: 'UAE',
        expected: { autoCode: false, reason: 'Lab value only' }
    },
    {
        id: 'A4',
        category: 'NEGATIVE_LAB',
        narrative: 'TSH 8.5 mIU/L. Will monitor.',
        market: 'UAE',
        expected: { autoCode: false, reason: 'Lab value only' }
    },
    {
        id: 'A5',
        category: 'NEGATIVE_LAB',
        narrative: 'D-Dimer positive. Order CT angio.',
        market: 'UAE',
        expected: { autoCode: false, reason: 'Lab value only' }
    },
    {
        id: 'A6',
        category: 'NEGATIVE_LAB',
        narrative: 'Glucose 250 mg/dL fasting.',
        market: 'UAE',
        expected: { autoCode: false, reason: 'Lab value only' }
    },
    {
        id: 'A7',
        category: 'NEGATIVE_LAB',
        narrative: 'Creatinine 2.5 mg/dL.',
        market: 'UAE',
        expected: { autoCode: false, reason: 'Lab value only' }
    },
    {
        id: 'A8',
        category: 'NEGATIVE_LAB',
        narrative: 'WBC 15,000. Awaiting culture results.',
        market: 'UAE',
        expected: { autoCode: false, reason: 'Lab value only' }
    },
    {
        id: 'A9',
        category: 'NEGATIVE_LAB',
        narrative: 'Lipid panel: Total cholesterol 280 mg/dL.',
        market: 'UAE',
        expected: { autoCode: false, reason: 'Lab value only' }
    },
    {
        id: 'A10',
        category: 'NEGATIVE_LAB',
        narrative: 'PT/INR 3.5. Adjust warfarin.',
        market: 'UAE',
        expected: { autoCode: false, reason: 'Lab value only' }
    },

    // A11-A20: Imaging only (NO AUTO_CODE)
    {
        id: 'A11',
        category: 'NEGATIVE_IMAGING',
        narrative: 'CT chest shows infiltrate in right lower lobe.',
        market: 'UAE',
        expected: { autoCode: false, reason: 'Imaging only - no provider diagnosis' }
    },
    {
        id: 'A12',
        category: 'NEGATIVE_IMAGING',
        narrative: 'MRI brain reveals acute infarct.',
        market: 'UAE',
        expected: { autoCode: false, reason: 'Imaging only' }
    },
    {
        id: 'A13',
        category: 'NEGATIVE_IMAGING',
        narrative: 'X-ray shows fracture of distal radius.',
        market: 'UAE',
        expected: { autoCode: false, reason: 'Imaging only' }
    },
    {
        id: 'A14',
        category: 'NEGATIVE_IMAGING',
        narrative: 'Ultrasound demonstrates gallstones.',
        market: 'UAE',
        expected: { autoCode: false, reason: 'Imaging only' }
    },
    {
        id: 'A15',
        category: 'NEGATIVE_IMAGING',
        narrative: 'CT abdomen shows appendiceal inflammation.',
        market: 'UAE',
        expected: { autoCode: false, reason: 'Imaging only' }
    },
    {
        id: 'A16',
        category: 'NEGATIVE_IMAGING',
        narrative: 'Echocardiogram shows reduced EF 30%.',
        market: 'UAE',
        expected: { autoCode: false, reason: 'Imaging only' }
    },
    {
        id: 'A17',
        category: 'NEGATIVE_IMAGING',
        narrative: 'Mammogram: BIRADS 4 lesion.',
        market: 'UAE',
        expected: { autoCode: false, reason: 'Imaging only' }
    },
    {
        id: 'A18',
        category: 'NEGATIVE_IMAGING',
        narrative: 'MRI spine shows disc herniation L4-L5.',
        market: 'UAE',
        expected: { autoCode: false, reason: 'Imaging only' }
    },
    {
        id: 'A19',
        category: 'NEGATIVE_IMAGING',
        narrative: 'Doppler ultrasound: DVT in left leg.',
        market: 'UAE',
        expected: { autoCode: false, reason: 'Imaging only' }
    },
    {
        id: 'A20',
        category: 'NEGATIVE_IMAGING',
        narrative: 'PET scan shows hypermetabolic lesion.',
        market: 'UAE',
        expected: { autoCode: false, reason: 'Imaging only' }
    },

    // A21-A30: Medications only (NO AUTO_CODE)
    {
        id: 'A21',
        category: 'NEGATIVE_MEDICATION',
        narrative: 'Continue metformin 500mg twice daily.',
        market: 'UAE',
        expected: { autoCode: false, reason: 'Medication only - no diagnosis' }
    },
    {
        id: 'A22',
        category: 'NEGATIVE_MEDICATION',
        narrative: 'Start lisinopril 10mg daily.',
        market: 'UAE',
        expected: { autoCode: false, reason: 'Medication only' }
    },
    {
        id: 'A23',
        category: 'NEGATIVE_MEDICATION',
        narrative: 'Patient on insulin glargine 20 units at bedtime.',
        market: 'UAE',
        expected: { autoCode: false, reason: 'Medication only' }
    },
    {
        id: 'A24',
        category: 'NEGATIVE_MEDICATION',
        narrative: 'Prescribed atorvastatin 40mg nightly.',
        market: 'UAE',
        expected: { autoCode: false, reason: 'Medication only' }
    },
    {
        id: 'A25',
        category: 'NEGATIVE_MEDICATION',
        narrative: 'Warfarin 5mg daily. INR stable.',
        market: 'UAE',
        expected: { autoCode: false, reason: 'Medication only' }
    },
    {
        id: 'A26',
        category: 'NEGATIVE_MEDICATION',
        narrative: 'Albuterol inhaler 2 puffs PRN.',
        market: 'UAE',
        expected: { autoCode: false, reason: 'Medication only' }
    },
    {
        id: 'A27',
        category: 'NEGATIVE_MEDICATION',
        narrative: 'Levothyroxine 75mcg once daily.',
        market: 'UAE',
        expected: { autoCode: false, reason: 'Medication only' }
    },
    {
        id: 'A28',
        category: 'NEGATIVE_MEDICATION',
        narrative: 'Sertraline 50mg for mood.',
        market: 'UAE',
        expected: { autoCode: false, reason: 'Medication only' }
    },
    {
        id: 'A29',
        category: 'NEGATIVE_MEDICATION',
        narrative: 'Omeprazole 20mg before meals.',
        market: 'UAE',
        expected: { autoCode: false, reason: 'Medication only' }
    },
    {
        id: 'A30',
        category: 'NEGATIVE_MEDICATION',
        narrative: 'Alendronate 70mg weekly.',
        market: 'UAE',
        expected: { autoCode: false, reason: 'Medication only' }
    },

    // A31-A40: Vitals/Procedures without approved implication
    {
        id: 'A31',
        category: 'NEGATIVE_VITAL',
        narrative: 'BP 160/95. Will recheck next visit.',
        market: 'UAE',
        expected: { autoCode: false, reason: 'Vital sign only' }
    },
    {
        id: 'A32',
        category: 'NEGATIVE_VITAL',
        narrative: 'O2 saturation 88% on room air.',
        market: 'UAE',
        expected: { autoCode: false, reason: 'Vital sign only' }
    },
    {
        id: 'A33',
        category: 'NEGATIVE_VITAL',
        narrative: 'Temperature 38.9°C. Tylenol given.',
        market: 'UAE',
        expected: { autoCode: false, reason: 'Vital sign only' }
    },
    {
        id: 'A34',
        category: 'NEGATIVE_VITAL',
        narrative: 'Heart rate 120 bpm. Monitor.',
        market: 'UAE',
        expected: { autoCode: false, reason: 'Vital sign only' }
    },
    {
        id: 'A35',
        category: 'NEGATIVE_PROCEDURE',
        narrative: 'Colonoscopy performed. No abnormalities noted.',
        market: 'UAE',
        expected: { autoCode: false, reason: 'Procedure without approved implication' }
    },
    {
        id: 'A36',
        category: 'NEGATIVE_PROCEDURE',
        narrative: 'EGD completed. Stomach appears normal.',
        market: 'UAE',
        expected: { autoCode: false, reason: 'Procedure without approved implication' }
    },
    {
        id: 'A37',
        category: 'NEGATIVE_PROCEDURE',
        narrative: 'Joint injection given to right knee.',
        market: 'UAE',
        expected: { autoCode: false, reason: 'Procedure without approved implication' }
    },
    {
        id: 'A38',
        category: 'NEGATIVE_PROCEDURE',
        narrative: 'Chest tube inserted.',
        market: 'UAE',
        expected: { autoCode: false, reason: 'Procedure without approved implication' }
    },
    {
        id: 'A39',
        category: 'NEGATIVE_PROCEDURE',
        narrative: 'Thoracentesis performed, 500ml removed.',
        market: 'UAE',
        expected: { autoCode: false, reason: 'Procedure without approved implication' }
    },
    {
        id: 'A40',
        category: 'NEGATIVE_PROCEDURE',
        narrative: 'Paracentesis done. Fluid sent for analysis.',
        market: 'UAE',
        expected: { autoCode: false, reason: 'Procedure without approved implication' }
    },

    // ========================================================================
    // SECTION B: POSITIVE / ALLOWED UAE OVERRIDES (30 tests)
    // Must AUTO_CODE with correct reasonType
    // ========================================================================

    // B1-B10: Diagnostic tests (positive, with context)
    {
        id: 'B1',
        category: 'POSITIVE_TEST',
        narrative: 'Sore throat. Rapid strep test positive.',
        market: 'UAE',
        expected: {
            autoCode: true,
            code: 'J02.0',
            reasonType: 'POSITIVE_NAMED_DIAGNOSTIC_TEST'
        }
    },
    {
        id: 'B2',
        category: 'POSITIVE_TEST',
        narrative: 'Fever. COVID PCR came back positive.',
        market: 'UAE',
        expected: {
            autoCode: true,
            code: 'U07.1',
            reasonType: 'POSITIVE_NAMED_DIAGNOSTIC_TEST'
        }
    },
    {
        id: 'B3',
        category: 'POSITIVE_TEST',
        narrative: 'Positive COVID rapid antigen test.',
        market: 'UAE',
        expected: {
            autoCode: true,
            code: 'U07.1',
            reasonType: 'POSITIVE_NAMED_DIAGNOSTIC_TEST'
        }
    },
    {
        id: 'B4',
        category: 'POSITIVE_TEST',
        narrative: 'Pharyngitis. Group A strep positive.',
        market: 'UAE',
        expected: {
            autoCode: true,
            code: 'J02.0',
            reasonType: 'POSITIVE_NAMED_DIAGNOSTIC_TEST'
        }
    },
    {
        id: 'B5',
        category: 'POSITIVE_TEST',
        narrative: 'Blood culture positive for E. coli.',
        market: 'UAE',
        expected: {
            autoCode: true,
            code: 'R78.81',
            reasonType: 'POSITIVE_NAMED_DIAGNOSTIC_TEST'
        }
    },
    {
        id: 'B6',
        category: 'POSITIVE_TEST',
        narrative: 'Sepsis. Blood culture grew E. coli.',
        market: 'UAE',
        expected: {
            autoCode: true,
            code: 'A41.51',
            reasonType: 'POSITIVE_NAMED_DIAGNOSTIC_TEST'
        }
    },
    {
        id: 'B7',
        category: 'POSITIVE_TEST',
        narrative: 'Respiratory symptoms. COVID-19 detected by PCR.',
        market: 'UAE',
        expected: {
            autoCode: true,
            code: 'U07.1',
            reasonType: 'POSITIVE_NAMED_DIAGNOSTIC_TEST'
        }
    },
    {
        id: 'B8',
        category: 'POSITIVE_TEST',
        narrative: 'Tonsillar exudate. Rapid strep positive result.',
        market: 'UAE',
        expected: {
            autoCode: true,
            code: 'J02.0',
            reasonType: 'POSITIVE_NAMED_DIAGNOSTIC_TEST'
        }
    },
    {
        id: 'B9',
        category: 'POSITIVE_TEST',
        narrative: 'SARS-CoV-2 detected on PCR testing.',
        market: 'UAE',
        expected: {
            autoCode: true,
            code: 'U07.1',
            reasonType: 'POSITIVE_NAMED_DIAGNOSTIC_TEST'
        }
    },
    {
        id: 'B10',
        category: 'POSITIVE_TEST',
        narrative: 'Positive rapid COVID antigen test performed today.',
        market: 'UAE',
        expected: {
            autoCode: true,
            code: 'U07.1',
            reasonType: 'POSITIVE_NAMED_DIAGNOSTIC_TEST'
        }
    },

    // B11-B20: Approved procedures
    {
        id: 'B11',
        category: 'POSITIVE_PROCEDURE',
        narrative: 'Incision and drainage of right hand abscess performed.',
        market: 'UAE',
        expected: {
            autoCode: true,
            code: 'L02.511',
            reasonType: 'APPROVED_PROCEDURE_IMPLIED_DX'
        }
    },
    {
        id: 'B12',
        category: 'POSITIVE_PROCEDURE',
        narrative: 'I&D of left index finger.',
        market: 'UAE',
        expected: {
            autoCode: true,
            code: 'L02.512',
            reasonType: 'APPROVED_PROCEDURE_IMPLIED_DX'
        }
    },
    {
        id: 'B13',
        category: 'POSITIVE_PROCEDURE',
        narrative: 'Hemodialysis session completed.',
        market: 'UAE',
        expected: {
            autoCode: true,
            code: 'N18.6',
            reasonType: 'APPROVED_PROCEDURE_IMPLIED_DX'
        }
    },
    {
        id: 'B14',
        category: 'POSITIVE_PROCEDURE',
        narrative: 'Patient received peritoneal dialysis.',
        market: 'UAE',
        expected: {
            autoCode: true,
            code: 'N18.6',
            reasonType: 'APPROVED_PROCEDURE_IMPLIED_DX'
        }
    },
    {
        id: 'B15',
        category: 'POSITIVE_PROCEDURE',
        narrative: 'Drainage of abscess on buttock performed.',
        market: 'UAE',
        expected: {
            autoCode: true,
            code: 'L02.31',
            reasonType: 'APPROVED_PROCEDURE_IMPLIED_DX'
        }
    },
    {
        id: 'B16',
        category: 'POSITIVE_PROCEDURE',
        narrative: 'I&D of facial abscess completed.',
        market: 'UAE',
        expected: {
            autoCode: true,
            code: 'L02.01',
            reasonType: 'APPROVED_PROCEDURE_IMPLIED_DX'
        }
    },
    {
        id: 'B17',
        category: 'POSITIVE_PROCEDURE',
        narrative: 'Dialysis performed for renal failure.',
        market: 'UAE',
        expected: {
            autoCode: true,
            code: 'N18.6',
            reasonType: 'APPROVED_PROCEDURE_IMPLIED_DX'
        }
    },
    {
        id: 'B18',
        category: 'POSITIVE_PROCEDURE',
        narrative: 'Incision and drainage of neck abscess.',
        market: 'UAE',
        expected: {
            autoCode: true,
            code: 'L02.11',
            reasonType: 'APPROVED_PROCEDURE_IMPLIED_DX'
        }
    },
    {
        id: 'B19',
        category: 'POSITIVE_PROCEDURE',
        narrative: 'I&D right thigh abscess performed.',
        market: 'UAE',
        expected: {
            autoCode: true,
            code: 'L02.416',
            reasonType: 'APPROVED_PROCEDURE_IMPLIED_DX'
        }
    },
    {
        id: 'B20',
        category: 'POSITIVE_PROCEDURE',
        narrative: 'Hemodialysis session for ESRD.',
        market: 'UAE',
        expected: {
            autoCode: true,
            code: 'N18.6',
            reasonType: 'APPROVED_PROCEDURE_IMPLIED_DX'
        }
    },

    // B21-B30: Mixed valid scenarios
    {
        id: 'B21',
        category: 'POSITIVE_MIXED',
        narrative: 'Rapid strep positive. Started antibiotics.',
        market: 'UAE',
        expected: {
            autoCode: true,
            code: 'J02.0',
            reasonType: 'POSITIVE_NAMED_DIAGNOSTIC_TEST'
        }
    },
    {
        id: 'B22',
        category: 'POSITIVE_MIXED',
        narrative: 'COVID PCR positive. Patient isolated.',
        market: 'UAE',
        expected: {
            autoCode: true,
            code: 'U07.1',
            reasonType: 'POSITIVE_NAMED_DIAGNOSTIC_TEST'
        }
    },
    {
        id: 'B23',
        category: 'POSITIVE_MIXED',
        narrative: 'I&D performed on right hand. Wound care instructions given.',
        market: 'UAE',
        expected: {
            autoCode: true,
            code: 'L02.511',
            reasonType: 'APPROVED_PROCEDURE_IMPLIED_DX'
        }
    },
    {
        id: 'B24',
        category: 'POSITIVE_MIXED',
        narrative: 'Dialysis session. Patient tolerated well.',
        market: 'UAE',
        expected: {
            autoCode: true,
            code: 'N18.6',
            reasonType: 'APPROVED_PROCEDURE_IMPLIED_DX'
        }
    },
    {
        id: 'B25',
        category: 'POSITIVE_MIXED',
        narrative: 'Group A strep positive. Penicillin prescribed.',
        market: 'UAE',
        expected: {
            autoCode: true,
            code: 'J02.0',
            reasonType: 'POSITIVE_NAMED_DIAGNOSTIC_TEST'
        }
    },
    {
        id: 'B26',
        category: 'POSITIVE_MIXED',
        narrative: 'Blood culture E. coli positive. No sepsis documented.',
        market: 'UAE',
        expected: {
            autoCode: true,
            code: 'R78.81',
            reasonType: 'POSITIVE_NAMED_DIAGNOSTIC_TEST'
        }
    },
    {
        id: 'B27',
        category: 'POSITIVE_MIXED',
        narrative: 'Septic patient. Blood culture grew E. coli.',
        market: 'UAE',
        expected: {
            autoCode: true,
            code: 'A41.51',
            reasonType: 'POSITIVE_NAMED_DIAGNOSTIC_TEST'
        }
    },
    {
        id: 'B28',
        category: 'POSITIVE_MIXED',
        narrative: 'COVID rapid antigen positive. Symptomatic.',
        market: 'UAE',
        expected: {
            autoCode: true,
            code: 'U07.1',
            reasonType: 'POSITIVE_NAMED_DIAGNOSTIC_TEST'
        }
    },
    {
        id: 'B29',
        category: 'POSITIVE_MIXED',
        narrative: 'Incision and drainage of left hand abscess performed.',
        market: 'UAE',
        expected: {
            autoCode: true,
            code: 'L02.512',
            reasonType: 'APPROVED_PROCEDURE_IMPLIED_DX'
        }
    },
    {
        id: 'B30',
        category: 'POSITIVE_MIXED',
        narrative: 'Hemodialysis performed. Next session Friday.',
        market: 'UAE',
        expected: {
            autoCode: true,
            code: 'N18.6',
            reasonType: 'APPROVED_PROCEDURE_IMPLIED_DX'
        }
    },

    // ========================================================================
    // SECTION C: ADVERSARIAL EDGE CASES (20 tests)
    // Designed to trick naive inference
    // ========================================================================

    // C1-C10: Conflicting signals
    {
        id: 'C1',
        category: 'ADVERSARIAL',
        narrative: 'Rapid strep negative. Symptomatic treatment.',
        market: 'UAE',
        expected: { autoCode: false, reason: 'Test negative - no AUTO_CODE' }
    },
    {
        id: 'C2',
        category: 'ADVERSARIAL',
        narrative: 'COVID PCR not detected.',
        market: 'UAE',
        expected: { autoCode: false, reason: 'Test negative' }
    },
    {
        id: 'C3',
        category: 'ADVERSARIAL',
        narrative: 'Rapid strep test was negative. Viral pharyngitis suspected.',
        market: 'UAE',
        expected: { autoCode: false, reason: 'Test negative + suspected diagnosis' }
    },
    {
        id: 'C4',
        category: 'ADVERSARIAL',
        narrative: 'Rule out COVID. PCR pending.',
        market: 'UAE',
        expected: { autoCode: false, reason: 'Rule out + pending test' }
    },
    {
        id: 'C5',
        category: 'ADVERSARIAL',
        narrative: 'Blood culture shows no growth.',
        market: 'UAE',
        expected: { autoCode: false, reason: 'Negative culture' }
    },
    {
        id: 'C6',
        category: 'ADVERSARIAL',
        narrative: 'Possible strep throat. Test not performed.',
        market: 'UAE',
        expected: { autoCode: false, reason: 'Possible diagnosis without test' }
    },
    {
        id: 'C7',
        category: 'ADVERSARIAL',
        narrative: 'COVID exposure. Awaiting test results.',
        market: 'UAE',
        expected: { autoCode: false, reason: 'Exposure only, no positive test' }
    },
    {
        id: 'C8',
        category: 'ADVERSARIAL',
        narrative: 'History of ESRD. No dialysis today.',
        market: 'UAE',
        expected: { autoCode: false, reason: 'History mentioned, procedure not performed' }
    },
    {
        id: 'C9',
        category: 'ADVERSARIAL',
        narrative: 'I&D recommended but patient declined.',
        market: 'UAE',
        expected: { autoCode: false, reason: 'Procedure recommended but not performed' }
    },
    {
        id: 'C10',
        category: 'ADVERSARIAL',
        narrative: 'Rapid strep positive last week. Currently improved.',
        market: 'UAE',
        expected: { autoCode: false, reason: 'Historical test, not current encounter' }
    },

    // C11-C20: Ambiguous wording
    {
        id: 'C11',
        category: 'ADVERSARIAL',
        narrative: 'Likely strep pharyngitis based on exam.',
        market: 'UAE',
        expected: { autoCode: false, reason: 'Likely diagnosis without test' }
    },
    {
        id: 'C12',
        category: 'ADVERSARIAL',
        narrative: 'Clinical diagnosis of COVID-19.',
        market: 'UAE',
        expected: { autoCode: false, reason: 'Clinical diagnosis without explicit positive test' }
    },
    {
        id: 'C13',
        category: 'ADVERSARIAL',
        narrative: 'Probable bacteremia. Cultures sent.',
        market: 'UAE',
        expected: { autoCode: false, reason: 'Probable + cultures pending' }
    },
    {
        id: 'C14',
        category: 'ADVERSARIAL',
        narrative: 'Suspected abscess. Consider I&D.',
        market: 'UAE',
        expected: { autoCode: false, reason: 'Suspected + procedure not performed' }
    },
    {
        id: 'C15',
        category: 'ADVERSARIAL',
        narrative: 'Query streptococcal infection.',
        market: 'UAE',
        expected: { autoCode: false, reason: 'Query diagnosis' }
    },
    {
        id: 'C16',
        category: 'ADVERSARIAL',
        narrative: 'Consistent with viral URI. COVID ruled out.',
        market: 'UAE',
        expected: { autoCode: false, reason: 'COVID ruled out' }
    },
    {
        id: 'C17',
        category: 'ADVERSARIAL',
        narrative: 'Abscess drained spontaneously. No procedure needed.',
        market: 'UAE',
        expected: { autoCode: false, reason: 'Spontaneous drainage, no I&D performed' }
    },
    {
        id: 'C18',
        category: 'ADVERSARIAL',
        narrative: 'Patient refused rapid strep test.',
        market: 'UAE',
        expected: { autoCode: false, reason: 'Test refused' }
    },
    {
        id: 'C19',
        category: 'ADVERSARIAL',
        narrative: 'Previous positive COVID. Currently recovered.',
        market: 'UAE',
        expected: { autoCode: false, reason: 'Historical positive, not current' }
    },
    {
        id: 'C20',
        category: 'ADVERSARIAL',
        narrative: 'Dialysis scheduled for next week.',
        market: 'UAE',
        expected: { autoCode: false, reason: 'Scheduled, not performed' }
    },

    // ========================================================================
    // SECTION D: JURISDICTION ISOLATION (10 tests)
    // Same narrative, different market
    // ========================================================================

    {
        id: 'D1_UAE',
        category: 'JURISDICTION_UAE',
        narrative: 'Rapid strep test positive.',
        market: 'UAE',
        expected: {
            autoCode: true,
            code: 'J02.0',
            reasonType: 'POSITIVE_NAMED_DIAGNOSTIC_TEST'
        }
    },
    {
        id: 'D1_USA',
        category: 'JURISDICTION_USA',
        narrative: 'Rapid strep test positive.',
        market: 'USA',
        expected: { autoCode: false, reason: 'USA mode - different rules' }
    },
    {
        id: 'D2_UAE',
        category: 'JURISDICTION_UAE',
        narrative: 'COVID PCR positive.',
        market: 'UAE',
        expected: {
            autoCode: true,
            code: 'U07.1',
            reasonType: 'POSITIVE_NAMED_DIAGNOSTIC_TEST'
        }
    },
    {
        id: 'D2_USA',
        category: 'JURISDICTION_USA',
        narrative: 'COVID PCR positive.',
        market: 'USA',
        expected: { autoCode: false, reason: 'USA mode' }
    },
    {
        id: 'D3_UAE',
        category: 'JURISDICTION_UAE',
        narrative: 'I&D right hand performed.',
        market: 'UAE',
        expected: {
            autoCode: true,
            code: 'L02.511',
            reasonType: 'APPROVED_PROCEDURE_IMPLIED_DX'
        }
    },
    {
        id: 'D3_USA',
        category: 'JURISDICTION_USA',
        narrative: 'I&D right hand performed.',
        market: 'USA',
        expected: { autoCode: false, reason: 'USA mode' }
    },
    {
        id: 'D4_UAE',
        category: 'JURISDICTION_UAE',
        narrative: 'Hemodialysis session.',
        market: 'UAE',
        expected: {
            autoCode: true,
            code: 'N18.6',
            reasonType: 'APPROVED_PROCEDURE_IMPLIED_DX'
        }
    },
    {
        id: 'D4_USA',
        category: 'JURISDICTION_USA',
        narrative: 'Hemodialysis session.',
        market: 'USA',
        expected: { autoCode: false, reason: 'USA mode' }
    },
    {
        id: 'D5_UAE',
        category: 'JURISDICTION_UAE',
        narrative: 'Blood culture E. coli positive. Sepsis.',
        market: 'UAE',
        expected: {
            autoCode: true,
            code: 'A41.51',
            reasonType: 'POSITIVE_NAMED_DIAGNOSTIC_TEST'
        }
    },
    {
        id: 'D5_USA',
        category: 'JURISDICTION_USA',
        narrative: 'Blood culture E. coli positive. Sepsis.',
        market: 'USA',
        expected: { autoCode: false, reason: 'USA mode' }
    }
];

// ============================================================================
// TEST EXECUTION FRAMEWORK
// ============================================================================

function runCertificationSuite() {
    console.log('╔═══════════════════════════════════════════════════════════════╗');
    console.log('║     UAE AUDIT CERTIFICATION SUITE                              ║');
    console.log('║     ANY FAILURE BLOCKS DEPLOYMENT                              ║');
    console.log('╚═══════════════════════════════════════════════════════════════╝\n');

    let passed = 0;
    let failed = 0;
    const failures = [];

    CERTIFICATION_TESTS.forEach(test => {
        const result = checkUAEOverride(test.narrative, test.market);
        const shouldAutoCode = result && result.shouldOverride;

        let testPassed = false;
        let failureReason = '';

        // Check AUTO_CODE expectation
        if (shouldAutoCode === test.expected.autoCode) {
            testPassed = true; // Initial pass
        } else {
            testPassed = false;
            failureReason = `Expected ${test.expected.autoCode ? 'AUTO_CODE' : 'AUTO_EXCLUDE'}, got ${shouldAutoCode ? 'AUTO_CODE' : 'AUTO_EXCLUDE'}`;
        }

        // If should AUTO_CODE, verify code and reasonType
        if (test.expected.autoCode && testPassed && shouldAutoCode) {
            // Check code
            if (test.expected.code) {
                const hasCode = result.diagnoses.some(d => d.code === test.expected.code);
                if (!hasCode) {
                    testPassed = false;
                    failureReason = `Expected code ${test.expected.code}, got ${result.diagnoses[0]?.code}`;
                }
            }

            // Check reasonType
            if (test.expected.reasonType && testPassed) {
                const hasReasonType = result.diagnoses.some(d => d.reasonType === test.expected.reasonType);
                if (!hasReasonType) {
                    testPassed = false;
                    failureReason = `Expected reasonType ${test.expected.reasonType}, got ${result.diagnoses[0]?.reasonType}`;
                }
            }

            // Verify reasonType is in allowed list
            if (testPassed) {
                const reasonType = result.diagnoses[0]?.reasonType;
                if (!Object.values(ALLOWED_REASON_TYPES).includes(reasonType)) {
                    testPassed = false;
                    failureReason = `Invalid reasonType: ${reasonType}`;
                }
            }

            // Verify audit trail exists
            if (testPassed && !result.diagnoses[0]?.auditTrailText) {
                testPassed = false;
                failureReason = 'Missing audit trail text';
            }
        }

        if (testPassed) {
            passed++;
            console.log(`✅ ${test.id} [${test.category}]`);
        } else {
            failed++;
            failures.push({
                id: test.id,
                category: test.category,
                narrative: test.narrative,
                market: test.market,
                reason: failureReason
            });
            console.log(`❌ ${test.id} [${test.category}] - ${failureReason}`);
        }
    });

    console.log('\n╔═══════════════════════════════════════════════════════════════╗');
    console.log(`║ RESULTS: ${passed}/${CERTIFICATION_TESTS.length} PASSED                                      ║`);
    console.log(`║ FAILED: ${failed}                                                       ║`);
    console.log('╚═══════════════════════════════════════════════════════════════╝\n');

    if (failures.length > 0) {
        console.log('╔═══════════════════════════════════════════════════════════════╗');
        console.log('║ FAILURES - DEPLOYMENT BLOCKED                                  ║');
        console.log('╚═══════════════════════════════════════════════════════════════╝\n');
        failures.forEach(f => {
            console.log(`Test ${f.id} [${f.category}]`);
            console.log(`  Market: ${f.market}`);
            console.log(`  Narrative: "${f.narrative}"`);
            console.log(`  Failure: ${f.reason}\n`);
        });

        console.log('╔═══════════════════════════════════════════════════════════════╗');
        console.log('║ ❌ CERTIFICATION FAILED - DEPLOYMENT BLOCKED                   ║');
        console.log('╚═══════════════════════════════════════════════════════════════╝\n');
        process.exit(1); // NON-ZERO EXIT - BLOCK DEPLOYMENT
    }

    console.log('╔═══════════════════════════════════════════════════════════════╗');
    console.log('║ ✅ CERTIFICATION PASSED - DEPLOYMENT ALLOWED                   ║');
    console.log('╚═══════════════════════════════════════════════════════════════╝\n');
    return { passed, failed, total: CERTIFICATION_TESTS.length };
}

if (require.main === module) {
    runCertificationSuite();
}

module.exports = { runCertificationSuite, CERTIFICATION_TESTS };
