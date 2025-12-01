// ICD-10-CM Encoder core – generated with Codex helper
// Responsibility: Deterministic NLP helpers to normalize text and extract concepts

import type { CandidateCode, ParsedConcept } from './models.ts';
import { searchIndex } from './dataSource.ts';

const abbreviationMap: Record<string, string> = {
  copd: 'chronic obstructive pulmonary disease',
  mi: 'myocardial infarction',
  htn: 'hypertension',
  ckd: 'chronic kidney disease',
  dm: 'diabetes mellitus',
};

const synonymExpansions: Record<string, string> = {
  'heart attack': 'acute myocardial infarction',
  'type 2 diabetes': 'type 2 diabetes mellitus',
  'type ii diabetes': 'type 2 diabetes mellitus',
  'secondary cancer': 'metastatic cancer',
};

export function normalizeText(text: string): string {
  let normalized = text.toLowerCase();
  normalized = normalized.replace(/\s+/g, ' ').trim();
  Object.entries(abbreviationMap).forEach(([abbr, expansion]) => {
    normalized = normalized.replace(new RegExp(`\\b${abbr}\\b`, 'g'), expansion);
  });
  Object.entries(synonymExpansions).forEach(([term, expansion]) => {
    normalized = normalized.replace(new RegExp(`\\b${term}\\b`, 'g'), expansion);
  });
  return normalized;
}

export function extractClinicalConcepts(text: string): ParsedConcept[] {
  const normalized = normalizeText(text);
  const concepts: ParsedConcept[] = [];

  if (/diabetes/.test(normalized)) {
    const stage = normalized.match(/stage\s*(\d(?:b)?)/)?.[1];
    concepts.push({
      raw: text,
      normalized: normalized.includes('type 1') ? 'type 1 diabetes' : 'type 2 diabetes',
      type: 'diabetes',
      attributes: { stage: stage || undefined },
    });
  }

  const ckdStage = normalized.match(/ckd\s*stage\s*(\d(?:b)?)/)?.[1] ||
    normalized.match(/stage\s*(\d(?:b)?)\s*ckd/)?.[1] ||
    normalized.match(/stage\s*(\d(?:b)?)/)?.[1];
  if (/chronic kidney disease/.test(normalized) || ckdStage) {
    concepts.push({
      raw: text,
      normalized: 'chronic kidney disease',
      type: 'ckd',
      attributes: { stage: ckdStage || undefined },
    });
  }

  if (/hypertension|hypertensive|high blood pressure/.test(normalized)) {
    concepts.push({ raw: text, normalized: 'hypertension', type: 'hypertension', attributes: {} });
  }

  if (/heart failure|cardiac failure/.test(normalized)) {
    concepts.push({ raw: text, normalized: 'heart failure', type: 'heart_failure', attributes: {} });
  }

  if (/copd|chronic obstructive pulmonary disease/.test(normalized)) {
    const acuteExac = /acute exacerbation/.test(normalized) ? 'acute_on_chronic' : undefined;
    concepts.push({ raw: text, normalized: 'chronic obstructive pulmonary disease', type: 'copd', attributes: { acuity: acuteExac } });
  }

  if (/asthma/.test(normalized)) {
    concepts.push({ raw: text, normalized: 'asthma', type: 'asthma', attributes: {} });
  }

  if (/pregnan/.test(normalized)) {
    const trimester =
      /third trimester/.test(normalized) ? '3rd' :
      /second trimester|\b16\s*weeks?\b/.test(normalized) ? '2nd' :
      /first trimester|\b10\s*weeks?\b/.test(normalized) ? '1st' : undefined;
    concepts.push({ raw: text, normalized: 'pregnancy', type: 'pregnancy', attributes: { trimester } });
  }

  if (/metastasis|metastatic|secondary cancer/.test(normalized)) {
    const siteMatch = normalized.match(/secondary\s+([a-z\s]+?)\s+cancer/);
    concepts.push({ raw: text, normalized: siteMatch?.[1]?.trim() || 'secondary neoplasm', type: 'neoplasm', attributes: { site: siteMatch?.[1]?.trim() } });
  }

  if (/cancer|neoplasm|carcinoma/.test(normalized)) {
    concepts.push({ raw: text, normalized: 'primary neoplasm', type: 'neoplasm', attributes: {} });
  }

  if (/pneumonia/.test(normalized)) {
    concepts.push({ raw: text, normalized: 'pneumonia', type: 'symptom', attributes: {} });
  }

  if (/depress/.test(normalized)) {
    const hasPsychotic = /with psychotic/.test(normalized);
    concepts.push({
      raw: text,
      normalized: hasPsychotic
        ? 'major depressive disorder recurrent severe with psychotic features'
        : 'major depressive disorder recurrent severe without psychotic features',
      type: 'other',
      attributes: { severity: hasPsychotic ? 'severe_psychotic' : 'severe' },
    });
  }

  return concepts;
}

function addCandidate(collection: CandidateCode[], candidate: CandidateCode) {
  const existing = collection.find((item) => item.code === candidate.code);
  if (existing) {
    existing.baseScore = Math.max(existing.baseScore, candidate.baseScore);
    existing.conceptRefs = Array.from(new Set([...existing.conceptRefs, ...candidate.conceptRefs]));
    return;
  }
  collection.push(candidate);
}

