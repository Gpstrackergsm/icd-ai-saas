/// <reference lib="es2021" />
// @ts-nocheck

// ICD-10-CM Encoder core – generated with Codex helper
// Responsibility: Apply ICD-10-CM style guideline rules and sequencing

import type { CandidateCode, EncodingContext, RuleResult } from './models.ts';
import {
  extractCodesFromText,
  getChapterForCode,
  getExcludes1Codes,
  getExcludes2Codes,
  getIncludesStrings,
  getNotesStrings,
  getRulesStrings,
} from './dataSource';

function mapCkdStageCode(stage?: string, ckdStage?: 1 | 2 | 3 | 4 | 5 | 'ESRD') {
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
}

function deriveDiabetesPrefix(diabetesConcept?: any): string {
  const diabetes = diabetesConcept?.attributes?.diabetes;
  if (diabetes?.dueToUnderlyingCondition) return 'E08';
  if (diabetes?.dueToDrugOrChemical) return 'E09';
  if (diabetes?.subtype) return diabetes.subtype;
  if (diabetesConcept?.attributes?.diabetesType === 'type1') return 'E10';
  if (diabetesConcept?.attributes?.diabetesType === 'secondary') return 'E08';
  return 'E11';
}

interface RankedCandidate extends CandidateCode {
  score: number;
  source: string;
}

function applyExclusionEngine(candidates: RankedCandidate[]): RankedCandidate[] {
  const working = candidates.map((candidate) => ({ ...candidate }));
  const hasDiabetesDomain = working.some((c) => /^E0[89]|E1[013]/.test(c.code));

  const normalizeText = (value?: string) => value?.toLowerCase() || '';

  const applyIncludesAndRules = (candidate: RankedCandidate): RankedCandidate => {
    let score = candidate.score;
    const includesText = getIncludesStrings(candidate.code);
    const haystack = normalizeText((candidate as any).source || (candidate as any).reason);

    if (includesText.some((entry) => entry && haystack.includes(entry.toLowerCase()))) {
      score += 0.5;
    }

    const ruleText = getRulesStrings(candidate.code).join(' ').toLowerCase();
    if (/code first/.test(ruleText)) score += 0.1;
    if (/use additional code/.test(ruleText)) score -= 0.1;

    return { ...candidate, score };
  };

  const updated = working.map(applyIncludesAndRules);

  const markExcludes2 = new Set<string>();
  updated.forEach((candidate) => {
    const excludes2 = getExcludes2Codes(candidate.code);
    excludes2.forEach((code) => {
      const conflict = updated.find((c) => c.code === code || c.code.startsWith(`${code}.`));
      if (conflict) {
        markExcludes2.add(candidate.code);
        markExcludes2.add(conflict.code);
      }
    });
  });

  const adjusted = updated.map((candidate) =>
    markExcludes2.has(candidate.code) ? { ...candidate, score: candidate.score - 0.25 } : candidate,
  );

  const specificity = (code: string) => code.replace(/\./g, '').length;
  const isDiabetesCode = (code: string) => /^E0[89]|E1[013]/.test(code);

  const decidePreferred = (a: RankedCandidate, b: RankedCandidate): RankedCandidate => {
    const specA = specificity(a.code);
    const specB = specificity(b.code);
    if (specA !== specB) return specA > specB ? a : b;
    if (hasDiabetesDomain && isDiabetesCode(a.code) !== isDiabetesCode(b.code)) {
      return isDiabetesCode(a.code) ? a : b;
    }
    if (a.score !== b.score) return a.score >= b.score ? a : b;
    return a.code.localeCompare(b.code) <= 0 ? a : b;
  };

  const conflictsToRemove = new Set<string>();

  const matchesExcluded = (candidateCode: string, excludedCode: string) =>
    candidateCode === excludedCode || candidateCode.startsWith(`${excludedCode}.`) || excludedCode.startsWith(candidateCode);

  adjusted.forEach((candidate) => {
    const excludes1 = getExcludes1Codes(candidate.code);
    excludes1.forEach((excludedCode) => {
      const conflict = adjusted.find(
        (other) => other.code !== candidate.code && matchesExcluded(other.code, excludedCode),
      );
      if (conflict && !conflictsToRemove.has(conflict.code) && !conflictsToRemove.has(candidate.code)) {
        const preferred = decidePreferred(candidate, conflict);
        const toDrop = preferred.code === candidate.code ? conflict : candidate;
        conflictsToRemove.add(toDrop.code);
      }
    });
  });

  let filtered = adjusted.filter((candidate) => !conflictsToRemove.has(candidate.code));

  if (!filtered.length && adjusted.length) {
    const best = adjusted.reduce((top, next) => decidePreferred(top, next));
    filtered = [best];
  }

  return filtered;
}

