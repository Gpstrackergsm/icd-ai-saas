
import { parseInput } from './lib/structured/parser';
import { runStructuredRules } from './lib/structured/engine';

const cases = [
    {
        name: "Case 1: Asthma Negation (Original Bug)",
        input: `
Asthma: No
COPD: None
Pneumonia: No
`
    },
    {
        name: "Case 2: Pneumonia Negation (Proactive Fix)",
        input: `
Pneumonia: No
Asthma: None
`
    },
    {
        name: "Case 3: Positive Asthma (Mild/Intermittent)",
        input: `
Asthma: Yes
Severity: Mild Intermittent
Status: Uncomplicated
`
    },
    {
        name: "Case 4: Positive Pneumonia (Unspecified)",
        input: `
Pneumonia: Yes
Organism: Unspecified
`
    },
    {
        name: "Case 5: Mixed Case (COPD Yes, Asthma No)",
        input: `
COPD: Yes
Asthma: No
Pneumonia: No
`
    }
];

console.log("Running 5 Verification Cases...\n");

cases.forEach(testCase => {
    console.log(`--- ${testCase.name} ---`);
    console.log(`Input:\n${testCase.input.trim()}`);

    try {
        const { context } = parseInput(testCase.input);
        const result = runStructuredRules(context);

        const codes = [...(result.primary ? [result.primary.code] : []), ...result.secondary.map(c => c.code)];
        console.log("Generated Codes:", codes.length > 0 ? codes.join(", ") : "None");

        // Validation Logic
        if (testCase.name.includes("Negation")) {
            if (codes.some(c => c.startsWith("J45") || c.startsWith("J18") || c.startsWith("J12"))) {
                console.log("RESULT: FAIL (Found negated code)");
            } else {
                console.log("RESULT: PASS");
            }
        } else if (testCase.name.includes("Positive Asthma")) {
            if (codes.some(c => c.startsWith("J45"))) {
                console.log("RESULT: PASS");
            } else {
                console.log("RESULT: FAIL (Missing Asthma code)");
            }
        } else if (testCase.name.includes("Positive Pneumonia")) {
            if (codes.some(c => c.startsWith("J18"))) {
                console.log("RESULT: PASS");
            } else {
                console.log("RESULT: FAIL (Missing Pneumonia code)");
            }
        } else if (testCase.name.includes("Mixed")) {
            if (codes.some(c => c.startsWith("J44")) && !codes.some(c => c.startsWith("J45"))) {
                console.log("RESULT: PASS");
            } else {
                console.log("RESULT: FAIL (Incorrect codes found)");
            }
        }

    } catch (e) {
        console.error("Error processing case:", e);
    }
    console.log("\n");
});
