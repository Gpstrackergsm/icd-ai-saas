import type { StructuredCode } from './engine';

/**
 * RESPIRATORY CORRECTOR MODULE
 * 
 * Enforces strict ICD-10-CM respiratory coding rules:
 * 1. COPD + Pneumonia sequencing (Pneumonia principal when reason for admission)
 * 2. COPD + Asthma exacerbation priority (COPD takes precedence)
 * 3. Acute bronchitis code addition for COPD exacerbations
 * 4. Deterministic sorting for respiratory codes
 */

export function correctRespiratorySequencing(codes: StructuredCode[]): StructuredCode[] {
    let corrected = [...codes];

    // 0. TRIM ALL CODES (remove trailing/leading spaces)
    corrected = corrected.map(c => ({
        ...c,
        code: c.code.trim()
    }));

    // 0.1 DEDUPLICATION
    const seen = new Set<string>();
    corrected = corrected.filter(c => {
        if (seen.has(c.code)) return false;
        seen.add(c.code);
        return true;
    });

    // 1. COPD + PNEUMONIA SEQUENCING
    // Rule: When both COPD and Pneumonia present, Pneumonia should be principal
    corrected = fixCOPDPneumoniaSequencing(corrected);

    // 2. COPD + ASTHMA EXACERBATION PRIORITY
    // Rule: COPD exacerbation takes precedence over Asthma exacerbation
    corrected = fixCOPDAsthmaExacerbation(corrected);

    // 3. ASTHMA + RESPIRATORY FAILURE PRIORITY
    // Rule: Asthma exacerbation takes precedence over respiratory failure
    corrected = fixAsthmaRespiratoryFailure(corrected);

    // 4. ADD ACUTE BRONCHITIS CODE
    // Rule: When COPD exacerbation triggered by bronchitis, add J20.9
    corrected = addAcuteBronchitisCode(corrected);

    // 4.1 Filter COPD Codes (Exacerbation supersedes Infection)
    corrected = fixCOPDExacerbationInfection(corrected);

    // 5. FINAL DETERMINISTIC SORTING
    corrected.sort((a, b) => {
        const sA = getRespiratoryPriorityScore(a.code);
        const sB = getRespiratoryPriorityScore(b.code);

        if (sA !== sB) return sA - sB;
        return a.code.localeCompare(b.code);
    });

    return corrected;
}

/**
 * Fix COPD + Pneumonia Sequencing
 * Cases 3, 31: Pneumonia should be principal when it's the reason for admission
 */
function fixCOPDPneumoniaSequencing(codes: StructuredCode[]): StructuredCode[] {
    const hasCOPD = codes.some(c => c.code === 'J44.0' || c.code === 'J44.1');
    const pneumoniaCode = codes.find(c =>
        c.code.startsWith('J13') ||
        c.code.startsWith('J14') ||
        c.code.startsWith('J15') ||
        c.code.startsWith('J16') ||
        c.code.startsWith('J17') ||
        c.code.startsWith('J18')
    );

    if (hasCOPD && pneumoniaCode) {
        // Ensure pneumonia is first by giving it highest priority
        // The sorting function will handle this
        return codes;
    }

    return codes;
}

/**
 * Fix COPD + Asthma Exacerbation Priority
 * Case 7: COPD exacerbation should be principal over Asthma exacerbation
 */
function fixCOPDAsthmaExacerbation(codes: StructuredCode[]): StructuredCode[] {
    const hasCOPDExacerbation = codes.some(c => c.code === 'J44.1');
    const hasAsthmaExacerbation = codes.some(c => c.code === 'J45.901');

    if (hasCOPDExacerbation && hasAsthmaExacerbation) {
        // Ensure COPD exacerbation is first
        // Also downgrade any J44.9 to ensure we don't have both J44.1 and J44.9
        // And remove J44.0 (Infection) if Exacerbation is main driver
        return codes.filter(c => c.code !== 'J44.9' && c.code !== 'J44.0');
    }

    return codes;
}

/**
 * Fix Asthma + Respiratory Failure Priority
 * Case 36: Asthma exacerbation should be principal over respiratory failure
 */
function fixAsthmaRespiratoryFailure(codes: StructuredCode[]): StructuredCode[] {
    const hasAsthmaExacerbation = codes.some(c => c.code === 'J45.901' || c.code === 'J45.902');
    const hasRespiratoryFailure = codes.some(c => c.code.startsWith('J96'));

    if (hasAsthmaExacerbation && hasRespiratoryFailure) {
        // Asthma exacerbation should be principal
        // The sorting function will handle this (asthma=25, RF=40)
        return codes;
    }

    return codes;
}

/**
 * Add Acute Bronchitis Code
 * Case 2: When COPD exacerbation is triggered by acute bronchitis, add J20.9
 */
