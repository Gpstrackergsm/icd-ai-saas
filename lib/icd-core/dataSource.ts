// ICD-10-CM Encoder core – generated with Codex helper
// Responsibility: Load ICD data and provide search utilities

import fs from 'fs';
import path from 'path';
import { IcdCode, IcdIndexTerm } from './models';

interface SampleData {
  codes: IcdCode[];
  indexTerms: IcdIndexTerm[];
}

let codes: IcdCode[] = [];
let indexTerms: IcdIndexTerm[] = [];
let initialized = false;

function normalizeTerm(term: string): string {
  return term
    .toLowerCase()
    .replace(/[^a-z0-9\s\.]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export async function initIcdData(): Promise<void> {
  if (initialized) return;
  const datasetPath = path.join(process.cwd(), 'data', 'icd-sample.json');
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
