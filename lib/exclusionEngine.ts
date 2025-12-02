import { SequencedCode } from './rulesEngine';

export interface ExclusionResult {
  valid: boolean;
  errors: string[];
  filtered: SequencedCode[];
}

const excludes1Pairs: [string, string][] = [
  ['E11.65', 'E11.64'],
  ['E10.65', 'E10.64'],
];

const excludes2Pairs: [string, string][] = [
  ['E11.9', 'E11.65'],
  ['E10.9', 'E10.65'],
];

function matches(code: string, prefix: string): boolean {
  return code === prefix || code.startsWith(`${prefix}`);
}

export function applyExclusions(sequence: SequencedCode[]): ExclusionResult {
  const errors: string[] = [];
  let filtered = [...sequence];

  excludes1Pairs.forEach(([a, b]) => {
    const hasA = filtered.some((c) => matches(c.code, a));
    const hasB = filtered.some((c) => matches(c.code, b));
    if (hasA && hasB) {
      errors.push(`Excludes1 conflict between ${a} and ${b}`);
    }
  });

  excludes2Pairs.forEach(([a, b]) => {
    const hasA = filtered.some((c) => matches(c.code, a));
    const hasB = filtered.some((c) => matches(c.code, b));
    if (hasA && hasB) {
      // Excludes2 allows both; downgrade later in ranking
      filtered = filtered.map((item) =>
        matches(item.code, a) || matches(item.code, b)
          ? { ...item, note: `${item.note || ''} (excludes2 caution)`.trim() }
          : item,
      );
    }
  });

  return { valid: errors.length === 0, errors, filtered };
}
