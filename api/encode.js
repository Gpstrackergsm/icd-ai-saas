// ICD-10-CM Encoder core – generated with Codex helper
// Responsibility: HTTP handler to encode free-text narratives into ICD-10-CM codes

let icdModule;
let encoderModule;

function loadRuntimeModules() {
  if (icdModule && encoderModule) return { icdModule, encoderModule };

try {
  require('../lib/runtime/register-ts');
} catch (err) {
  throw new Error('TypeScript runtime support is unavailable; install ts-node and typescript');
}

  try {
    icdModule = require('../lib/icd-core/dataSource');
    encoderModule = require('../lib/icd-core/encoder');
    return { icdModule, encoderModule };
  } catch (err) {
    throw new Error('Failed to load ICD encoder modules');
  }
}

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
    req.on('data', (chunk) => (body += chunk));
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

  let modules;
  try {
    modules = loadRuntimeModules();
  } catch (err) {
    return sendJson(res, 500, { success: false, error: { message: err.message || 'Missing runtime' } });
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

  const rawText = body.text;
  if (rawText === undefined || rawText === null) {
    return validationError(res, 'text is required');
  }

  if (typeof rawText !== 'string') {
    return validationError(res, 'text must be a string');
  }

  const text = rawText.trim();
  if (!text) {
    return validationError(res, 'text cannot be empty');
  }

  if (text.length > 2000) {
    return validationError(res, 'text is too long (max 2000 characters)');
  }

  try {
    await modules.icdModule.initIcdData();
    const output = modules.encoderModule.encodeDiagnosisText(text, { debug: Boolean(body.debug) });
    return sendJson(res, 200, { success: true, data: output });
  } catch (err) {
    console.error('Encode handler failed:', err);
    return sendJson(res, 500, { success: false, error: { message: 'Unexpected server error' } });
  }
};
