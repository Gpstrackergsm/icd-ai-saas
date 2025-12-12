import { parseInput } from './lib/structured/parser';
import { runStructuredRules } from './lib/structured/engine';

// 72-year-old female with hypertension and CKD stage 4 admitted for volume overload. No heart failure documented.
const userCaseInput = `
Age: 72
Gender: Female
Encounter Type: Inpatient
Chief Complaint: Volume overload
Hypertension: Yes
CKD Present: Yes
CKD Stage: 4
Heart Failure: No
Dialysis: None
`;

console.log("Analyzing Case: 72-year-old female with HTN and CKD stage 4 admitted for volume overload...");
console.log("Input Data:");
console.log(userCaseInput);

// Parse input
const { context, errors } = parseInput(userCaseInput);

if (errors.length > 0) {
    console.error("Parsing Errors:", errors);
}

console.log("\nParsed Context:");
console.log(JSON.stringify(context, null, 2));

// Run rules
const result = runStructuredRules(context);

console.log("\n=================================");
console.log("Generated ICD-10-CM Codes:");
console.log("=================================");
const codes: string[] = [];
if (result.primary) {
    codes.push(result.primary.code);
    console.log(`PRIMARY: ${result.primary.code}`);
}

result.secondary.forEach(c => {
    codes.push(c.code);
    console.log(`SECONDARY: ${c.code}`);
});

console.log("\nCode List: " + codes.join(', '));
