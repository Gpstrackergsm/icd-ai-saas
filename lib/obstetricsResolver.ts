
export interface ObstetricsAttributes {
    type: 'pregnancy' | 'delivery' | 'complication' | 'none';
    trimester?: '1' | '2' | '3' | 'unspecified';
    weeks?: number;
    complication_type?: string;
}

export interface ObstetricsResolution {
    code: string;
    label: string;
    attributes: ObstetricsAttributes;
    warnings?: string[];
}

export function resolveObstetrics(text: string): ObstetricsResolution | undefined {
    const lower = text.toLowerCase();
    const warnings: string[] = [];

    if (!/pregnan|gestation|delivery|maternity|obstetric/.test(lower)) {
        return undefined;
    }

    // Trimester
    let trimester: ObstetricsAttributes['trimester'] = 'unspecified';
    if (/first trimester|1st trimester/.test(lower)) trimester = '1';
    if (/second trimester|2nd trimester/.test(lower)) trimester = '2';
    if (/third trimester|3rd trimester/.test(lower)) trimester = '3';

    // Weeks
    const weeksMatch = lower.match(/(\d+)\s*weeks/);
    const weeks = weeksMatch ? parseInt(weeksMatch[1]) : undefined;

    // Calculate trimester from weeks if not explicit
    if (weeks && trimester === 'unspecified') {
        if (weeks < 14) trimester = '1';
        else if (weeks < 28) trimester = '2';
        else trimester = '3';
    }

    // 1. Normal Pregnancy (Z34) - Supervision of normal pregnancy
    // Only if no complications mentioned
    const hasComplication = /complication|hypertension|diabetes|preeclampsia|placenta|hemorrhage/.test(lower);

    if (!hasComplication && /normal|routine/.test(lower)) {
        let code = 'Z34.90'; // Unspecified
        if (trimester === '1') code = 'Z34.91';
        if (trimester === '2') code = 'Z34.92';
        if (trimester === '3') code = 'Z34.93';

        return {
            code,
            label: 'Encounter for supervision of normal pregnancy',
            attributes: { type: 'pregnancy', trimester, weeks },
            warnings: weeks ? ['Add Z3A code for weeks of gestation'] : ['Add Z3A code for weeks of gestation']
        };
    }

    // 2. Complications (O codes)
    // Generic fallback for complications if specific ones aren't matched
    // O99.89 Other specified diseases and conditions complicating pregnancy

    let code = 'O99.89';
    let label = 'Other specified diseases and conditions complicating pregnancy, childbirth and the puerperium';

    if (/hypertension/.test(lower)) {
        code = 'O16.9'; // Unspecified maternal hypertension
        if (trimester === '1') code = 'O16.1';
        if (trimester === '2') code = 'O16.2';
        if (trimester === '3') code = 'O16.3';
        label = 'Unspecified maternal hypertension';
    } else if (/diabetes/.test(lower)) {
        code = 'O24.919'; // Unspecified diabetes in pregnancy
        if (trimester === '1') code = 'O24.911';
        if (trimester === '2') code = 'O24.912';
        if (trimester === '3') code = 'O24.913';
        label = 'Unspecified diabetes mellitus in pregnancy';
    }

    return {
        code,
        label,
        attributes: { type: 'complication', trimester, weeks },
        warnings: ['Add Z3A code for weeks of gestation']
    };
}
