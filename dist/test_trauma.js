"use strict";
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
const parser_1 = require("./lib/structured/parser");
const engine_1 = require("./lib/structured/engine");
const traumaCase = `Age: 35
Gender: Male
Encounter Type: ED
Injury Present: Yes
Type:  Open wound
Body Region: Chest
Laterality: Right
Encounter: Initial
Ext Cause: MVC`;
const { context } = (0, parser_1.parseInput)(traumaCase);
console.log('=== TRAUMA PARSER TEST ===');
console.log('Injury Context:', JSON.stringify(context.conditions.injury, null, 2));
console.log('\n=== ENGINE TEST ===');
const result = (0, engine_1.runStructuredRules)(context);
console.log('Primary:', ((_a = result.primary) === null || _a === void 0 ? void 0 : _a.code) || 'NONE');
console.log('Secondary:', result.secondary.map(c => c.code));
