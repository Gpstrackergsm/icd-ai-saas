// ICD-10-CM Encoder core – generated with Codex helper
// Responsibility: Apply ICD-10-CM style guideline rules and sequencing

import { CandidateCode, EncodingContext, RuleResult } from './models';

function ensureUnique(codes: CandidateCode[]): CandidateCode[] {
  const seen = new Map<string, CandidateCode>();
  codes.forEach((code) => {
    const existing = seen.get(code.code);
    if (!existing || existing.baseScore < code.baseScore) {
      seen.set(code.code, code);
    }
  });
  return Array.from(seen.values());
}

function hasCode(codes: CandidateCode[], code: string): boolean {
  return codes.some((candidate) => candidate.code === code);
}

export function applyGuidelineRules(ctx: EncodingContext): RuleResult {
  let working = ensureUnique(ctx.initialCandidates);
  const warnings: string[] = [];
  const errors: string[] = [];
  const addedCodes: CandidateCode[] = [];

  const hasDiabetes = ctx.concepts.some((c) => c.type === 'diabetes');
  const hasCKD = ctx.concepts.some((c) => c.type === 'ckd');
  const ckdConcept = ctx.concepts.find((c) => c.type === 'ckd');
  const hasHypertension = ctx.concepts.some((c) => c.type === 'hypertension');
  const hasHF = ctx.concepts.some((c) => c.type === 'heart_failure');
  const hasPregnancy = ctx.concepts.some((c) => c.type === 'pregnancy');

  if (hasDiabetes && hasCKD && !hasCode(working, 'E11.22')) {
    const reason = 'Diabetes with CKD requires combination code';
    const candidate: CandidateCode = { code: 'E11.22', reason, baseScore: 9, conceptRefs: ['diabetes', 'ckd'] };
    working.push(candidate);
    addedCodes.push(candidate);
  }

  if (hasDiabetes && hasCKD) {
    const stage = ckdConcept?.attributes.stage?.toLowerCase();
    const ckdCode = stage === '4' ? 'N18.4' : stage === '3b' ? 'N18.32' : 'N18.9';
    if (!hasCode(working, ckdCode)) {
      const candidate: CandidateCode = { code: ckdCode, reason: 'CKD staging note', baseScore: 8, conceptRefs: ['ckd'] };
      working.push(candidate);
      addedCodes.push(candidate);
    }
  }

  if (hasHypertension && hasCKD && hasHF) {
    if (!hasCode(working, 'I13.0')) {
      const candidate: CandidateCode = { code: 'I13.0', reason: 'Hypertensive heart and CKD with HF', baseScore: 9, conceptRefs: ['hypertension', 'ckd', 'hf'] };
      working.push(candidate);
      addedCodes.push(candidate);
    }
    if (!hasCode(working, 'I50.9')) {
      const candidate: CandidateCode = { code: 'I50.9', reason: 'Heart failure detail required', baseScore: 7, conceptRefs: ['hf'] };
      working.push(candidate);
      addedCodes.push(candidate);
    }
  } else if (hasHypertension && hasCKD && !hasCode(working, 'I12.9')) {
    const candidate: CandidateCode = { code: 'I12.9', reason: 'Hypertensive CKD combination guidance', baseScore: 8, conceptRefs: ['hypertension'] };
    working.push(candidate);
    addedCodes.push(candidate);
  }

  if (hasPregnancy && hasDiabetes) {
    if (!working.some((c) => c.code.startsWith('O24'))) {
      const candidate: CandidateCode = { code: 'O24.112', reason: 'Pregnancy supersedes standard diabetes codes', baseScore: 9, conceptRefs: ['pregnancy'] };
      working.push(candidate);
      addedCodes.push(candidate);
      warnings.push('Use pregnancy-specific diabetes codes (O24.-) when pregnant.');
    }
    working = working.filter((c) => !c.code.startsWith('E11'));
  }

  const neoplasmSecondary = working.find((c) => c.code.startsWith('C78') || c.code.startsWith('C79'));
  const neoplasmPrimary = working.find((c) => c.code.startsWith('C18') || c.code.startsWith('C34') || c.code.startsWith('C50'));
  const reorderedCodes: string[] = [];
  if (neoplasmSecondary && neoplasmPrimary) {
    working = working.filter((c) => ![neoplasmPrimary.code, neoplasmSecondary.code].includes(c.code));
    working.unshift(neoplasmSecondary, neoplasmPrimary);
    reorderedCodes.push(neoplasmSecondary.code, neoplasmPrimary.code);
  }

  if (hasDiabetes && hasCKD && working.some((c) => c.code === 'E11.9')) {
    warnings.push('E11.9 is insufficient when CKD is documented; upgrading to E11.22.');
    working = working.filter((c) => c.code !== 'E11.9');
  }

  const removedCodes = ctx.initialCandidates
    .map((c) => c.code)
    .filter((code) => !working.some((c) => c.code === code));

  return {
    addedCodes,
    removedCodes,
    reorderedCodes,
    warnings,
    errors,
    finalCandidates: working,
  };
}
