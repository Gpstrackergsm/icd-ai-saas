
export interface InfectionAttributes {
    type: 'sepsis' | 'bacteremia' | 'uti' | 'pneumonia' | 'post_procedural_sepsis' | 'urosepsis' | 'other';
    organism?: string;
    severe?: boolean;
    shock?: boolean;
    organ_dysfunction?: boolean;
    complicated?: boolean;
    post_procedural?: boolean;
    requires_sepsis_code?: boolean;
    requires_shock_code?: boolean;
    requires_source_code?: boolean;
    source_code?: string;
    source_label?: string;
}

export interface InfectionResolution {
    code: string;
    label: string;
    attributes: InfectionAttributes;
    warnings?: string[];
}

export function resolveInfection(text: string): InfectionResolution | undefined {
    const lower = text.toLowerCase();
    const warnings: string[] = [];

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
        return {
            code: 'T81.44XA',
            label: 'Sepsis following a procedure, initial encounter',
            attributes: {
                type: 'post_procedural_sepsis',
                severe: isSevere || organDysfunction,
                organ_dysfunction: organDysfunction,
                post_procedural: true,
                requires_sepsis_code: true // Flag to add A41.9 as secondary
            },
            warnings: [
                'Code also A41.9 (Sepsis, unspecified organism) as secondary',
                'Code also the specific infection (e.g., J18.9 for pneumonia)',
                'Code also any organ dysfunction (e.g., J95.821 for respiratory failure)'
            ]
        };
    }

    // 2. Urosepsis / Sepsis with Shock (Non-procedural)
    // Per ICD-10-CM guidelines: A41.9 (Sepsis) MUST be sequenced before R65.21 (Shock)
    if (/sepsis|septic|urosepsis/.test(lower)) {
        // Determine organism
        let code = 'A41.9';
        if (/e\\.? coli|escherichia coli/.test(lower)) code = 'A41.51';
        if (/staph|staphylococcus/.test(lower)) {
            if (/aureus/.test(lower)) {
                if (/mrsa|methicillin resistant/.test(lower)) code = 'A41.02';
                else code = 'A41.01';
            } else {
                code = 'A41.2';
            }
        }

        // Detect source
        let sourceCode: string | undefined;
        let sourceLabel: string | undefined;
        if (hasUTI) {
            sourceCode = 'N39.0';
            sourceLabel = 'Urinary tract infection, site not specified';
        } else if (hasPneumonia) {
            sourceCode = 'J18.9';
            sourceLabel = 'Pneumonia, unspecified organism';
        }

        return {
            code,
            label: 'Sepsis, unspecified organism',
            attributes: {
                type: hasUTI ? 'urosepsis' : 'sepsis',
                severe: isSevere || hasShock,
                shock: hasShock,
                organ_dysfunction: hasShock || organDysfunction,
                requires_shock_code: hasShock, // Flag to add R65.21
                requires_source_code: !!sourceCode,
                source_code: sourceCode,
                source_label: sourceLabel
            },
            warnings: hasShock ? ['Code also R65.21 (Severe sepsis with septic shock)', 'Code also localized infection source'] : []
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
