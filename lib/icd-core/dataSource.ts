/// <reference lib="es2021" />
// @ts-nocheck

// ICD-10-CM Encoder core – generated with Codex helper
// Responsibility: Load ICD data and provide search utilities

import * as fs from 'fs';
import * as path from 'path';
import type { IcdCode, IcdIndexTerm } from './models.ts';

declare const __dirname: string;

interface SampleData {
  codes: IcdCode[];
  indexTerms: IcdIndexTerm[];
}

interface IndexedCode {
  entry: IcdCode;
  codeUpper: string;
  normalizedShort: string;
  normalizedLong: string;
  tokens: Set<string>;
}

interface IndexedIndexTerm extends IcdIndexTerm {
  normalizedTerm: string;
  tokens: Set<string>;
}

let codes: IcdCode[] = [];
let indexedCodes: IndexedCode[] = [];
let indexTerms: IcdIndexTerm[] = [];
let normalizedIndexTerms: IndexedIndexTerm[] = [];
let codeMap = new Map<string, IcdCode>();
let indexedCodeMap = new Map<string, IndexedCode>();
let codesByToken = new Map<string, IndexedCode[]>();
let indexTermsByToken = new Map<string, IndexedIndexTerm[]>();
let initialized = false;
let loadingPromise: Promise<void> | null = null;
let resolvedDataPath: string | undefined;
let icdMasterCache: SampleData | null = null;

const MASTER_DATA_FILE = 'icd-master.json';

function resolveDataDirectory(): string | undefined {
  const candidates = [
    path.resolve(process.cwd(), 'data'),
    path.resolve(__dirname, '..', '..', 'data'),
    path.resolve(__dirname, '..', '..', '..', 'data'),
  ];

  return candidates.find((candidate) => fs.existsSync(candidate));
}

function resolveDataPath(): string | undefined {
  if (resolvedDataPath) return resolvedDataPath;

  const explicitPath = process.env.ICD_DATA_PATH ? path.resolve(process.env.ICD_DATA_PATH) : undefined;
  if (explicitPath && fs.existsSync(explicitPath)) {
    resolvedDataPath = explicitPath;
    console.log('[ICD] Using ICD_DATA_PATH override:', resolvedDataPath);
    return resolvedDataPath;
  }

  const dataDir = resolveDataDirectory();
  if (!dataDir) return undefined;

  const candidate = path.join(dataDir, MASTER_DATA_FILE);
  if (fs.existsSync(candidate)) {
    resolvedDataPath = candidate;
    console.log('[ICD] Resolved dataset path:', resolvedDataPath);
  }

  return resolvedDataPath;
}

