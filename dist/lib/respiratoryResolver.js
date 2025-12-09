"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveRespiratory = resolveRespiratory;
function resolveRespiratory(text) {
    const lower = text.toLowerCase();
    const warnings = [];
    const secondary_codes = [];
    const isAcute = /acute/.test(lower);
    const isChronic = /chronic/.test(lower);
    const exacerbation = /exacerbation/.test(lower);
    const hypoxia = /hypoxia/.test(lower);
    const hypercapnia = /hypercapnia/.test(lower);
    const isPostProcedural = /post[- ]?procedural|following.*procedure|after.*surgery|post[- ]?op/.test(lower);
    // Helper to detect structured negations (key: value) or natural language negations
    const isNegated = (term) => {
        // Matches "No [condition]", "None [condition]", "Denies [condition]"
        // OR "[condition]: No", "[condition]: None", "[condition]: 0"
        const pattern = new RegExp(`(no|none|denies|negative)\\s+${term}|${term}\\s*:\\s*(no|none|denies|negative|0)`, 'i');
        return pattern.test(lower);
    };
    const hasPneumonia = /pneumonia/.test(lower) && !isNegated('pneumonia');
    const hasFailure = /respiratory failure/.test(lower) && !isNegated('respiratory failure');
    // Group expressions for regex safety in the helper
    const hasCopd = /copd|chronic obstructive/.test(lower) && !isNegated('(?:copd|chronic obstructive)');
    const hasAsthma = /asthma/.test(lower) && !isNegated('asthma');
    const secondary_conditions = [];
    // Helper functions to generate codes
    const getPneumoniaCode = () => {
        let code = 'J18.9'; // Unspecified
        if (/viral/.test(lower))
            code = 'J12.9';
        if (/bacterial/.test(lower))
            code = 'J15.9';
        if (/strep/.test(lower))
            code = 'J13';
        if (/hemophilus/.test(lower))
            code = 'J14';
        if (/pseudomonas/.test(lower))
            code = 'J15.1'; // Pneumonia due to Pseudomonas
        return code;
    };
    const getOrganismCode = () => {
        if (/pseudomonas.*aeruginosa|p\.?\s*aeruginosa/.test(lower)) {
            return { code: 'B96.5', label: 'Pseudomonas (aeruginosa) as the cause of diseases classified elsewhere' };
        }
        if (/e\.?\s*coli|escherichia\s+coli/.test(lower)) {
            return { code: 'B96.20', label: 'Unspecified Escherichia coli [E. coli] as the cause of diseases classified elsewhere' };
        }
        if (/strep|streptococcus/.test(lower)) {
            return { code: 'B95.9', label: 'Unspecified streptococcus as the cause of diseases classified elsewhere' };
        }
        if (/staph|staphylococcus/.test(lower)) {
            if (/aureus/.test(lower)) {
                if (/mrsa|methicillin resistant/.test(lower)) {
                    return { code: 'B95.62', label: 'Methicillin resistant Staphylococcus aureus as the cause of diseases classified elsewhere' };
                }
                return { code: 'B95.61', label: 'Methicillin susceptible Staphylococcus aureus as the cause of diseases classified elsewhere' };
            }
            return { code: 'B95.8', label: 'Other staphylococcus as the cause of diseases classified elsewhere' };
        }
        return null;
    };
    const getCopdCode = () => {
        let code = 'J44.9';
        if (exacerbation)
            code = 'J44.1';
        else if (/infection/.test(lower) || hasPneumonia)
            code = 'J44.0';
        return code;
    };
    const getAsthmaCode = () => {
        let code = 'J45.909'; // Unspecified asthma, uncomplicated
        const severe = /severe/.test(lower);
        const moderate = /moderate/.test(lower);
        const mild = /mild/.test(lower);
        const intermittent = /intermittent/.test(lower);
        const persistent = /persistent/.test(lower);
        if (mild && intermittent)
            code = exacerbation ? 'J45.21' : 'J45.20';
        else if (mild && persistent)
            code = exacerbation ? 'J45.31' : 'J45.30';
        else if (moderate && persistent)
            code = exacerbation ? 'J45.41' : 'J45.40';
        else if (severe && persistent)
            code = exacerbation ? 'J45.51' : 'J45.50';
        else if (exacerbation)
            code = 'J45.901';
        if (/status asthmaticus/.test(lower)) {
            code = 'J45.902';
        }
        return code;
    };
    // 1. Post-procedural Respiratory Failure (Highest Priority)
    if (hasFailure && isPostProcedural) {
        if (hasPneumonia) {
            secondary_conditions.push('pneumonia');
            secondary_codes.push({ code: getPneumoniaCode(), label: 'Pneumonia', type: 'underlying_condition' });
        }
        if (hasCopd) {
            secondary_conditions.push('copd');
            secondary_codes.push({ code: getCopdCode(), label: 'COPD', type: 'underlying_condition' });
        }
        if (hasAsthma) {
            secondary_conditions.push('asthma');
            secondary_codes.push({ code: getAsthmaCode(), label: 'Asthma', type: 'underlying_condition' });
        }
        let code = 'J95.821'; // Acute postprocedural respiratory failure
        if (isAcute && isChronic)
            code = 'J95.822'; // Acute on chronic
        return {
            code,
            label: 'Postprocedural respiratory failure',
            attributes: { type: 'post_procedural_failure', acuity: isAcute && isChronic ? 'acute_on_chronic' : 'acute', hypoxia, hypercapnia, secondary_conditions },
            secondary_codes,
            warnings: ['Code also underlying cause (e.g. pneumonia) if known']
        };
    }
    // 2. Respiratory Failure (Non-procedural)
    if (hasFailure) {
        if (hasPneumonia) {
            secondary_conditions.push('pneumonia');
            secondary_codes.push({ code: getPneumoniaCode(), label: 'Pneumonia', type: 'underlying_condition' });
        }
        if (hasCopd) {
            secondary_conditions.push('copd');
            secondary_codes.push({ code: getCopdCode(), label: 'COPD', type: 'underlying_condition' });
        }
        if (hasAsthma) {
            secondary_conditions.push('asthma');
            secondary_codes.push({ code: getAsthmaCode(), label: 'Asthma', type: 'underlying_condition' });
        }
        let code = 'J96.90'; // Unspecified
        if (isAcute && isChronic) {
            if (hypoxia)
                code = 'J96.21';
            else if (hypercapnia)
                code = 'J96.22';
            else
                code = 'J96.20';
        }
        else if (isAcute) {
            if (hypoxia)
                code = 'J96.01';
            else if (hypercapnia)
                code = 'J96.02';
            else
                code = 'J96.00';
        }
        else if (isChronic) {
            if (hypoxia)
                code = 'J96.11';
            else if (hypercapnia)
                code = 'J96.12';
            else
                code = 'J96.10';
        }
        return {
            code,
            label: 'Respiratory failure',
            attributes: { type: 'respiratory_failure', acuity: isAcute && isChronic ? 'acute_on_chronic' : isAcute ? 'acute' : isChronic ? 'chronic' : 'unspecified', hypoxia, hypercapnia, secondary_conditions },
            secondary_codes,
            warnings
        };
    }
    // 3. COPD
    if (hasCopd) {
        if (hasPneumonia) {
            secondary_conditions.push('pneumonia');
            // J44.0 includes "with acute lower respiratory infection", but we also code the infection
            secondary_codes.push({ code: getPneumoniaCode(), label: 'Pneumonia', type: 'infection' });
        }
        if (hasAsthma) {
            secondary_conditions.push('asthma');
            // Code also type of asthma
            secondary_codes.push({ code: getAsthmaCode(), label: 'Asthma', type: 'comorbidity' });
        }
        let code = 'J44.9';
        if (exacerbation)
            code = 'J44.1';
        else if (/infection/.test(lower) || hasPneumonia)
            code = 'J44.0';
        return {
            code,
            label: 'Chronic obstructive pulmonary disease',
            attributes: { type: 'copd', exacerbation, secondary_conditions },
            secondary_codes,
            warnings: ['Code also type of asthma if applicable']
        };
    }
    // 4. Asthma
    if (hasAsthma) {
        if (hasPneumonia) {
            secondary_conditions.push('pneumonia');
            secondary_codes.push({ code: getPneumoniaCode(), label: 'Pneumonia', type: 'comorbidity' });
        }
        const code = getAsthmaCode();
        return {
            code,
            label: 'Asthma',
            attributes: { type: 'asthma', exacerbation, secondary_conditions },
            secondary_codes,
            warnings
        };
    }
    // 3. Pneumonia (Primary Diagnosis)
    if (hasPneumonia) {
        const code = getPneumoniaCode();
        // Add organism code if detected
        const organism = getOrganismCode();
        if (organism) {
            secondary_codes.push({ code: organism.code, label: organism.label, type: 'organism' });
        }
        return {
            code,
            label: 'Pneumonia',
            attributes: { type: 'pneumonia', acuity: isAcute ? 'acute' : 'unspecified' },
            secondary_codes: secondary_codes.length > 0 ? secondary_codes : undefined,
            warnings: organism ? [] : ['Code underlying organism if known']
        };
    }
    return undefined;
}
