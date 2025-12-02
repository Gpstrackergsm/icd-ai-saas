import { SequencedCode } from './rulesEngine.js';

export interface HierarchyResult {
  valid: boolean;
  warnings: string[];
  filtered: SequencedCode[];
}

function isBillable(code: string): boolean {
  const stripped = code.replace('.', '');
  return stripped.length >= 4;
}

function requiresSeventh(code: string): boolean {
  return /^T[0-9]/.test(code) || code.includes('X');
}

export function validateHierarchy(sequence: SequencedCode[]): HierarchyResult {
  const warnings: string[] = [];
  const filtered: SequencedCode[] = [];

  sequence.forEach((entry) => {
    if (!isBillable(entry.code)) {
      warnings.push(`Code ${entry.code} is not billable; omitted.`);
      return;
    }
    if (requiresSeventh(entry.code) && entry.code.length < 7) {
      warnings.push(`Code ${entry.code} missing seventh character.`);
      return;
    }
    filtered.push(entry);
  });

  return { valid: warnings.length === 0, warnings, filtered };
}
