import { parseInput } from './lib/structured/parser';

const case8 = "67-year-old male with NSTEMI admitted for acute myocardial infarction. No prior MI history.";

console.log('=== DEBUGGING CASE 8 ===\n');
console.log('Input:', case8);

const { context } = parseInput(case8);

console.log('\nParsed MI context:');
console.log('  Type:', context.conditions.cardiovascular?.mi?.type);
console.log('  Timing:', context.conditions.cardiovascular?.mi?.timing);
console.log('  Location:', context.conditions.cardiovascular?.mi?.location);
