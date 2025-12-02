import { SequencedCode } from './rulesEngine.js';

export interface ExclusionResult {
  valid: boolean;
  errors: string[];
  filtered: SequencedCode[];
}

const excludes1: Array<[string, string]> = [
  ['E11.610', 'M14.6'],
  ['E11.65', 'E11.64'],
  ['E10.65', 'E10.64'],
];

const excludes2: Array<[string, string]> = [
  ['E11.9', 'E11.65'],
  ['E10.9', 'E10.65'],
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
