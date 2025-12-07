import { resolveDiabetes } from './lib/diabetesResolver';

const testCases = [
    { text: "Type 2 diabetes with neuropathy", expected: "E11.40" },
    { text: "Type 2 diabetes with bilateral neuropathy", expected: "E11.42" },
    { text: "Type 2 diabetes with neuropathy, stocking distribution", expected: "E11.42" },
    { text: "Type 2 diabetes with neuropathy and numbness", expected: "E11.42" },
    { text: "Type 2 diabetes with neuropathy and tingling", expected: "E11.42" },
    { text: "Type 2 diabetes with neuropathy and burning pain", expected: "E11.42" },
    { text: "Type 2 diabetes with neuropathy, abnormal monofilament test", expected: "E11.42" },
    { text: "Type 2 diabetes with neuropathy, decreased vibration sense", expected: "E11.42" },
    { text: "Type 2 diabetes with autonomic neuropathy", expected: "E11.43" }, // Should keep specific type if mentioned
    { text: "Type 2 diabetes with peripheral neuropathy", expected: "E11.42" }, // Explicit peripheral
];

let failed = false;

testCases.forEach((test, index) => {
    const result = resolveDiabetes(test.text);
    // Check primary code or secondary codes for the neuropathy code
    // The structure returns { code, secondary_codes... }
    // Either the primary code is the diabetes+neuropathy code (if not charcot which is a complication)
    // Or it's in secondary_codes.
    // In `diabetesResolver.ts`, `detectNeuropathyType` sets `attributes.complication = 'neuropathy'` and returns the code as primary if no higher priority complication exists.

    let actualCode = result?.code;

    // If result is not undefined and code matches expected, good.
    // Sometimes it might return multiple things.

    // Actually, resolveDiabetes returns one main code object.
    // If neuropathy is the complication, it returns e.g. E11.42 directly.

    const passed = actualCode === test.expected;
    console.log(`Case ${index + 1}: "${test.text}"`);
    console.log(`  Expected: ${test.expected}`);
    console.log(`  Actual:   ${actualCode}`);
    console.log(`  Result:   ${passed ? 'PASS' : 'FAIL'}`);
    console.log('---');

    if (!passed) failed = true;
});

if (failed) {
    console.log('SOME TESTS FAILED');
    process.exit(1);
} else {
    console.log('ALL TESTS PASSED');
    process.exit(0);
}
