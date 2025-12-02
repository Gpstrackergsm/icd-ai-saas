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

  const hasPresymptomatic = filtered.some((e) => /^E10\.A[12]/.test(e.code));
  if (hasPresymptomatic) {
    const withPresymptomatic = filtered.filter((e) => /^E10\.A[12]/.test(e.code));
    const withoutPresymptomatic = filtered.filter((e) => !/^E10\.A[12]/.test(e.code) || !/^E10/.test(e.code));
    if (withPresymptomatic.length && withoutPresymptomatic.some((e) => /^E10\./.test(e.code))) {
      warnings.push('Presymptomatic Type 1 diabetes cannot coexist with complication codes; removed E10 complication entries.');
      filtered.splice(0, filtered.length, ...withPresymptomatic, ...withoutPresymptomatic.filter((e) => !/^E10\./.test(e.code)));
    }
  }

  const retinopathyLevels = filtered.filter((e) => /^E10\.3[135]/.test(e.code));
  if (retinopathyLevels.length > 1) {
    const severityRank = (code: string): number => {
      if (/^E10\.35/.test(code)) return 3;
      if (/^E10\.34/.test(code)) return 2;
      return 1;
    };
    const highest = retinopathyLevels.reduce((prev, curr) => (severityRank(curr.code) >= severityRank(prev.code) ? curr : prev));
    warnings.push('Multiple retinopathy severities detected; retaining highest severity only.');
    const retained = filtered.filter((e) => !/^E10\.3[135]/.test(e.code) || e.code === highest.code);
    filtered.splice(0, filtered.length, ...retained);
  }

  const hasHypoComa = filtered.some((e) => /\.641$/.test(e.code));
  const hasHypoNonComa = filtered.some((e) => /\.649$/.test(e.code));
  if (hasHypoComa && hasHypoNonComa) {
    warnings.push('Hypoglycemic coma overrides non-coma hypoglycemia; removed non-coma codes.');
    const retained = filtered.filter((e) => !/\.649$/.test(e.code));
    filtered.splice(0, filtered.length, ...retained);
  }

  const hasDKA = filtered.some((e) => /\.10$/.test(e.code));
  if (hasDKA && hasHypoComa) {
    warnings.push('DKA cannot coexist with hypoglycemic coma; removed DKA entries.');
    const retained = filtered.filter((e) => !/\.10$/.test(e.code));
    filtered.splice(0, filtered.length, ...retained);
  }

  const hasDiabetesHypo = filtered.some((e) => /^E0[89]\.|^E1[0-3]\./.test(e.code));
  if (hasDiabetesHypo && filtered.some((e) => /^E15/.test(e.code))) {
    warnings.push('E15 cannot coexist with diabetic hypoglycemia; removed E15.');
    const retained = filtered.filter((e) => !/^E15/.test(e.code));
    filtered.splice(0, filtered.length, ...retained);
  }

  return { valid: warnings.length === 0, warnings, filtered };
}
