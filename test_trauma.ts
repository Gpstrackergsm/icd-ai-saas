import { parseInput } from './lib/structured/parser';
import { runStructuredRules } from './lib/structured/engine';

const traumaCase = `Age: 35
Gender: Male
Encounter Type: ED
Injury Present: Yes
Type:  Open wound
Body Region: Chest
Laterality: Right
Encounter: Initial
Ext Cause: MVC`;

const { context } = parseInput(traumaCase);
console.log('=== TRAUMA PARSER TEST ===');
console.log('Injury Context:', JSON.stringify(context.conditions.injury, null, 2));
console.log('\n=== ENGINE TEST ===');
const result = runStructuredRules(context);
console.log('Primary:', result.primary?.code || 'NONE');
console.log('Secondary:', result.secondary.map(c => c.code));
