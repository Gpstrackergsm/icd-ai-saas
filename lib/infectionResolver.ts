
export interface InfectionAttributes {
    type: 'sepsis' | 'bacteremia' | 'uti' | 'pneumonia' | 'other';
    organism?: string;
    severe?: boolean;
    shock?: boolean;
    organ_dysfunction?: boolean;
    complicated?: boolean;
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
    const organDysfunction = /organ dysfunction|failure/.test(lower);

    // 1. Sepsis / Severe Sepsis / Septic Shock
    if (/sepsis|septic/.test(lower)) {
        if (hasShock) {
            // R65.21 Severe sepsis with septic shock
            // Note: Requires underlying infection code first. 
            // We return R65.21 but warnings should state "Code underlying infection first"
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
        // If organism is specified, we should try to match it, but for now default to A41.9
        let code = 'A41.9';
        if (/e\.? coli|escherichia coli/.test(lower)) code = 'A41.51';
        if (/staph|staphylococcus/.test(lower)) {
            if (/aureus/.test(lower)) {
                if (/mrsa|methicillin resistant/.test(lower)) code = 'A41.02';
                else code = 'A41.01';
            } else {
                code = 'A41.2'; // Staph unspecified
            }
        }

        return {
            code,
            label: 'Sepsis, unspecified organism',
            attributes: { type: 'sepsis' },
            warnings: ['Code first underlying infection if known']
        };
    }

    // 2. Bacteremia (R78.81)
    if (/bacteremia/.test(lower)) {
        return {
            code: 'R78.81',
            label: 'Bacteremia',
            attributes: { type: 'bacteremia' },
            warnings: ['Do not use if sepsis is documented']
        };
    }

    // 3. UTI
    if (/uti|urinary tract infection/.test(lower)) {
        // N39.0 is site unspecified. 
        // If site is specified (cystitis, etc), logic would differ.
        // Complicated vs Uncomplicated isn't a direct ICD distinction in N39.0 but affects clinical path.
        return {
            code: 'N39.0',
            label: 'Urinary tract infection, site not specified',
            attributes: { type: 'uti' },
            warnings: ['Use additional code to identify organism']
        };
    }

    return undefined;
}
