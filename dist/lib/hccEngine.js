"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.flagHcc = flagHcc;
const hccCodes = [/^E0[89]/, /^E1[013]\.[1-9]/];
function flagHcc(sequence) {
    return sequence.map((entry) => ({
        ...entry,
        hcc: hccCodes.some((pattern) => pattern.test(entry.code)),
    }));
}
