import { SequencedCode } from './rulesEngine';
import { getGuidelineForCode, GuidelineReference } from './guidelineReferences';

export interface CodeRationale {
    code: string;
    label: string;
    clinicalJustification: string;
    guidelineReference?: GuidelineReference;
    sequencingReason?: string;
    specificityNotes?: string[];
}

export interface RationaleResult {
    rationales: CodeRationale[];
    summary: string;
}

/**
 * Generate comprehensive clinical rationale for each code in the sequence
 */
export function generateRationale(
    codes: SequencedCode[],
    warnings: string[]
): RationaleResult {
    const rationales: CodeRationale[] = [];

    codes.forEach((c, index) => {
        const specificityNotes: string[] = [];
        let clinicalJustification = '';
        let sequencingReason = '';

        // Determine clinical justification based on triggeredBy
        if (c.triggeredBy.includes('diabetes')) {
            clinicalJustification = 'Diabetes mellitus with documented complication requiring specific code assignment';
            if (c.triggeredBy.includes('manifestation')) {
                sequencingReason = 'Manifestation code follows etiology (diabetes) per ICD-10-CM guidelines';
            }
        } else if (c.triggeredBy.includes('cardiovascular')) {
            clinicalJustification = 'Cardiovascular condition requiring specific code for accurate risk stratification';
            if (c.code.startsWith('I1')) {
                clinicalJustification = 'Hypertensive disease with documented complications';
            }
        } else if (c.triggeredBy.includes('infection')) {
            clinicalJustification = 'Infectious disease requiring specific pathogen and site identification';
            if (c.triggeredBy.includes('shock')) {
                sequencingReason = 'Septic shock sequenced after sepsis code per ICD-10-CM Guideline I.C.1.d';
            } else if (c.triggeredBy.includes('source')) {
                sequencingReason = 'Source infection sequenced after sepsis/shock codes';
            }
        } else if (c.triggeredBy.includes('respiratory')) {
            clinicalJustification = 'Respiratory condition requiring specific code for severity and type';
        } else if (c.triggeredBy.includes('neoplasm')) {
            clinicalJustification = 'Malignancy requiring specific site and behavior code';
            if (c.triggeredBy.includes('metastasis')) {
                sequencingReason = 'Secondary malignancy sequenced after primary site';
            }
        } else if (c.triggeredBy.includes('trauma')) {
            clinicalJustification = 'Injury requiring specific site, laterality, and encounter type';
            if (c.triggeredBy.includes('pain')) {
                sequencingReason = 'Pain code sequenced after injury per ICD-10-CM Guideline I.C.6.a';
            } else if (c.triggeredBy.includes('external_cause')) {
                sequencingReason = 'External cause sequenced last per ICD-10-CM Guideline I.C.20';
            }
        } else if (c.triggeredBy.includes('obstetrics')) {
            clinicalJustification = 'Pregnancy-related condition with trimester and complication documentation';
        } else if (c.triggeredBy.includes('renal')) {
            clinicalJustification = 'Renal condition requiring specific stage and etiology';
        } else {
            clinicalJustification = 'Clinical condition documented in medical record';
        }

        // Add specificity notes
        const cleanCode = c.code.replace('.', '');
        if (cleanCode.length >= 7) {
            specificityNotes.push('Highly specific code with full character detail');
        } else if (cleanCode.length <= 4) {
            specificityNotes.push('Category-level code; consider more specific code if documentation allows');
        }

        if (/unspecified/i.test(c.label)) {
            specificityNotes.push('Unspecified code used; query for more specific documentation if possible');
        }

        if (c.hcc) {
            specificityNotes.push('HCC code - captures significant clinical complexity');
        }

        // Get guideline reference
        const guideline = getGuidelineForCode(c.code, c.label);

        // Determine sequencing reason if first or last
        if (index === 0 && !sequencingReason) {
            sequencingReason = 'Principal diagnosis - primary reason for encounter';
        } else if (index === codes.length - 1 && c.code.startsWith('W') && !sequencingReason) {
            sequencingReason = 'External cause code sequenced last per guidelines';
        }

        rationales.push({
            code: c.code,
            label: c.label,
            clinicalJustification,
            guidelineReference: guideline,
            sequencingReason: sequencingReason || undefined,
            specificityNotes: specificityNotes.length > 0 ? specificityNotes : undefined
        });
    });

    // Generate summary
    const summary = generateSummary(codes, warnings);

    return { rationales, summary };
}

function generateSummary(codes: SequencedCode[], warnings: string[]): string {
    const parts: string[] = [];

    parts.push(`Assigned ${codes.length} code${codes.length !== 1 ? 's' : ''} based on clinical documentation.`);

    const hccCount = codes.filter(c => c.hcc).length;
    if (hccCount > 0) {
        parts.push(`${hccCount} HCC code${hccCount !== 1 ? 's' : ''} identified for risk adjustment.`);
    }

    if (warnings.length > 0) {
        parts.push(`${warnings.length} warning${warnings.length !== 1 ? 's' : ''} generated - review for documentation improvement opportunities.`);
    } else {
        parts.push('No warnings - all codes meet specificity and compliance requirements.');
    }

    return parts.join(' ');
}
