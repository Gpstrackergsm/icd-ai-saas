/**
 * Direct UAE Rules Test - No Server Required
 * Tests the detection logic directly from the module
 */

const uaeRules = require('./lib/uae-market-rules.js');

const TEST_CASES = [
    {
        id: 1,
        name: "Rapid Strep Test",
        narrative: "Patient presents with sore throat and fever. Rapid strep test performed in clinic and returned positive for Group A Streptococcus.",
        expectedCode: "J02.0"
    },
    {
        id: 2,
        name: "I&D Right Index Finger",
        narrative: "Patient presents with painful swelling of the right index finger. Provider performed incision and drainage of an abscess.",
        expectedCode: "L02.511"
    },
    {
        id: 3,
        name: "Hemodialysis",
        narrative: "Patient underwent hemodialysis session today. Dialysis access functioning well.",
        expectedCode: "N18.6"
    },
    {
        id: 4,
        name: "Chest X-ray Pneumonia",
        narrative: "Chest X-ray shows right lower lobe consolidation consistent with pneumonia.",
        expectedCode: "J18.9"
    },
    {
        id: 5,
        name: "Blood Culture E. coli",
        narrative: "Blood cultures positive for E. coli. Patient treated with IV antibiotics.",
        expectedCode: "R78.81"  // Changed from A41.51 - sepsis requires explicit wording
    },
    {
        id: 6,
        name: "I&D Left Thigh",
        narrative: "Incision and drainage performed for left thigh abscess.",
        expectedCode: "L02.416"
    },
    {
        id: 7,
        name: "Hypertension Management",
        narrative: "Patient advised to continue hypertension medication. No assessment documented.",
        expectedCode: "I10"
    },
    {
        id: 8,
        name: "Diabetes + Insulin",
        narrative: "Patient on insulin therapy. Blood glucose monitored today.",
        expectedCode: "E11.9"
    },
    {
        id: 9,
        name: "COVID Rapid Test",
        narrative: "Rapid COVID-19 antigen test positive in clinic.",
        expectedCode: "U07.1"
    },
    {
        id: 10,
        name: "Negative Control",
        narrative: "Patient complains of headache. No tests, no procedures, no diagnosis documented.",
        expectedCode: null  // Should NOT trigger override
    }
];

console.log('\n' + '='.repeat(70));
console.log('UAE RULES - DIRECT TESTING (No Server Required)');
console.log('='.repeat(70) + '\n');

let passCount = 0;
let failCount = 0;

for (const testCase of TEST_CASES) {
    console.log(`\n${'─'.repeat(70)}`);
    console.log(`CASE ${testCase.id}: ${testCase.name}`);
    console.log(`${'─'.repeat(70)}`);
    console.log(`Narrative: ${testCase.narrative}`);
    console.log(`Expected Code: ${testCase.expectedCode || 'None (no override)'}`);

    // Test UAE market
    const uaeOverride = uaeRules.checkUAEOverride(testCase.narrative, 'UAE');

    if (uaeOverride) {
        console.log(`\n✅ UAE OVERRIDE TRIGGERED`);
        console.log(`   Diagnoses Found: ${uaeOverride.diagnoses.length}`);

        uaeOverride.diagnoses.forEach((diagnosis, index) => {
            console.log(`\n   [${index + 1}] ${diagnosis.code} - ${diagnosis.description}`);
            console.log(`       Reason: ${uaeOverride.reasons[index]}`);
        });

        // Check if matches expected
        const primaryCode = uaeOverride.diagnoses[0]?.code;
        if (primaryCode === testCase.expectedCode) {
            console.log(`\n✅ PASS: Got expected code ${testCase.expectedCode}`);
            passCount++;
        } else {
            console.log(`\n❌ FAIL: Expected ${testCase.expectedCode}, got ${primaryCode}`);
            failCount++;
        }

        // Check for duplicates
        const codes = uaeOverride.diagnoses.map(d => d.code);
        const uniqueCodes = [...new Set(codes)];
        if (codes.length !== uniqueCodes.length) {
            console.log(`\n⚠️  WARNING: Duplicate codes detected!`);
            console.log(`   Original: ${codes.join(', ')}`);
            console.log(`   Unique: ${uniqueCodes.join(', ')}`);
        } else if (codes.length > 1) {
            console.log(`\n✅ No duplicates (${codes.length} unique codes)`);
        }

    } else {
        console.log(`\n❌ NO UAE OVERRIDE`);
        if (testCase.expectedCode === null) {
            console.log(`✅ PASS: Correctly did NOT override (negative control)`);
            passCount++;
        } else {
            console.log(`❌ FAIL: Expected ${testCase.expectedCode} but no override triggered`);
            failCount++;
        }
    }

    // Test USA market (should always be null)
    const usaOverride = uaeRules.checkUAEOverride(testCase.narrative, 'USA');
    if (usaOverride) {
        console.log(`\n❌ ERROR: USA mode triggered UAE override (should be NULL)`);
    } else {
        console.log(`\n✅ USA mode: No override (correct)`);
    }
}

console.log('\n' + '='.repeat(70));
console.log(`SUMMARY: ${passCount} PASS, ${failCount} FAIL`);
console.log('='.repeat(70) + '\n');

process.exit(failCount > 0 ? 1 : 0);
