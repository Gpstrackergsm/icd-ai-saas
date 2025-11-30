const fs = require('fs');
const path = require('path');

let cachedCodes = null;
let cachedIndexTerms = null;

function loadData() {
  if (!cachedCodes) {
    const codesPath = path.join(process.cwd(), 'data', 'icd_codes.json');
    const raw = fs.readFileSync(codesPath, 'utf8');
    cachedCodes = JSON.parse(raw);
  }
  if (!cachedIndexTerms) {
    const termsPath = path.join(process.cwd(), 'data', 'index_terms.json');
    const raw = fs.readFileSync(termsPath, 'utf8');
    cachedIndexTerms = JSON.parse(raw);
  }
}

function normalize(text = '') {
  return text.toString().toLowerCase().trim().replace(/\s+/g, ' ');
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => {
      data += chunk;
    });
    req.on('end', () => {
      try {
        const parsed = data ? JSON.parse(data) : {};
        resolve(parsed);
      } catch (err) {
        reject(err);
      }
    });
    req.on('error', reject);
  });
}

function uniquePush(collection, item, seen) {
  if (seen.has(item.code)) return;
  seen.add(item.code);
  collection.push(item);
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    loadData();
  } catch (err) {
    res.status(500).json({ error: 'Failed to load data' });
    return;
  }

  let query = '';
  try {
    const body = req.body ?? (await parseBody(req));
    query = body.query || '';
  } catch (err) {
    res.status(400).json({ error: 'Invalid JSON body' });
    return;
  }

  const normalizedQuery = normalize(query);
  if (!normalizedQuery) {
    res.status(400).json({ error: 'Query is required' });
    return;
  }

  const results = [];
  const seen = new Set();
  const codeMatch = cachedCodes.find(
    (entry) => normalize(entry.code) === normalizedQuery
  );

  if (codeMatch) {
    uniquePush(results, { code: codeMatch.code, desc: codeMatch.title }, seen);
  }

  cachedCodes.forEach((entry) => {
    if (results.length >= 10) return;
    const title = normalize(entry.title);
    if (title.includes(normalizedQuery)) {
      uniquePush(results, { code: entry.code, desc: entry.title }, seen);
    }
  });

  cachedIndexTerms.forEach((termEntry) => {
    if (results.length >= 10) return;
    if (normalize(termEntry.term) === normalizedQuery) {
      termEntry.codes.forEach((codeValue) => {
        if (results.length >= 10) return;
        const codeData = cachedCodes.find(
          (entry) => normalize(entry.code) === normalize(codeValue)
        );
        if (codeData) {
          uniquePush(results, { code: codeData.code, desc: codeData.title }, seen);
        }
      });
    }
  });

  res.status(200).json({ codes: results.slice(0, 10) });
};
