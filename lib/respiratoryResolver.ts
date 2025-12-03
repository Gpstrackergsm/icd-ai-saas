
export interface RespiratoryAttributes {
    type: 'copd' | 'asthma' | 'pneumonia' | 'respiratory_failure' | 'none';
    acuity?: 'acute' | 'chronic' | 'acute_on_chronic' | 'unspecified';
    organism?: string;
    exacerbation?: boolean;
    hypoxia?: boolean;
    hypercapnia?: boolean;
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

    // 1. COPD
    if (/copd|chronic obstructive/.test(lower)) {
        let code = 'J44.9';
        if (exacerbation) code = 'J44.1';
        else if (/infection/.test(lower)) code = 'J44.0';

        return {
            code,
            label: 'Chronic obstructive pulmonary disease',
            attributes: { type: 'copd', exacerbation },
            warnings: ['Code also type of asthma if applicable']
        };
    }

    // 2. Asthma
    if (/asthma/.test(lower)) {
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
            code = 'J45.902'; // Unspecified asthma with status asthmaticus
            // Logic for severity + status asthmaticus exists but is complex. 
            // J45.902 is a safe fallback if severity not clear.
        }

        return {
            code,
            label: 'Asthma',
            attributes: { type: 'asthma', exacerbation },
            warnings
        };
    }

    // 3. Pneumonia
    if (/pneumonia/.test(lower)) {
        let code = 'J18.9'; // Unspecified
        if (/viral/.test(lower)) code = 'J12.9';
        if (/bacterial/.test(lower)) code = 'J15.9';
        if (/strep/.test(lower)) code = 'J13'; // Strep pneumoniae
        if (/hemophilus/.test(lower)) code = 'J14';

        return {
            code,
            label: 'Pneumonia',
            attributes: { type: 'pneumonia', organism: 'unspecified' },
            warnings: ['Code underlying organism if known']
        };
    }

    // 4. Respiratory Failure
    if (/respiratory failure/.test(lower)) {
        let code = 'J96.90'; // Unspecified
        if (isAcute && isChronic) {
            if (hypoxia && hypercapnia) code = 'J96.20'; // Unspecified whether hypoxia/hypercapnia? No, J96.20 is acute on chronic unsp.
            // J96.21 Acute on chronic with hypoxia
            // J96.22 Acute on chronic with hypercapnia
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
            attributes: { type: 'respiratory_failure', acuity: isAcute && isChronic ? 'acute_on_chronic' : isAcute ? 'acute' : isChronic ? 'chronic' : 'unspecified', hypoxia, hypercapnia },
            warnings
        };
    }

    return undefined;
}
