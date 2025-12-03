
export interface NeoplasmAttributes {
    type: 'malignant' | 'benign' | 'uncertain' | 'in_situ' | 'history' | 'screening';
    site?: string;
    is_secondary?: boolean;
}

export interface NeoplasmResolution {
    code: string;
    label: string;
    attributes: NeoplasmAttributes;
    secondary_codes?: Array<{ code: string; label: string; type: string }>;
    warnings?: string[];
}

export function resolveNeoplasm(text: string): NeoplasmResolution | undefined {
    const lower = text.toLowerCase();
    const warnings: string[] = [];

    const isHistory = /history of/.test(lower) && !/personal history of/.test(lower) ? false : /history/.test(lower); // "history of" usually means Z code if "personal history"
    // Actually "history of cancer" usually implies Z85.
    // But "history of present illness: cancer" implies active.
    // We'll assume "history of" implies Z code for this logic unless context suggests active.

    const isScreening = /screening/.test(lower);
    const isMetastatic = /metastatic|metastasis|secondary/.test(lower);

    // 1. Screening
    if (isScreening && /malignancy|cancer|neoplasm/.test(lower)) {
        let code = 'Z12.9'; // Screening for malignant neoplasm, site unspecified
        if (/colon/.test(lower)) code = 'Z12.11';
        if (/breast/.test(lower)) code = 'Z12.31';
        if (/prostate/.test(lower)) code = 'Z12.5';
        if (/lung/.test(lower)) code = 'Z12.2';

        return {
            code,
            label: 'Encounter for screening for malignant neoplasm',
            attributes: { type: 'screening' },
            warnings
        };
    }

    // 2. History
    if (isHistory && /cancer|malignancy|neoplasm/.test(lower)) {
        let code = 'Z85.9';
        if (/breast/.test(lower)) code = 'Z85.3';
        if (/prostate/.test(lower)) code = 'Z85.46';
        if (/lung/.test(lower)) code = 'Z85.118';
        if (/colon/.test(lower)) code = 'Z85.038';

        return {
            code,
            label: 'Personal history of malignant neoplasm',
            attributes: { type: 'history' },
            warnings
        };
    }

    // 3. Active Malignancy
    if (/cancer|malignancy|carcinoma|sarcoma|tumor|neoplasm/.test(lower)) {
        const secondary_codes: Array<{ code: string; label: string; type: string }> = [];

        // Laterality
        let laterality: 'left' | 'right' | 'unspecified' = 'unspecified';
        if (/left/.test(lower)) laterality = 'left';
        if (/right/.test(lower)) laterality = 'right';

        // Gender (for breast)
        const isMale = /male/.test(lower) && !/female/.test(lower);
        const isFemale = /female/.test(lower) || (!isMale && /breast/.test(lower)); // Default to female for breast if unspecified

        // Metastasis Logic
        // "Metastatic X to Y" or "X cancer metastatic to Y"
        // We need to identify Primary Site and Secondary Site

        let primarySite = 'unspecified';
        let secondarySite = 'none';

        // Check for specific secondary sites
        // Check for specific secondary sites
        if (/metastatic.*to.*brain|metastasis.*to.*brain/.test(lower)) secondarySite = 'brain';
        if (/metastatic.*to.*bone|metastasis.*to.*bone/.test(lower)) secondarySite = 'bone';
        if (/metastatic.*to.*liver|metastasis.*to.*liver/.test(lower)) secondarySite = 'liver';
        if (/metastatic.*to.*lung|metastasis.*to.*lung/.test(lower)) secondarySite = 'lung';

        // Determine Primary Code
        let code = 'C80.1'; // Malignant (primary) neoplasm, unspecified
        let label = 'Malignant neoplasm, unspecified';
        let site = 'unspecified';

        if (/breast/.test(lower)) {
            site = 'breast';
            // C50.911 (Right), C50.912 (Left), C50.919 (Unspecified) - Female
            // C50.921 (Right), C50.922 (Left), C50.929 (Unspecified) - Male
            const genderDigit = isMale ? '2' : '1';
            const latDigit = laterality === 'right' ? '1' : laterality === 'left' ? '2' : '9';

            if (isMetastatic && !/metastatic to/.test(lower) && !/metastasis to/.test(lower)) {
                // "Metastatic breast cancer" -> Primary Breast + Secondary Unspecified
                code = `C50.9${genderDigit}${latDigit}`;
                label = `Malignant neoplasm of ${laterality} breast (${isMale ? 'male' : 'female'})`;
                secondary_codes.push({ code: 'C79.9', label: 'Secondary malignant neoplasm of unspecified site', type: 'metastasis' });
            } else if (isMetastatic && (/metastatic to/.test(lower) || /metastasis to/.test(lower))) {
                // "Breast cancer metastatic to..." -> Primary Breast + Secondary Site
                code = `C50.9${genderDigit}${latDigit}`;
                label = `Malignant neoplasm of ${laterality} breast (${isMale ? 'male' : 'female'})`;
            } else {
                // "Breast cancer" -> Primary Breast
                code = `C50.9${genderDigit}${latDigit}`;
                label = `Malignant neoplasm of ${laterality} breast (${isMale ? 'male' : 'female'})`;
            }
        } else if (/lung/.test(lower)) {
            site = 'lung';
            // C34.90 (Unspecified), C34.91 (Right), C34.92 (Left)
            const latDigit = laterality === 'right' ? '1' : laterality === 'left' ? '2' : '0';

            if (isMetastatic && !/metastatic.*to|metastasis.*to/.test(lower)) {
                code = `C34.9${latDigit}`;
                label = `Malignant neoplasm of unspecified part of ${laterality} bronchus or lung`;
                secondary_codes.push({ code: 'C79.9', label: 'Secondary malignant neoplasm of unspecified site', type: 'metastasis' });
            } else {
                code = `C34.9${latDigit}`;
                label = `Malignant neoplasm of unspecified part of ${laterality} bronchus or lung`;
            }
        } else if (/colon/.test(lower)) {
            site = 'colon';
            code = 'C18.9';
            label = 'Malignant neoplasm of colon, unspecified';
            if (isMetastatic && !/metastatic to/.test(lower)) {
                secondary_codes.push({ code: 'C79.9', label: 'Secondary malignant neoplasm of unspecified site', type: 'metastasis' });
            }
        } else if (/prostate/.test(lower)) {
            site = 'prostate';
            code = 'C61';
            label = 'Malignant neoplasm of prostate';
            if (isMetastatic && !/metastatic to/.test(lower)) {
                secondary_codes.push({ code: 'C79.9', label: 'Secondary malignant neoplasm of unspecified site', type: 'metastasis' });
            }
        }

        // Add Secondary Code if identified
        if (secondarySite === 'brain') secondary_codes.push({ code: 'C79.31', label: 'Secondary malignant neoplasm of brain', type: 'metastasis' });
        if (secondarySite === 'bone') secondary_codes.push({ code: 'C79.51', label: 'Secondary malignant neoplasm of bone', type: 'metastasis' });
        if (secondarySite === 'liver') secondary_codes.push({ code: 'C78.7', label: 'Secondary malignant neoplasm of liver and intrahepatic bile duct', type: 'metastasis' });
        if (secondarySite === 'lung' && site !== 'lung') secondary_codes.push({ code: 'C78.00', label: 'Secondary malignant neoplasm of unspecified lung', type: 'metastasis' });

        if (laterality === 'unspecified' && (site === 'breast' || site === 'lung')) {
            warnings.push('Laterality (left/right) missing; code is unspecified');
        }

        return {
            code,
            label,
            attributes: { type: 'malignant', site, is_secondary: isMetastatic },
            secondary_codes,
            warnings
        };
    }

    return undefined;
}
