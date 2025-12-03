"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildAuditTrail = buildAuditTrail;
function buildAuditTrail(sequence, warnings) {
    const audit = [];
    sequence.forEach((entry) => {
        audit.push(`${entry.code}: triggered by ${entry.triggeredBy}`);
        if (entry.note)
            audit.push(`${entry.code}: note ${entry.note}`);
    });
    warnings.forEach((warn) => audit.push(`Warning: ${warn}`));
    return audit;
}
