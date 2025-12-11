
import { runRulesEngine } from './lib/rulesEngine';

const input = `Patient: 32-year-old female
History: G4P2, 2 prior cesarean deliveries, Candidate for VBAC
Current Encounter: Admitted for spontaneous labor, 40 weeks gestation
Pregnancy Type: Twin gestation (dichorionic/diamniotic)
Complications: Mild preeclampsia, Prolonged second stage of labor
Delivery Outcome: Successful VBAC, Twin delivery: Twin A liveborn male, Twin B liveborn female`;

console.log("Running Legacy Rules Engine...");
const result = runRulesEngine(input);

console.log("\nGenerated Sequence:");
result.sequence.forEach((c, i) => {
    console.log(`${i + 1}. ${c.code} - ${c.label}`);
});

const hasO631 = result.sequence.some(c => c.code === 'O63.1');
const hasO7582 = result.sequence.some(c => c.code === 'O75.82');

console.log("\nVerification:");
console.log("Has O63.1 (Prolonged labor):", hasO631 ? "YES" : "NO");
console.log("Has O75.82 (VBAC):", hasO7582 ? "YES" : "NO");

if (hasO631 && hasO7582) {
    console.log("\nTEST PASSED: New structured engine is active and generating correct codes.");
} else {
    console.log("\nTEST FAILED: Codes are still missing.");
    process.exit(1);
}
