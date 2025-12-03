
export interface PsychiatricAttributes {
    type: 'depression' | 'anxiety' | 'bipolar' | 'schizophrenia' | 'substance' | 'none';
    severity?: 'mild' | 'moderate' | 'severe' | 'unspecified';
    remission?: 'partial' | 'full' | 'none';
    with_psychotic_features?: boolean;
    episode?: 'single' | 'recurrent';
}

export interface PsychiatricResolution {
    code: string;
    label: string;
    attributes: PsychiatricAttributes;
    warnings?: string[];
}

export function resolvePsychiatric(text: string): PsychiatricResolution | undefined {
    const lower = text.toLowerCase();
    const warnings: string[] = [];

    const mild = /mild/.test(lower);
    const moderate = /moderate/.test(lower);
    const severe = /severe/.test(lower);
    const psychotic = /psychotic/.test(lower);
    const remission = /remission/.test(lower);
    const partial = /partial/.test(lower);
    const full = /full/.test(lower);
    const recurrent = /recurrent/.test(lower);

    // 1. Depression (Major Depressive Disorder)
    if (/depression|depressive/.test(lower) && !/bipolar|manic/.test(lower)) {
        // F32 Single, F33 Recurrent
        const isRecurrent = recurrent;
        let code = isRecurrent ? 'F33.9' : 'F32.9';

        if (isRecurrent) {
            if (remission) {
                code = full ? 'F33.42' : 'F33.41'; // Full vs Partial
            } else {
                if (mild) code = 'F33.0';
                if (moderate) code = 'F33.1';
                if (severe) code = psychotic ? 'F33.3' : 'F33.2';
            }
        } else {
            // Single episode
            if (mild) code = 'F32.0';
            if (moderate) code = 'F32.1';
            if (severe) code = psychotic ? 'F32.3' : 'F32.2';
        }

        return {
            code,
            label: 'Major depressive disorder',
            attributes: { type: 'depression', severity: mild ? 'mild' : moderate ? 'moderate' : severe ? 'severe' : 'unspecified', episode: isRecurrent ? 'recurrent' : 'single', with_psychotic_features: psychotic },
            warnings
        };
    }

    // 2. Anxiety
    if (/anxiety/.test(lower)) {
        // F41.1 Generalized anxiety disorder
        // F41.9 Anxiety disorder, unspecified
        return {
            code: /generalized/.test(lower) ? 'F41.1' : 'F41.9',
            label: 'Anxiety disorder',
            attributes: { type: 'anxiety' },
            warnings
        };
    }

    // 3. Bipolar
    if (/bipolar/.test(lower)) {
        // F31
        return {
            code: 'F31.9',
            label: 'Bipolar disorder, unspecified',
            attributes: { type: 'bipolar' },
            warnings: ['Specify current episode (manic, depressed) and severity']
        };
    }

    // 4. Schizophrenia
    if (/schizophrenia/.test(lower)) {
        return {
            code: 'F20.9',
            label: 'Schizophrenia, unspecified',
            attributes: { type: 'schizophrenia' },
            warnings
        };
    }

    // 5. Substance Use
    if (/alcohol|drug|opioid|cannabis|cocaine/.test(lower) && /use|abuse|dependence/.test(lower)) {
        // Simplified mapping
        let code = 'F19.10'; // Other drug abuse, uncomplicated
        let substance = 'substance';

        if (/alcohol/.test(lower)) {
            substance = 'alcohol';
            code = 'F10.10'; // Alcohol abuse
            if (/dependence/.test(lower)) code = 'F10.20';
        }

        return {
            code,
            label: `${substance} use disorder`,
            attributes: { type: 'substance' },
            warnings: ['Specify use vs abuse vs dependence']
        };
    }

    return undefined;
}
