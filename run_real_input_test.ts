
import { runRulesEngine } from './lib/rulesEngineCore';

const inputCASE = `CASE DEMO: 
28-year-old female admitted for Spontaneous Vaginal Delivery (SVD). 
Full term normal delivery.
Course complicated by First Degree Perineal Laceration during delivery.
Outcome: Single live birth.`;

console.log("--- INPUT CLINICAL TEXT ---");
console.log(inputCASE);
console.log("\n--- ENGINE PROCESSING ---");

const result = runRulesEngine(inputCASE);

console.log("\n--- RESULT ---");
if (result.sequence.length === 0) {
    console.log("Status: BLOCKED / UNCODABLE");
} else {
    console.log("Status: PROCESSED");
    result.sequence.forEach(c => console.log(`${c.code}: ${c.label}`));
}

if (result.warnings.length > 0) {
    console.log("\n[WARNINGS & ERRORS]");
    result.warnings.forEach(w => console.log(w));
}
