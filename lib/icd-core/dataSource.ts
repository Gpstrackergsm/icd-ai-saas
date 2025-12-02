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
}

interface IndexedIndexTerm extends IcdIndexTerm {
  normalizedTerm: string;
}

let codes: IcdCode[] = [];
let indexedCodes: IndexedCode[] = [];
let indexTerms: IcdIndexTerm[] = [];
let normalizedIndexTerms: IndexedIndexTerm[] = [];
let codeMap = new Map<string, IcdCode>();
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
  indexedCodes = codes.map((entry) => ({
    entry,
    codeUpper: entry.code.toUpperCase(),
    normalizedShort: normalizeTerm(entry.shortDescription || entry.code),
    normalizedLong: normalizeTerm(entry.longDescription || entry.shortDescription || entry.code),
  }));

  normalizedIndexTerms = indexTerms.map((item) => ({
    ...item,
    normalizedTerm: normalizeTerm(item.term),
  }));

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
  const matches = indexedCodes
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

  const matches = indexedCodes
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
  const matches = normalizedIndexTerms
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
