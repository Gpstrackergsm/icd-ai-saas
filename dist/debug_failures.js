"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const parser_1 = require("./lib/structured/parser");
// Test failing cases
const cases = [
    { num: 7, input: "Age: 62\nGender: Female\nEncounter Type: Inpatient\nCondition: Hypertension with Chronic Kidney Disease Stage 3" },
    { num: 10, input: "Age: 59\nGender: Male\nEncounter Type: Outpatient\nCondition: Secondary Hypertension due to renal disease" },
    { num: 19, input: "Age: 82\nGender: Male\nEncounter Type: Inpatient\nCondition: Pneumonia due to COVID-19" },
];
cases.forEach(c => {
    console.log(`\nCase ${c.num}:`);
    const { context } = (0, parser_1.parseInput)(c.input);
    console.log('Cardiovascular:', JSON.stringify(context.conditions.cardiovascular, null, 2));
    console.log('Renal:', JSON.stringify(context.conditions.renal, null, 2));
    console.log('Respiratory:', JSON.stringify(context.conditions.respiratory, null, 2));
    console.log('Infection:', JSON.stringify(context.conditions.infection, null, 2));
});
