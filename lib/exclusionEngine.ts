import { SequencedCode } from './rulesEngine.js';

export interface ExclusionResult {
  valid: boolean;
  errors: string[];
  filtered: SequencedCode[];
}

const excludes1: Array<[string, string]> = [
  // Diabetes-specific Charcot joint excludes generic Charcot
  ['E08.610', 'M14.6'],
  ['E09.610', 'M14.6'],
  ['E10.610', 'M14.6'],
  ['E11.610', 'M14.6'],
  ['E13.610', 'M14.6'],

  // Diabetic neuropathy excludes generic neuropathy codes
  ['E08.4', 'G50'],
  ['E08.4', 'G51'],
  ['E08.4', 'G52'],
  ['E08.4', 'G53'],
  ['E08.4', 'G54'],
  ['E08.4', 'G55'],
  ['E08.4', 'G56'],
  ['E08.4', 'G57'],
  ['E08.4', 'G58'],
  ['E08.4', 'G59'],
  ['E09.4', 'G50'],
  ['E09.4', 'G51'],
  ['E09.4', 'G52'],
  ['E09.4', 'G53'],
  ['E09.4', 'G54'],
  ['E09.4', 'G55'],
  ['E09.4', 'G56'],
  ['E09.4', 'G57'],
  ['E09.4', 'G58'],
  ['E09.4', 'G59'],
  ['E10.4', 'G50'],
  ['E10.4', 'G51'],
  ['E10.4', 'G52'],
  ['E10.4', 'G53'],
  ['E10.4', 'G54'],
  ['E10.4', 'G55'],
  ['E10.4', 'G56'],
  ['E10.4', 'G57'],
  ['E10.4', 'G58'],
  ['E10.4', 'G59'],
  ['E11.4', 'G50'],
  ['E11.4', 'G51'],
  ['E11.4', 'G52'],
  ['E11.4', 'G53'],
  ['E11.4', 'G54'],
  ['E11.4', 'G55'],
  ['E11.4', 'G56'],
  ['E11.4', 'G57'],
  ['E11.4', 'G58'],
  ['E11.4', 'G59'],
  ['E13.4', 'G50'],
  ['E13.4', 'G51'],
  ['E13.4', 'G52'],
  ['E13.4', 'G53'],
  ['E13.4', 'G54'],
  ['E13.4', 'G55'],
  ['E13.4', 'G56'],
  ['E13.4', 'G57'],
  ['E13.4', 'G58'],
  ['E13.4', 'G59'],

  // Hyperglycemia vs hypoglycemia mutual exclusion
  ['E11.65', 'E11.64'],
  ['E10.65', 'E10.64'],
  ['E08.65', 'E08.64'],
  ['E09.65', 'E09.64'],
  ['E13.65', 'E13.64'],
];

const excludes2: Array<[string, string]> = [
  // Unspecified diabetes can coexist with specific complications (Excludes2)
  ['E11.9', 'E11.65'],
  ['E10.9', 'E10.65'],
  ['E08.9', 'E08.65'],
  ['E09.9', 'E09.65'],
  ['E13.9', 'E13.65'],
];

function codeMatches(candidate: string, target: string): boolean {
  return candidate === target || candidate.startsWith(`${target}`);
}

export function applyExclusions(sequence: SequencedCode[]): ExclusionResult {
  const errors: string[] = [];
  let filtered = [...sequence];

  excludes1.forEach(([a, b]) => {
    const hasA = filtered.some((c) => codeMatches(c.code, a));
    const hasB = filtered.some((c) => codeMatches(c.code, b));
    if (hasA && hasB) {
      const preferred = a.startsWith('E') ? a : b;
      filtered = filtered.filter((c) => codeMatches(c.code, preferred));
      errors.push(`Excludes1: ${a} cannot be reported with ${b}; kept ${preferred}`);
    }
  });

  excludes2.forEach(([a, b]) => {
    const hasA = filtered.some((c) => codeMatches(c.code, a));
    const hasB = filtered.some((c) => codeMatches(c.code, b));
    if (hasA && hasB) {
      filtered = filtered.map((item) => ({
        ...item,
        note: `${item.note ? `${item.note}; ` : ''}Excludes2 caution between ${a} and ${b}`,
      }));
    }
  });

  return { valid: errors.length === 0, errors, filtered };
}
