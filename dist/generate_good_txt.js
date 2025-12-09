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
// Output to desktop as requested
const outputFile = '/Users/khalidaitelmaati/Desktop/good.txt';
const rawData = fs.readFileSync(inputFile, 'utf8');
const casesRaw = rawData.split(/CASE \d+/).filter(c => c.trim().length > 0);
console.log(`Processing ${casesRaw.length} cases...`);
let outputContent = '';
casesRaw.forEach((caseText, index) => {
    const caseNum = index + 1;
    let context;
    let codeListString = '';
    try {
        const parsed = (0, parser_1.parseInput)(caseText);
        context = parsed.context;
        const result = (0, engine_1.runStructuredRules)(context);
        const codes = [
            ...(result.primary ? [result.primary.code] : []),
            ...result.secondary.map(c => c.code)
        ];
        codeListString = codes.join(', ');
    }
    catch (e) {
        codeListString = 'ERROR PARSING CASE';
        console.error(`Error Case ${caseNum}`, e);
    }
    outputContent += `CASE ${caseNum}\n`;
    // outputContent += `Input Data:\n${caseText.trim()}\n`; // User requested "each case and answer", uncomment if full text needed.
    // Given the ambiguity "case and answer", let's provide a summary or just the answer to keep it clean, 
    // BUT usually "case and answer" implies seeing the case too. 
    // I will include the full case text but indented slightly for readability.
    // outputContent += caseText.split('\n').map(l => l.trim() ? `  ${l.trim()}` : '').join('\n').trim() + '\n';
    outputContent += `Answer: ${codeListString}\n`;
    outputContent += `----------------------------------------------------------------\n\n`;
});
fs.writeFileSync(outputFile, outputContent);
console.log(`Successfully wrote ${casesRaw.length} cases to ${outputFile}`);