function addAcuteBronchitisCode(codes: StructuredCode[]): StructuredCode[] {
    const hasJ441 = codes.some(c => c.code === 'J44.1');
    const hasJ440 = codes.some(c => c.code === 'J44.0');
    const hasJ209 = codes.some(c => c.code === 'J20.9');

    // EXCLUDE if Pneumonia is present (J12-J18) - Excludes1 Note
    const hasPneumonia = codes.some(c =>
        c.code.startsWith('J12') || c.code.startsWith('J13') ||
        c.code.startsWith('J14') || c.code.startsWith('J15') ||
        c.code.startsWith('J16') || c.code.startsWith('J17') ||
        c.code.startsWith('J18')
    );

    // If we have both J44.1 (exacerbation) and J44.0 (with infection), add J20.9
    // BUT ONLY if no pneumonia is present
    if (hasJ441 && hasJ440 && !hasJ209 && !hasPneumonia) {
        codes.push({
            code: 'J20.9',
            label: 'Acute bronchitis, unspecified',
            rationale: 'Acute bronchitis as trigger for COPD exacerbation',
            guideline: 'ICD-10-CM J20.9',
            trigger: 'COPD with infection',
            rule: 'Respiratory Corrector'
        });
    }

    return codes;
}

/**
 * Respiratory Priority Scoring
 * Lower score = higher priority (appears first)
 */
function getRespiratoryPriorityScore(code: string): number {
    // 1. Pneumonia (highest priority when reason for admission)
    if (code.startsWith('J13') || code.startsWith('J14') ||
        code.startsWith('J15') || code.startsWith('J16') ||
        code.startsWith('J17') || code.startsWith('J18')) {
        return 10;
    }

    // 2. COPD Exacerbation
    if (code === 'J44.1') return 20;

    // 3. Asthma Exacerbation
    if (code === 'J45.901' || code === 'J45.902') return 25;

    // 4. COPD with Infection
    if (code === 'J44.0') return 30;

    // 5. COPD Unspecified
    if (code === 'J44.9') return 35;

    // 6. Respiratory Failure
    if (code.startsWith('J96')) return 40;

    // 7. Acute Bronchitis
    if (code.startsWith('J20')) return 45;

    // 8. Bronchiolitis
    if (code.startsWith('J21')) return 46;

    // 9. Emphysema
    if (code.startsWith('J43')) return 50;

    // 10. Chronic Bronchitis
    if (code.startsWith('J41')) return 51;

    // 11. Asthma (uncomplicated)
    if (code.startsWith('J45')) return 55;

    // 12. Influenza
    if (code.startsWith('J10') || code.startsWith('J11')) return 15;

    // 13. COVID-19
    if (code === 'U07.1') return 5;

    // 14. Post-procedural respiratory conditions
    if (code.startsWith('J95')) return 12;

    // 15. Pulmonary Edema
    if (code.startsWith('J81')) return 60;

    // 16. Pleural Effusion
    if (code.startsWith('J91')) return 65;

    // 17. Pneumothorax
    if (code.startsWith('J93')) return 70;

    // 18. Pulmonary Embolism (I-codes, not J)
    if (code.startsWith('I26')) return 8;

    // 19. Aspiration Pneumonia
    if (code.startsWith('J69')) return 11;

    // 20. Z-codes (oxygen dependence, etc.)
    if (code.startsWith('Z99.81')) return 95;
    if (code.startsWith('Z')) return 99;

    // 21. Tobacco/Nicotine dependence
    if (code.startsWith('F17')) return 90;

    // 22. Organism codes (B96)
    if (code.startsWith('B96')) return 85;

    // === NON-RESPIRATORY SEQUENCING SUPPORT ===
    // Ensure this corrector doesn't break Sepsis/Source sequencing (Case 21, 23, 35)

    // 23. Localized Sources (UTI, Skin, Abdominal) - Should appear BEFORE Sepsis
    if (code.startsWith('N39') || code.startsWith('N10') || code.startsWith('N30') || // UTI
        code.startsWith('K35') || code.startsWith('K81') || code.startsWith('K57') || // Abdominal
        code.startsWith('L0') || code.startsWith('L89') || code.startsWith('L97') || // Skin
        code.startsWith('T8')) { // Post-procedural infection
        return 52; // Higher priority than Sepsis
    }

    // 24. Sepsis (A40, A41)
    if (code.startsWith('A40') || code.startsWith('A41') || code === 'B37.7') {
        return 55; // Lower priority than Sources
    }

    // 25. Severe Sepsis (R65.2)
    if (code.startsWith('R65.2')) return 56;

    // 26. Renal Failure (N17/N18) - Often associated with Sepsis/Respiratory
    if (code.startsWith('N17') || code.startsWith('N18')) return 58;

    // Default
    return 60;
}

/**
 * Fix COPD Infection vs Exacerbation
 * If J44.1 (Exacerbation) and J44.0 (Infection) present, remove J44.0
 */
function fixCOPDExacerbationInfection(codes: StructuredCode[]): StructuredCode[] {
    const hasExacerbation = codes.some(c => c.code === 'J44.1');
    if (hasExacerbation) {
        return codes.filter(c => c.code !== 'J44.0');
    }
    return codes;
}
