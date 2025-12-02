import { SequencedCode } from './rulesEngine.js';

export interface ScoredCode extends SequencedCode {
  score: number;
}

export function scoreSequence(sequence: SequencedCode[], warnings: string[]): ScoredCode[] {
  return sequence.map((entry) => {
    let score = 0.5;
    if (entry.code.includes('.')) score += 0.1;
    if (/\d{2,}$/.test(entry.code.replace('.', ''))) score += 0.1;
    if (entry.hcc) score += 0.1;
    if (warnings.length) score -= 0.1;
    if (/\.6/.test(entry.code)) score += 0.05; // complication codes
    score = Math.min(1, Math.max(0, score));
    return { ...entry, score };
  });
}
