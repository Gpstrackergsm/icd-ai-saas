
export interface RespiratoryAttributes {
    type: 'copd' | 'asthma' | 'pneumonia' | 'respiratory_failure' | 'post_procedural_failure' | 'none';
    acuity?: 'acute' | 'chronic' | 'acute_on_chronic' | 'unspecified';
    organism?: string;
    exacerbation?: boolean;
    hypoxia?: boolean;
    hypercapnia?: boolean;
    secondary_conditions?: Array<'pneumonia' | 'respiratory_failure' | 'copd' | 'asthma'>;
}

export interface RespiratoryResolution {
    code: string;
    label: string;
    attributes: RespiratoryAttributes;
    warnings?: string[];
}

export function resolveRespiratory(text: string): RespiratoryResolution | undefined {
    const lower = text.toLowerCase();
    const warnings: string[] = [];

    const isAcute = /acute/.test(lower);
    const isChronic = /chronic/.test(lower);
    const exacerbation = /exacerbation/.test(lower);
    const hypoxia = /hypoxia/.test(lower);
    const hypercapnia = /hypercapnia/.test(lower);
    const isPostProcedural = /post[- ]?procedural|following.*procedure|after.*surgery|post[- ]?op/.test(lower);

    const hasPneumonia = /pneumonia/.test(lower);
    const hasFailure = /respiratory failure/.test(lower);
    const hasCopd = /copd|chronic obstructive/.test(lower);
    const hasAsthma = /asthma/.test(lower);

    const secondary_conditions: RespiratoryAttributes['secondary_conditions'] = [];

    // 1. Post-procedural Respiratory Failure (Highest Priority)
    if (hasFailure && isPostProcedural) {
        if (hasPneumonia) secondary_conditions.push('pneumonia');
        if (hasCopd) secondary_conditions.push('copd');
        if (hasAsthma) secondary_conditions.push('asthma');

        let code = 'J95.821'; // Acute postprocedural respiratory failure
        if (isAcute && isChronic) code = 'J95.822'; // Acute on chronic
        // Note: J95.821 is Acute. J95.822 is Acute on chronic.

        return {
            code,
            label: 'Postprocedural respiratory failure',
            attributes: { type: 'post_procedural_failure', acuity: isAcute && isChronic ? 'acute_on_chronic' : 'acute', hypoxia, hypercapnia, secondary_conditions },
            warnings: ['Code also underlying cause (e.g. pneumonia) if known']
        };
    }

    // 2. Respiratory Failure (Non-procedural)
    if (hasFailure) {
        if (hasPneumonia) secondary_conditions.push('pneumonia');
        if (hasCopd) secondary_conditions.push('copd');
        if (hasAsthma) secondary_conditions.push('asthma');

        let code = 'J96.90'; // Unspecified
        if (isAcute && isChronic) {
            if (hypoxia) code = 'J96.21';
            else if (hypercapnia) code = 'J96.22';
            else code = 'J96.20';
        } else if (isAcute) {
            if (hypoxia) code = 'J96.01';
            else if (hypercapnia) code = 'J96.02';
            else code = 'J96.00';
        } else if (isChronic) {
            if (hypoxia) code = 'J96.11';
            else if (hypercapnia) code = 'J96.12';
            else code = 'J96.10';
        }

        return {
            code,
            label: 'Respiratory failure',
            attributes: { type: 'respiratory_failure', acuity: isAcute && isChronic ? 'acute_on_chronic' : isAcute ? 'acute' : isChronic ? 'chronic' : 'unspecified', hypoxia, hypercapnia, secondary_conditions },
            warnings
        };
    }

    // 3. COPD
    if (hasCopd) {
        if (hasPneumonia) secondary_conditions.push('pneumonia');
        if (hasAsthma) secondary_conditions.push('asthma');

        let code = 'J44.9';
        if (exacerbation) code = 'J44.1';
        else if (/infection/.test(lower) || hasPneumonia) code = 'J44.0';

        return {
            code,
            label: 'Chronic obstructive pulmonary disease',
            attributes: { type: 'copd', exacerbation, secondary_conditions },
            warnings: ['Code also type of asthma if applicable']
        };
    }

    // 4. Asthma
    if (hasAsthma) {
        if (hasPneumonia) secondary_conditions.push('pneumonia');

        let code = 'J45.909'; // Unspecified asthma, uncomplicated
        const severe = /severe/.test(lower);
        const moderate = /moderate/.test(lower);
        const mild = /mild/.test(lower);
        const intermittent = /intermittent/.test(lower);
        const persistent = /persistent/.test(lower);

        if (mild && intermittent) code = exacerbation ? 'J45.21' : 'J45.20';
        else if (mild && persistent) code = exacerbation ? 'J45.31' : 'J45.30';
        else if (moderate && persistent) code = exacerbation ? 'J45.41' : 'J45.40';
        else if (severe && persistent) code = exacerbation ? 'J45.51' : 'J45.50';
        else if (exacerbation) code = 'J45.901';

        if (/status asthmaticus/.test(lower)) {
            code = 'J45.902';
        }

        return {
            code,
            label: 'Asthma',
            attributes: { type: 'asthma', exacerbation, secondary_conditions },
            warnings
        };
    }

    // 5. Pneumonia (Standalone)
    if (hasPneumonia) {
        let code = 'J18.9'; // Unspecified
        if (/viral/.test(lower)) code = 'J12.9';
        if (/bacterial/.test(lower)) code = 'J15.9';
        if (/strep/.test(lower)) code = 'J13';
        if (/hemophilus/.test(lower)) code = 'J14';

        return {
            code,
            label: 'Pneumonia',
            attributes: { type: 'pneumonia', organism: 'unspecified' },
            warnings: ['Code underlying organism if known']
        };
    }

    return undefined;
}
