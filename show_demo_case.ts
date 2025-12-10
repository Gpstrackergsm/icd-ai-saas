
import { runRulesEngine } from './lib/rulesEngine';
import { highRiskRules } from './lib/validation/highRiskRules';

// Manual trigger verification to demonstrate the rule logic specifically
const demonstrateRule = () => {
    console.log("--- CASE EXAMPLE: Normal Delivery with Complication ---");
    console.log("Scenario: Evaluation of codes O80 (Normal Delivery) and O70.0 (Perineal Laceration)");

    // We mock the sequenced codes as if the engine produced them
    // This simulates a scenario where the resolvers found both, and sequencing didn't catch the exclusion
    const mockCodes = [
        { code: 'O80', label: 'Encounter for full-term uncomplicated delivery', triggeredBy: 'test', hcc: false },
        { code: 'O70.0', label: 'First degree perineal laceration during delivery', triggeredBy: 'test', hcc: false }
    ];

    console.log("\n[INPUT CODES]");
    mockCodes.forEach(c => console.log(` - ${c.code}: ${c.label}`));

    console.log("\n[RUNNING VALIDATION ENGINE...]");

    // We run the specific high-risk rule for this
    let errors: string[] = [];
    highRiskRules.forEach(rule => {
        const result = rule(mockCodes);
        if (result && result.level === 'error') {
            errors.push(`[${result.ruleId}] ${result.message}`);
        }
    });

    if (errors.length > 0) {
        console.log("\n[SYSTEM RESPONSE: FAIL]");
        errors.forEach(e => console.log(`❌ ERROR: ${e}`));
        console.log("\n>>> CLAIM BLOCKED <<<");
    } else {
        console.log("\n[SYSTEM RESPONSE: PASS]");
    }
};

demonstrateRule();
