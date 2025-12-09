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
const fs = __importStar(require("fs"));
const parser_1 = require("./lib/structured/parser");
const engine_1 = require("./lib/structured/engine");
const inputFile = './structured_1000_cases.txt';
const rawData = fs.readFileSync(inputFile, 'utf8');
// Split by "CASE \d+"
const casesRaw = rawData.split(/CASE \d+/).filter(c => c.trim().length > 0);
console.log(`Loaded ${casesRaw.length} cases.`);
let passCount = 0;
let failCount = 0;
const failures = [];
casesRaw.forEach((caseText, index) => {
    var _a, _b, _c, _d;
    const caseNum = index + 1;
    let context;
    try {
        const parsed = (0, parser_1.parseInput)(caseText);
        context = parsed.context;
    }
    catch (e) {
        console.error(`CASE ${caseNum}: Parse Error`, e);
        failCount++;
        return;
    }
    const output = (0, engine_1.runStructuredRules)(context);
    const codes = [
        ...(output.primary ? [output.primary.code] : []),
        ...output.secondary.map(c => c.code)
    ];
    const messages = [];
    // --- AUDIT RULES ---
    // 1. Mechanical Ventilation > 24h -> Must have J96.00
    if ((_b = (_a = context.conditions.respiratory) === null || _a === void 0 ? void 0 : _a.mechanicalVent) === null || _b === void 0 ? void 0 : _b.present) { // Strict check (removed duration check to be safe as per user rule "Vent = Resp Failure")
        if (!codes.includes('J96.00')) {
            messages.push('FAIL: Vent present but missing J96.00');
        }
    }
    // 2. Drug Use -> Must be Z72.2 (if no abuse)
    // Parser might put 'abuse' if specific words found, but if simple "Drug Use: Yes", we expect Z72.2 or F-code.
    // If output has F19.10 but input said "Drug Use: Yes" (and no abuse), that's a fail (per new rule).
    // Hard to check input text via logic, but we can check if F19.10 is present.
    // Actually, user said FORCE Z72.2. So F19.10 is suspicious unless "abuse" was parsed.
    if (caseText.includes('Drug Use: Yes') && !caseText.toLowerCase().includes('abuse')) {
        if (codes.includes('F19.10'))
            messages.push('FAIL: Drug Use: Yes mapped to F19.10 (Should be Z72.2)');
        if (!codes.includes('Z72.2') && !codes.some(c => c.startsWith('F')))
            messages.push('FAIL: Drug Use: Yes missing code');
    }
    // 3. Diabetic Ulcer Stage 3 -> L97.x93
    // EXCEPTION: If "Bone exposed" is present, we expect suffix 4, so skip this check or allow suffix 4.
    if (caseText.includes('Stage/Depth: Stage 3') && caseText.includes('Type: Diabetic')) {
        const hasBoneExposed = caseText.toLowerCase().includes('bone exposed') || ((_c = context.conditions.diabetes) === null || _c === void 0 ? void 0 : _c.ulcerSeverity) === 'bone';
        const l97 = codes.find(c => c.startsWith('L97'));
        if (!l97) {
            messages.push('FAIL: Diabetic Stage 3 missing L97 code');
        }
        else if (hasBoneExposed) {
            // If bone is exposed, we expect suffix 4, even if it says Stage 3
            if (!l97.endsWith('4'))
                messages.push(`FAIL: Diabetic Stage 3 with Bone Exposed mapped to ${l97} (Expected suffix 4)`);
        }
        else {
            // Standard Stage 3 (Muscle/Fat) -> allow 2 or 3? Or strict 3 per user rule?
            // User rule usually implies Stage 3 = Muscle Necrosis (suffix 3) in this context
            if (!l97.endsWith('3'))
                messages.push(`FAIL: Diabetic Stage 3 mapped to ${l97} (Expected suffix 3)`);
        }
    }
    // 4. Bone Exopsed -> L97.x94
    if (((_d = context.conditions.diabetes) === null || _d === void 0 ? void 0 : _d.ulcerSeverity) === 'bone' || caseText.toLowerCase().includes('bone exposed')) {
        const l97 = codes.find(c => c.startsWith('L97'));
        if (l97 && !l97.endsWith('4'))
            messages.push(`FAIL: Bone Exposed mapped to ${l97} (Expected suffix 4)`);
    }
    // 5. Sequencing: J96/J18 > J44
    if (codes.includes('J44.0') || codes.includes('J44.1')) {
        const j44Index = codes.findIndex(c => c.startsWith('J44'));
        const j96Index = codes.findIndex(c => c.startsWith('J96'));
        const j18Index = codes.findIndex(c => c.startsWith('J18') || c.startsWith('J15')); // Pneumonia
        if (j96Index !== -1 && j96Index > j44Index)
            messages.push('FAIL: Sequencing J44 > J96');
        if (j18Index !== -1 && j18Index > j44Index)
            messages.push('FAIL: Sequencing J44 > Pneumonia');
    }
    // 6. CKD-Diabetes Conflict: E1x.22 + N18.x -> FAIL
    const hasE22 = codes.some(c => /^E1[0-9]\.22/.test(c));
    const hasN18 = codes.some(c => c.startsWith('N18'));
    if (hasE22 && hasN18)
        messages.push('FAIL: E1x.22 and N18.x coexist (Rule 2 Violation)');
    // 7. CKD-Diabetes Conflict: E1x.21 + E1x.22 -> FAIL
    const hasE21 = codes.some(c => /^E1[0-9]\.21/.test(c));
    if (hasE21 && hasE22)
        messages.push('FAIL: E1x.21 and E1x.22 coexist (Rule 1 Violation)');
    if (messages.length > 0) {
        failCount++;
        failures.push(`CASE ${caseNum}: ${messages.join(', ')}`);
        // console.log(`CASE ${caseNum} FAILED:`, messages);
    }
    else {
        passCount++;
    }
});
console.log(`\nAUDIT COMPLETE.`);
console.log(`Passed: ${passCount}`);
console.log(`Failed: ${failCount}`);
if (failures.length > 0) {
    console.log('\n--- FAILURES ---');
    console.log(failures.slice(0, 50).join('\n')); // Show first 50
    if (failures.length > 50)
        console.log(`... and ${failures.length - 50} more.`);
}
