"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.scoreSequence = scoreSequence;
function scoreSequence(sequence, warnings) {
    return sequence.map((entry) => {
        let score = 0.5;
        if (entry.code.includes('.'))
            score += 0.1;
        if (/\d{2,}$/.test(entry.code.replace('.', '')))
            score += 0.1;
        if (entry.hcc)
            score += 0.1;
        if (warnings.length)
            score -= 0.1;
        if (/\.6/.test(entry.code))
            score += 0.05; // complication codes
        score = Math.min(1, Math.max(0, score));
        return { ...entry, score };
    });
}
