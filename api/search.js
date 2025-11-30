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

const PRIMARY_MAP = {
  colon: 'C18.9',
  breast: 'C50.919',
  lung: 'C34.90',
  pancreas: 'C25.9',
  prostate: 'C61',
  stomach: 'C16.9',
};

const SECONDARY_MAP = {
  liver: 'C78.7',
  brain: 'C79.31',
  bone: 'C79.51',
  lung: 'C78.00',
  'lymph node': 'C77.9',
};

const CKD_STAGE_MAP = {
  1: 'N18.1',
  2: 'N18.2',
  3: 'N18.3',
  4: 'N18.4',
  5: 'N18.5',
};

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
  'secondary cancer': 'metastasis',
  metastatic: 'secondary malignant neoplasm',
  from: 'primary',
  'due to': 'primary',
  of: 'primary',
  'colon cancer': 'malignant neoplasm of colon',
  'liver cancer': 'malignant neoplasm of liver',
};

function escapeRegExp(string = '') {
  return string.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&');
}

function applyNormalization(text = '') {
  let normalized = normalize(text);

  Object.entries(synonymDictionary).forEach(([term, canonical]) => {
    if (term === 'exacerbation' && normalized.includes('acute exacerbation')) {
      return;
    }
    const pattern = new RegExp(`\\b${escapeRegExp(term)}\\b`, 'g');
    normalized = normalized.replace(pattern, canonical);
  });

  return normalized;
}

function detectMetastasis(rawQuery = '', normalizedQuery = '') {
  const metastasisKeywords = ['secondary', 'metastasis', 'metastatic', 'mets', 'spread to'];
  const hasMetastasis = metastasisKeywords.some((keyword) => normalizedQuery.includes(keyword));
  if (!hasMetastasis) return { detected: false, results: [] };

  const organNames = Array.from(
    new Set([...Object.keys(SECONDARY_MAP), ...Object.keys(PRIMARY_MAP)])
  );

  const organMatches = organNames
    .map((organ) => {
      const pattern = new RegExp(`\\b${escapeRegExp(organ)}\\b`);
      const index = normalizedQuery.search(pattern);
      if (index === -1) return null;
      return { organ, index };
    })
    .filter(Boolean)
    .sort((a, b) => a.index - b.index);

  const secondarySite = organMatches[0]?.organ;

  let primarySite = null;
  organNames.some((organ) => {
    const pattern = new RegExp(`\\b(from|due to|of|primary)\\s+${escapeRegExp(organ)}\\b`);
    if (pattern.test(rawQuery)) {
      primarySite = organ;
      return true;
    }
    return false;
  });

  if (!primarySite && organMatches.length > 1) {
    primarySite = organMatches.find((match) => match.organ !== secondarySite)?.organ;
  }

  const secondaryCode = secondarySite ? SECONDARY_MAP[secondarySite] : null;
  const primaryCode = primarySite ? PRIMARY_MAP[primarySite] : null;

  if (secondaryCode && primaryCode) {
    return {
      detected: true,
      results: [secondaryCode, primaryCode],
      secondarySite,
      primarySite,
    };
  }

  return { detected: true, results: [] };
}

function detectHypertensiveHeartCkd(normalizedQuery = '') {
  const hasHypertension = normalizedQuery.includes('hypertensive') || normalizedQuery.includes('hypertension');
  const hasHeart = normalizedQuery.includes('heart');
  const hasKidney =
    normalizedQuery.includes('kidney') ||
    normalizedQuery.includes('ckd') ||
    normalizedQuery.includes('chronic kidney disease');

  if (!(hasHypertension && hasHeart && hasKidney)) {
    return { detected: false, results: [] };
  }

  const hasHeartFailure =
    normalizedQuery.includes('heart failure') ||
    normalizedQuery.includes('cardiac failure') ||
    normalizedQuery.split(/\s+/).includes('hf');

  const baseCode = hasHeartFailure ? 'I13.0' : 'I13.10';
  const results = [{ code: baseCode }];

  const stageMatch = normalizedQuery.match(/ckd\s*stage\s*(\d+)/);
  const stageNumber = stageMatch ? stageMatch[1] : null;
  const stageCode = stageNumber && CKD_STAGE_MAP[stageNumber];
  if (stageCode) {
    results.push({ code: stageCode });
  }

  return { detected: true, results };
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

  const hypertensiveHeartCkd = detectHypertensiveHeartCkd(normalizedQuery);
  if (hypertensiveHeartCkd.detected) {
    const cleanedHypertensiveResults = cleanICDCodes(hypertensiveHeartCkd.results);
    if (normalizedQuery === 'hypertensive heart and chronic kidney disease with heart failure and ckd stage 4') {
      const codes = cleanedHypertensiveResults.map((r) => r.code);
      if (!(codes[0] === 'I13.0' && codes[1] === 'N18.4')) {
        console.warn('Inline test failed for hypertensive heart and CKD stage 4 with HF query');
      }
    }
    res.setHeader('Content-Type', 'application/json');
    res.status(200).json({ results: cleanedHypertensiveResults });
    return;
  }

  const metastasis = detectMetastasis(query, normalizedQuery);
  if (metastasis.detected) {
    const metastasisResults = Array.isArray(metastasis.results)
      ? metastasis.results.map((code, index) => {
          if (index === 0 && metastasis.secondarySite) {
            return {
              code,
              description: `Secondary malignant neoplasm of ${metastasis.secondarySite}`,
            };
          }
          if (index === 1 && metastasis.primarySite) {
            return {
              code,
              description: `Primary malignant neoplasm of ${metastasis.primarySite}`,
            };
          }
          return { code };
        })
      : [];
    const cleanedMetastasisResults = cleanICDCodes(metastasisResults);
    if (query === 'secondary liver cancer from colon') {
      const codes = cleanedMetastasisResults.map((r) => r.code);
      if (!(codes[0] === 'C78.7' && codes[1] === 'C18.9')) {
        console.warn('Inline test failed for secondary liver cancer from colon query');
      }
    }
    res.setHeader('Content-Type', 'application/json');
    res.status(200).json({ results: cleanedMetastasisResults });
    return;
  }
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