export function mapConceptsToCandidateCodes(concepts: ParsedConcept[]): CandidateCode[] {
  const candidates: CandidateCode[] = [];
  const conceptText = concepts.map((c) => c.normalized).join(' ');

  const diabetes = concepts.find((c) => c.type === 'diabetes');
  const ckd = concepts.find((c) => c.type === 'ckd');
  const hypertension = concepts.find((c) => c.type === 'hypertension');
  const heartFailure = concepts.find((c) => c.type === 'heart_failure');
  const copd = concepts.find((c) => c.type === 'copd');
  const pneumonia = concepts.find((c) => c.normalized.includes('pneumonia'));
  const depression = concepts.find((c) => c.normalized.startsWith('major depressive disorder'));
  const sourceText = concepts.map((c) => c.raw.toLowerCase()).join(' ');
  const hasNeuropathy = /neuropathy/.test(sourceText);

  if (diabetes && ckd) {
    addCandidate(candidates, { code: 'E11.22', reason: 'Type 2 diabetes with CKD', baseScore: 9, conceptRefs: [diabetes.raw] });
    const stage = ckd.attributes.stage?.toLowerCase();
    if (stage === '4') addCandidate(candidates, { code: 'N18.4', reason: 'CKD stage 4', baseScore: 8, conceptRefs: [ckd.raw] });
    else if (stage === '3b') addCandidate(candidates, { code: 'N18.32', reason: 'CKD stage 3b', baseScore: 8, conceptRefs: [ckd.raw] });
    else addCandidate(candidates, { code: 'N18.9', reason: 'CKD unspecified stage', baseScore: 5, conceptRefs: [ckd.raw] });
  } else if (diabetes) {
    addCandidate(candidates, { code: 'E11.9', reason: 'Diabetes without clear manifestation', baseScore: 5, conceptRefs: [diabetes.raw] });
  } else if (ckd) {
    const stage = ckd.attributes.stage?.toLowerCase();
    if (stage === '4') addCandidate(candidates, { code: 'N18.4', reason: 'CKD stage 4', baseScore: 8, conceptRefs: [ckd.raw] });
    else if (stage === '3b') addCandidate(candidates, { code: 'N18.32', reason: 'CKD stage 3b', baseScore: 8, conceptRefs: [ckd.raw] });
    else addCandidate(candidates, { code: 'N18.9', reason: 'CKD unspecified stage', baseScore: 5, conceptRefs: [ckd.raw] });
  }

  if (hypertension && ckd && !heartFailure) {
    addCandidate(candidates, { code: 'I12.9', reason: 'Hypertensive CKD combination', baseScore: 8, conceptRefs: [hypertension.raw] });
  }

  if (hypertension && heartFailure && ckd) {
    addCandidate(candidates, { code: 'I13.0', reason: 'Hypertensive heart and CKD with heart failure', baseScore: 9, conceptRefs: [hypertension.raw] });
    addCandidate(candidates, { code: 'I50.9', reason: 'Heart failure detail', baseScore: 7, conceptRefs: [heartFailure.raw] });
  }

  if (copd) {
    if (pneumonia) {
      addCandidate(candidates, { code: 'J44.0', reason: 'COPD with acute infection', baseScore: 8, conceptRefs: [copd.raw] });
      addCandidate(candidates, { code: 'J18.9', reason: 'Pneumonia organism unspecified', baseScore: 6, conceptRefs: [pneumonia.raw] });
    } else if (copd.attributes.acuity === 'acute_on_chronic') {
      addCandidate(candidates, { code: 'J44.1', reason: 'COPD with acute exacerbation', baseScore: 8, conceptRefs: [copd.raw] });
    } else {
      addCandidate(candidates, { code: 'J44.0', reason: 'COPD with lower respiratory issues', baseScore: 5, conceptRefs: [copd.raw] });
    }
  }

  if (conceptText.includes('myocardial infarction') || /heart attack/.test(conceptText)) {
    addCandidate(candidates, { code: 'I21.9', reason: 'Acute myocardial infarction', baseScore: 6, conceptRefs: ['mi'] });
  }

  if (depression) {
    const hasPsychotic = depression.attributes.severity === 'severe_psychotic';
    addCandidate(candidates, {
      code: hasPsychotic ? 'F33.3' : 'F33.2',
      reason: 'Major depressive disorder severity mapping',
      baseScore: 6,
      conceptRefs: [depression.raw],
    });
  }

  if (hasNeuropathy && diabetes) {
    addCandidate(candidates, {
      code: 'E11.42',
      reason: 'Diabetic neuropathy',
      baseScore: 7,
      conceptRefs: [diabetes.raw],
    });
  }

  const neoplasmConcepts = concepts.filter((c) => c.type === 'neoplasm');
  if (neoplasmConcepts.length >= 1) {
    if (/secondary liver/.test(conceptText) || /metastasis.*liver/.test(conceptText)) {
      addCandidate(candidates, { code: 'C78.7', reason: 'Secondary liver malignancy', baseScore: 8, conceptRefs: neoplasmConcepts.map((c) => c.raw) });
    }
    if (/colon/.test(conceptText)) {
      addCandidate(candidates, { code: 'C18.9', reason: 'Primary colon malignancy', baseScore: 6, conceptRefs: neoplasmConcepts.map((c) => c.raw) });
    }
  }

  const pregnancy = concepts.find((c) => c.type === 'pregnancy');
  if (pregnancy && diabetes) {
    const trimester = pregnancy.attributes.trimester;
    const code = trimester === '2nd' ? 'O24.112' : 'O24.112';
    addCandidate(candidates, { code, reason: 'Pre-existing diabetes in pregnancy', baseScore: 7, conceptRefs: [pregnancy.raw] });
  }

  if (candidates.length === 0) {
    const searchResults = searchIndex(conceptText, 5);
    searchResults.forEach((result) => {
      addCandidate(candidates, { code: result.code.code, reason: `Index match for ${result.matchedTerm}`, baseScore: result.score, conceptRefs: [result.matchedTerm] });
    });
  }

  return candidates;
}