function mapRetinopathyCode(prefix: string, retinopathy: any): string {
  const severity = retinopathy?.severity || 'unspecified';
  const withMacular = Boolean(retinopathy?.withMacularEdema);
  const withTraction = Boolean(retinopathy?.withTractionDetachmentMacula);
  if (severity === 'mild-npdr') return withMacular ? `${prefix}.321` : `${prefix}.329`;
  if (severity === 'moderate-npdr') return withMacular ? `${prefix}.331` : `${prefix}.339`;
  if (severity === 'severe-npdr') return withMacular ? `${prefix}.341` : `${prefix}.349`;
  if (severity === 'pdr') {
    if (withTraction) return `${prefix}.352`;
    return withMacular ? `${prefix}.351` : `${prefix}.359`;
  }
  return withMacular ? `${prefix}.311` : `${prefix}.319`;
}

function mapDiabeticNeuropathyCode(prefix: string, neuropathyType?: string): string {
  if (neuropathyType === 'mononeuropathy') return `${prefix}.41`;
  if (neuropathyType === 'polyneuropathy') return `${prefix}.42`;
  if (neuropathyType === 'autonomic') return `${prefix}.43`;
  if (neuropathyType === 'amyotrophy') return `${prefix}.44`;
  return `${prefix}.40`;
}

function isDiabeticNeuropathyCode(code: string): boolean {
  return /^(E0[89]|E1[013])\.(4|61)/.test(code);
}

function isGenericNeuropathyCode(code: string): boolean {
  return /^(G5[8-9]|G6[0-9]|H47\.|M14\.6)/.test(code);
}

