import { SequencedCode } from './rulesEngine.js';

const hccCodes = [/^E0[89]/, /^E1[013]\.[1-9]/];

export function flagHcc(sequence: SequencedCode[]): SequencedCode[] {
  return sequence.map((entry) => ({
    ...entry,
    hcc: hccCodes.some((pattern) => pattern.test(entry.code)),
  }));
}
