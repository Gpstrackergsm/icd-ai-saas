import { SequencedCode } from './rulesEngine.js';

export function buildAuditTrail(sequence: SequencedCode[], warnings: string[]): string[] {
  const audit: string[] = [];
  sequence.forEach((entry) => {
    audit.push(`${entry.code}: triggered by ${entry.triggeredBy}`);
    if (entry.note) audit.push(`${entry.code}: note ${entry.note}`);
  });
  warnings.forEach((warn) => audit.push(`Warning: ${warn}`));
  return audit;
}
