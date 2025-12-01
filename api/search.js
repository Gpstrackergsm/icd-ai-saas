// ICD-10-CM Encoder core – generated with Codex helper
// Responsibility: HTTP handler to search ICD-10-CM codes and index terms

require('ts-node/register');
const { initIcdData, searchIndex, searchCodesByTerm } = require('../lib/icd-core/dataSource');

function sendError(res, status, message) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify({ error: message }));
}

async function parseBody(req) {
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
    return sendError(res, 405, 'Method not allowed');
  }

  let body;
  try {
    body = req.body ?? (await parseBody(req));
  } catch (err) {
    return sendError(res, 400, 'Invalid JSON body');
  }

  const query = (body.query || '').toString().trim();
  if (!query) return sendError(res, 400, 'Query is required');

  await initIcdData();
  const indexResults = searchIndex(query, 10);
  const codeMatches = searchCodesByTerm(query, 5);

  const combined = [...indexResults.map((item) => ({
    code: item.code.code,
    description: item.code.longDescription || item.code.shortDescription,
    matchedTerm: item.matchedTerm,
    score: item.score,
  }))];

  codeMatches.forEach((code) => {
    if (!combined.some((entry) => entry.code === code.code)) {
      combined.push({ code: code.code, description: code.longDescription || code.shortDescription, matchedTerm: query, score: 1 });
    }
  });

  res.statusCode = 200;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify({ results: combined }));
};
