"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const parser_1 = require("./lib/structured/parser");
const engine_1 = require("./lib/structured/engine");
const validator_post_1 = require("./lib/structured/validator-post");
const fs = __importStar(require("fs"));
function parseCases(fileContent) {
    const cases = [];
    const lines = fileContent.split('\n');
    let currentCase = null;
    for (const line of lines) {
        if (line.trim().startsWith('CASE ')) {
            if (currentCase) {
                cases.push({ id: currentCase.id, input: currentCase.lines.join('\n') });
            }
            const caseNum = parseInt(line.replace('CASE ', '').trim());
            currentCase = { id: caseNum, lines: [] };
        }
        else if (currentCase && line.trim()) {
            currentCase.lines.push(line.trim());
        }
    }
    if (currentCase) {
        cases.push({ id: currentCase.id, input: currentCase.lines.join('\n') });
    }
    return cases;
}
function inferDomain(input) {
    const lower = input.toLowerCase();
    if (lower.includes('diabetes'))
        return 'Diabetes';
    if (lower.includes('sepsis') || lower.includes('septic'))
        return 'Sepsis';
    if (lower.includes('hypertension') || lower.includes('heart failure'))
        return 'Cardiology';
    if (lower.includes('ckd') || lower.includes('kidney') || lower.includes('renal'))
        return 'Renal';
    if (lower.includes('copd') || lower.includes('asthma') || lower.includes('pneumonia') || lower.includes('respiratory'))
        return 'Respiratory';
    if (lower.includes('infection') || lower.includes('uti'))
        return 'Infection';
    return 'Other';
}
function validateClinicalConsistency(codes, input) {
    const violations = [];
    const lower = input.toLowerCase();
    // E11.21 + E11.22 conflict
    if (codes.includes('E11.21') && codes.includes('E11.22')) {
        violations.push('E11.21 + E11.22 conflict');
    }
    // I13.x + I50.x conflict
    const hasI13 = codes.some(c => c.startsWith('I13'));
    const hasI50 = codes.some(c => c.startsWith('I50'));
    if (hasI13 && hasI50) {
        violations.push('I13.x + I50.x conflict');
    }
    // Viral sepsis must be A41.9, not A41.89
    if (lower.includes('viral') && lower.includes('sepsis') && codes.includes('A41.89')) {
        violations.push('Viral sepsis coded as A41.89 (should be A41.9)');
    }
    // MRSA sepsis must be A41.02
    if (lower.includes('mrsa') && lower.includes('sepsis') && !codes.includes('A41.02')) {
        violations.push('MRSA sepsis not coded as A41.02');
    }
    // Unspecified pneumonia must be J18.9, not J15.x
    if (lower.includes('pneumonia') && lower.includes('unspecified') && codes.some(c => c.startsWith('J15'))) {
        violations.push('Unspecified pneumonia as J15.x (should be J18.9)');
    }
    // CKD present must have N18.x
    if (lower.includes('ckd') && !codes.some(c => c.startsWith('N18'))) {
        violations.push('CKD present without N18.x code');
    }
    // Organism-specific code without organism
    if (codes.includes('A41.01') && !lower.includes('staph') && !lower.includes('aureus')) {
        violations.push('A41.01 used without Staph aureus in input');
    }
    return violations;
}
async function runComplianceTest() {
    const fileContent = fs.readFileSync('./data/structured_cases.txt', 'utf-8');
    const cases = parseCases(fileContent);
    const results = [];
    const violationMap = new Map();
    const domainStats = new Map();
    let totalCodes = 0;
    let demographicOnly = 0;
    for (const testCase of cases) {
        try {
            const { context } = (0, parser_1.parseInput)(testCase.input);
            const engineResult = (0, engine_1.runStructuredRules)(context);
            const validated = (0, validator_post_1.validateCodeSet)(engineResult.primary, engineResult.secondary, context);
            const codes = validated.codes.map(c => c.code);
            const violations = validateClinicalConsistency(codes, testCase.input);
            const hasCodes = codes.length > 0;
            const status = hasCodes && violations.length === 0 ? 'PASS' : 'FAIL';
            if (!hasCodes) {
                demographicOnly++;
            }
            totalCodes += codes.length;
            results.push({
                caseId: testCase.id,
                input: testCase.input,
                codes,
                status,
                violations,
                hasCodes
            });
            // Track violations
            violations.forEach(v => {
                if (!violationMap.has(v)) {
                    violationMap.set(v, []);
                }
                violationMap.get(v).push(testCase.id);
            });
            // Track domain stats
            const domain = inferDomain(testCase.input);
            if (!domainStats.has(domain)) {
                domainStats.set(domain, { total: 0, passed: 0, failed: 0 });
            }
            const stats = domainStats.get(domain);
            stats.total++;
            if (status === 'PASS')
                stats.passed++;
            else
                stats.failed++;
        }
        catch (error) {
            results.push({
                caseId: testCase.id,
                input: testCase.input,
                codes: [],
                status: 'FAIL',
                violations: ['Processing error'],
                hasCodes: false
            });
            demographicOnly++;
            const domain = inferDomain(testCase.input);
            if (!domainStats.has(domain)) {
                domainStats.set(domain, { total: 0, passed: 0, failed: 0 });
            }
            domainStats.get(domain).total++;
            domainStats.get(domain).failed++;
        }
    }
    const totalPassed = results.filter(r => r.status === 'PASS').length;
    const totalFailed = results.length - totalPassed;
    const successPct = (totalPassed / results.length * 100).toFixed(2);
    const codesCoverage = ((results.length - demographicOnly) / results.length * 100).toFixed(2);
    const meanCodes = (totalCodes / results.length).toFixed(2);
    const passedSamples = results.filter(r => r.status === 'PASS').slice(0, 5);
    const failedSamples = results.filter(r => r.status === 'FAIL').slice(0, 5);
    // Generate compliance report
    let report = '';
    report += 'ICD-10-CM PRODUCTION COMPLIANCE REPORT\n';
    report += '='.repeat(80) + '\n\n';
    report += 'SECTION 1 — OVERALL\n';
    report += '-'.repeat(80) + '\n';
    report += `System Status:    ${totalPassed === results.length ? 'PASS' : 'FAIL'}\n`;
    report += `Total Cases:      ${results.length}\n`;
    report += `Passed:           ${totalPassed}\n`;
    report += `Failed:           ${totalFailed}\n`;
    report += `Success Rate:     ${successPct}%\n\n`;
    report += 'SECTION 2 — COVERAGE\n';
    report += '-'.repeat(80) + '\n';
    report += `Code Generation:  ${codesCoverage}%\n`;
    report += `Demographic Only: ${(demographicOnly / results.length * 100).toFixed(2)}%\n`;
    report += `Mean Codes/Case:  ${meanCodes}\n\n`;
    report += 'SECTION 3 — DOMAIN COMPLIANCE\n';
    report += '-'.repeat(80) + '\n';
    const sortedDomains = Array.from(domainStats.entries()).sort((a, b) => a[0].localeCompare(b[0]));
    for (const [domain, stats] of sortedDomains) {
        report += `${domain.padEnd(15)} Total: ${stats.total.toString().padStart(4)}  Passed: ${stats.passed.toString().padStart(4)}  Failed: ${stats.failed.toString().padStart(4)}\n`;
    }
    report += '\n';
    report += 'SECTION 4 — VIOLATIONS\n';
    report += '-'.repeat(80) + '\n';
    if (violationMap.size === 0) {
        report += 'No clinical rule violations detected.\n';
    }
    else {
        const sortedViolations = Array.from(violationMap.entries()).sort((a, b) => b[1].length - a[1].length);
        for (const [type, caseIds] of sortedViolations) {
            report += `${type}\n`;
            report += `  Count: ${caseIds.length}\n`;
            report += `  Cases: ${caseIds.slice(0, 10).join(', ')}${caseIds.length > 10 ? '...' : ''}\n\n`;
        }
    }
    report += 'SECTION 5 — SAMPLES\n';
    report += '-'.repeat(80) + '\n';
    report += 'PASSED CASES:\n';
    passedSamples.forEach(r => {
        report += `  CASE ${r.caseId}: ${r.codes.join(', ')}\n`;
    });
    report += '\nFAILED CASES:\n';
    failedSamples.forEach(r => {
        const reason = r.violations.length > 0 ? r.violations.join('; ') : 'No codes generated';
        report += `  CASE ${r.caseId}: ${reason}\n`;
    });
    report += '\n';
    report += 'SECTION 6 — ARTIFACTS\n';
    report += '-'.repeat(80) + '\n';
    report += '✓ results.json\n';
    report += '✓ violations.json\n';
    report += '✓ compliance_report.txt\n';
    fs.writeFileSync('./compliance_report.txt', report);
    fs.writeFileSync('./results.json', JSON.stringify({
        summary: {
            total: results.length,
            passed: totalPassed,
            failed: totalFailed,
            successRate: parseFloat(successPct)
        },
        coverage: {
            codeGeneration: parseFloat(codesCoverage),
            demographicOnly: demographicOnly,
            meanCodesPerCase: parseFloat(meanCodes)
        },
        results: results
    }, null, 2));
    const violations = Array.from(violationMap.entries()).map(([type, caseIds]) => ({
        type,
        caseIds,
        count: caseIds.length
    }));
    fs.writeFileSync('./violations.json', JSON.stringify({
        totalViolations: violations.reduce((sum, v) => sum + v.count, 0),
        violations: violations
    }, null, 2));
    console.log(report);
}
runComplianceTest().catch(console.error);