function normalizeTerm(term: string): string {
  return term
    .toLowerCase()
    .replace(/[^a-z0-9\s\.]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function readJson(filePath: string): any {
  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(raw);
  } catch (error: any) {
    throw new Error(`Failed to parse ICD data at ${filePath}: ${error?.message || error}`);
  }
}

function toIcdCode(raw: any): IcdCode {
  const shortDescription = raw.shortDescription || raw.title || raw.description || raw.longDescription || raw.code;
  const longDescription = raw.longDescription || raw.title || raw.description || shortDescription;

  const type = (raw.type || '').toString().toLowerCase();
  const isHeader = raw.isHeader !== undefined ? raw.isHeader : type === 'header';
  const isBillable = raw.isBillable !== undefined ? raw.isBillable : type !== 'header';

  return {
    ...raw,
    code: raw.code,
    shortDescription,
    longDescription,
    chapter: raw.chapter || raw.category || raw.block || raw.section || 'Unknown',
    block: raw.block || raw.section || raw.category || undefined,
    isBillable,
    isHeader,
  } satisfies IcdCode;
}

function normalizeIndexTermsShape(rawTerms: any[]): IcdIndexTerm[] {
  const normalized: IcdIndexTerm[] = [];

  rawTerms.forEach((item, idx) => {
    if (!item) return;
    if (item.code) {
      normalized.push({
        id: item.id || `idx-${idx}`,
        term: item.term || item.originalTerm || item.code,
        originalTerm: item.originalTerm || item.term || item.code,
        code: item.code,
        weight: item.weight || 1,
        tags: item.tags,
      });
      return;
    }

    if (Array.isArray(item.codes)) {
      item.codes.forEach((code: string, codeIdx: number) => {
        normalized.push({
          id: item.id || `idx-${idx}-${codeIdx}`,
          term: item.term,
          originalTerm: item.term,
          code,
          weight: item.weight || 1,
          tags: item.tags,
        });
      });
    }
  });

  return normalized;
}

function hydrateInMemoryIndexes(dataset: SampleData, dataSourceLabel: string): void {
  codes = (dataset.codes || []).map(toIcdCode);
  indexTerms = normalizeIndexTermsShape(dataset.indexTerms || []);

  codeMap = new Map(codes.map((entry) => [entry.code.toUpperCase(), entry]));
  indexedCodeMap = new Map();
  codesByToken = new Map();
  indexTermsByToken = new Map();

  indexedCodes = codes.map((entry) => {
    const normalizedShort = normalizeTerm(entry.shortDescription || entry.code);
    const normalizedLong = normalizeTerm(entry.longDescription || entry.shortDescription || entry.code);
    const tokens = new Set<string>([
      ...normalizedShort.split(' '),
      ...normalizedLong.split(' '),
      entry.code.toLowerCase(),
      entry.code.replace('.', '').toLowerCase(),
    ]);
    const indexed: IndexedCode = {
      entry,
      codeUpper: entry.code.toUpperCase(),
      normalizedShort,
      normalizedLong,
      tokens,
    };

    tokens.forEach((token) => {
      if (!codesByToken.has(token)) codesByToken.set(token, []);
      codesByToken.get(token)!.push(indexed);
    });

    indexedCodeMap.set(indexed.codeUpper, indexed);

    return indexed;
  });

  normalizedIndexTerms = indexTerms.map((item) => {
    const normalizedTerm = normalizeTerm(item.term);
    const tokens = new Set<string>(normalizedTerm.split(' '));
    const indexed: IndexedIndexTerm = {
      ...item,
      normalizedTerm,
      tokens,
    };

    tokens.forEach((token) => {
      if (!indexTermsByToken.has(token)) indexTermsByToken.set(token, []);
      indexTermsByToken.get(token)!.push(indexed);
    });

    return indexed;
  });

  initialized = true;
  console.log(
    '[ICD] ICD database loaded successfully',
    JSON.stringify({ dataSource: dataSourceLabel, codes: codes.length, indexTerms: indexTerms.length }),
  );
}

export function loadICDMaster(): SampleData {
  if (icdMasterCache) return icdMasterCache;

  const datasetPath = resolveDataPath();
  if (!datasetPath) {
    throw new Error('ICD master database not found: expected data/icd-master.json');
  }

  if (!fs.existsSync(datasetPath)) {
    throw new Error(`ICD master database missing at ${datasetPath}`);
  }

  const parsed = readJson(datasetPath);
  const values = Array.isArray(parsed)
    ? parsed
    : parsed && typeof parsed === 'object'
      ? Object.values(parsed)
      : null;

  if (!values) {
    throw new Error('ICD master database is corrupted or in an unsupported format.');
  }

  icdMasterCache = { codes: values as IcdCode[], indexTerms: (parsed as any)?.indexTerms ?? [] };
  console.log(`ICD MASTER DATABASE LOADED: ${icdMasterCache.codes.length} ENTRIES`);
  return icdMasterCache;
}

export async function initIcdData(): Promise<void> {
  if (initialized) return;
  if (loadingPromise) return loadingPromise;

  loadingPromise = (async () => {
    const dataset = loadICDMaster();
    hydrateInMemoryIndexes(dataset, 'icd-master.json');
  })();

  return loadingPromise;
}

export function getCode(code: string): IcdCode | undefined {
  const needle = code.trim().toUpperCase();
  return codeMap.get(needle);
}

export function searchCodesByTerm(term: string, limit = 20): IcdCode[] {
  const normalized = normalizeTerm(term);
  if (!normalized) return [];
  const tokens = normalized.split(' ');
  const candidateSet = new Set<IndexedCode>();

  tokens.forEach((token) => {
    const bucket = codesByToken.get(token);
    bucket?.forEach((entry) => candidateSet.add(entry));
  });

  const candidates = candidateSet.size > 0 ? [...candidateSet] : indexedCodes;

  const matches = candidates
    .map((item) => {
      const score = computeScore(normalized, item);
      return { entry: item.entry, score };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
  return matches.map((item) => item.entry);
}

function computeScore(term: string, entry: IndexedCode): number {
  let score = 0;
  const normalizedCode = entry.codeUpper.toLowerCase();
  if (normalizedCode.startsWith(term)) score += 5;
  if (entry.normalizedShort.includes(term)) score += 3;
  if (entry.normalizedLong.includes(term)) score += 2;
  return score;
}

function levenshteinDistance(a: string, b: string): number {
  const dp = Array.from({ length: a.length + 1 }, () => new Array<number>(b.length + 1).fill(0));
  for (let i = 0; i <= a.length; i++) dp[i][0] = i;
  for (let j = 0; j <= b.length; j++) dp[0][j] = j;

  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
    }
  }

  return dp[a.length][b.length];
}

export function searchCodesFuzzy(term: string, limit = 10): { code: IcdCode; score: number }[] {
  const normalized = normalizeTerm(term);
  if (!normalized) return [];

  const tokens = normalized.split(' ');
  const candidateSet = new Set<IndexedCode>();
  tokens.forEach((token) => {
    const bucket = codesByToken.get(token);
    bucket?.forEach((item) => candidateSet.add(item));
  });

  const candidates = candidateSet.size > 0 ? [...candidateSet] : indexedCodes;

  const matches = candidates
    .map((item) => {
      const distance = levenshteinDistance(normalized, item.normalizedShort.slice(0, normalized.length));
      const altDistance = levenshteinDistance(normalized, item.normalizedLong.slice(0, Math.max(normalized.length, 6)));
      const bestDistance = Math.min(distance, altDistance);
      const score = Math.max(0, normalized.length - bestDistance);
      return { code: item.entry, score };
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  return matches;
}

export function searchIndex(
  term: string,
  limit = 20,
): { code: IcdCode; score: number; matchedTerm: string }[] {
  const normalized = normalizeTerm(term);
  if (!normalized) return [];
  const tokens = normalized.split(' ');
  const candidateSet = new Set<IndexedIndexTerm>();

  tokens.forEach((token) => {
    const bucket = indexTermsByToken.get(token);
    bucket?.forEach((entry) => candidateSet.add(entry));
  });

  const candidates = candidateSet.size > 0 ? [...candidateSet] : normalizedIndexTerms;

  const matches = candidates
    .map((item) => {
      const matchScore = similarity(normalized, item.normalizedTerm);
      return { item, score: matchScore };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((item) => {
      const code = getCode(item.item.code) || {
        code: item.item.code,
        shortDescription: item.item.term,
        longDescription: item.item.term,
        chapter: 'Unknown',
        isBillable: true,
        isHeader: false,
      };
      return {
        code: code!,
        score: item.score + item.item.weight,
        matchedTerm: item.item.originalTerm,
      };
    });
  return matches;
}

function similarity(search: string, candidate: string): number {
  if (candidate === search) return 10;
  if (candidate.startsWith(search)) return 7;
  if (candidate.includes(search)) return 5;
  const searchTokens = new Set(search.split(' '));
  const candidateTokens = new Set(candidate.split(' '));
  const overlap = [...searchTokens].filter((token) => candidateTokens.has(token)).length;
  return overlap > 0 ? overlap : 0;
}

function computeCodeDepthScore(code: IcdCode): number {
  const compact = code.code.replace(/\./g, '');
  const depthScore = Math.min(20, compact.length * 3);
  const specificity = code.isBillable ? 20 : 8;
  return depthScore + specificity;
}

function normalizedConfidence(score: number): number {
  return Math.max(0, Math.min(100, Math.round(score)));
}

type MatchType = 'exact' | 'index' | 'term' | 'fuzzy';

interface RankedEntry {
  code: string;
  description: string;
  matchedTerm: string;
  matchType: MatchType;
  confidence: number;
  source: 'icd-master';
  score: number;
}

function buildRankedEntry(
  code: IcdCode,
  matchedTerm: string,
  matchType: MatchType,
  matchScore: number,
  confidenceBoost = 0,
): RankedEntry {
  const codeDepthScore = computeCodeDepthScore(code);
  const matchConfidence = matchType === 'exact' ? 30 : matchType === 'index' ? 15 : matchType === 'term' ? 10 : 0;
  const fuzzyPenalty = matchType === 'fuzzy' ? -15 : 0;
  const combinedScore = matchScore * 10 + codeDepthScore + matchConfidence + confidenceBoost + fuzzyPenalty;
  const confidence = normalizedConfidence(combinedScore);

  return {
    code: code.code,
    description: code.longDescription || code.shortDescription || code.code,
    matchedTerm,
    matchType,
    confidence,
    source: 'icd-master',
    score: combinedScore,
  };
}

function pickBetterResult(current: RankedEntry | undefined, next: RankedEntry): RankedEntry {
  if (!current) return next;
  if (current.matchType === 'fuzzy' && next.matchType !== 'fuzzy') return next;
  if (next.matchType === 'exact' && current.matchType !== 'exact') return next;
  return next.score > current.score ? next : current;
}

export function rankedSearch(
  term: string,
  limit = 20,
): { results: RankedEntry[]; suggestions: RankedEntry[]; refinements: string[] } {
  const normalized = normalizeTerm(term);
  if (!normalized) return { results: [], suggestions: [], refinements: [] };

  const indexResults = searchIndex(term, limit * 2);
  const codeMatches = searchCodesByTerm(term, limit * 2);
  const fuzzyMatches = searchCodesFuzzy(term, limit * 2);

  const combined = new Map<string, RankedEntry>();

  indexResults.forEach((match) => {
    const matchType: MatchType = match.matchedTerm && normalizeTerm(match.matchedTerm) === normalized ? 'exact' : 'index';
    const ranked = buildRankedEntry(match.code, match.matchedTerm || term, matchType, match.score, match.score * 2);
    combined.set(match.code.code, pickBetterResult(combined.get(match.code.code), ranked));
  });

  codeMatches.forEach((code) => {
    const indexed = indexedCodeMap.get(code.code.toUpperCase());
    const baseScore = indexed ? computeScore(normalized, indexed) : 1;
    const matchType: MatchType =
      normalizeTerm(code.code) === normalized || normalizeTerm(code.shortDescription) === normalized ? 'exact' : 'term';
    const ranked = buildRankedEntry(code, term, matchType, baseScore, baseScore * 2);
    combined.set(code.code, pickBetterResult(combined.get(code.code), ranked));
  });

  fuzzyMatches.forEach((match) => {
    const ranked = buildRankedEntry(match.code, term, 'fuzzy', match.score);
    combined.set(match.code.code, pickBetterResult(combined.get(match.code.code), ranked));
  });

  const results = Array.from(combined.values())
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  const suggestions = results.slice(0, Math.min(10, results.length));
  const refinements = buildRefinements(normalized, suggestions);

  return { results, suggestions, refinements };
}

function buildRefinements(query: string, ranked: RankedEntry[]): string[] {
  const seen = new Set<string>();
  const refinements: string[] = [];

  normalizedIndexTerms
    .filter((item) => item.normalizedTerm.startsWith(query) && item.normalizedTerm !== query)
    .slice(0, 15)
    .forEach((item) => {
      const suggestion = item.normalizedTerm;
      if (!seen.has(suggestion)) {
        refinements.push(suggestion);
        seen.add(suggestion);
      }
    });

  ranked.forEach((entry) => {
    const tokens = normalizeTerm(entry.description).split(' ');
    tokens.forEach((token) => {
      if (token.length > 3 && token.startsWith(query.split(' ')[0]) && !seen.has(token)) {
        refinements.push(token);
        seen.add(token);
      }
    });
  });

  return refinements.slice(0, 10);
}

export function getSuggestions(term: string, limit = 10): { suggestions: RankedEntry[]; refinements: string[] } {
  const { suggestions, refinements } = rankedSearch(term, limit);
  return { suggestions: suggestions.slice(0, limit), refinements };
}

export function normalizeSearchTerm(term: string): string {
  return normalizeTerm(term);
}

export function getIcdDatasetStats(): {
  totalCodes: number;
  billableCodes: number;
  chapters: number;
  blocks: number;
} {
  if (!initialized) {
    throw new Error('ICD data has not been initialized. Call initIcdData() first.');
  }

  const billableCodes = codes.filter((code) => code.isBillable !== false).length;
  const chapters = new Set(codes.map((code) => code.chapter).filter(Boolean)).size;
  const blocks = new Set(codes.map((code) => code.block).filter(Boolean)).size;

  return {
    totalCodes: codes.length,
    billableCodes,
    chapters,
    blocks,
  };
}

// Preload ICD data on module import to keep lookups fast.
void initIcdData();
