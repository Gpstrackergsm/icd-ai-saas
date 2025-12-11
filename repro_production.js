
const path = require('path');
const fs = require('fs');

// Mock specific parts to load from DIST, just like api/encode.js might behave in prod
// Note: api/encode.js tries to load from ../lib/icd-core/...
// But we want to confirm what happens if we use the COMPILED CODE in dist

try {
    const rulesEnginePath = path.resolve(__dirname, './dist/lib/rulesEngine.js');
    if (!fs.existsSync(rulesEnginePath)) {
        console.error("DIST rulesEngine not found at", rulesEnginePath);
        console.error("Please run 'npm run build' first.");
        process.exit(1);
    }

    const { runRulesEngine } = require(rulesEnginePath);

    const input = `Patient: 32-year-old female
History: G4P2, 2 prior cesarean deliveries, Candidate for VBAC
Current Encounter: Admitted for spontaneous labor, 40 weeks gestation
Pregnancy Type: Twin gestation (dichorionic/diamniotic)
Complications: Mild preeclampsia, Prolonged second stage of labor
Delivery Outcome: Successful VBAC, Twin delivery: Twin A liveborn male, Twin B liveborn female`;

    console.log("Running Rules Engine from DIST (Compiled Code)...");
    const result = runRulesEngine(input);

    console.log("\nGenerated Sequence:");
    result.sequence.forEach((c, i) => {
        console.log(`${i + 1}. ${c.code} - ${c.label}`);
    });

    const hasO631 = result.sequence.some(c => c.code === 'O63.1');
    const hasO7582 = result.sequence.some(c => c.code === 'O75.82');

    console.log("\nVerification:");
    console.log("Has O63.1:", hasO631 ? "YES" : "NO");
    console.log("Has O75.82:", hasO7582 ? "YES" : "NO");

} catch (err) {
    console.error("CRITICAL FAILURE:", err);
}
