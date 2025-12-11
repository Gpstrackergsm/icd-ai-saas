
import { runRulesEngine } from './lib/rulesEngineCore';

const caseText = `
Patient: 34-year-old female
History: G3P1, Previous Cesarean section
Current Encounter: Admitted for Premature Rupture of Membranes (PROM)
Gestational age: 39 weeks
Complications: Gestational Diabetes (Diet Controlled)
Labor: Trial of Labor (Attempted VBAC) failed due to arrest of descent, proceeded to Emergency Repeat Cesarean Section
Outcome: Single liveborn female
`;

console.log("Running New Test Case: Failed VBAC + GDM + PROM");
console.log("------------------------------------------------");

// Debug parsing
const { parseInput } = require('./lib/structured/parser');
const debugCtx = parseInput(caseText).context;
console.log("DEBUG CONTEXT:", JSON.stringify(debugCtx.conditions.obstetric, null, 2));

const result = runRulesEngine(caseText);

console.log("\nGenerated Codes:");
result.sequence.forEach((c, i) => {
    console.log(`${i + 1}. ${c.code} - ${c.label}`);
});

console.log("\nWarnings:", result.warnings);
console.log("\nERRORS:", result.errors);
console.log("Exit code:", result.errors && result.errors.length > 0 ? 1 : 0);
