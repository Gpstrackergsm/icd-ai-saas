
import { runRulesEngine } from './lib/rulesEngineCore';
import { parseInput } from './lib/structured/parser';

const caseText = `
Patient
32-year-old female
G4P2
History of 2 prior cesarean deliveries
Candidate for VBAC
Current Encounter
Admitted for spontaneous labor
40 weeks gestation
Twin gestation (dichorionic/diamniotic)
Complications During Labor
Mild preeclampsia
Prolonged second stage of labor
Delivery Outcome
Successful VBAC
Twin delivery:
Twin A → liveborn male
Twin B → liveborn female
`;

console.log("Running Test Case: Successful VBAC + Twins + Complications");
console.log("---------------------------------------------------------");

// Debug parsing
const debugCtx = parseInput(caseText).context;
console.log("DEBUG CONTEXT:", JSON.stringify(debugCtx.conditions.obstetric, null, 2));

const result = runRulesEngine(caseText);

console.log("\nGenerated Codes:");
const sortedCodes = result.sequence.sort((a, b) => a.code.localeCompare(b.code));
sortedCodes.forEach(c => {
    console.log(`${c.code} - ${c.label}`);
});

console.log("\nWarnings:", result.warnings);
console.log("\nERRORS:", result.errors);
console.log("Exit code:", result.errors && result.errors.length > 0 ? 1 : 0);
