
export interface GastroAttributes {
    type: 'cholelithiasis' | 'cholecystitis' | 'pancreatitis' | 'gastritis' | 'gi_bleed' | 'none';
    acuity?: 'acute' | 'chronic' | 'unspecified';
    obstruction?: boolean;
    with_inflammation?: boolean; // for cholelithiasis + cholecystitis
    bleeding?: boolean;
}

export interface GastroResolution {
    code: string;
    label: string;
    attributes: GastroAttributes;
    warnings?: string[];
}

export function resolveGastro(text: string): GastroResolution | undefined {
    const lower = text.toLowerCase();
    const warnings: string[] = [];

    const isAcute = /acute/.test(lower);
    const isChronic = /chronic/.test(lower);
    const obstruction = /obstruct/.test(lower);
    const bleeding = /bleed|hemorrhage/.test(lower);

    // 1. Cholelithiasis / Gallstones
    if (/cholelithiasis|gallstone|calculus of gallbladder/.test(lower)) {
        const withCholecystitis = /cholecystitis/.test(lower);

        // K80.0: Calculus of gallbladder with acute cholecystitis
        // K80.1: Calculus of gallbladder with other cholecystitis (chronic)
        // K80.2: Calculus of gallbladder without cholecystitis

        let code = 'K80.20'; // Default: stones w/o cholecystitis w/o obstruction

        if (withCholecystitis) {
            if (isAcute) {
                code = obstruction ? 'K80.01' : 'K80.00';
            } else {
                // Chronic or unspecified cholecystitis with stones
                code = obstruction ? 'K80.11' : 'K80.10';
            }
        } else {
            // Stones without cholecystitis
            code = obstruction ? 'K80.21' : 'K80.20';
        }

        return {
            code,
            label: 'Calculus of gallbladder',
            attributes: { type: 'cholelithiasis', acuity: isAcute ? 'acute' : isChronic ? 'chronic' : 'unspecified', obstruction, with_inflammation: withCholecystitis },
            warnings
        };
    }

    // 2. Cholecystitis (without stones mentioned)
    if (/cholecystitis/.test(lower)) {
        // K81.0 Acute, K81.1 Chronic, K81.9 Unspecified
        let code = 'K81.9';
        if (isAcute) code = 'K81.0';
        else if (isChronic) code = 'K81.1';

        return {
            code,
            label: 'Cholecystitis',
            attributes: { type: 'cholecystitis', acuity: isAcute ? 'acute' : isChronic ? 'chronic' : 'unspecified' },
            warnings: ['Verify if gallstones are present (use K80 series)']
        };
    }

    // 3. Pancreatitis
    if (/pancreatitis/.test(lower)) {
        // K85 Acute, K86.0/1 Chronic
        if (isChronic) {
            const alcohol = /alcohol/.test(lower);
            return {
                code: alcohol ? 'K86.0' : 'K86.1',
                label: 'Chronic pancreatitis',
                attributes: { type: 'pancreatitis', acuity: 'chronic' },
                warnings
            };
        }

        // Acute
        let code = 'K85.9'; // Acute unspecified
        if (/alcohol/.test(lower)) code = 'K85.2';
        if (/biliary|gallstone/.test(lower)) code = 'K85.1';

        return {
            code,
            label: 'Acute pancreatitis',
            attributes: { type: 'pancreatitis', acuity: 'acute' },
            warnings
        };
    }

    // 4. Gastritis
    if (/gastritis/.test(lower)) {
        let code = 'K29.70'; // Gastritis, unspecified, without bleeding
        if (isAcute) code = bleeding ? 'K29.01' : 'K29.00';
        else if (isChronic) code = bleeding ? 'K29.51' : 'K29.50';
        else code = bleeding ? 'K29.71' : 'K29.70';

        return {
            code,
            label: 'Gastritis',
            attributes: { type: 'gastritis', acuity: isAcute ? 'acute' : isChronic ? 'chronic' : 'unspecified', bleeding },
            warnings
        };
    }

    // 5. GI Bleeding (if not captured above)
    if (bleeding && /gastrointestinal|gi bleed/.test(lower)) {
        return {
            code: 'K92.2',
            label: 'Gastrointestinal hemorrhage, unspecified',
            attributes: { type: 'gi_bleed', bleeding: true },
            warnings: ['Code underlying cause if known']
        };
    }

    return undefined;
}