function applyNeuropathyRules(
  ctx: EncodingContext,
  working: CandidateCode[],
  warnings: string[],
): CandidateCode[] {
  const diabetesConcept = ctx.concepts.find((c) => c.type === 'diabetes');
  const diabeticNeuropathyContext = Boolean(
    diabetesConcept?.attributes.diabetes?.neuropathy || diabetesConcept?.attributes.diabetes?.charcotJoint,
  );
  const hasDiabetes = Boolean(diabetesConcept);
  const hasNonDiabeticNeuropathyConcept = ctx.concepts.some(
    (c) => c.attributes.neuropathy && c.type !== 'diabetes',
  );

  const diabeticNeuropathyCandidates = working.filter((c) => isDiabeticNeuropathyCode(c.code));
  const genericNeuropathyCandidates = working.filter((c) => isGenericNeuropathyCode(c.code));
  const hasDiabeticNeuropathyCode = diabeticNeuropathyCandidates.length > 0;

  if (hasDiabetes && diabeticNeuropathyContext) {
    if (genericNeuropathyCandidates.length) {
      working = working.filter((c) => !isGenericNeuropathyCode(c.code));
    }
  } else if (!hasDiabetes && hasNonDiabeticNeuropathyConcept) {
    // Allow neurologic codes to remain; no action needed.
  } else if (genericNeuropathyCandidates.length && diabeticNeuropathyCandidates.length === 0 && hasDiabetes) {
    warnings.push('Neuropathy described with diabetes; consider diabetic neuropathy codes.');
  }

  if (hasDiabeticNeuropathyCode && !hasNonDiabeticNeuropathyConcept) {
    working = working.filter((candidate) => !isGenericNeuropathyCode(candidate.code));
    working = working.map((candidate) =>
      isDiabeticNeuropathyCode(candidate.code)
        ? { ...candidate, baseScore: Math.max(candidate.baseScore, 12), guidelineRule: candidate.guidelineRule || 'diabetic_neuropathy_priority' }
        : candidate,
    );
  }

  // Resolve Excludes1 conflicts between diabetic neuropathy and neurologic codes
  const conflicts = new Set<string>();
  diabeticNeuropathyCandidates.forEach((candidate) => {
    const excludes = getExcludes1Codes(candidate.code);
    excludes.forEach((excluded) => {
      if (genericNeuropathyCandidates.some((c) => c.code === excluded)) {
        conflicts.add(excluded);
      }
    });
  });

  genericNeuropathyCandidates.forEach((candidate) => {
    const excludes = getExcludes1Codes(candidate.code);
    excludes.forEach((excluded) => {
      if (diabeticNeuropathyCandidates.some((c) => c.code === excluded)) {
        conflicts.add(candidate.code);
      }
    });
  });

  if (conflicts.size) {
    working = working.filter((c) => !conflicts.has(c.code));
  }

  // Prefer diabetic neuropathy codes over other nervous system chapters when both present
  if (hasDiabetes && diabeticNeuropathyCandidates.length) {
    const nervousSystemChapters = new Set(['Diseases of the nervous system', 'Diseases of the eye and adnexa', 'Diseases of the musculoskeletal system and connective tissue']);
    working = working.filter((candidate) => {
      if (isDiabeticNeuropathyCode(candidate.code)) return true;
      if (isGenericNeuropathyCode(candidate.code)) return false;
      const chapter = getChapterForCode(candidate.code);
      if (chapter && nervousSystemChapters.has(chapter) && candidate.code.startsWith('M14.6')) return false;
      return true;
    });
  }

  return working;
}

function applyRespiratoryRules(
  ctx: EncodingContext,
  working: CandidateCode[],
  warnings: string[],
): CandidateCode[] {
  const hasCOPDConcept = ctx.concepts.some((c) => c.type === 'copd');
  const hasAsthmaConcept = ctx.concepts.some((c) => c.type === 'asthma');
  const copdConcept = ctx.concepts.find((c) => c.type === 'copd');
  const asthmaConcept = ctx.concepts.find((c) => c.type === 'asthma');

  const copdCandidates = working.filter((c) => c.code.startsWith('J44'));
  const asthmaCandidates = working.filter((c) => c.code.startsWith('J45'));

  if (hasCOPDConcept && !copdCandidates.length) {
    working.push({
      code: 'J44.9',
      reason: 'COPD documented',
      baseScore: 6,
      conceptRefs: [copdConcept?.raw || 'copd'],
      guidelineRule: 'copd_default',
    });
  }

  if (hasAsthmaConcept && !asthmaCandidates.length) {
    working.push({
      code: 'J45.909',
      reason: 'Asthma documented',
      baseScore: 6,
      conceptRefs: [asthmaConcept?.raw || 'asthma'],
      guidelineRule: 'asthma_default',
    });
  }

  const pneumoniaPresent = working.some((c) => /^J1[0-8]/.test(c.code));
  working = working.map((candidate) => {
    if (candidate.code.startsWith('J44.0') && !pneumoniaPresent) {
      warnings.push('COPD with acute infection requires organism-specific pneumonia code; ensure documentation.');
    }
    if (candidate.code.startsWith('J44')) {
      return { ...candidate, baseScore: Math.max(candidate.baseScore, 8) };
    }
    return candidate;
  });

  if (hasCOPDConcept && asthmaCandidates.some((c) => c.code === 'J45.909')) {
    working = working.filter((c) => c.code !== 'J45.909');
  }

  return working;
}

