"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const encoder_1 = require("./lib/icd-core/encoder");
const text = "67-year-old female patient admitted with acute exacerbation of congestive heart failure and acute kidney injury. Patient has a history of type 2 diabetes mellitus with diabetic nephropathy and stage 4 chronic kidney disease. She also has longstanding hypertensive heart and chronic kidney disease. During hospitalization, patient developed hospital-acquired pneumonia due to Pseudomonas aeruginosa. Patient is currently on hemodialysis three times per week. She also has a non-healing diabetic ulcer on the plantar surface of her left foot with exposed muscle. Initial encounter for the foot ulcer.";
console.log("Testing Full Encoder Pipeline for 7th Character Fix...");
const result = (0, encoder_1.encodeDiagnosisText)(text);
console.log("\nCodes Found:");
result.codes.forEach(c => {
    console.log(`${c.code} - ${c.title}`);
});
// Check specific codes that were problematic
const diabetes = result.codes.find(c => c.code.startsWith('E11.621'));
const ulcer = result.codes.find(c => c.code.startsWith('L97.523'));
console.log("\nVerification:");
if (diabetes && !diabetes.code.endsWith('A')) {
    console.log("✅ E11.621 is correct (no 'A' suffix)");
}
else if (diabetes) {
    console.log(`❌ E11.621 has incorrect suffix: ${diabetes.code}`);
}
else {
    console.log("❌ E11.621 not found");
}
if (ulcer && !ulcer.code.endsWith('A')) {
    console.log("✅ L97.523 is correct (no 'A' suffix)");
}
else if (ulcer) {
    console.log(`❌ L97.523 has incorrect suffix: ${ulcer.code}`);
}
else {
    console.log("❌ L97.523 not found");
}
