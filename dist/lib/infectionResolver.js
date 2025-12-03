"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveInfection = resolveInfection;
function resolveInfection(text) {
    const lower = text.toLowerCase();
    const warnings = [];
    const isSevere = /severe/.test(lower);
    const hasShock = /shock/.test(lower);
    const organDysfunction = /organ dysfunction|failure|acute/.test(lower);
    const isPostProcedural = /post[- ]?procedural|following.*procedure|after.*surgery|post[- ]?op/.test(lower);
    // Detect if pneumonia + organ failure + post-procedure = implied sepsis
    const hasPneumonia = /pneumonia/.test(lower);
    const hasRespiratoryFailure = /respiratory failure/.test(lower);
    const hasUTI = /uti|urinary tract infection|urosepsis/.test(lower);
    const impliedSepsis = isPostProcedural && hasPneumonia && (hasRespiratoryFailure || organDysfunction);
    // 1. Post-Procedural Sepsis (T81.44XA) - HIGHEST PRIORITY
    if (impliedSepsis || (isPostProcedural && /sepsis|septic/.test(lower))) {
        const secondaryCodes = [];
        // Add organ dysfunction if present
        if (hasRespiratoryFailure) {
            secondaryCodes.push({
                code: 'J95.821',
                label: 'Acute postprocedural respiratory failure',
                type: 'organ_dysfunction'
            });
        }
        // Always add A41.9 for post-procedural sepsis
        secondaryCodes.push({
            code: 'A41.9',
            label: 'Sepsis, unspecified organism',
            type: 'source'
        });
        // Add source infection
        if (hasPneumonia) {
            secondaryCodes.push({
                code: 'J18.9',
                label: 'Pneumonia, unspecified organism',
                type: 'source'
            });
        }
        return {
            code: 'T81.44XA',
            label: 'Sepsis following a procedure, initial encounter',
            attributes: {
                type: 'post_procedural_sepsis',
                severe: isSevere || organDysfunction,
                organ_dysfunction: organDysfunction,
                post_procedural: true,
                requires_sepsis_code: true
            },
            secondary_codes: secondaryCodes,
            warnings: [
                'Post-procedural sepsis sequencing: T81.44XA → Organ dysfunction → A41.9 → Source infection'
            ]
        };
    }
    // 2. Urosepsis / Sepsis with Shock (Non-procedural)
    // Per ICD-10-CM guidelines: A41.9 (Sepsis) MUST be sequenced before R65.21 (Shock)
    if (/sepsis|septic|urosepsis/.test(lower)) {
        // Determine organism
        let code = 'A41.9';
        let label = 'Sepsis, unspecified organism';
        if (/e\.?\s?coli|escherichia\s+coli/i.test(lower)) {
            code = 'A41.51';
            label = 'Sepsis due to Escherichia coli [E. coli]';
        }
        if (/staph|staphylococcus/.test(lower)) {
            if (/aureus/.test(lower)) {
                if (/mrsa|methicillin resistant/.test(lower)) {
                    code = 'A41.02';
                    label = 'Sepsis due to Methicillin resistant Staphylococcus aureus';
                }
                else {
                    code = 'A41.01';
                    label = 'Sepsis due to Methicillin susceptible Staphylococcus aureus';
                }
            }
            else {
                code = 'A41.2';
                label = 'Sepsis due to unspecified staphylococcus';
            }
        }
        const secondaryCodes = [];
        // Add R65.21 if shock is present
        if (hasShock) {
            secondaryCodes.push({
                code: 'R65.21',
                label: 'Severe sepsis with septic shock',
                type: 'shock'
            });
        }
        // Detect and add source
        if (hasUTI) {
            secondaryCodes.push({
                code: 'N39.0',
                label: 'Urinary tract infection, site not specified',
                type: 'source'
            });
        }
        else if (hasPneumonia) {
            secondaryCodes.push({
                code: 'J18.9',
                label: 'Pneumonia, unspecified organism',
                type: 'source'
            });
        }
        return {
            code,
            label,
            attributes: {
                type: hasUTI ? 'urosepsis' : 'sepsis',
                severe: isSevere || hasShock,
                shock: hasShock,
                organ_dysfunction: hasShock || organDysfunction,
                requires_shock_code: hasShock,
                requires_source_code: secondaryCodes.some(sc => sc.type === 'source')
            },
            secondary_codes: secondaryCodes,
            warnings: hasShock ?
                ['Sepsis with shock sequencing: A41.9 → R65.21 → Source infection per ICD-10-CM Guideline I.C.1.b'] :
                []
        };
    }
    // 3. Bacteremia (R78.81)
    if (/bacteremia/.test(lower)) {
        return {
            code: 'R78.81',
            label: 'Bacteremia',
            attributes: { type: 'bacteremia' },
            warnings: ['Do not use if sepsis is documented']
        };
    }
    // 4. UTI (Standalone, no sepsis)
    if (hasUTI && !/sepsis|septic/.test(lower)) {
        return {
            code: 'N39.0',
            label: 'Urinary tract infection, site not specified',
            attributes: { type: 'uti' },
            warnings: ['Use additional code to identify organism']
        };
    }
    return undefined;
}
