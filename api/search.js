// ICD-10-CM Encoder core – generated with Codex helper
// Responsibility: HTTP handler to search ICD-10-CM codes and index terms

try {
  require('ts-node/register');
} catch (err) {
  console.warn('ts-node/register not found; proceeding without it');
}
const { initIcdData, searchIndex, searchCodesByTerm } = require('../lib/icd-core/dataSource.ts');

function sendJson(res, status, payload) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(payload));
}

function logResponse(status, payload) {
  console.log('Search response', { status, payload });
}

function buildError(message, where) {
  return { success: false, error: message, where };
}

function createHttpError(message, statusCode = 400, where = 'api/search') {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.where = where;
  return error;
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

function extractQueryFromGet(req) {
  const url = new URL(req.url, 'http://localhost');
  return url.searchParams.get('q') ?? url.searchParams.get('query');
}

function respondJson(res, status, payload) {
  logResponse(status, payload);
  return sendJson(res, status, payload);
}

module.exports = async function handler(req, res) {
  console.log('Incoming search request', { method: req.method, url: req.url, headers: req.headers });

  try {
    let query;
    let requestBody = {};

    if (req.method === 'GET') {
      query = extractQueryFromGet(req);
      console.log('Parsed GET query/body', { query, body: requestBody });
    } else if (req.method === 'POST') {
      try {
        requestBody = req.body ?? (await parseBody(req));
      } catch (err) {
        throw createHttpError('Invalid JSON body', 400, 'api/search:body');
      }

      console.log('Parsed POST body', requestBody);

      if (!ensureObjectBody(requestBody)) {
        throw createHttpError('Request body must be a JSON object', 400, 'api/search:body');
      }

      const rawQuery = requestBody.query ?? requestBody.q;
      if (rawQuery === undefined || rawQuery === null) {
        throw createHttpError('query is required', 400, 'api/search:body');
      }

      if (typeof rawQuery !== 'string') {
        throw createHttpError('query must be a string', 400, 'api/search:body');
      }

      query = rawQuery.trim();
    } else {
      return respondJson(res, 405, buildError('Method not allowed', 'api/search'));
    }

    if (query === undefined || query === null) {
      throw createHttpError('query is required', 400, 'api/search:query');
    }

    if (typeof query !== 'string') {
      throw createHttpError('query must be a string', 400, 'api/search:query');
    }

    query = query.trim();

    if (!query) {
      throw createHttpError('query cannot be empty', 400, 'api/search:query');
    }

    if (query.length > 500) {
      throw createHttpError('query is too long (max 500 characters)', 400, 'api/search:query');
    }

    console.log('Validated search query', { query });

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

    const successPayload = { success: true, data: { results: combined } };
    return respondJson(res, 200, successPayload);
  } catch (err) {
    console.error('Search handler failed:', err);
    const message = err && err.message ? err.message : 'Unexpected server error';
    const where = err && err.where ? err.where : err?.stack?.split('\n')[0] || 'api/search';
    const statusCode = err && err.statusCode ? err.statusCode : 500;
    return respondJson(res, statusCode, buildError(message, where));
  }
};
