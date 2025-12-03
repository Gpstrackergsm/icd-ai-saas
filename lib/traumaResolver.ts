
export interface TraumaAttributes {
    type: 'fracture' | 'injury' | 'burn' | 'pain' | 'external_cause' | 'none';
    site?: string;
    laterality?: 'left' | 'right' | 'bilateral' | 'unspecified';
    encounter?: 'initial' | 'subsequent' | 'sequela';
    open_closed?: 'open' | 'closed';
    displaced?: boolean;
    has_pain?: boolean;
    pain_type?: 'acute' | 'chronic' | 'post_traumatic';
    external_cause?: string;
}

export interface TraumaResolution {
    code: string;
    label: string;
    attributes: TraumaAttributes;
    warnings?: string[];
    secondary_codes?: Array<{ code: string; label: string; type: string }>;
}

export function resolveTrauma(text: string): TraumaResolution | undefined {
    const lower = text.toLowerCase();
    const warnings: string[] = [];
    const secondary_codes: Array<{ code: string; label: string; type: string }> = [];

    // Encounter detection
    let encounter: TraumaAttributes['encounter'] = 'initial';
    if (/subsequent|follow[- ]up|healing/.test(lower)) encounter = 'subsequent';
    if (/sequela|late effect/.test(lower)) encounter = 'sequela';

    const suffix = encounter === 'initial' ? 'A' : encounter === 'subsequent' ? 'D' : 'S';

    // Laterality
    let laterality: TraumaAttributes['laterality'] = 'unspecified';
    if (/left/.test(lower)) laterality = 'left';
    if (/right/.test(lower)) laterality = 'right';
    if (/bilateral/.test(lower)) laterality = 'bilateral';

    // Pain detection
    const hasPain = /pain/.test(lower);
    const acutePain = /acute.*pain|severe.*pain/.test(lower);
    const chronicPain = /chronic.*pain/.test(lower);
    const postTraumaticPain = /post[- ]?traumatic.*pain/.test(lower);

    // External cause detection
    const hasFall = /fall/.test(lower);
    const fallSameLevel = /same level/.test(lower);

    // Fracture logic
    if (/fracture|broken/.test(lower)) {
        const open = /open/.test(lower) ? 'open' : 'closed';
        const displaced = /displaced/.test(lower) && !/nondisplaced/.test(lower);

        let baseCode = 'S00.00';
        let site = 'unspecified';
        let label = 'Fracture';

        // Specific fracture types
        // Colles' fracture (distal radius)
        if (/distal radius|wrist.*radius|colles/.test(lower)) {
            site = 'distal_radius';
            const latCode = laterality === 'left' ? '2' : laterality === 'right' ? '1' : '9';
            baseCode = `S52.53${latCode}${suffix}`;
            label = "Colles' fracture of radius";
        }
        // Generic radius
        else if (/radius|forearm/.test(lower) && !/distal/.test(lower)) {
            site = 'radius';
            const latCode = laterality === 'left' ? '2' : laterality === 'right' ? '1' : '9';
            baseCode = `S52.50${latCode}${suffix}`;
            label = 'Unspecified fracture of radius';
        }
        // Femur
        else if (/femur|thigh/.test(lower)) {
            site = 'femur';
            baseCode = `S72.90X${suffix}`;
            label = 'Unspecified fracture of femur';
        }
        // Hip
        else if (/hip/.test(lower)) {
            site = 'hip';
            const latCode = laterality === 'left' ? '2' : laterality === 'right' ? '1' : '9';
            baseCode = `S72.00${latCode}${suffix}`;
            label = 'Fracture of unspecified part of neck of femur';
        }
        // Rib
        else if (/rib/.test(lower)) {
            site = 'rib';
            baseCode = `S22.39X${suffix}`;
            label = 'Fracture of one rib';
        }
        // Generic fracture
        else {
            baseCode = `T14.8XX${suffix}`;
            label = 'Fracture of unspecified body region';
            warnings.push('Fracture site not specified; using unspecified code');
        }

        // Add pain code if documented
        if (hasPain) {
            if (postTraumaticPain || acutePain) {
                secondary_codes.push({
                    code: 'G89.11',
                    label: 'Acute pain due to trauma',
                    type: 'pain'
                });
            } else if (chronicPain) {
                secondary_codes.push({
                    code: 'G89.21',
                    label: 'Chronic pain due to trauma',
                    type: 'pain'
                });
            }
        }

        // Add external cause if documented
        if (hasFall) {
            let externalCode = 'W19.XXXA'; // Unspecified fall
            if (fallSameLevel) {
                externalCode = 'W18.30XA'; // Fall on same level, unspecified
            }
            secondary_codes.push({
                code: externalCode,
                label: 'Unspecified fall',
                type: 'external_cause'
            });
        }

        return {
            code: baseCode,
            label,
            attributes: {
                type: 'fracture',
                site,
                laterality,
                encounter,
                open_closed: open,
                displaced,
                has_pain: hasPain,
                pain_type: postTraumaticPain || acutePain ? 'acute' : chronicPain ? 'chronic' : undefined
            },
            warnings,
            secondary_codes
        };
    }

    // General Injury
    if (/injury|trauma|wound|laceration|contusion/.test(lower)) {
        return {
            code: `T14.90X${suffix}`,
            label: 'Injury, unspecified',
            attributes: { type: 'injury', encounter },
            warnings: ['Specify type of injury (laceration, contusion, etc.) and location']
        };
    }

    return undefined;
}
