// ICD-10-CM Encoder core – generated with Codex helper
// Responsibility: Load ICD data and provide search utilities

import fs from 'fs';
import path from 'path';
import type { IcdCode, IcdIndexTerm } from './models.ts';

declare const __dirname: string;

interface SampleData {
  codes: IcdCode[];
  indexTerms: IcdIndexTerm[];
}

let codes: IcdCode[] = [];
let indexTerms: IcdIndexTerm[] = [];
let initialized = false;
let resolvedDataPath: string | undefined;

const DATA_FILE = 'icd-sample.json';

function resolveDataPath(): string {
  if (resolvedDataPath) return resolvedDataPath;

  const candidates = [
    path.resolve(process.cwd(), 'data', DATA_FILE),
    path.resolve(__dirname, '..', '..', 'data', DATA_FILE),
    path.resolve(__dirname, '..', '..', '..', 'data', DATA_FILE),
  ];

  const existing = candidates.find((candidate) => fs.existsSync(candidate));

  if (!existing) {
    throw new Error('ICD data missing');
  }

  resolvedDataPath = existing;
  console.log('[ICD] Resolved dataset path:', resolvedDataPath);
  return resolvedDataPath!;
}

function normalizeTerm(term: string): string {
  return term
    .toLowerCase()
    .replace(/[^a-z0-9\s\.]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export async function initIcdData(): Promise<void> {
  if (initialized) return;
  const datasetPath = resolveDataPath();

  if (!fs.existsSync(datasetPath)) {
    throw new Error('ICD data missing');
  }

  console.log('[ICD] Loading dataset from', datasetPath);

  const raw = fs.readFileSync(datasetPath, 'utf-8');
  const parsed: SampleData = JSON.parse(raw);
  codes = parsed.codes;
  indexTerms = parsed.indexTerms;
  initialized = true;
}

export function getCode(code: string): IcdCode | undefined {
  const needle = code.trim().toUpperCase();
  return codes.find((entry) => entry.code.toUpperCase() === needle);
}

export function searchCodesByTerm(term: string, limit = 20): IcdCode[] {
  const normalized = normalizeTerm(term);
  if (!normalized) return [];
  const matches = codes
    .map((entry) => {
      const score = computeScore(normalized, entry);
      return { entry, score };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
  return matches.map((item) => item.entry);
}

function computeScore(term: string, entry: IcdCode): number {
  let score = 0;
  if (entry.code.toLowerCase().startsWith(term)) score += 5;
  if (normalizeTerm(entry.shortDescription).includes(term)) score += 3;
  if (normalizeTerm(entry.longDescription).includes(term)) score += 2;
  return score;
}

export function searchIndex(
  term: string,
  limit = 20,
): { code: IcdCode; score: number; matchedTerm: string }[] {
  const normalized = normalizeTerm(term);
  if (!normalized) return [];
  const matches = indexTerms
    .map((item) => {
      const matchScore = similarity(normalized, item.term);
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
        code,
        score: item.score + item.item.weight,
        matchedTerm: item.item.originalTerm,
      };
    });
  return matches;
}

function similarity(search: string, candidate: string): number {
  const normalizedCandidate = normalizeTerm(candidate);
  if (normalizedCandidate === search) return 10;
  if (normalizedCandidate.startsWith(search)) return 7;
  if (normalizedCandidate.includes(search)) return 5;
  const searchTokens = new Set(search.split(' '));
  const candidateTokens = new Set(normalizedCandidate.split(' '));
  const overlap = [...searchTokens].filter((token) => candidateTokens.has(token)).length;
  return overlap > 0 ? overlap : 0;
}

export function normalizeSearchTerm(term: string): string {
  return normalizeTerm(term);
}
