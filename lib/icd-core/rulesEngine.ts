/// <reference lib="es2021" />
// @ts-nocheck

// ICD-10-CM Encoder core – generated with Codex helper
// Responsibility: Apply ICD-10-CM style guideline rules and sequencing

import type { CandidateCode, EncodingContext, RuleResult } from './models.ts';

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

  const diabetesConcept = ctx.concepts.find((c) => c.type === 'diabetes');
  const hasDiabetes = Boolean(diabetesConcept);
  const ckdConcept = ctx.concepts.find((c) => c.type === 'ckd');
  const hasCKD = Boolean(ckdConcept?.attributes.hasCKD || ckdConcept);
  const hypertensionConcept = ctx.concepts.find((c) => c.type === 'hypertension');
  const hasHypertension = Boolean(hypertensionConcept?.attributes.hasHypertension || hypertensionConcept);
  const heartFailureConcept = ctx.concepts.find((c) => c.type === 'heart_failure');
  const hasHF = Boolean(heartFailureConcept?.attributes.hasHeartFailure || heartFailureConcept);
  const hasPregnancy = ctx.concepts.some((c) => c.type === 'pregnancy');
  const hasInjury = ctx.concepts.some((c) => c.type === 'injury');

  const diabetesPrefix = diabetesConcept?.attributes.diabetesType === 'type1'
    ? 'E10'
    : diabetesConcept?.attributes.diabetesType === 'secondary'
      ? 'E08'
      : 'E11';

  const reorderedCodes: string[] = [];

  const markCandidate = (code: string, reason: string, baseScore: number, rule: string, refs: string[]) => {
    const existing = working.find((c) => c.code === code);
    if (existing) {
      existing.guidelineRule = rule;
      existing.reason = existing.reason || reason;
      existing.baseScore = Math.max(existing.baseScore, baseScore);
      return;
    }
    const candidate: CandidateCode = { code, reason, baseScore, conceptRefs: refs, guidelineRule: rule };
    working.push(candidate);
    addedCodes.push(candidate);
  };

  const removeCodes = (codesToRemove: string[], reason?: string) => {
    const before = working.length;
    working = working.filter((candidate) => !codesToRemove.includes(candidate.code));
    if (reason && before !== working.length) warnings.push(reason);
  };

  // Diabetes + CKD combination enforcement
  if (hasDiabetes && hasCKD && !working.some((c) => c.code === `${diabetesPrefix}.22`)) {
    markCandidate(`${diabetesPrefix}.22`, 'Diabetes with CKD requires combination code', 10, 'diabetes_ckd_combo', ['diabetes', 'ckd']);
  }

  // Hyperosmolarity outranks other diabetic events
  const hyperCode = working.find((c) => c.code === `${diabetesPrefix}.00`);
  if (hyperCode) {
    if (!hyperCode.guidelineRule) hyperCode.guidelineRule = 'diabetes_hyperosmolar_priority';
  }

  // Remove E11.9 when complications exist
  const hasDiabetesComplication = working.some((c) => /E1[01]\.(2|3|4|5|6)/.test(c.code)) || hasCKD;
  if (hasDiabetesComplication) {
    const before = working.length;
    working = working.filter((c) => c.code !== `${diabetesPrefix}.9`);
    if (before !== working.length) {
      warnings.push(`${diabetesPrefix}.9 removed because complications were documented.`);
    }
  }

  const mapCkdStageCode = (stage?: string, ckdStage?: 1 | 2 | 3 | 4 | 5 | 'ESRD') => {
    if (ckdStage === 'ESRD' || stage === 'ESRD') return 'N18.6';
    if (ckdStage === 5 || stage === '5') return 'N18.5';
    if (ckdStage === 4 || stage === '4') return 'N18.4';
    if (ckdStage === 3 || stage?.startsWith('3')) {
      if (stage?.toLowerCase() === '3a') return 'N18.31';
      if (stage?.toLowerCase() === '3b') return 'N18.32';
      return 'N18.3';
    }
    if (ckdStage === 2 || stage === '2') return 'N18.2';
    if (ckdStage === 1 || stage === '1') return 'N18.1';
    return 'N18.9';
  };

  // Hypertension combination logic
  let preferredHypertensionCode: string | undefined;
  if (hasHypertension && hasHF && hasCKD) {
    preferredHypertensionCode = 'I13.0';
    markCandidate(preferredHypertensionCode, 'Hypertension with HF and CKD requires I13.x', 10, 'htn_hf_ckd_combo', ['hypertension', 'hf', 'ckd']);
    markCandidate(mapCkdStageCode(ckdConcept?.attributes.stage, ckdConcept?.attributes.ckdStage), 'CKD stage required', 9, 'ckd_stage_required', ['ckd']);
  } else if (hasHypertension && hasCKD && !hasHF) {
    preferredHypertensionCode =
      ckdConcept?.attributes.ckdStage === 5 || ckdConcept?.attributes.stage === '5' || ckdConcept?.attributes.stage === 'ESRD'
        ? 'I12.0'
        : 'I12.9';
    markCandidate(preferredHypertensionCode, 'Hypertensive CKD requires I12.x', 9, 'htn_ckd_combo', ['hypertension', 'ckd']);
    markCandidate(mapCkdStageCode(ckdConcept?.attributes.stage, ckdConcept?.attributes.ckdStage), 'CKD stage required', 9, 'ckd_stage_required', ['ckd']);
  } else if (hasHypertension && hasHF && !hasCKD) {
    preferredHypertensionCode = 'I11.0';
    markCandidate(preferredHypertensionCode, 'Hypertensive heart disease with HF requires I11.0', 9, 'htn_hf_combo', ['hypertension', 'hf']);
  }

  if (preferredHypertensionCode) {
    reorderedCodes.unshift(preferredHypertensionCode);
  }

  // Remove essential hypertension when HF or CKD present
  if ((hasHF || hasCKD) && working.some((c) => c.code === 'I10')) {
    removeCodes(['I10'], 'Removed I10 because hypertensive complications are present.');
  }

  // Resolve hypertensive hierarchy conflicts: I13 outranks I12/I11/I10, I12 outranks I11/I10
  const hasI13 = working.some((c) => c.code.startsWith('I13'));
  const hasI12 = working.some((c) => c.code.startsWith('I12'));
  const hasI11 = working.some((c) => c.code.startsWith('I11'));
  if (hasI13) {
    removeCodes(
      working.filter((c) => c.code === 'I10' || c.code.startsWith('I11') || c.code.startsWith('I12')).map((c) => c.code),
      'Removed less specific hypertension combinations because I13 captured HF and CKD.',
    );
  } else if (hasI12) {
    removeCodes(
      working.filter((c) => c.code === 'I10' || c.code.startsWith('I11')).map((c) => c.code),
      'Removed essential/heart disease hypertension because CKD combination applies.',
    );
  } else if (hasI11) {
    removeCodes(['I10'], 'Removed essential hypertension because heart disease combination applies.');
  }

  // Always add CKD staging when present
  if (hasCKD) {
    const stage = ckdConcept?.attributes.stage;
    const ckdStageCode = working.find((c) => c.code.startsWith('N18.'))?.code;
    if (!ckdStageCode) {
      const defaultStage = mapCkdStageCode(stage, ckdConcept?.attributes.ckdStage);
      markCandidate(defaultStage, 'CKD stage must be captured', 8, 'ckd_stage_required', ['ckd']);
    }
    // Drop unspecified CKD when a staged code exists
    const stagedCodes = working.filter((c) => /^N18\.[1-6]/.test(c.code));
    if (stagedCodes.length) {
      removeCodes(['N18.9'], 'Dropped unspecified CKD because staged CKD is documented.');
    }
  }

  // Pregnancy overrides endocrine/cardiac codes
  if (hasPregnancy) {
    const hadPregnancyCode = working.some((c) => c.code.startsWith('O')); 
    if (!hadPregnancyCode) {
      markCandidate('O26.90', 'Pregnancy present – use O chapter codes', 8, 'pregnancy_override', ['pregnancy']);
    }
    const before = working.length;
    working = working.filter((c) => !(c.code.startsWith('E1') || c.code.startsWith('I1')));
    if (before !== working.length) {
      warnings.push('Removed endocrine/hypertensive codes because pregnancy codes take priority.');
    }
  }

  // Neoplasm sequencing primary vs secondary
  const hasSpecificSecondary = working.some((c) => (c.code.startsWith('C78') || c.code.startsWith('C79')) && c.code !== 'C79.9');
  if (hasSpecificSecondary) {
    working = working.filter((c) => c.code !== 'C79.9');
  }
  const neoplasmSecondary = working.find((c) => c.code.startsWith('C78') || c.code.startsWith('C79'));
  const neoplasmPrimary = working.find((c) => c.code.startsWith('C18') || c.code.startsWith('C34') || c.code.startsWith('C50') || c.code.startsWith('C22'));
  if (neoplasmSecondary && neoplasmPrimary) {
    if (neoplasmSecondary.code.slice(0, 3) === neoplasmPrimary.code.slice(0, 3)) {
      errors.push('Primary site cannot equal metastatic site; check documentation.');
    }
    working = working.filter((c) => ![neoplasmPrimary.code, neoplasmSecondary.code].includes(c.code));
    working.unshift(neoplasmSecondary, neoplasmPrimary);
    reorderedCodes.push(neoplasmSecondary.code, neoplasmPrimary.code);
  }

  const secondarySites = ctx.concepts
    .filter((c) => c.type === 'neoplasm' && c.attributes.severity === 'secondary')
    .flatMap((c) => c.attributes.metastaticSites || (c.attributes.site ? [c.attributes.site] : []))
    .filter(Boolean) as string[];
  const primarySites = ctx.concepts
    .filter((c) => c.type === 'neoplasm' && c.attributes.severity === 'primary')
    .map((c) => c.attributes.primaryNeoplasmSite || c.attributes.site)
    .filter(Boolean) as string[];
  if (primarySites.length && secondarySites.length && secondarySites.some((s) => primarySites.includes(s))) {
    errors.push('Metastatic site must differ from primary; specify distinct primary and secondary locations.');
  }

  if (hyperCode) {
    reorderedCodes.unshift(hyperCode.code);
  }

  // Injury: ensure external cause present
  if (hasInjury) {
    const hasExternal = working.some((c) => c.code.startsWith('V') || c.code.startsWith('W') || c.code.startsWith('Y'));
    if (!hasExternal) {
      warnings.push('Injury requires external cause code; added W19.XXXA.');
      markCandidate('W19.XXXA', 'Default external cause for fall/unspecified injury', 6, 'injury_external_cause', ['injury']);
    }
    // enforce 7th character presence
    working = working.map((c) => {
      if (/^[A-Z]\d{2}\.[A-Z0-9]{3}$/.test(c.code)) {
        const updated = { ...c, code: `${c.code}A`, guidelineRule: c.guidelineRule ?? 'seventh_character_enforced' };
        return updated;
      }
      return c;
    });
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
