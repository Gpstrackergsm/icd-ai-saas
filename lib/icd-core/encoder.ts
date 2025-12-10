/// <reference lib="es2021" />
// @ts-nocheck

// ICD-10-CM Encoder core – generated with Codex helper
// Responsibility: High-level encoder orchestrating NLP, rules, and ordering

import { getCode, initIcdData, searchIndex } from './dataSource';
import { applyGuidelineRules } from './rulesEngine';
import type { CandidateCode } from './models';
import { extractClinicalConcepts, mapConceptsToCandidateCodes, normalizeText } from './nlpParser';
import { runRulesEngine } from '../rulesEngine';

export interface EncoderResultCode {
  code: string;
  title: string;
  chapter?: string;
  block?: string;
  billable: boolean;
  score: number;
  isPrimary: boolean;
  rationale?: string;
  source?: string;
  confidence?: number;
  guidelineRule?: string;
}

export interface EncoderResult {
  text: string;
  codes: EncoderResultCode[];
  warnings?: string[];
  errors?: string[];
}

function computeRankingScore(candidate: CandidateCode): number {
  let score = candidate.baseScore;
  if (/^I1[123]/.test(candidate.code)) score += 1.5;
  if (/^(E0[8]|E1[01]\\.(2[12]|4|0))/.test(candidate.code)) score += 1.25;
  if (/^N18\\.[1-6]/.test(candidate.code)) score += 0.75;
  if (/\\.9$/.test(candidate.code)) score -= 0.5;
  return Math.max(0, score);
}

function enrichWithSearchIndex(text: string, working: CandidateCode[]): CandidateCode[] {
  const matches = searchIndex(text, 8);
  const asCandidates = matches.map((match) => ({
    code: match.code,
    baseScore: Math.max(3, match.weight ?? 3),
    reason: `Index match: ${match.term}`,
    conceptRefs: [match.term],
  }));

  const seen = new Set(working.map((c) => c.code));
  asCandidates.forEach((candidate) => {
    if (!seen.has(candidate.code)) working.push(candidate);
  });

  return working;
}

function applyChapterAwareness(candidates: CandidateCode[]): CandidateCode[] {
  return candidates.map((candidate) => {
    const details = getCode(candidate.code);
    if (details?.chapter?.toLowerCase().includes('endocrine') && candidate.code.startsWith('E')) {
      return { ...candidate, baseScore: candidate.baseScore + 0.25 };
    }
    if (details?.chapter?.toLowerCase().includes('circulatory') && /^I\\d/.test(candidate.code)) {
      return { ...candidate, baseScore: candidate.baseScore + 0.25 };
    }
    return candidate;
  });
}

function addHeuristicNeoplasmCandidates(text: string, candidates: CandidateCode[]): CandidateCode[] {
  const normalized = text.toLowerCase();
  const exists = (code: string) => candidates.some((c) => c.code === code);
  if (normalized.includes('secondary') && normalized.includes('liver') && !exists('C78.7')) {
    candidates.push({ code: 'C78.7', reason: 'Heuristic: secondary liver neoplasm', baseScore: 9, conceptRefs: ['liver'] });
    if (normalized.includes('colon') && !exists('C18.9')) {
      candidates.push({ code: 'C18.9', reason: 'Heuristic: colon primary noted', baseScore: 7, conceptRefs: ['colon'] });
    }
  }
  return candidates;
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

function removeNonBillableWhenAlternatives(candidates: CandidateCode[]): CandidateCode[] {
  const billableCodes = new Set(
    candidates
      .filter((candidate) => getCode(candidate.code)?.isBillable !== false)
      .map((candidate) => candidate.code.split('.')[0]),
  );

  return candidates.filter((candidate) => {
    const codeInfo = getCode(candidate.code);
    if (!codeInfo || codeInfo.isBillable !== false) return true;
    const root = candidate.code.split('.')[0];
    return !billableCodes.has(root);
  });
}

export function encodeDiagnosisText(text: string): EncoderResult {
  initIcdData();
  const normalized = normalizeText(text || '');

  // FIRST: Run new domain-specific resolvers
  const domainResult = runRulesEngine(text);

  // CRITICAL: Check for hard-stop errors from the domain engine (Validation Rules)
  // If strict validation fails (e.g., O80+Complication), we MUST STOP and not fall back to NLP.
  if (domainResult.errors && domainResult.errors.length > 0) {
    return {
      text: normalized,
      codes: [], // Block generation
      warnings: [...(domainResult.warnings || [])],
      errors: domainResult.errors // Return strict errors
    };
  }

  // If domain resolvers found codes, use them as high-priority candidates
  let workingCandidates: CandidateCode[] = [];

  if (domainResult.sequence && domainResult.sequence.length > 0) {
    workingCandidates = domainResult.sequence.map((seq, idx) => ({
      code: seq.code,
      reason: seq.note || seq.label || `Domain resolver: ${seq.triggeredBy}`,
      baseScore: 12 - idx, // Primary gets highest score
      conceptRefs: [seq.triggeredBy],
      guidelineRule: seq.triggeredBy,
    }));
  }

  // THEN: Run legacy NLP extraction as fallback/enrichment
  const concepts = extractClinicalConcepts(normalized);
  let nlpCandidates = mapConceptsToCandidateCodes(concepts);
  nlpCandidates = enrichWithSearchIndex(normalized, nlpCandidates);
  nlpCandidates = applyChapterAwareness(nlpCandidates);
  nlpCandidates = addHeuristicNeoplasmCandidates(normalized, nlpCandidates);

  // Merge: Domain codes take priority, NLP fills gaps
  const domainCodes = new Set(workingCandidates.map(c => c.code));
  nlpCandidates.forEach(candidate => {
    if (!domainCodes.has(candidate.code)) {
      workingCandidates.push(candidate);
    }
  });

  const ruleResult = applyGuidelineRules({ concepts, initialCandidates: workingCandidates });
  const baseCandidates = workingCandidates.filter((c) => !ruleResult.removedCodes.includes(c.code));
  let resolvedCandidates = ruleResult.finalCandidates ?? [...baseCandidates, ...ruleResult.addedCodes];

  if (!resolvedCandidates.length) {
    resolvedCandidates = enrichWithSearchIndex(normalized, []);
  }

  const postBillable = removeNonBillableWhenAlternatives(resolvedCandidates);
  const ranked = rankAndFilterCandidates(postBillable, ruleResult.reorderedCodes);
  const limited = ranked.slice(0, Math.min(15, Math.max(3, ranked.length)));

  const codes: EncoderResultCode[] = limited.map((candidate, index) => {
    const codeMeta = getCode(candidate.code);
    const score = Number(computeRankingScore(candidate).toFixed(2));
    const confidence = Math.min(0.99, Math.max(0.1, Number((candidate.baseScore / 10).toFixed(2))));
    return {
      code: candidate.code,
      title: codeMeta?.longDescription || codeMeta?.shortDescription || candidate.reason,
      chapter: codeMeta?.chapter,
      block: codeMeta?.block,
      billable: codeMeta?.isBillable !== false,
      score,
      isPrimary: index === 0,
      rationale: candidate.reason,
      source: candidate.guidelineRule,
      confidence,
      guidelineRule: candidate.guidelineRule,
    };
  });

  if (codes.length) codes[0].isPrimary = true;

  // Merge warnings from both engines
  const allWarnings = [...(domainResult.warnings || []), ...(ruleResult.warnings || [])];

  return {
    text: normalized,
    codes,
    warnings: allWarnings,
    errors: ruleResult.errors,
  };
}
