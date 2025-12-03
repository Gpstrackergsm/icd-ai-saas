export interface InfectionAttributes {
    type: 'sepsis' | 'bacteremia' | 'uti' | 'pneumonia' | 'post_procedural_sepsis' | 'other';
    organism?: string;
    severe?: boolean;
    shock?: boolean;
    organ_dysfunction?: boolean;
    complicated?: boolean;
    post_procedural?: boolean;
    requires_sepsis_code?: boolean;
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

    // 2. Sepsis / Severe Sepsis / Septic Shock (Non-procedural)
    if (/sepsis|septic/.test(lower)) {
        if (hasShock) {
            return {
                code: 'R65.21',
                label: 'Severe sepsis with septic shock',
                attributes: { type: 'sepsis', severe: true, shock: true, organ_dysfunction: true },
                warnings: ['Code first underlying infection', 'Use additional code to identify specific organ dysfunction']
            };
        }
        if (isSevere || organDysfunction) {
            return {
                code: 'R65.20',
                label: 'Severe sepsis without septic shock',
                attributes: { type: 'sepsis', severe: true, organ_dysfunction: true },
                warnings: ['Code first underlying infection', 'Use additional code to identify specific organ dysfunction']
            };
        }

        // Unspecified Sepsis (A41.9)
        let code = 'A41.9';
        if (/e\.? coli|escherichia coli/.test(lower)) code = 'A41.51';
        if (/staph|staphylococcus/.test(lower)) {
            if (/aureus/.test(lower)) {
                if (/mrsa|methicillin resistant/.test(lower)) code = 'A41.02';
                else code = 'A41.01';
            } else {
                code = 'A41.2';
            }
        }

        return {
            code,
            label: 'Sepsis, unspecified organism',
            attributes: { type: 'sepsis' },
            warnings: ['Code first underlying infection if known']
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

    // 4. UTI
    if (/uti|urinary tract infection/.test(lower)) {
        return {
            code: 'N39.0',
            label: 'Urinary tract infection, site not specified',
            attributes: { type: 'uti' },
            warnings: ['Use additional code to identify organism']
        };
    }

    return undefined;
}
