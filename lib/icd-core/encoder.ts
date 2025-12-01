// ICD-10-CM Encoder core – generated with Codex helper
// Responsibility: High-level encoder orchestrating NLP, rules, and ordering

import { initIcdData, getCode } from './dataSource.ts';
import { applyGuidelineRules } from './rulesEngine.ts';
import type { CandidateCode, EncoderOutput, EncoderOutputCode } from './models.ts';
import { extractClinicalConcepts, mapConceptsToCandidateCodes, normalizeText } from './nlpParser.ts';

function sequenceCodes(codes: CandidateCode[], priorityOrder: string[] = []): CandidateCode[] {
  const orderMap = new Map(priorityOrder.map((code, idx) => [code, idx]));
  const ordered = [...codes];
  ordered.sort((a, b) => {
    const aOrder = orderMap.has(a.code) ? orderMap.get(a.code)! : Infinity;
    const bOrder = orderMap.has(b.code) ? orderMap.get(b.code)! : Infinity;
    if (aOrder !== bOrder) return aOrder - bOrder;
    return b.baseScore - a.baseScore;
  });
  return ordered;
}

export function encodeDiagnosisText(text: string, opts?: { debug?: boolean }): EncoderOutput {
  initIcdData();
  const normalized = normalizeText(text);
  const concepts = extractClinicalConcepts(normalized);
  const initialCandidates = mapConceptsToCandidateCodes(concepts);
  const ruleResult = applyGuidelineRules({ concepts, initialCandidates });
  const baseCandidates = initialCandidates.filter((c) => !ruleResult.removedCodes.includes(c.code));
  const workingList = ruleResult.finalCandidates ?? [...baseCandidates, ...ruleResult.addedCodes];
  const combinedCandidates = sequenceCodes(workingList, ruleResult.reorderedCodes).filter(
    (candidate, index, arr) => arr.findIndex((c) => c.code === candidate.code) === index,
  );

  const outputCodes: EncoderOutputCode[] = combinedCandidates.map((candidate, index) => {
    const code = getCode(candidate.code);
    return {
      code: candidate.code,
      description: code?.longDescription || code?.shortDescription || candidate.reason,
      reason: candidate.reason,
      order: index + 1,
    };
  });

  return {
    codes: outputCodes,
    warnings: ruleResult.warnings,
    errors: ruleResult.errors,
    debug: opts?.debug ? { concepts, initialCandidates, ruleResult } : undefined,
  };
}
