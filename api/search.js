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

  const results = records.filter((entry) => {
    const codeMatch = entry.code && normalize(entry.code).startsWith(query);
    const descMatch = entry.description
      ? normalize(entry.description).includes(query)
      : false;
    const synonymMatch = Array.isArray(entry.synonyms)
      ? entry.synonyms.some((syn) => normalize(syn).includes(query))
      : false;
    return codeMatch || descMatch || synonymMatch;
  });

  res.setHeader('Content-Type', 'application/json');
  res.status(200).json({ results });
};