function pickPreferredCandidate(a: CandidateCode, b: CandidateCode): CandidateCode {
  if (a.baseScore !== b.baseScore) return a.baseScore > b.baseScore ? a : b;
  if (a.code.length !== b.code.length) return a.code.length > b.code.length ? a : b;
  return a;
}

function collectGuidanceCodes(code: string): string[] {
  const relatedText = [
    ...getIncludesStrings(code),
    ...getRulesStrings(code).filter((entry) => /code\s+(also|first)|use additional code/i.test(entry)),
    ...getNotesStrings(code).filter((entry) => /(includes|code\s+(also|first)|use additional code)/i.test(entry)),
  ];

  const collected = new Set<string>();
  relatedText.forEach((entry) => {
    extractCodesFromText(entry).forEach((code) => collected.add(code));
  });

  return Array.from(collected);
}

function applyInclusionExclusionGuidance(
  working: CandidateCode[],
  pushWarning: (message: string) => void,
  markCandidate: (code: string, reason: string, baseScore: number, rule: string, refs: string[]) => void,
): CandidateCode[] {
  const existing = new Map<string, CandidateCode>(working.map((c) => [c.code, c]));
  const removals = new Set<string>();
  const snapshot = [...working];

  snapshot.forEach((candidate) => {
    const excludes1 = getExcludes1Codes(candidate.code);
    excludes1.forEach((excludedCode) => {
      const conflict = existing.get(excludedCode);
      if (conflict) {
        const preferred = pickPreferredCandidate(candidate, conflict);
        const toDrop = preferred === candidate ? conflict : candidate;
        if (toDrop) {
          removals.add(toDrop.code);
          pushWarning(`Removed ${toDrop.code} because it conflicts with ${preferred.code} (Excludes1).`);
        }
      }
    });

    const excludes2 = getExcludes2Codes(candidate.code);
    excludes2.forEach((excludedCode) => {
      if (existing.has(excludedCode)) {
        pushWarning(
          `${candidate.code} has Excludes2 guidance with ${excludedCode}; ensure conditions are unrelated if both are coded.`,
        );
      }
    });

    const guidanceCodes = collectGuidanceCodes(candidate.code);
    const missingGuidanceCodes = guidanceCodes.filter((code) => {
      if (existing.has(code)) return false;
      const root = code.slice(0, 3);
      return !working.some((c) => c.code.toUpperCase().startsWith(root));
    });
    if (missingGuidanceCodes.length === 1) {
      const supportCode = missingGuidanceCodes[0];
      markCandidate(
        supportCode,
        `Added ${supportCode} because ${candidate.code} carries an ICD guidance note requiring additional coding.`,
        Math.max(4, candidate.baseScore - 1),
        'icd_guidance',
        candidate.conceptRefs || [],
      );
      pushWarning(`${candidate.code} requires additional code ${supportCode}; added per ICD guidance.`);
      const added = working.find((c) => c.code === supportCode);
      if (added) existing.set(supportCode, added);
    } else if (missingGuidanceCodes.length > 1) {
      pushWarning(
        `${candidate.code} requires additional related codes (${missingGuidanceCodes.join(', ')}); select the appropriate one based on documentation.`,
      );
    }
  });

  if (removals.size) {
    working = working.filter((candidate) => !removals.has(candidate.code));
  }

  return working;
}

