import type { StructuredCode } from './engine';

export function correctDiabetesCodes(codes: StructuredCode[]): StructuredCode[] {
    // DEEP COPY to match structure
    let corrected = [...codes];

    // 0. REMOVE ALL SPACES (Fix spacing issues like "E11 .22" → "E11.22")
    // This MUST happen before deduplication to catch "E11.22" vs "E11 .22"
    corrected = corrected.map(c => ({ ...c, code: c.code.replace(/\s+/g, '') }));

    // 1. DEDUPLICATION (Simple code match)
    const uniqueMap = new Map<string, StructuredCode>();
    corrected.forEach(c => {
        if (!uniqueMap.has(c.code)) {
            uniqueMap.set(c.code, c);
        }
    });
    corrected = Array.from(uniqueMap.values());

    // 1. RETINOPATHY SPECIFICITY
    // If specific retinopathy exists, remove unspecified (E1x.319, E1x.311)
    const hasSpecificRetino = corrected.some(c =>
        (c.code.startsWith('E1') || c.code.startsWith('E0')) &&
        c.code.includes('.3') &&
        !c.code.endsWith('.319') && !c.code.endsWith('.311')
    );

    if (hasSpecificRetino) {
        corrected = corrected.filter(c => !c.code.endsWith('.319') && !c.code.endsWith('.311'));
    }

    // 2. NEUROPATHY SPECIFICITY
    // If specific neuropathy (poly .42, autonomic .43, gastroparesis .43?) exists, remove unspecified .40
    // E11.43 is Gastroparesis (Type 2) or Autonomic (Type 1 E10.43)
    const hasSpecificNeuro = corrected.some(c => c.code.endsWith('.42') || c.code.endsWith('.43') || c.code.endsWith('.41')); // .41 is mono

    if (hasSpecificNeuro) {
        corrected = corrected.filter(c => !c.code.endsWith('.40'));
    }

    // 3. DKA / HHS WITH COMA
    // If "with coma" exists (.11, .01), remove "without coma" (.10, .00)
    const hasDKAComa = corrected.some(c => c.code.endsWith('.11'));
    if (hasDKAComa) {
        corrected = corrected.filter(c => !c.code.endsWith('.10'));
    }

    const hasHHSComa = corrected.some(c => c.code.endsWith('.01'));
    if (hasHHSComa) {
        corrected = corrected.filter(c => !c.code.endsWith('.00'));
    }

    // 4. GANGRENE RULE (Strict)
    // If E11.52/E10.52 exists, REMOVE I96 (Gangrene NEC)
    const hasDiabeticGangrene = corrected.some(c => c.code.endsWith('.52'));
    if (hasDiabeticGangrene) {
        corrected = corrected.filter(c => c.code !== 'I96');
    }

    // 5. ULCER SEQUENCING & SELECTION
    // Ensure E10.621/E11.621 precedes L97 (handled by sort)
    // STRICT ULCER CLEANUP: If one L97 code is fully specified (site + depth), REMOVE all other L97 codes.
    // Definition of fully specified: L97 + site (not .9) + depth (not .9?)
    // Actually, prompt says: "If one L97 code is fully specified... REMOVE all other L97 codes".
    const l97Codes = corrected.filter(c => c.code.startsWith('L97'));
    if (l97Codes.length > 1) {
        // Find best code. Priority: Necrosis (.5/.6) > Fat (.4) > Muscle (.3?) > Skin (.1/.2)
        // Also specific site vs unspecified.
        // Simple heuristic: If we have a code that is NOT unspecified site L97.9.. and NOT unspecified depth ..9
        // Just keep the first one that looks specific? Or sort them?
        // Let's keep the one with the longest logical specificity or severity.
        // Actually, prompt: "Choose ONE L97.xxx".
        // Let's pick the one with highest severity (last digit).
        // And remove others.

        // Sort L97s by severity (descending last char) and specificity
        // But simply: If strict rule says remove others...
        // Let's keep the one that triggered the highest priority, or just the first specific one.

        // Identify specific vs unspecified laterality
        const getSpecificityScore = (c: string) => {
            // L97.[Site][Lat][Severity]
            // Site: 4=Heel, 5=Other Foot, 8=Other, 9=Unspecified
            // Lat: 1=Right, 2=Left, 3=Bi?, 9=Unsp
            // Prefer Site != 9
            // Prefer Lat != 9
            let score = 0;
            if (c.includes('L97.9')) score -= 10; // Unspecified site penalty
            if (c.includes('L97.8')) score -= 5;  // Other site penalty (less than 9?)

            // Laterality check (approximate regex or char check)
            // L97.xxx -> check 6th char? L97.412
            // L97.41 (Right) vs L97.49 (Unsp)
            const parts = c.split('.');
            if (parts.length > 1) {
                const remnant = parts[1];
                if (remnant.length >= 2) {
                    const lat = remnant[1];
                    if (lat === '1' || lat === '2') score += 10; // Defined laterality
                    if (lat === '9') score -= 10; // Unspecified laterality
                }
            }
            // Severity: Higher last digit is usually more severe (necrosis > skin)
            // 1=Skin, 2=Fat, 3=Muscle, 4=Bone
            const lastChar = c.slice(-1);
            if (!isNaN(parseInt(lastChar))) {
                score += parseInt(lastChar);
            }
            return score;
        };

        // Identifying specific: 
        const isSpecific = (c: string) => !c.includes('97.9'); // Not unspecified site
        const specific = l97Codes.filter(c => isSpecific(c.code));

        if (specific.length > 0) {
            // Keep the "best" specific one.
            // Assumption: Engine outputs severity. We want the most severe.
            // Sort by code string (descending)? L97.523 vs L97.521. 3 > 1. 
            specific.sort((a, b) => getSpecificityScore(b.code) - getSpecificityScore(a.code));
            const winner = specific[0];
            corrected = corrected.filter(c => !c.code.startsWith('L97') || c.code === winner.code);
        } else if (l97Codes.length > 1) {
            // Fallback if specific filtering didn't trigger? (Shouldn't happen with logic above but safety)
            // Just pick one.
            const winner = l97Codes[0];
            corrected = corrected.filter(c => !c.code.startsWith('L97') || c.code === winner.code);
        }
    }

    // 6. FINAL DETERMINISTIC SORTING
    corrected.sort((a, b) => {
        const sA = getStrictSortScore(a.code);
        const sB = getStrictSortScore(b.code);

        if (sA !== sB) return sA - sB;
        return a.code.localeCompare(b.code);
    });

    return corrected;
}

