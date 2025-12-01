// ICD-10-CM Encoder core – generated with Codex helper
// Responsibility: HTTP handler to encode free-text narratives into ICD-10-CM codes

require('ts-node/register');
const { encodeDiagnosisText } = require('../lib/icd-core/encoder');
const { initIcdData } = require('../lib/icd-core/dataSource');

function sendJson(res, status, payload) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(payload));
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

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return sendJson(res, 405, { error: 'Method not allowed' });
  }

  let body;
  try {
    body = req.body ?? (await parseBody(req));
  } catch (err) {
    return sendJson(res, 400, { error: 'Invalid JSON body' });
  }

  const text = (body.text || '').toString().trim();
  if (!text) return sendJson(res, 400, { error: 'text is required' });

  await initIcdData();
  const output = encodeDiagnosisText(text, { debug: Boolean(body.debug) });
  return sendJson(res, 200, output);
};
