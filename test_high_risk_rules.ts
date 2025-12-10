
import { highRiskRules } from './lib/validation/highRiskRules';
import { SequencedCode } from './lib/rulesEngine';

interface TestCase {
    name: string;
    codes: SequencedCode[];
    context?: any;
    expectError?: string; // Rule ID expected to fail/warn
    expectValid?: boolean;
}

const createCode = (code: string, label = 'Test'): SequencedCode => ({
    code,
    label,
    triggeredBy: 'test',
    hcc: false
});

const testCases: TestCase[] = [
    // 1. EXT-001
    {
        name: 'EXT-001 Fail: External Cause Principal',
        codes: [createCode('W19.xxxA'), createCode('S72.001A')],
        expectError: 'EXT-001',
        expectValid: false
    },
    {
        name: 'EXT-001 Pass: External Cause Secondary',
        codes: [createCode('S72.001A'), createCode('W19.xxxA')],
        expectValid: true
    },

    // 2. EXT-002
    {
        name: 'EXT-002 Fail: Y92 with Subsequent Injury',
        codes: [createCode('S91.301D'), createCode('Y92.01')], // D is subsequent
        expectError: 'EXT-002',
        expectValid: false
    },
    {
        name: 'EXT-002 Pass: Y92 with Initial Injury',
        codes: [createCode('S91.301A'), createCode('Y92.01')],
        expectValid: true
    },

    // 3. SEP-001
    {
        name: 'SEP-001 Fail: Severe Sepsis Principal',
        codes: [createCode('R65.21'), createCode('A41.9')],
        expectError: 'SEP-001',
        expectValid: false
    },
    {
        name: 'SEP-001 Pass: Sepsis Principal',
        codes: [createCode('A41.9'), createCode('R65.21')],
        expectValid: true
    },

    // 4. SEP-002
    {
        name: 'SEP-002 Fail: Urosepsis w/o Sepsis code',
        context: { text: 'Patient admitted with Urosepsis' },
        codes: [createCode('N39.0')],
        expectError: 'SEP-002',
        expectValid: false
    },
    {
        name: 'SEP-002 Pass: Urosepsis w/ Sepsis code',
        context: { text: 'Patient admitted with Urosepsis' },
        codes: [createCode('A41.9'), createCode('N39.0')],
        expectValid: true
    },

    // 5. DM-001
    {
        name: 'DM-001 Fail: E11.9 + N18',
        codes: [createCode('E11.9'), createCode('N18.30')],
        expectError: 'DM-001',
        expectValid: false
    },
    {
        name: 'DM-001 Pass: E11.22 + N18',
        codes: [createCode('E11.22'), createCode('N18.30')],
        expectValid: true
    },

    // 6. DM-002
    {
        name: 'DM-002 Fail: Type 1 + Type 2',
        codes: [createCode('E10.9'), createCode('E11.22')],
        expectError: 'DM-002',
        expectValid: false
    },

    // 7. CKD-001
    {
        name: 'CKD-001 Fail: I10 + N18',
        codes: [createCode('I10'), createCode('N18.3')],
        expectError: 'CKD-001',
        expectValid: false
    },
    {
        name: 'CKD-001 Pass: I12.9 + N18',
        codes: [createCode('I12.9'), createCode('N18.3')],
        expectValid: true
    },

    // 8. CKD-002
    {
        name: 'CKD-002 Fail: I10 + I50 + N18',
        codes: [createCode('I10'), createCode('I50.9'), createCode('N18.9')],
        expectError: 'CKD-002',
        expectValid: false
    },
    {
        name: 'CKD-002 Pass: I13.0 + I50 + N18',
        codes: [createCode('I13.0'), createCode('I50.9'), createCode('N18.9')],
        expectValid: true
    },

    // 9. PREG-001
    {
        name: 'PREG-001 Fail: Unspecified Trimester',
        codes: [createCode('O14.00')],
        expectError: 'PREG-001',
        expectValid: false
    },
    {
        name: 'PREG-001 Pass: Specified Trimester',
        codes: [createCode('O14.03')],
        expectValid: true
    },

    // 10. PREG-002
    {
        name: 'PREG-002 Fail: O80 + Complication',
        codes: [createCode('O80'), createCode('O70.0'), createCode('Z37.0')],
        expectError: 'PREG-002',
        expectValid: false
    },
    {
        name: 'PREG-002 Pass: O70.0 + Z37.0',
        codes: [createCode('O70.0'), createCode('Z37.0')],
        expectValid: true
    },

    // 11. SEQ-001
    {
        name: 'SEQ-001 Fail: Manifestation Principal',
        codes: [createCode('F02.80'), createCode('G30.9')],
        expectError: 'SEQ-001',
        expectValid: false
    },

    // 12. LAT-001
    {
        name: 'LAT-001 Fail: Unspecified Side Fracture',
        codes: [createCode('S82.809A', 'Fracture of unspecified part of unspecified lower leg')],
        expectError: 'LAT-001',
        expectValid: false
    },
    {
        name: 'LAT-001 Pass: Right Side Fracture',
        codes: [createCode('S82.801A', 'Fracture of unspecified part of right lower leg')],
        expectValid: true
    },

    // 13. INJ-001
    {
        name: 'INJ-001 Fail: Active Code in Aftercare',
        context: { text: 'Cast removal follow-up', isAftercare: true }, // Logic in rule might use text search if context flag logic not fully plumbed, we added text search fallback
        codes: [createCode('S52.501A')],
        expectError: 'INJ-001',
        expectValid: false
    },

    // 14. NEO-001
    {
        name: 'NEO-001 Fail: Secondary w/o Primary',
        codes: [createCode('C79.31')],
        expectError: 'NEO-001',
        expectValid: false
    },
    {
        name: 'NEO-001 Pass: Secondary w/ Primary',
        codes: [createCode('C79.31'), createCode('C34.90')],
        expectValid: true
    },

    // 15. OB-002
    {
        name: 'OB-002 Fail: Delivery w/o Z37',
        codes: [createCode('O80')],
        expectError: 'OB-002',
        expectValid: false
    },
    {
        name: 'OB-002 Pass: Delivery w/ Z37',
        codes: [createCode('O80'), createCode('Z37.0')],
        expectValid: true
    },
];

console.log(`Running ${testCases.length} Test Scenarios for High-Risk Validation Rules...\n`);

let passedCount = 0;
let failedCount = 0;

testCases.forEach(test => {
    let triggered = false;
    let ruleId = '';

    highRiskRules.forEach(rule => {
        const result = rule(test.codes, test.context);
        if (result) {
            triggered = true;
            ruleId = result.ruleId;
        }
    });

    const passed = (test.expectValid && !triggered) || (!test.expectValid && triggered && ruleId === test.expectError);

    if (passed) {
        console.log(`PASS: ${test.name}`);
        passedCount++;
    } else {
        console.log(`FAIL: ${test.name}`);
        console.log(` - Expected Valid: ${test.expectValid}`);
        console.log(` - Triggered: ${triggered} ${triggered ? '(' + ruleId + ')' : ''}`);
        failedCount++;
    }
});

console.log(`\nSummary: ${passedCount}/${testCases.length} Passed.`);
if (failedCount > 0) {
    console.error(`${failedCount} tests failed.`);
    process.exit(1);
}
