
import { PatientContext } from '../context';
import { StructuredCode } from '../types';

export function resolveSepsis(ctx: PatientContext): StructuredCode[] {
    const codes: StructuredCode[] = [];

    // Check for Sepsis Presence (Merge structured and narrative)
    const infection = ctx.conditions.infection;
    const narrativeSepsis = ctx.conditions.sepsis; // Top-level narrative sepsis

    // Check if sepsis is present in ANY location
    const hasSepsis = !!(infection?.sepsis?.present || narrativeSepsis);

    // Determines severity from both sources
    const isSevere =
        (infection?.sepsis?.severe === true) ||
        (infection?.sepsis?.shock === true) ||
        (narrativeSepsis?.severity === 'severe') ||
        (narrativeSepsis?.severity === 'shock');

    const hasShock =
        (infection?.sepsis?.shock === true) ||
        (narrativeSepsis?.severity === 'shock');

    // --- 1. SEPSIS ORGANISMS (A40, A41, B37.7) ---
    if (hasSepsis) {
        // Default to A41.9 if no specific organism
        let organismCode = 'A41.9';
        let organismLabel = 'Sepsis, unspecified organism';

        // Check for specific organism in infection context
        if (infection?.organism && infection.organism !== 'unspecified') {
            organismCode = mapSepsisOrganism(infection.organism, !!ctx.demographics?.isNeonatal);
            organismLabel = `Sepsis due to ${infection.organism.replace(/_/g, ' ')}`;
            // Refine label based on code if needed (e.g. A41.01 = Sepsis due to MSSA)
        }

        codes.push({
            code: organismCode,
            label: organismLabel,
            rationale: `Sepsis documented${infection?.organism ? ' due to ' + infection.organism : ''}`,
            guideline: 'ICD-10-CM A41',
            trigger: `Sepsis${infection?.organism ? ' + ' + infection.organism : ''}`,
            rule: 'Sepsis organism code'
        });
    }

    // --- 2. SEVERE SEPSIS (R65.2) ---
    // STRICT RULE: Requires Explicit "Severe Sepsis" OR "Sepsis + Organ Dysfunction"
    // Also handling Septic Shock (R65.21)

    // Check for Organ Dysfunction (Generic check across systems)
    const hasDysfunction =
        ctx.conditions.renal?.aki || // Correct path: renal.aki
        ctx.conditions.ckd?.aki ||   // Correct path: ckd.aki
        ctx.conditions.respiratory?.failure?.type !== 'none' || // Check failure existence
        ctx.conditions.neurology?.encephalopathy?.present;



    if (hasSepsis && (isSevere || hasShock || hasDysfunction)) {
        // If Shock -> R65.21
        if (hasShock) {
            codes.push({
                code: 'R65.21',
                label: 'Severe sepsis with septic shock',
                rationale: 'Sepsis associated with acute organ dysfunction and septic shock',
                guideline: 'ICD-10-CM R65.21',
                trigger: 'Septic Shock',
                rule: 'Severe Sepsis / Shock'
            });
        }
        // If Severe OR Dysfunction -> R65.20
        else {
            codes.push({
                code: 'R65.20',
                label: 'Severe sepsis without septic shock',
                rationale: 'Sepsis associated with acute organ dysfunction',
                guideline: 'ICD-10-CM R65.20',
                trigger: 'Severe Sepsis / Dysfunction',
                rule: 'Severe Sepsis'
            });
        }
    }

    // --- 3. SEQUENCING HELPERS ---
    // The engine's main sequencer handles the Prio between Sepsis vs Source.
    // This resolver just returns the components.

    return codes;
}

// Helper: Map organism to ICD-10 Sepsis Code
function mapSepsisOrganism(organism: string, isNeonatal: boolean): string {
    const lower = organism.toLowerCase();

    // Neonatal Sepsis Check (P36.x)
    if (isNeonatal) {
        if (lower.includes('group b strep') || lower.includes('streptococcus agalactiae') || lower.includes('gbs b') || lower.includes('strep_group_b') || lower.includes('group b streptococcus')) return 'P36.0'; // Sepsis of newborn due to GBS
        if (lower.includes('e. coli') || lower.includes('escherichia coli') || lower.includes('e_coli')) return 'P36.4'; // Sepsis of newborn due to E. coli
        if (lower.includes('staph aureus') || lower.includes('staphylococcus aureus') || lower.includes('mssa') || lower.includes('mrsa')) return 'P36.2'; // Sepsis of newborn due to Staph aureus
        if (lower.includes('staph') || lower.includes('staphylococcus')) return 'P36.3'; // Sepsis of newborn due to other Staph
        return 'P36.9'; // Bacterial sepsis of newborn, unspecified
    }

    // E. coli
    if (lower.includes('e. coli') || lower.includes('e.coli') || lower.includes('e coli') || lower === 'e_coli') return 'A41.51';

    // Pseudomonas
    if (lower.includes('pseudomonas')) return 'A41.52';

    // MRSA/MSSA/Staph aureus
    if (lower.includes('mrsa')) return 'A41.02';
    if (lower.includes('mssa')) return 'A41.01';
    if (lower.includes('staphylococcus aureus') || lower.includes('staph aureus')) return 'A41.01'; // Default MSSA

    // Staph epidermidis or other Staph
    if (lower.includes('epidermidis') || lower === 'staph_epidermidis' || lower === 'staph epidermidis') return 'A41.1';
    if (lower.includes('staph') || lower.includes('staphylococcus')) return 'A41.01'; // Default A41.01

    // STREPTOCOCCAL SEPSIS - A40.x
    if (lower.includes('group a strep') || lower.includes('streptococcus pyogenes') || lower.includes('gbs a') || lower === 'strep_group_a') return 'A40.0';
    if (lower.includes('group b strep') || lower.includes('streptococcus agalactiae') || lower.includes('gbs b') || lower === 'strep_group_b') return 'A40.1';
    if (lower.includes('streptococcus pneumoniae') || lower.includes('strep pneumoniae') || lower === 'strep_pneumoniae') return 'A40.3';
    if (lower.includes('strep') || lower.includes('streptococcus')) return 'A40.9';

    // Klebsiella
    if (lower.includes('klebsiella')) return 'A41.50';

    // Other organisms
    if (lower.includes('enterococcus')) return 'A41.81';
    if (lower.includes('proteus')) return 'A41.59';
    if (lower.includes('candida')) return 'B37.7';
    if (lower.includes('bacteroides') || lower.includes('anaerobe')) return 'A41.4';
    if (lower.includes('enterobacter')) return 'A41.59';
    if (lower.includes('serratia')) return 'A41.53';
    if (lower.includes('acinetobacter')) return 'A41.59';
    if (lower.includes('legionella')) return 'A48.1';

    return 'A41.9';
}
