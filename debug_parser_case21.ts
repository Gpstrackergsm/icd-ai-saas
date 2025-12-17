
import { parseInput } from './lib/structured/parser';

const text = "Diffuse axonal injury (DAI) with prolonged coma (>24 hrs). Initial.";
const result = parseInput(text);

console.log("Parsed Context:", JSON.stringify(result.context, null, 2));

if (result.context.conditions.obstetric?.pregnant) {
    console.log("❌ FAIL: Pregnancy detected!");
} else {
    console.log("✅ PASS: No pregnancy.");
}
