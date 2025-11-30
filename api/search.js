const fs = require('fs');
const path = require('path');

let cachedData = null;

function loadData() {
  if (!cachedData) {
    const filePath = path.join(process.cwd(), 'data', 'icd.json');
    const raw = fs.readFileSync(filePath, 'utf8');
    cachedData = JSON.parse(raw);
  }
  return cachedData;
}

function normalize(text = '') {
  return text.toString().toLowerCase().trim();
}

const synonymDictionary = {
  copd: 'chronic obstructive pulmonary disease',
  exacerbation: 'acute exacerbation',
  'heart attack': 'myocardial infarction',
  'high blood pressure': 'hypertension',
  'diabetes type 2': 'type 2 diabetes mellitus',
  ckd: 'chronic kidney disease',
  'depression recurrent': 'major depressive disorder recurrent',
  nstemi: 'non st elevation myocardial infarction',
};

function applyNormalization(text = '') {
  let normalized = normalize(text);

  Object.entries(synonymDictionary).forEach(([term, canonical]) => {
    if (term === 'exacerbation' && normalized.includes('acute exacerbation')) {
      return;
    }
    const pattern = new RegExp(`\\b${term.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&')}\\b`, 'g');
    normalized = normalized.replace(pattern, canonical);
  });

  return normalized;
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
    });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (err) {
        reject(err);
      }
    });
    req.on('error', reject);
  });
}

function cleanICDCodes(codes = []) {
  const seen = new Set();
  const unique = codes.reduce((acc, entry) => {
    const code = (entry.code || '').toUpperCase();
    if (!code || seen.has(code)) return acc;
    seen.add(code);
    acc.push({ ...entry, code });
    return acc;
  }, []);

  const hasDiabeticKidneyDisease = unique.some((entry) =>
    /^E(10|11|13)\.2\d/i.test(entry.code || '')
  );
  const hasCkdStage = unique.some((entry) => /^N18\.[1-6]/i.test(entry.code || ''));

  const filtered = unique.filter((entry) => {
    if (hasDiabeticKidneyDisease && /^E(10|11|13)\.9$/i.test(entry.code || '')) {
      return false;
    }
    if (hasCkdStage && /^N18\.9$/i.test(entry.code || '')) {
      return false;
    }
    return true;
  });

  return filtered;
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  let body;
  try {
    body = req.body ?? (await parseBody(req));
  } catch (err) {
    res.status(400).json({ error: 'Invalid JSON body' });
    return;
  }

  const query = normalize(body.query || '');
  if (!query) {
    res.status(400).json({ error: 'Query is required' });
    return;
  }

  let records;
  try {
    records = loadData();
  } catch (err) {
    res.status(500).json({ error: 'Failed to load ICD data' });
    return;
  }

  const normalizedQuery = applyNormalization(query);
  const tokens = normalizedQuery.split(/\s+/).filter(Boolean);
  const rawTokens = query.split(/\s+/).filter(Boolean);

  const hasCopdExacerbation =
    rawTokens.includes('copd') && rawTokens.includes('exacerbation');

  const scored = records
    .map((entry) => {
      const entryCode = normalize(entry.code || '');
      const entryDescription = normalize(entry.description || entry.desc || '');
      const entrySynonyms = Array.isArray(entry.synonyms)
        ? entry.synonyms.map((syn) => applyNormalization(syn))
        : [];

      const codeExact = entryCode === normalizedQuery;
      const synonymExact = entrySynonyms.some((syn) => syn === normalizedQuery);

      const tokensInDescription = tokens.length
        ? tokens.every((token) => entryDescription.includes(token))
        : false;

      const partialCoverage = tokens.length
        ? tokens.filter((token) => entryDescription.includes(token)).length / tokens.length
        : 0;

      const synonymMatch = entrySynonyms.some(
        (syn) => syn.includes(normalizedQuery) || normalizedQuery.includes(syn)
      );

      const combinationRule =
        hasCopdExacerbation && entryCode === 'j44.1' ? true : false;

      let score = 0;

      if (codeExact) score = 100;
      else if (synonymExact) score = 90;
      else if (combinationRule) score = 80;
      else if (tokensInDescription || entryDescription.includes(normalizedQuery)) score = 70;
      else if (partialCoverage >= 0.6 || synonymMatch) score = 60;

      return score > 0 ? { entry, score } : null;
    })
    .filter(Boolean)
    .sort((a, b) => b.score - a.score || (a.entry.code || '').localeCompare(b.entry.code || ''));

  const results = scored.map((item) => item.entry);

  const cleanedResults = cleanICDCodes(results);

  if (normalizedQuery === 'type 2 diabetes with ckd stage 4') {
    const codes = cleanedResults.map((r) => r.code);
    if (!(codes.length === 2 && codes.includes('E11.22') && codes.includes('N18.4'))) {
      console.warn('Inline test failed for diabetes with CKD stage 4 query');
    }
  }

  res.setHeader('Content-Type', 'application/json');
  res.status(200).json({ results: cleanedResults });
};
