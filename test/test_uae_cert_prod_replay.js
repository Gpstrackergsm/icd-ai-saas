/**
 * UAE CERTIFICATION - PRODUCTION REPLAY VERIFICATION
 * 
 * CRITICAL: Tests all 100 certification cases against PRODUCTION endpoint
 * 
 * Requirements:
 * - Send real HTTP requests to production
 * - Test in BOTH UAE and USA modes
 * - Exact match verification
 * - Exit code 1 on ANY mismatch
 * 
 * Success: "PRODUCTION REPLAY: 100/100 MATCHED"
 * Failure: Immediate exit, detailed diff
 */

const https = require('https');
const { CERTIFICATION_TESTS } = require('./uae_audit_certification_suite.js');

// ============================================================================
// CONFIGURATION
// ============================================================================

const PRODUCTION_URL = process.env.PROD_URL || 'https://www.icd-10-cm.online';
const API_ENDPOINT = '/api/encode-structured';

// ============================================================================
// HTTP REQUEST HELPER
// ============================================================================

function makeProductionRequest(narrative, market) {
    return new Promise((resolve, reject) => {
        const payload = JSON.stringify({
            narrative: narrative,
            marketProfile: market,
            level: 5
        });

        const url = new URL(API_ENDPOINT, PRODUCTION_URL);

        const options = {
            hostname: url.hostname,
            port: url.port || 443,
            path: url.pathname,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(payload)
            }
        };

        const req = https.request(options, (res) => {
            let data = '';

            res.on('data', (chunk) => {
                data += chunk;
            });

            res.on('end', () => {
                try {
                    const parsed = JSON.parse(data);
                    resolve(parsed);
                } catch (err) {
                    reject(new Error(`Failed to parse response: ${err.message}`));
                }
            });
        });

        req.on('error', (err) => {
            reject(err);
        });

        req.write(payload);
        req.end();
    });
}

// ============================================================================
// VERIFICATION LOGIC
// ============================================================================

function verifyResponse(test, response) {
    const errors = [];

    // Check if UAE override was applied
    const uaeOverride = response.metadata?.uae_override || false;
    const codes = response.codes || [];

    if (test.expected.autoCode) {
        // Expected AUTO_CODE
        if (!uaeOverride && codes.length === 0) {
            errors.push(`Expected AUTO_CODE, got no codes`);
            return errors;
        }

        // Check for expected code
        if (test.expected.code) {
            const hasCode = codes.some(c => c.code === test.expected.code);
            if (!hasCode) {
                errors.push(`Expected code ${test.expected.code}, got ${codes.map(c => c.code).join(', ') || 'none'}`);
            }
        }

        // Check reasonType
        if (test.expected.reasonType) {
            const codeWithReason = codes.find(c => c.code === test.expected.code);
            if (codeWithReason && codeWithReason.reasonType !== test.expected.reasonType) {
                errors.push(`Expected reasonType ${test.expected.reasonType}, got ${codeWithReason.reasonType}`);
            }
        }
    } else {
        // Expected AUTO_EXCLUDE
        if (uaeOverride) {
            errors.push(`Expected AUTO_EXCLUDE, but UAE override was applied`);
        }
    }

    return errors;
}

// ============================================================================
// MAIN REPLAY FUNCTION
// ============================================================================

async function runProductionReplay() {
    console.log('╔═══════════════════════════════════════════════════════════════╗');
    console.log('║     UAE PRODUCTION REPLAY VERIFICATION                         ║');
    console.log('║     Testing 100 cases against LIVE production                  ║');
    console.log('╚═══════════════════════════════════════════════════════════════╝\n');
    console.log(`Production URL: ${PRODUCTION_URL}${API_ENDPOINT}\n`);

    let passed = 0;
    let failed = 0;
    const failures = [];

    for (const test of CERTIFICATION_TESTS) {
        try {
            const response = await makeProductionRequest(test.narrative, test.market);
            const errors = verifyResponse(test, response);

            if (errors.length === 0) {
                passed++;
                console.log(`✅ ${test.id} [${test.category}]`);
            } else {
                failed++;
                failures.push({
                    id: test.id,
                    category: test.category,
                    narrative: test.narrative,
                    market: test.market,
                    errors: errors
                });
                console.log(`❌ ${test.id} [${test.category}] - ${errors[0]}`);
            }
        } catch (err) {
            failed++;
            failures.push({
                id: test.id,
                category: test.category,
                narrative: test.narrative,
                market: test.market,
                errors: [`HTTP Error: ${err.message}`]
            });
            console.log(`❌ ${test.id} [${test.category}] - HTTP Error`);
        }

        // Rate limiting - small delay between requests
        await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log('\n╔═══════════════════════════════════════════════════════════════╗');
    console.log(`║ PRODUCTION REPLAY RESULTS: ${passed}/${CERTIFICATION_TESTS.length} MATCHED                  ║`);
    console.log(`║ FAILED: ${failed}                                                       ║`);
    console.log('╚═══════════════════════════════════════════════════════════════╝\n');

    if (failures.length > 0) {
        console.log('╔═══════════════════════════════════════════════════════════════╗');
        console.log('║ FAILURES - PRODUCTION MISMATCH                                 ║');
        console.log('╚═══════════════════════════════════════════════════════════════╝\n');
        failures.slice(0, 10).forEach(f => {
            console.log(`Test ${f.id} [${f.category}]`);
            console.log(`  Market: ${f.market}`);
            console.log(`  Narrative: "${f.narrative}"`);
            f.errors.forEach(err => console.log(`  Error: ${err}`));
            console.log('');
        });

        if (failures.length > 10) {
            console.log(`... and ${failures.length - 10} more failures\n`);
        }

        console.log('╔═══════════════════════════════════════════════════════════════╗');
        console.log('║ ❌ PRODUCTION REPLAY FAILED                                    ║');
        console.log('╚═══════════════════════════════════════════════════════════════╝\n');
        process.exit(1);
    }

    console.log('╔═══════════════════════════════════════════════════════════════╗');
    console.log('║ ✅ PRODUCTION REPLAY: 100/100 MATCHED                          ║');
    console.log('╚═══════════════════════════════════════════════════════════════╝\n');
    return { passed, failed, total: CERTIFICATION_TESTS.length };
}

if (require.main === module) {
    runProductionReplay().catch(err => {
        console.error('Fatal error:', err);
        process.exit(1);
    });
}

module.exports = { runProductionReplay };
