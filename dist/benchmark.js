"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const parser_1 = require("./lib/structured/parser");
const validator_1 = require("./lib/structured/validator");
const engine_1 = require("./lib/structured/engine");
const cases = [
    "Type 2 diabetes with CKD stage 4 and hypertension",
    "Type 2 diabetes with diabetic neuropathy",
    "Type 2 diabetes with chronic kidney disease",
    "Type 2 diabetes with diabetic retinopathy and macular edema",
    "Type 2 diabetes with foot ulcer right foot fat exposed",
    "Primary Hypertension",
    "Hypertension with Chronic Kidney Disease Stage 3",
    "Hypertensive Heart Disease",
    "Hypertensive Heart and Chronic Kidney Disease Stage 4",
    "Secondary Hypertension due to renal disease",
    "COPD",
    "COPD with exacerbation",
    "Mild persistent asthma",
    "Acute severe asthma",
    "COPD with acute lower respiratory infection",
    "Bacterial pneumonia",
    "Viral pneumonia",
    "Aspiration pneumonia",
    "Pneumonia due to COVID-19",
    "Pneumonia with sepsis due to Streptococcus"
];
console.log("🚀 Starting Performance Benchmark...");
console.log(`Processing ${cases.length} complex cases...`);
const start = performance.now();
cases.forEach((c, i) => {
    // 1. Parse
    const { context } = (0, parser_1.parseInput)(c);
    // 2. Validate
    const validation = (0, validator_1.validateContext)(context);
    // 3. Engine
    const results = (0, engine_1.runStructuredRules)(context);
    // console.log(`Case ${i+1}: ${results.primary?.code}`);
});
const end = performance.now();
const totalTime = end - start;
const avgTime = totalTime / cases.length;
console.log("\n📊 BENCHMARK RESULTS");
console.log("========================");
console.log(`Total Time: ${totalTime.toFixed(2)} ms`);
console.log(`Average Latency: ${avgTime.toFixed(2)} ms / case`);
console.log(`Throughput: ${(1000 / avgTime).toFixed(0)} cases / sec`);
console.log("========================");
