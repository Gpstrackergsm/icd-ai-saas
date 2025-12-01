// ICD-10-CM Encoder core – generated with Codex helper
// Responsibility: HTTP handler to search ICD-10-CM codes and index terms

require('ts-node/register');
const { initIcdData, searchIndex, searchCodesByTerm } = require('../lib/icd-core/dataSource');

function sendJson(res, status, payload) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(payload));
}

function validationError(res, message) {
  return sendJson(res, 400, { success: false, error: { message } });
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

function ensureObjectBody(body) {
  return body !== null && typeof body === 'object' && !Array.isArray(body);
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return sendJson(res, 405, { success: false, error: { message: 'Method not allowed' } });
  }

  let body;
  try {
    body = req.body ?? (await parseBody(req));
  } catch (err) {
    return sendJson(res, 400, { success: false, error: { message: 'Invalid JSON body' } });
  }

  if (!ensureObjectBody(body)) {
    return validationError(res, 'Request body must be a JSON object');
  }

  const rawQuery = body.query;
  if (rawQuery === undefined || rawQuery === null) {
    return validationError(res, 'query is required');
  }

  if (typeof rawQuery !== 'string') {
    return validationError(res, 'query must be a string');
  }

  const query = rawQuery.trim();
  if (!query) {
    return validationError(res, 'query cannot be empty');
  }

  if (query.length > 500) {
    return validationError(res, 'query is too long (max 500 characters)');
  }

  try {
    await initIcdData();
    const indexResults = searchIndex(query, 10);
    const codeMatches = searchCodesByTerm(query, 5);

    const combined = [
      ...indexResults.map((item) => ({
        code: item.code.code,
        description: item.code.longDescription || item.code.shortDescription,
        matchedTerm: item.matchedTerm,
        score: item.score,
      })),
    ];

    codeMatches.forEach((code) => {
      if (!combined.some((entry) => entry.code === code.code)) {
        combined.push({
          code: code.code,
          description: code.longDescription || code.shortDescription,
          matchedTerm: query,
          score: 1,
        });
      }
    });

    return sendJson(res, 200, { success: true, data: { results: combined } });
  } catch (err) {
    console.error('Search handler failed:', err);
    return sendJson(res, 500, { success: false, error: { message: 'Unexpected server error' } });
  }
};
