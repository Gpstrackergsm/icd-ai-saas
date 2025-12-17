const { parseInput } = require('./dist/lib/structured/parser.js');
const { runStructuredRules } = require('./dist/lib/structured/engine.js');

const text = 'Closed clavicle shaft fracture, right';
const { context } = parseInput(text);
const result = runStructuredRules(context);
console.log('Primary:', result.primary?.code, result.primary?.label);
console.log('Secondary:', result.secondary?.map(s => s.code).join(', ') || 'none');
