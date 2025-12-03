
export interface NeoplasmAttributes {
    type: 'malignant' | 'benign' | 'uncertain' | 'in_situ' | 'history' | 'screening';
    site?: string;
    is_secondary?: boolean;
}

export interface NeoplasmResolution {
    code: string;
    label: string;
    attributes: NeoplasmAttributes;
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
    if (/cancer|malignancy|carcinoma|sarcoma|tumor/.test(lower)) {
        // Simplified site mapping
        let code = 'C80.1'; // Malignant (primary) neoplasm, unspecified
        let label = 'Malignant neoplasm, unspecified';
        let site = 'unspecified';

        if (/breast/.test(lower)) {
            site = 'breast';
            if (isMetastatic) {
                code = 'C79.81'; // Secondary of breast
                label = 'Secondary malignant neoplasm of breast';
            } else {
                code = 'C50.919'; // Malignant neoplasm of unspecified site of unspecified female breast
                label = 'Malignant neoplasm of breast';
            }
        } else if (/lung/.test(lower)) {
            site = 'lung';
            if (isMetastatic) {
                code = 'C78.00';
                label = 'Secondary malignant neoplasm of lung';
            } else {
                code = 'C34.90';
                label = 'Malignant neoplasm of unspecified part of unspecified bronchus or lung';
            }
        } else if (/colon/.test(lower)) {
            site = 'colon';
            if (isMetastatic) {
                code = 'C78.5';
                label = 'Secondary malignant neoplasm of large intestine and rectum';
            } else {
                code = 'C18.9';
                label = 'Malignant neoplasm of colon, unspecified';
            }
        } else if (/prostate/.test(lower)) {
            site = 'prostate';
            // Prostate is rarely secondary site, usually primary.
            code = 'C61';
            label = 'Malignant neoplasm of prostate';
        }

        // Generic Metastatic handling if site not matched above but "metastatic" is present
        if (isMetastatic && site === 'unspecified') {
            code = 'C79.9'; // Secondary malignant neoplasm of unspecified site
            label = 'Secondary malignant neoplasm of unspecified site';
        }

        return {
            code,
            label,
            attributes: { type: 'malignant', site, is_secondary: isMetastatic },
            warnings: ['Verify histology and exact site']
        };
    }

    return undefined;
}
