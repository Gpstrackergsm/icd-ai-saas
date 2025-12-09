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
// Hardcoded output path as requested
const outputFile = '/Users/khalidaitelmaati/Desktop/results.txt';
try {
    const rawData = fs.readFileSync(inputFile, 'utf8');
    // Split by "CASE \d+"
    // We want to keep the "CASE N" header or handle indexing
    // The split removes the delimiter, so we need to re-assemble or just use index
    const casesRaw = rawData.split(/CASE \d+/).filter(c => c.trim().length > 0);
    console.log(`Loaded ${casesRaw.length} cases.`);
    let outputContent = '';
    casesRaw.forEach((caseText, index) => {
        const caseNum = index + 1;
        let context;
        let codes = [];
        try {
            const parsed = (0, parser_1.parseInput)(caseText);
            context = parsed.context;
            const output = (0, engine_1.runStructuredRules)(context);
            codes = [
                ...(output.primary ? [output.primary.code] : []),
                ...output.secondary.map(c => c.code)
            ];
        }
        catch (e) {
            console.error(`CASE ${caseNum}: Parse/Engine Error`, e);
            codes = ['ERROR'];
        }
        outputContent += `CASE ${caseNum}\n`;
        outputContent += `Codes: ${codes.join(', ')}\n\n`;
    });
    fs.writeFileSync(outputFile, outputContent.trim());
    console.log(`Successfully wrote results to ${outputFile}`);
}
catch (error) {
    console.error('Error:', error);
}
