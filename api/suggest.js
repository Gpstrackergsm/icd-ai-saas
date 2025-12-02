// ICD-10-CM intelligent suggestions endpoint
// Responsibility: Return smart ICD matches and refinements for a query

const fs = require('fs');
const path = require('path');

let icdModule;

function loadIcdModule() {
  if (icdModule) return icdModule;

  try {
    require(path.resolve(__dirname, '../lib/runtime/register-ts'));
  } catch (err) {
    throw createHttpError('TypeScript runtime support is unavailable; install ts-node and typescript', 500, 'api/suggest:runtime');
  }

  const icdJs = path.resolve(__dirname, '../lib/icd-core/dataSource.js');
  const icdTs = path.resolve(__dirname, '../lib/icd-core/dataSource.ts');

  try {
    icdModule = require(fs.existsSync(icdJs) ? icdJs : icdTs);
    return icdModule;
  } catch (err) {
    throw createHttpError('Failed to load ICD data module', 500, 'api/suggest:runtime');
  }
}

function sendJson(res, status, payload) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(payload));
}

function createHttpError(message, statusCode = 400, where = 'api/suggest') {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.where = where;
  return error;
}

function extractQuery(req) {
  const url = new URL(req.url, 'http://localhost');
  return url.searchParams.get('q') ?? url.searchParams.get('query');
}

function ensureValidQuery(rawQuery) {
  if (rawQuery === undefined || rawQuery === null) {
    throw createHttpError('q is required', 400, 'api/suggest:query');
  }
  if (typeof rawQuery !== 'string') {
    throw createHttpError('q must be a string', 400, 'api/suggest:query');
  }
  const query = rawQuery.trim();
  if (!query) {
    throw createHttpError('q cannot be empty', 400, 'api/suggest:query');
  }
  if (query.length > 500) {
    throw createHttpError('q is too long (max 500 characters)', 400, 'api/suggest:query');
  }
  return query;
}

module.exports = async function handler(req, res) {
  console.log('Incoming suggest request', { method: req.method, url: req.url });

  if (req.method !== 'GET') {
    return sendJson(res, 405, { success: false, error: { message: 'Method not allowed', where: 'api/suggest' } });
  }

  try {
    const { initIcdData, getSuggestions } = loadIcdModule();
    const rawQuery = extractQuery(req);
    const query = ensureValidQuery(rawQuery);

    await initIcdData();
    const { suggestions, refinements } = getSuggestions(query, 10);

    const payload = {
      success: true,
      data: {
        suggestions: suggestions.map((item) => ({ ...item, confidence: item.confidence ?? 0, source: item.source || 'icd-master' })),
        refinements: refinements ?? [],
      },
    };

    return sendJson(res, 200, payload);
  } catch (err) {
    console.error('Suggest handler failed:', err);
    const message = err && err.message ? err.message : 'Unexpected server error';
    const where = err && err.where ? err.where : err?.stack?.split('\n')[0] || 'api/suggest';
    const statusCode = err && err.statusCode ? err.statusCode : 500;
    return sendJson(res, statusCode, { success: false, error: { message, where } });
  }
};