function getStrictSortScore(code: string): number {
    // 1. Cardio-Renal Top Priority I13
    if (code.startsWith('I13')) return 1;

    // 2. Primary / Acute Drivers (But I50 must be AFTER Diabetes-CKD E11.22/N18)
    // Prompt Order: I13 -> E11.22 -> N18 -> I50 -> Z99
    // So I50 must have LOWER priority (Higher score) than E11/N18.

    // Sepsis A41 still high? "1. Cardio / Sepsis primary drivers"
    // But specific rule for Cardio-Renal-Diabetes overrides?
    // Let's keep Sepsis fairly high, but prioritize the specific sequence if I13 exists.

    if (code.startsWith('A40') || code.startsWith('A41')) return 2; // Sepsis

    // 3. Diabetes Combination Codes (E10, E11)
    // Acute DKA/HHS E10.1 / E11.0 -> High priority
    if (code.startsWith('E10.1') || code.startsWith('E11.0') || code.startsWith('E08.1') || code.startsWith('E09.1')) return 3;

    // E11.22 (CKD combo) needs to be before N18 and I50.
    // General Diabetes E codes
    if (code.startsWith('E08') || code.startsWith('E09') || code.startsWith('E10') || code.startsWith('E11') || code.startsWith('E13')) return 4;

    // N18 (CKD) - Should be after E11 (4)
    if (code.startsWith('N18')) return 5;

    // I50 (Heart Failure) - Should be after N18 (5)
    if (code.startsWith('I50')) return 6;

    // I12 (HTN CKD) - If I13 not present?
    if (code.startsWith('I12')) return 6;
    if (code.startsWith('I10')) return 6;

    // 4. Manifestations (L97, I96)
    if (code.startsWith('L97')) return 20;
    if (code.startsWith('I96')) return 21;
    if (code.startsWith('E89')) return 22;

    // 5. Z Codes
    if (code.startsWith('Z99.2')) return 95; // Dialysis status at end? Prompt: ... -> Z99.2
    if (code.startsWith('Z')) return 99;
    if (code.startsWith('R')) return 90;

    return 60; // Default
}
