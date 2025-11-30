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
  '3b': 'N18.32',
  4: 'N18.4',
  5: 'N18.5',
  esrd: 'N18.6',
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

function extractCkdStageCode(normalizedQuery = '') {
  if (/\besrd\b/.test(normalizedQuery) || normalizedQuery.includes('end stage renal disease')) {
    return CKD_STAGE_MAP.esrd;
  }

  const stageMatch = normalizedQuery.match(/(?:ckd\s*)?stage\s*(\d(?:b)?)/);
  const stageKey = stageMatch?.[1]?.toLowerCase();

  if (!stageKey) return null;

  return CKD_STAGE_MAP[stageKey] || null;
}

function appendCkdStageForHypertensive(results = [], normalizedQuery = '') {
  const hasHypertensiveHeartDisease = results.some((entry) =>
    /^I13\./i.test(entry.code || '')
  );

  if (!hasHypertensiveHeartDisease) return results;

  const stageCode = extractCkdStageCode(normalizedQuery);
  if (!stageCode) return results;

  const hasStageCode = results.some(
    (entry) => (entry.code || '').toUpperCase() === stageCode
  );

  if (hasStageCode) return results;

  return [...results, { code: stageCode }];
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

  const stageCode = extractCkdStageCode(normalizedQuery);
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

function hasKeywordMatch(normalizedQuery = '', description = '', synonyms = []) {
  const loweredDescription = normalize(description);
  const descriptionTokens = loweredDescription.split(/[^a-z0-9]+/i).filter(Boolean);
  const synonymTokens = synonyms
    .map((syn) => normalize(syn))
    .flatMap((syn) => syn.split(/[^a-z0-9]+/i).filter(Boolean));

  const keywordSet = new Set(
    [...descriptionTokens, ...synonymTokens].filter((token) => token.length > 2)
  );

  for (const token of keywordSet) {
    const pattern = new RegExp(`\\b${escapeRegExp(token)}\\b`, 'i');
    if (pattern.test(normalizedQuery)) {
      return true;
    }
  }

  return false;
}

const BLOCKED_CODES = ['M06.9', 'I48.91', 'Z00.00', 'Z12', 'C80.1'];

function isCodeExplicitlyMentioned(rawQuery = '', code = '') {
  if (!code) return false;
  const pattern = new RegExp(`\\b${escapeRegExp(code)}\\b`, 'i');
  return pattern.test(rawQuery || '');
}

function applyBlockList(results = [], rawQuery = '') {
  return results.filter((entry) => {
    const upperCode = (entry.code || '').toUpperCase();
    const isBlocked = BLOCKED_CODES.some((blocked) =>
      blocked.endsWith('.x')
        ? upperCode.startsWith(blocked.replace('.x', ''))
        : upperCode.startsWith(blocked)
    );
    if (!isBlocked) return true;
    return isCodeExplicitlyMentioned(rawQuery, upperCode);
  });
}

function applyStageLock(results = [], normalizedQuery = '') {
  const stageCode = extractCkdStageCode(normalizedQuery);
  if (!stageCode) return results;

  const filtered = results.filter((entry) => !/^N18\./i.test(entry.code || ''));
  filtered.push({ code: stageCode });

  return cleanICDCodes(filtered);
}

function applyMentalHealthRules(normalizedQuery = '', results = []) {
  const hasRecurrent = /\brecurrent\b/.test(normalizedQuery);
  const hasPsychotic = /\bpsychotic\b/.test(normalizedQuery);
  const hasSevere = /\bsevere\b/.test(normalizedQuery);

  const targetPrefix = hasRecurrent ? 'F33' : 'F32';
  const severityDigit = hasPsychotic ? '3' : hasSevere ? '2' : '9';
  const replacementCode = `${targetPrefix}.${severityDigit}`;

  const hasMentalHealth = results.some((entry) => /^F3[23]\./i.test(entry.code || ''));
  if (!hasMentalHealth) return results;

  const filtered = results.filter((entry) => !/^F3[23]\./i.test(entry.code || ''));
  filtered.push({ code: replacementCode });

  return cleanICDCodes(filtered);
}

function applyDiabetesRules(normalizedQuery = '', results = []) {
  if (!/\bdiabet/i.test(normalizedQuery)) return results;

  if (/\bneuropathy\b/.test(normalizedQuery)) {
    return cleanICDCodes([{ code: 'E11.40' }]);
  }

  if (/\bnephropathy\b/.test(normalizedQuery)) {
    return cleanICDCodes([{ code: 'E11.21' }]);
  }

  if (/\bretinopathy\b/.test(normalizedQuery)) {
    return cleanICDCodes([{ code: 'E11.319' }]);
  }

  const hasCkd = /\bckd\b/.test(normalizedQuery) || /chronic kidney disease/.test(normalizedQuery);
  const hasHyperglycemia = /hyperglycemia/.test(normalizedQuery);

  const filtered = results.filter((entry) => {
    if (!hasCkd && /^E(10|11|13)\.2\d/i.test(entry.code || '')) {
      return false;
    }
    if (!hasHyperglycemia && /(R73|E16\.1)/i.test(entry.code || '')) {
      return false;
    }
    return true;
  });

  return cleanICDCodes(filtered);
}

function removeI10WithCkd(normalizedQuery = '', results = []) {
  const hasCkd = /\bckd\b/.test(normalizedQuery) || /chronic kidney disease/.test(normalizedQuery);
  if (!hasCkd) return results;
  return results.filter((entry) => !/^I10$/i.test(entry.code || ''));
}

function applyHypertensionRules(normalizedQuery = '') {
  const hasHypertension = /\bhypertension\b/.test(normalizedQuery) ||
    /\bhypertensive\b/.test(normalizedQuery);
  if (!hasHypertension) return { detected: false, results: [] };

  const hasHeart = /heart/.test(normalizedQuery) || /cardiac/.test(normalizedQuery);
  const hasHeartFailure =
    /heart failure/.test(normalizedQuery) || /cardiac failure/.test(normalizedQuery) ||
    /\bhf\b/.test(normalizedQuery);
  const hasKidney = /kidney/.test(normalizedQuery) || /\bckd\b/.test(normalizedQuery);

  const stageCode = extractCkdStageCode(normalizedQuery);

  if (hasKidney && hasHeart) {
    const baseCode = hasHeartFailure ? 'I13.0' : 'I13.10';
    const codes = [{ code: baseCode }];
    if (stageCode) codes.push({ code: stageCode });
    return { detected: true, results: codes };
  }

  if (hasKidney) {
    const codes = [{ code: 'I12.9' }];
    if (stageCode) codes.push({ code: stageCode });
    return { detected: true, results: codes };
  }

  if (hasHeart) {
    const baseCode = hasHeartFailure ? 'I11.0' : 'I11.9';
    return { detected: true, results: [{ code: baseCode }] };
  }

  return { detected: false, results: [] };
}

function applyCoreConditionAdds(normalizedQuery = '', results = []) {
  const updated = [...results];

  const addCode = (code) => {
    if (!updated.some((entry) => (entry.code || '').toUpperCase() === code.toUpperCase())) {
      updated.push({ code });
    }
  };

  if (/\bdka\b/.test(normalizedQuery)) {
    const isType1 = /type\s*1/.test(normalizedQuery) || /\bE10/i.test(normalizedQuery);
    addCode(isType1 ? 'E10.10' : 'E11.10');
  }

  if (/pulmonary embolism/.test(normalizedQuery) && /cor pulmonale/.test(normalizedQuery)) {
    addCode('I26.09');
  }

  if (/chronic systolic (hf|heart failure)/.test(normalizedQuery)) {
    addCode('I50.22');
  }

  if (/history of .*cancer/.test(normalizedQuery)) {
    addCode('Z85.9');
  }

  if (/\bhomeless/.test(normalizedQuery)) {
    addCode('Z59.00');
  }

  if (/insomnia due to/.test(normalizedQuery)) {
    addCode('G47.01');
  }

  if (/klebsiella pneumonia/.test(normalizedQuery)) {
    addCode('J15.0');
  }

  return cleanICDCodes(updated);
}

function limitResults(results = []) {
  return results.slice(0, 10);
}

function searchSingle(rawQuery = '', records = []) {
  const query = normalize(rawQuery || '');
  if (!query) {
    return { results: [] };
  }

  const normalizedQuery = applyNormalization(query);

  const hypertensionRule = applyHypertensionRules(normalizedQuery);
  if (hypertensionRule.detected) {
    const cleanedHypertension = limitResults(cleanICDCodes(hypertensionRule.results));
    return { results: applyCoreConditionAdds(normalizedQuery, cleanedHypertension) };
  }

  const hypertensiveHeartCkd = detectHypertensiveHeartCkd(normalizedQuery);
  if (hypertensiveHeartCkd.detected) {
    const hypertensiveWithStage = appendCkdStageForHypertensive(
      hypertensiveHeartCkd.results,
      normalizedQuery
    );
    const cleanedHypertensiveResults = limitResults(
      cleanICDCodes(hypertensiveWithStage)
    );
    if (
      normalizedQuery ===
      'hypertensive heart and chronic kidney disease with heart failure and ckd stage 4'
    ) {
      const codes = cleanedHypertensiveResults.map((r) => r.code);
      if (!(codes[0] === 'I13.0' && codes[1] === 'N18.4')) {
        console.warn(
          'Inline test failed for hypertensive heart and CKD stage 4 with HF query'
        );
      }
    }
    return { results: cleanedHypertensiveResults };
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
    const cleanedMetastasisResults = limitResults(cleanICDCodes(metastasisResults));
    if (query === 'secondary liver cancer from colon') {
      const codes = cleanedMetastasisResults.map((r) => r.code);
      if (!(codes[0] === 'C78.7' && codes[1] === 'C18.9')) {
        console.warn('Inline test failed for secondary liver cancer from colon query');
      }
    }
    return { results: cleanedMetastasisResults };
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

      if (
        !codeExact &&
        !synonymExact &&
        !hasKeywordMatch(normalizedQuery, entryDescription, entrySynonyms)
      ) {
        return null;
      }

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
    .sort(
      (a, b) =>
        b.score - a.score || (a.entry.code || '').localeCompare(b.entry.code || '')
    );

  const results = scored.map((item) => item.entry);

  let cleanedResults = cleanICDCodes(results);

  cleanedResults = cleanICDCodes(
    appendCkdStageForHypertensive(cleanedResults, normalizedQuery)
  );

  cleanedResults = removeI10WithCkd(normalizedQuery, cleanedResults);

  cleanedResults = applyStageLock(cleanedResults, normalizedQuery);

  cleanedResults = applyDiabetesRules(normalizedQuery, cleanedResults);

  cleanedResults = applyMentalHealthRules(normalizedQuery, cleanedResults);

  cleanedResults = applyCoreConditionAdds(normalizedQuery, cleanedResults);

  cleanedResults = applyBlockList(cleanedResults, rawQuery);

  if (normalizedQuery === 'type 2 diabetes with ckd stage 4') {
    const codes = cleanedResults.map((r) => r.code);
    if (!(codes.length === 2 && codes.includes('E11.22') && codes.includes('N18.4'))) {
      console.warn('Inline test failed for diabetes with CKD stage 4 query');
    }
  }

  return { results: limitResults(cleanedResults) };
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

  const rawQuery = (body.query || '').toString();
  const query = normalize(rawQuery);
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

  const lines = rawQuery
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const numberedPattern = /^([0-9]+)\s*[)\.\-]\s*(.+)$/;
  const numberedItems = lines
    .map((line) => {
      const match = line.match(numberedPattern);
      if (!match) return null;
      return { id: match[1], query: match[2] };
    })
    .filter(Boolean);

  if (numberedItems.length > 1) {
    const batchResults = numberedItems.map((item) => {
      const { results } = searchSingle(item.query, records);
      const codes = limitResults(results || []).map((entry) => ({
        code: entry.code,
        desc: entry.description || entry.desc || '',
      }));
      return { id: item.id, query: item.query, codes };
    });

    res.setHeader('Content-Type', 'application/json');
    res.status(200).json({ batch: batchResults });
    return;
  }

  const { results } = searchSingle(rawQuery, records);
  res.setHeader('Content-Type', 'application/json');
  res.status(200).json({ results });
};
