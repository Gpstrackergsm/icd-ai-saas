
export interface TraumaAttributes {
    type: 'fracture' | 'injury' | 'burn' | 'none';
    site?: string;
    laterality?: 'left' | 'right' | 'bilateral' | 'unspecified';
    encounter?: 'initial' | 'subsequent' | 'sequela';
    open_closed?: 'open' | 'closed';
    displaced?: boolean;
}

export interface TraumaResolution {
    code: string;
    label: string;
    attributes: TraumaAttributes;
    warnings?: string[];
}

export function resolveTrauma(text: string): TraumaResolution | undefined {
    const lower = text.toLowerCase();
    const warnings: string[] = [];

    // Encounter detection
    let encounter: TraumaAttributes['encounter'] = 'initial'; // Default
    if (/subsequent|follow[- ]up|healing/.test(lower)) encounter = 'subsequent';
    if (/sequela|late effect/.test(lower)) encounter = 'sequela';

    // Suffix mapping
    const suffix = encounter === 'initial' ? 'A' : encounter === 'subsequent' ? 'D' : 'S';

    // Laterality
    let laterality: TraumaAttributes['laterality'] = 'unspecified';
    if (/left/.test(lower)) laterality = 'left';
    if (/right/.test(lower)) laterality = 'right';
    if (/bilateral/.test(lower)) laterality = 'bilateral';

    // Fracture logic
    if (/fracture|broken/.test(lower)) {
        const open = /open/.test(lower) ? 'open' : 'closed';
        const displaced = /displaced/.test(lower) && !/nondisplaced/.test(lower);

        // Simplified site mapping
        let baseCode = 'S00.00'; // Placeholder
        let site = 'unspecified';

        if (/femur|thigh/.test(lower)) {
            site = 'femur';
            baseCode = 'S72.90X'; // Unspecified fracture of femur
        } else if (/radius|forearm|wrist/.test(lower)) {
            site = 'radius';
            baseCode = 'S52.501'; // Unspecified fracture of lower end of radius
            if (laterality === 'left') baseCode = 'S52.502';
            if (laterality === 'right') baseCode = 'S52.501';
            if (laterality === 'unspecified') baseCode = 'S52.509';
        } else if (/hip/.test(lower)) {
            site = 'hip';
            baseCode = 'S72.001'; // Fracture of unspecified part of neck of femur
            if (laterality === 'left') baseCode = 'S72.002';
            if (laterality === 'right') baseCode = 'S72.001';
            if (laterality === 'unspecified') baseCode = 'S72.009';
        } else if (/rib/.test(lower)) {
            site = 'rib';
            baseCode = 'S22.39X'; // Fracture of one rib
        } else {
            // Generic fracture
            baseCode = 'T14.8'; // Fracture of unspecified body region
            // T14.8 does not take 7th character in the same way as S codes usually, but let's assume S code structure for standard trauma
            // Actually T14.8xxA is valid.
        }

        // Append suffix
        // Note: Most fracture codes are 7 characters. 
        // If baseCode is 5 chars (S72.90), we need placeholder 'X' then suffix -> S72.90XA
        // If baseCode is 6 chars (S52.501), we add suffix -> S52.501A
        // If baseCode is 3 chars (T14), T14.8xxA

        let finalCode = baseCode;
        if (baseCode.length === 3) finalCode = `${baseCode}.8XX${suffix}`; // T14 -> T14.8XXA
        else if (baseCode.length === 5) finalCode = `${baseCode}X${suffix}`;
        else if (baseCode.length === 6) finalCode = `${baseCode}${suffix}`;
        else if (baseCode.endsWith('X')) finalCode = `${baseCode}${suffix}`; // Already has X placeholder

        return {
            code: finalCode,
            label: `Fracture of ${site}`,
            attributes: { type: 'fracture', site, laterality, encounter, open_closed: open, displaced },
            warnings: ['Verify open/closed status and specific anatomical location']
        };
    }

    // General Injury
    if (/injury|trauma|wound|laceration|contusion/.test(lower)) {
        // Generic fallback
        return {
            code: `T14.90X${suffix}`,
            label: 'Injury, unspecified',
            attributes: { type: 'injury', encounter },
            warnings: ['Specify type of injury (laceration, contusion, etc.) and location']
        };
    }

    return undefined;
}
