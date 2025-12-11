
import { parseInput } from './lib/structured/parser';
import { runStructuredRules } from './lib/structured/engine';
import { validateCodeSet } from './lib/structured/validator-post';

const input = `Patient: 32-year-old female
History: G4P2, 2 prior cesarean deliveries, Candidate for VBAC
Current Encounter: Admitted for spontaneous labor, 40 weeks gestation
Pregnancy Type: Twin gestation (dichorionic/diamniotic)
Complications: Mild preeclampsia, Prolonged second stage of labor
Delivery Outcome: Successful VBAC, Twin delivery: Twin A liveborn male, Twin B liveborn female`;

console.log("Running OB VBAC Case Analysis...");
console.log("Input:", input);
console.log("-".repeat(50));

const { context } = parseInput(input);
const results = runStructuredRules(context);
const validated = validateCodeSet(results.primary, results.secondary, context);

console.log("\nGenerated Codes:");
if (validated.codes.length === 0) {
    console.log("No codes generated.");
} else {
    validated.codes.forEach((c, i) => {
        console.log(`${i + 1}. ${c.code} - ${c.label || 'No description'}`);
    });
}

console.log("\nParsed Context:");
console.log(JSON.stringify(context, null, 2));
