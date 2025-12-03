"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveObstetrics = resolveObstetrics;
function resolveObstetrics(text) {
    const lower = text.toLowerCase();
    const warnings = [];
    const secondary_codes = [];
    if (!/pregnan|gestation|delivery|maternity|obstetric|birth/.test(lower)) {
        return undefined;
    }
    // Trimester
    let trimester = 'unspecified';
    if (/first trimester|1st trimester/.test(lower))
        trimester = '1';
    if (/second trimester|2nd trimester/.test(lower))
        trimester = '2';
    if (/third trimester|3rd trimester/.test(lower))
        trimester = '3';
    // Weeks
    const weeksMatch = lower.match(/(\d+)\s*weeks/);
    const weeks = weeksMatch ? parseInt(weeksMatch[1]) : undefined;
    // Calculate trimester from weeks if not explicit
    if (weeks && trimester === 'unspecified') {
        if (weeks < 14)
            trimester = '1';
        else if (weeks < 28)
            trimester = '2';
        else
            trimester = '3';
    }
    // Generate Z3A code
    if (weeks) {
        let z3aCode = 'Z3A.00';
        if (weeks < 8)
            z3aCode = 'Z3A.01';
        else if (weeks >= 8 && weeks <= 42)
            z3aCode = `Z3A.${weeks}`;
        else if (weeks > 42)
            z3aCode = 'Z3A.49';
        secondary_codes.push({ code: z3aCode, label: `${weeks} weeks gestation of pregnancy`, type: 'weeks_of_gestation' });
    }
    else {
        warnings.push('Weeks of gestation not specified; add Z3A code manually if known');
    }
    // Delivery Outcome (Z37)
    if (/delivery|birth|born/.test(lower) && !/history/.test(lower)) {
        // Default to single live birth if not specified
        let z37Code = 'Z37.0';
        let z37Label = 'Single live birth';
        if (/twin/.test(lower)) {
            z37Code = 'Z37.2';
            z37Label = 'Twins, both liveborn';
        }
        else if (/stillborn|stillbirth/.test(lower)) {
            z37Code = 'Z37.1';
            z37Label = 'Single stillbirth';
        }
        secondary_codes.push({ code: z37Code, label: z37Label, type: 'outcome_of_delivery' });
    }
    // 1. Normal Pregnancy (Z34) - Supervision of normal pregnancy
    // Only if no complications mentioned
    const hasComplication = /complication|hypertension|diabetes|preeclampsia|placenta|hemorrhage|eclampsia/.test(lower);
    if (!hasComplication && /normal|routine/.test(lower)) {
        let code = 'Z34.90'; // Unspecified
        if (trimester === '1')
            code = 'Z34.91';
        if (trimester === '2')
            code = 'Z34.92';
        if (trimester === '3')
            code = 'Z34.93';
        return {
            code,
            label: 'Encounter for supervision of normal pregnancy',
            attributes: { type: 'pregnancy', trimester, weeks },
            secondary_codes,
            warnings
        };
    }
    // 2. Complications (O codes)
    // Generic fallback for complications if specific ones aren't matched
    // O99.89 Other specified diseases and conditions complicating pregnancy
    let code = 'O99.89';
    let label = 'Other specified diseases and conditions complicating pregnancy, childbirth and the puerperium';
    if (/preeclampsia/.test(lower)) {
        if (/severe/.test(lower)) {
            code = 'O14.10'; // Severe pre-eclampsia
            if (trimester === '1')
                code = 'O14.10'; // Usually not 1st
            if (trimester === '2')
                code = 'O14.12';
            if (trimester === '3')
                code = 'O14.13';
            label = 'Severe pre-eclampsia';
        }
        else {
            code = 'O14.00'; // Mild to moderate
            if (trimester === '2')
                code = 'O14.02';
            if (trimester === '3')
                code = 'O14.03';
            label = 'Mild to moderate pre-eclampsia';
        }
    }
    else if (/placenta previa/.test(lower)) {
        code = 'O44.00'; // Placenta previa without hemorrhage
        if (/hemorrhage|bleeding/.test(lower))
            code = 'O44.10';
        // Trimester specific
        const base = /hemorrhage|bleeding/.test(lower) ? 'O44.1' : 'O44.0';
        if (trimester === '2')
            code = `${base}2`;
        if (trimester === '3')
            code = `${base}3`;
        label = 'Placenta previa';
    }
    else if (/hypertension/.test(lower)) {
        code = 'O16.9'; // Unspecified maternal hypertension
        if (trimester === '1')
            code = 'O16.1';
        if (trimester === '2')
            code = 'O16.2';
        if (trimester === '3')
            code = 'O16.3';
        label = 'Unspecified maternal hypertension';
    }
    else if (/diabetes/.test(lower)) {
        code = 'O24.919'; // Unspecified diabetes in pregnancy
        if (trimester === '1')
            code = 'O24.911';
        if (trimester === '2')
            code = 'O24.912';
        if (trimester === '3')
            code = 'O24.913';
        label = 'Unspecified diabetes mellitus in pregnancy';
    }
    return {
        code,
        label,
        attributes: { type: 'complication', trimester, weeks },
        secondary_codes,
        warnings
    };
}
