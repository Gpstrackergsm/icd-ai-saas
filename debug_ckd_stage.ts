import { parseInput } from './lib/structured/parser';

const { context } = parseInput(`Age: 73
Gender: Male
Encounter Type: Inpatient
Diabetes Type: Type 2
Complications: Nephropathy/CKD
CKD Stage: 2
Insulin Use: No`);

console.log("CKD Context:");
console.log(JSON.stringify(context.conditions.ckd, null, 2));
console.log("\nRenal Context:");
console.log(JSON.stringify(context.conditions.renal, null, 2));
