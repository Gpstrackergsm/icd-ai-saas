"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const parser_1 = require("./lib/structured/parser");
const input = `Age: 45
Gender: Female
Encounter Type: Inpatient

Diabetes Type: Type 1
Complications: Foot Ulcer, Retinopathy
Ulcer Site: Right Foot
Ulcer Depth: Muscle exposed

Infection Present: Yes
Infection Site: Lung
Organism: Viral
Sepsis: Yes
Pneumonia: Yes
Pneumonia Organism: Viral`;
const { context } = (0, parser_1.parseInput)(input);
console.log("Parsed Context:");
console.log(JSON.stringify(context.conditions.infection, null, 2));
