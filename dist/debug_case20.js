"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const parser_1 = require("./lib/structured/parser");
const validator_1 = require("./lib/structured/validator");
// Case 20: Pneumonia with sepsis
const input20 = "Age: 60\nGender: Female\nEncounter Type: Inpatient\nCondition: Pneumonia with sepsis\nOrganism: Streptococcus";
const { context } = (0, parser_1.parseInput)(input20);
console.log('Case 20 - Pneumonia with sepsis:');
console.log('Infection:', JSON.stringify(context.conditions.infection, null, 2));
console.log('Respiratory:', JSON.stringify(context.conditions.respiratory, null, 2));
const validation = (0, validator_1.validateContext)(context);
console.log('\nValidation:', validation);
console.log('\nExpected: A40.9 (primary), J15.4 (secondary)');
console.log('Issue: Sepsis validation requires infection source/site');
