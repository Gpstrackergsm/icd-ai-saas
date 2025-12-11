
import { parseCardiology, resolveCardiologyCodes, CARDIOLOGY_TEST_CASES } from './lib/domains/cardiology/module';

function runTests() {
    console.log('Running Cardiology Domain Tests...');
    console.log('-----------------------------------');

    let passed = 0;
    let failed = 0;

    CARDIOLOGY_TEST_CASES.forEach((testCase, index) => {
        const caseNum = index + 1;
        try {
            // 1. Parse
            const attrs = parseCardiology(testCase.narrative);

            // 2. Resolve
            const results = resolveCardiologyCodes(attrs);
            const generatedCodes = results.map(r => r.code);

            // 3. Compare (Set logic)
            const expectedSet = new Set(testCase.expectedCodes);
            const generatedSet = new Set(generatedCodes);

            // Check if ALL expected codes are present (we allow extra codes if reasonable? ideally exact match here)
            const missing = testCase.expectedCodes.filter(c => !generatedSet.has(c));
            const extra = generatedCodes.filter(c => !expectedSet.has(c));

            // For N18.3 vs N18.30 mismatch, strict check
            if (missing.length === 0 && extra.length === 0) {
                console.log(`✅ Case ${caseNum}: PASS`);
                passed++;
            } else {
                console.log(`❌ Case ${caseNum}: FAIL`);
                console.log(`   Input: "${testCase.narrative}"`);
                console.log(`   Expected: ${testCase.expectedCodes.join(', ')}`);
                console.log(`   Got:      ${generatedCodes.join(', ')}`);
                console.log(`   Missing:  ${missing.join(', ')}`);
                console.log(`   Extra:    ${extra.join(', ')}`);
                failed++;
            }

        } catch (err) {
            console.log(`❌ Case ${caseNum}: ERROR`, err);
            failed++;
        }
    });

    console.log('-----------------------------------');
    console.log(`Total: ${CARDIOLOGY_TEST_CASES.length}`);
    console.log(`Passed: ${passed}`);
    console.log(`Failed: ${failed}`);

    if (failed > 0) process.exit(1);
}

runTests();
