
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
        const open = /open|compound/.test(lower) ? 'open' : 'closed';
        const displaced = /displaced/.test(lower) && !/nondisplaced/.test(lower);

        // 7th Character Logic
        // A = Initial encounter for closed fracture
        // B = Initial encounter for open fracture
        // D = Subsequent encounter for fracture with routine healing
        // S = Sequela
        let char7 = 'A';
        if (encounter === 'initial') {
            char7 = open === 'open' ? 'B' : 'A';
        } else if (encounter === 'subsequent') {
            char7 = 'D'; // Default to routine healing
            if (/delayed/.test(lower)) char7 = 'G';
            if (/nonunion/.test(lower)) char7 = 'K';
            if (/malunion/.test(lower)) char7 = 'P';
        } else if (encounter === 'sequela') {
            char7 = 'S';
        }

        let baseCode = 'S00.00';
        let site = 'unspecified';
        let label = 'Fracture';
        let requiresLaterality = false;

        // Specific fracture types

        // Colles' fracture (distal radius)
        if (/distal radius|wrist.*radius|colles/.test(lower)) {
            site = 'distal_radius';
            requiresLaterality = true;
            const latCode = laterality === 'left' ? '2' : laterality === 'right' ? '1' : '9';
            baseCode = `S52.53${latCode}${char7}`;
            label = "Colles' fracture of radius";
        }
        // Generic radius
        else if (/radius|forearm/.test(lower) && !/distal/.test(lower)) {
            site = 'radius';
            requiresLaterality = true;
            const latCode = laterality === 'left' ? '2' : laterality === 'right' ? '1' : '9';
            baseCode = `S52.50${latCode}${char7}`;
            label = 'Unspecified fracture of radius';
        }
        // Femur (Neck)
        else if (/femur|thigh/.test(lower) && /neck/.test(lower)) {
            site = 'femur_neck';
            requiresLaterality = true;
            const latCode = laterality === 'left' ? '2' : laterality === 'right' ? '1' : '9';
            baseCode = `S72.00${latCode}${char7}`;
            label = 'Fracture of unspecified part of neck of femur';
        }
        // Femur (Shaft/Unspecified)
        else if (/femur|thigh/.test(lower)) {
            site = 'femur';
            requiresLaterality = true;
            const latCode = laterality === 'left' ? '2' : laterality === 'right' ? '1' : '9';
            baseCode = `S72.9${latCode}X${char7}`; // S72.91XA
            label = 'Unspecified fracture of femur';
        }
        // Ankle (Lateral malleolus)
        else if (/ankle/.test(lower) || /malleolus/.test(lower)) {
            site = 'ankle';
            requiresLaterality = true;
            const latCode = laterality === 'left' ? '2' : laterality === 'right' ? '1' : '9';
            // S82.891A Other fracture of right lower leg
            // Let's use Lateral Malleolus S82.6
            baseCode = `S82.6${latCode}X${char7}`;
            label = 'Fracture of lateral malleolus';
        }
        // Humerus
        else if (/humerus|upper arm/.test(lower)) {
            site = 'humerus';
            requiresLaterality = true;
            const latCode = laterality === 'left' ? '2' : laterality === 'right' ? '1' : '9';
            baseCode = `S42.30${latCode}${char7}`; // Shaft
            label = 'Fracture of shaft of humerus';
        }
        // Tibia
        else if (/tibia|shin/.test(lower)) {
            site = 'tibia';
            requiresLaterality = true;
            const latCode = laterality === 'left' ? '2' : laterality === 'right' ? '1' : '9';
            baseCode = `S82.20${latCode}${char7}`;
            label = 'Fracture of shaft of tibia';
        }
        // Clavicle
        else if (/clavicle|collar bone/.test(lower)) {
            site = 'clavicle';
            requiresLaterality = true;
            const latCode = laterality === 'left' ? '2' : laterality === 'right' ? '1' : '9';
            baseCode = `S42.00${latCode}${char7}`;
            label = 'Fracture of clavicle';
        }
        // Rib
        else if (/rib/.test(lower)) {
            site = 'rib';
            requiresLaterality = true; // S22.3 is by side
            const latCode = laterality === 'left' ? '2' : laterality === 'right' ? '1' : '9';
            baseCode = `S22.39X${char7}`; // S22.39XA
            // Actually S22.3xx is complicated. S22.39XA is "Fracture of one rib, unspecified side"
            // S22.31XA = Fracture of one rib, right side
            // S22.32XA = Fracture of one rib, left side
            if (laterality === 'right') baseCode = `S22.31X${char7}`;
            if (laterality === 'left') baseCode = `S22.32X${char7}`;
            label = 'Fracture of one rib';
        }
        // Hip (General)
        else if (/hip/.test(lower)) {
            site = 'hip';
            requiresLaterality = true;
            const latCode = laterality === 'left' ? '2' : laterality === 'right' ? '1' : '9';
            baseCode = `S72.00${latCode}${char7}`;
            label = 'Fracture of unspecified part of neck of femur (Hip)';
        }
        // Generic fracture
        else {
            baseCode = `T14.8XX${char7}`;
            label = 'Fracture of unspecified body region';
            warnings.push('Fracture site not specified; using unspecified code');
        }

        if (requiresLaterality && laterality === 'unspecified') {
            warnings.push('Laterality (left/right) missing; code is unspecified');
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
