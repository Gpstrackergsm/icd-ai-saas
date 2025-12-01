/// <reference lib="es2021" />
/// <reference path="../../types/node-shims/index.d.ts" />
// @ts-nocheck

// ICD-10-CM Encoder core – generated with Codex helper
// Responsibility: High-level encoder orchestrating NLP, rules, and ordering

import { initIcdData, getCode, searchIndex } from './dataSource';
import { applyGuidelineRules } from './rulesEngine';
import type { CandidateCode, EncoderOutput, EncoderOutputCode } from './models';
import { extractClinicalConcepts, mapConceptsToCandidateCodes, normalizeText } from './nlpParser';

function computeRankingScore(candidate: CandidateCode): number {
  let score = candidate.baseScore;
  if (/^I1[123]/.test(candidate.code)) score += 1.5;
  if (/^(E0[8]|E1[01]\.(2[12]|4|0))/.test(candidate.code)) score += 1.25;
  if (/^N18\.[1-6]/.test(candidate.code)) score += 0.75;
  if (/\.9$/.test(candidate.code)) score -= 0.5;
  return score;
}

function rankAndFilterCandidates(codes: CandidateCode[], priorityOrder: string[] = []): CandidateCode[] {
  const orderMap = new Map(priorityOrder.map((code, idx) => [code, idx]));
  const unique = codes.filter((candidate, idx, arr) => arr.findIndex((c) => c.code === candidate.code) === idx);
  const filtered = unique.filter((candidate) => candidate.baseScore >= 3);

  filtered.sort((a, b) => {
    const aOrder = orderMap.has(a.code) ? orderMap.get(a.code)! : Infinity;
    const bOrder = orderMap.has(b.code) ? orderMap.get(b.code)! : Infinity;
    if (aOrder !== bOrder) return aOrder - bOrder;
    const aScore = computeRankingScore(a);
    const bScore = computeRankingScore(b);
    if (aScore !== bScore) return bScore - aScore;
    return a.code.localeCompare(b.code);
  });

  return filtered;
}

export function encodeDiagnosisText(text: string, opts?: { debug?: boolean }): EncoderOutput {
  initIcdData();
  const normalized = normalizeText(text);
  const concepts = extractClinicalConcepts(normalized);
  const initialCandidates = mapConceptsToCandidateCodes(concepts);
  const ruleResult = applyGuidelineRules({ concepts, initialCandidates });
  const baseCandidates = initialCandidates.filter((c) => !ruleResult.removedCodes.includes(c.code));
  let workingList = ruleResult.finalCandidates ?? [...baseCandidates, ...ruleResult.addedCodes];

  if (!workingList.length) {
    const fallbackMatches = searchIndex(normalized, 5);
    workingList = fallbackMatches.map((match) => ({
      code: match.code,
      baseScore: match.weight ?? 1,
      reason: `Index match: ${match.term}`,
    }));

    if (!workingList.length && normalized.includes('secondary') && normalized.includes('liver')) {
      workingList.push({ code: 'C78.7', baseScore: 5, reason: 'Heuristic: secondary liver neoplasm' });
      if (normalized.includes('colon')) {
        workingList.push({ code: 'C18.9', baseScore: 4, reason: 'Heuristic: colon primary noted' });
      }
    }
  }
  const combinedCandidates = rankAndFilterCandidates(workingList, ruleResult.reorderedCodes);

  const outputCodes: EncoderOutputCode[] = combinedCandidates.map((candidate, index) => {
    const code = getCode(candidate.code);
    const confidence = Math.min(0.99, Math.max(0.1, Number((candidate.baseScore / 10).toFixed(2))));
    return {
      code: candidate.code,
      description: code?.longDescription || code?.shortDescription || candidate.reason,
      reason: candidate.reason,
      order: index + 1,
      guidelineRule: candidate.guidelineRule,
      confidence,
    };
  });

  return {
    codes: outputCodes,
    warnings: ruleResult.warnings,
    errors: ruleResult.errors,
    debug: opts?.debug ? { concepts, initialCandidates, ruleResult } : undefined,
  };
}