function applyDiabetesGuidelines(
  ctx: EncodingContext,
  working: CandidateCode[],
  warnings: string[],
): { candidates: CandidateCode[]; reorderedCodes: string[]; primaryCode?: string } {
  const diabetesConcept = ctx.concepts.find((c) => c.type === 'diabetes');
  if (!diabetesConcept) return { candidates: working, reorderedCodes: [] };

  const diabetes = diabetesConcept.attributes.diabetes || {};
  const prefix = deriveDiabetesPrefix(diabetesConcept);
  const ckdConcept = ctx.concepts.find((c) => c.type === 'ckd');

  let primaryCode = `${prefix}.9`;
  const hasHyperosmolar = diabetes.hyperosmolarity?.present;
  const hasKetoacidosis = diabetes.ketoacidosis?.present;
  const hasHypoglycemia = diabetes.hypoglycemia?.present;
  const hasNeuropathy = Boolean(diabetes.neuropathy);
  const neuropathyCode = hasNeuropathy ? mapDiabeticNeuropathyCode(prefix, diabetes.neuropathyType) : undefined;

  if (hasHyperosmolar) {
    primaryCode = `${prefix}.0${diabetes.hyperosmolarity?.withComa ? '1' : '0'}`;
  } else if (hasKetoacidosis) {
    if (diabetes.ketoacidosis?.withHyperosmolarity) {
      primaryCode = `${prefix}.12`;
    } else {
      primaryCode = `${prefix}.1${diabetes.ketoacidosis?.withComa ? '1' : '0'}`;
    }
  } else if (hasHypoglycemia) {
    primaryCode = `${prefix}.64${diabetes.hypoglycemia?.withComa ? '1' : '9'}`;
  } else if (diabetes.uncontrolled) {
    primaryCode = `${prefix}.65`;
  }

  if (!hasHyperosmolar && !hasKetoacidosis && !hasHypoglycemia) {
    if (diabetes.footUlcer) {
      primaryCode = `${prefix}.621`;
    } else if (diabetes.peripheralAngiopathy?.present) {
      primaryCode = `${prefix}.${diabetes.peripheralAngiopathy.withGangrene ? '52' : '51'}`;
    } else if (diabetes.charcotJoint) {
      primaryCode = `${prefix}.610`;
    } else if (diabetes.retinopathy?.present) {
      primaryCode = mapRetinopathyCode(prefix, diabetes.retinopathy);
    } else if (diabetes.nephropathy && ckdConcept) {
      primaryCode = `${prefix}.22`;
    } else if (diabetes.nephropathy) {
      primaryCode = `${prefix}.21`;
    } else if (ckdConcept) {
      primaryCode = `${prefix}.22`;
    } else if (diabetes.neuropathy) {
      primaryCode = neuropathyCode || `${prefix}.40`;
    } else if (diabetes.cataract) {
      primaryCode = `${prefix}.36`;
    }
  }

  if (neuropathyCode) {
    primaryCode = neuropathyCode;
  }

  let filtered = working.filter((c) => !c.code.startsWith(prefix));
  const reorderedCodes: string[] = [];
  const primaryCandidate: CandidateCode = {
    code: primaryCode,
    reason: 'Diabetes mapped per complications',
    baseScore: neuropathyCode ? 12 : 11,
    conceptRefs: [diabetesConcept.raw],
    guidelineRule: 'diabetes_guideline',
  };
  filtered.push(primaryCandidate);
  reorderedCodes.push(primaryCode);

  if (ckdConcept) {
    const stageCode = mapCkdStageCode(
      ckdConcept.attributes.stage || diabetes.ckdStage,
      ckdConcept.attributes.ckdStage as any,
    );
    const existingStage = filtered.some((c) => c.code.startsWith('N18.'));
    if (!existingStage) {
      filtered.push({
        code: stageCode,
        reason: 'CKD stage documented',
        baseScore: 8,
        conceptRefs: [ckdConcept.raw],
        guidelineRule: 'ckd_stage_required',
      });
    }

    const ckdComboCode = `${prefix}.22`;
    if (!filtered.some((c) => c.code === ckdComboCode)) {
      filtered.push({
        code: ckdComboCode,
        reason: 'Diabetes with CKD combination',
        baseScore: 9,
        conceptRefs: [diabetesConcept.raw, ckdConcept.raw],
        guidelineRule: 'diabetes_ckd_combo',
      });
    }
  }

  if (diabetes.footUlcer) {
    filtered.push({
      code: 'L97.409',
      reason: 'Diabetic foot ulcer requires additional site code',
      baseScore: 6,
      conceptRefs: [diabetesConcept.raw],
      guidelineRule: 'diabetes_foot_ulcer',
    });
  }

  if (diabetes.neuropathy && neuropathyCode && !primaryCode.includes('.4')) {
    filtered.push({
      code: neuropathyCode,
      reason: 'Diabetic neuropathy additionally documented',
      baseScore: 9,
      conceptRefs: [diabetesConcept.raw],
      guidelineRule: 'diabetes_neuropathy_detail',
    });
  }

  if (diabetes.dueToUnderlyingCondition && /pancreatitis/.test(diabetesConcept.raw.toLowerCase())) {
    filtered.push({
      code: 'K86.1',
      reason: 'Underlying chronic pancreatitis documented with diabetes',
      baseScore: 7,
      conceptRefs: [diabetesConcept.raw],
      guidelineRule: 'diabetes_underlying_condition',
    });
  }

  if (primaryCode.includes('.64')) {
    warnings.push('Hypoglycemia coded as diabetic complication; ensure coma status documented.');
  }

  if (primaryCode.includes('.51') || primaryCode.includes('.52')) {
    filtered = filtered.filter((c) => !c.code.startsWith('I70'));
  }
  if (primaryCode.includes('.4') || primaryCode.includes('.610')) {
    filtered = filtered.filter((c) => !c.code.startsWith('G6'));
  }
  if (/\.3\d{2}$/.test(primaryCode)) {
    filtered = filtered.filter((c) => !(c.code.startsWith('H35') || c.code.startsWith('H36')));
  }

  if (hasNeuropathy) {
    filtered = filtered.filter((candidate) => {
      if (!diabetes.retinopathy?.present && candidate.code.startsWith(`${prefix}.3`)) return false;
      if (!diabetes.nephropathy && !ckdConcept && candidate.code.startsWith(`${prefix}.2`)) return false;
      if (!hasKetoacidosis && candidate.code.startsWith(`${prefix}.1`)) return false;
      if (!hasHyperosmolar && candidate.code.startsWith(`${prefix}.0`)) return false;
      return true;
    });
  }

  return { candidates: filtered, reorderedCodes, primaryCode };
}

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

  const pushWarning = (message: string) => {
    if (!warnings.includes(message)) warnings.push(message);
  };

  const removeCodes = (codesToRemove: string[], reason?: string) => {
    const before = working.length;
    working = working.filter((candidate) => !codesToRemove.includes(candidate.code));
    if (reason && before !== working.length) warnings.push(reason);
  };

  const diabetesResult = applyDiabetesGuidelines(ctx, working, warnings);
  working = diabetesResult.candidates;
  reorderedCodes.push(...diabetesResult.reorderedCodes);
  const diabeticPrimaryCode = diabetesResult.primaryCode;

  working = applyNeuropathyRules(ctx, working, warnings);

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

  if (diabeticPrimaryCode && /\.4\d?/.test(diabeticPrimaryCode)) {
    const withoutPrimary = reorderedCodes.filter((code) => code !== diabeticPrimaryCode);
    reorderedCodes.length = 0;
    reorderedCodes.push(diabeticPrimaryCode, ...withoutPrimary);
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

  working = applyRespiratoryRules(ctx, working, warnings);

  working = applyInclusionExclusionGuidance(working, pushWarning, markCandidate);

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

  if (working.length) {
    const ranked = working.map((candidate) => ({
      ...candidate,
      score: candidate.baseScore,
      source: candidate.guidelineRule || candidate.reason || 'rules_engine',
    })) as RankedCandidate[];

    const resolved = applyExclusionEngine(ranked);
    working = resolved.map((rc) => {
      const existing = working.find((c) => c.code === rc.code);
      if (existing) return { ...existing, baseScore: rc.score };
      return { code: rc.code, reason: rc.source, baseScore: rc.score, conceptRefs: [], guidelineRule: 'exclusion_engine' };
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
