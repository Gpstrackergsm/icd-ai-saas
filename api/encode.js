// ICD-10-CM Encoder core – generated with Codex helper
// Responsibility: HTTP handler to encode free-text narratives into ICD-10-CM codes

const fs = require('fs');
const path = require('path');

const MAX_TEXT_LENGTH = 500;

let icdModule;
let encoderModule;

function loadRuntimeModules() {
  if (icdModule && encoderModule) return { icdModule, encoderModule };

  try {
    require(path.resolve(__dirname, '../lib/runtime/register-ts'));
  } catch (err) {
    throw new Error('TypeScript runtime support is unavailable; install ts-node and typescript');
  }

  const icdJs = path.resolve(__dirname, '../lib/icd-core/dataSource.js');
  const icdTs = path.resolve(__dirname, '../lib/icd-core/dataSource.ts');
  const encoderJs = path.resolve(__dirname, '../lib/icd-core/encoder.js');
  const encoderTs = path.resolve(__dirname, '../lib/icd-core/encoder.ts');

  try {
    icdModule = require(fs.existsSync(icdJs) ? icdJs : icdTs);
    encoderModule = require(fs.existsSync(encoderJs) ? encoderJs : encoderTs);
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

function sendError(res, status, message, code) {
  return sendJson(res, status, { success: false, error: { message, code } });
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
  try {
    if (req.method !== 'POST') {
      return sendError(res, 405, 'Method not allowed', 'BAD_REQUEST');
    }

    let modules;
    try {
      modules = loadRuntimeModules();
    } catch (err) {
      return sendError(res, 500, 'Internal error', 'INTERNAL_ERROR');
    }

    let body;
    try {
      body = req.body ?? (await parseBody(req));
    } catch (err) {
      return sendError(res, 400, 'Invalid JSON body', 'BAD_REQUEST');
    }

    if (!ensureObjectBody(body)) {
      return sendError(res, 400, 'Request body must be a JSON object', 'BAD_REQUEST');
    }

    const rawText = body.text;
    if (rawText === undefined || rawText === null) {
      return sendError(res, 400, 'text is required', 'BAD_REQUEST');
    }

    if (typeof rawText !== 'string') {
      return sendError(res, 400, 'text must be a string', 'BAD_REQUEST');
    }

    const text = rawText.trim();
    if (!text) {
      return sendError(res, 400, 'text cannot be empty', 'BAD_REQUEST');
    }

    if (text.length > MAX_TEXT_LENGTH) {
      return sendError(res, 400, `text is too long (max ${MAX_TEXT_LENGTH} characters)`, 'BAD_REQUEST');
    }

    try {
      await modules.icdModule.initIcdData();
      const output = modules.encoderModule.encodeDiagnosisText(text, { debug: Boolean(body.debug) });

      // Restructure to primary/secondary format
      const allCodes = Array.isArray(output?.codes) ? output.codes : [];

      // Limit to max 5 codes
      const limitedCodes = allCodes.slice(0, 5);

      if (limitedCodes.length === 0) {
        return sendJson(res, 200, {
          success: true,
          data: {
            text,
            primary: null,
            secondary: [],
            warnings: Array.isArray(output?.warnings) ? output.warnings : [],
            audit: ['No codes could be determined from the provided text'],
          },
        });
      }

      // First code is primary, rest are secondary
      const primaryCode = limitedCodes[0];
      const secondaryCodes = limitedCodes.slice(1);

      const formatCode = (code) => ({
        code: code.code,
        description: code.title || 'Unknown',
        rationale: code.rationale || code.guidelineRule || 'Clinical diagnosis match',
        confidence: typeof code.confidence === 'number' ? Number(code.confidence.toFixed(2)) : 0.85,
        billable: Boolean(code.billable),
      });

      return sendJson(res, 200, {
        success: true,
        data: {
          text,
          primary: formatCode(primaryCode),
          secondary: secondaryCodes.map(formatCode),
          warnings: Array.isArray(output?.warnings) ? output.warnings : [],
          audit: [
            `Processed ${allCodes.length} candidate codes`,
            `Limited output to ${limitedCodes.length} most relevant codes`,
            `Primary code: ${primaryCode.code}`,
            ...(secondaryCodes.length > 0 ? [`Secondary codes: ${secondaryCodes.map(c => c.code).join(', ')}`] : []),
          ],
        },
      });
    } catch (err) {
      console.error('Encode handler failed:', err);
      return sendError(res, 500, 'Internal error', 'INTERNAL_ERROR');
    }
  } catch (err) {
    console.error('Unexpected encode handler crash:', err);
    return sendError(res, 500, 'Internal error', 'INTERNAL_ERROR');
  }
};
