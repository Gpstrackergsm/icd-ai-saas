
/**
 * Sepsis / Severe Sepsis Guardrails (Round 3)
 * Purpose:
 * 1) Do not add R65.20 unless actual organ dysfunction exists
 * 2) Auto-add R65.20 if Sepsis + organ dysfunction (ARDS, AKI, RF, encephalopathy) exist
 * 3) Replace A41.9 if organism is known
 */

export interface SepsisContext {
    hasSepsis?: boolean;              // "sepsis" documented
    hasSepticShock?: boolean;         // "septic shock" documented
    sepsisOrganism?: "MRSA" | "ECOLI" | "STREP" | "PSEUD" | "OTHER" | null;
    text?: string;
};

// Simplified type for internal use within Engine where we have StructuredCode objects
type SimpleCode = string;

const ORGAN_DYSFUNCTION_CODES: RegExp[] = [
    /^J80$/,          // ARDS
    /^J96\./,         // Acute/Chronic RF
    /^N17\./,         // AKI
    /^G93\.4/,        // Encephalopathy family
    /^I95\./,         // Hypotension (optional)
    /^R57\./,         // Shock (non-septic)
    /^K72\./,         // Acute liver failure
];

function hasAnyOrganDysfunction(codes: SimpleCode[]): boolean {
    return codes.some(c => ORGAN_DYSFUNCTION_CODES.some(rx => rx.test(c)));
}

function hasCode(codes: SimpleCode[], code: SimpleCode): boolean {
    return codes.includes(code);
}

function removeCode(codes: SimpleCode[], code: SimpleCode): SimpleCode[] {
    return codes.filter(c => c !== code);
}

function addCodeOnce(codes: SimpleCode[], code: SimpleCode): SimpleCode[] {
    return hasCode(codes, code) ? codes : [...codes, code];
}

/** Map known organisms to sepsis codes */
function organismToSepsisCode(org: SepsisContext["sepsisOrganism"]): SimpleCode | null {
    if (!org) return null;
    switch (org) {
        case "MRSA": return "A41.02";
        case "ECOLI": return "A41.51";
        // Can add more as needed
        default: return null;
    }
}

/**
 * Main correction function.
 * Returns array of code strings. The Engine will need to re-map these to StructuredCode objects if new ones are added.
 */
export function enforceSepsisGuardrails(inputCodes: SimpleCode[], ctx: SepsisContext): SimpleCode[] {
    let codes = [...inputCodes];

    const hasR6520 = hasCode(codes, "R65.20");
    const hasR6521 = hasCode(codes, "R65.21");

    const organDysfx = hasAnyOrganDysfunction(codes);

    // Rule A: Septic shock wins
    if (hasR6521 && hasR6520) {
        codes = removeCode(codes, "R65.20");
    }

    // Rule B (CASE 35): Remove R65.20 if NO organ dysfunction
    if (hasR6520 && !organDysfx) {
        codes = removeCode(codes, "R65.20");
    }

    // Rule C (CASE 41): Add R65.20 if Sepsis + Organ Dys + No Shock
    const sepsisPresent = ctx.hasSepsis || codes.some(c => /^A40\.|^A41\./.test(c));
    if (sepsisPresent && organDysfx && !hasR6521) {
        codes = addCodeOnce(codes, "R65.20");
    }

    // Rule D (CASE 48): Replace A41.9 if specific organism known
    const hasA419 = hasCode(codes, "A41.9");
    const specificSepsis = organismToSepsisCode(ctx.sepsisOrganism);

    if (hasA419 && specificSepsis) {
        codes = removeCode(codes, "A41.9");
        codes = addCodeOnce(codes, specificSepsis);
    }

    // Fallback text detection for organism
    if (hasCode(codes, "A41.9") && ctx.text) {
        const t = ctx.text.toLowerCase();
        if (t.includes("mrsa")) {
            codes = removeCode(codes, "A41.9");
            codes = addCodeOnce(codes, "A41.02");
        } else if (t.includes("e. coli") || t.includes("ecoli") || t.includes("escherichia coli")) {
            codes = removeCode(codes, "A41.9");
            codes = addCodeOnce(codes, "A41.51");
        }
    }

    // Optional: Auto-add Shock if documented
    if (ctx.hasSepticShock && !hasR6521) {
        codes = addCodeOnce(codes, "R65.21");
        codes = removeCode(codes, "R65.20");
    }

    return codes;
}
