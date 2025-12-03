
export interface PatientContext {
    demographics: {
        age?: number;
        gender?: 'male' | 'female';
    };
    encounter: {
        type: 'initial' | 'subsequent' | 'sequela' | 'inpatient' | 'outpatient' | 'ed';
    };
    conditions: {
        diabetes?: {
            type: 'type1' | 'type2' | 'drug_induced' | 'secondary';
            complications: Array<'ckd' | 'foot_ulcer' | 'retinopathy' | 'neuropathy' | 'pad' | 'hypoglycemia' | 'hyperosmolarity' | 'ketoacidosis'>;
            ulcerSite?: 'foot_left' | 'foot_right' | 'foot_bilateral' | 'ankle_left' | 'ankle_right' | 'other';
            ulcerSeverity?: 'skin' | 'fat' | 'muscle' | 'bone' | 'unspecified';
            insulinUse?: boolean;
        };
        ckd?: {
            stage: 1 | 2 | 3 | 4 | 5 | 'esrd';
            onDialysis: boolean;
            dialysisType?: 'none' | 'temporary' | 'chronic';
            aki: boolean;
            transplantStatus: boolean;
        };
        cardiovascular?: {
            hypertension: boolean;
            heartFailure?: {
                type: 'systolic' | 'diastolic' | 'combined' | 'unspecified';
                acuity: 'acute' | 'chronic' | 'acute_on_chronic' | 'unspecified';
            };
            cad?: boolean;
            previousMI?: boolean;
            atrialFib?: boolean;
            mi?: {
                type: 'stemi' | 'nstemi';
                site?: 'anterior' | 'inferior' | 'lateral' | 'posterior' | 'other';
                acuity: 'acute' | 'old';
            };
        };
        respiratory?: {
            failure?: {
                type: 'none' | 'acute' | 'chronic' | 'acute_on_chronic';
                withHypoxia?: boolean;
                withHypercapnia?: boolean;
            };
            copd?: {
                present: boolean;
                withInfection?: boolean;
                withExacerbation?: boolean;
            };
            asthma?: {
                present: boolean;
                severity?: 'mild' | 'moderate' | 'severe';
                exacerbation?: boolean;
            };
            pneumonia?: {
                organism?: 'pseudomonas' | 'e_coli' | 'mrsa' | 'mssa' | 'strep' | 'viral' | 'unspecified';
                type: 'aspiration' | 'bacterial' | 'viral' | 'unspecified';
            };
            mechanicalVent?: {
                present: boolean;
                duration?: number; // hours
            };
        };
        infection?: {
            present: boolean;
            site?: 'lung' | 'urinary' | 'blood' | 'skin' | 'other';
            organism?: 'mrsa' | 'e_coli' | 'pseudomonas' | 'unspecified';
            sepsis?: {
                present: boolean;
                severe?: boolean;
                shock?: boolean;
            };
            hospitalAcquired?: boolean;
        };
        wounds?: {
            present: boolean;
            type?: 'pressure' | 'diabetic' | 'traumatic' | 'venous' | 'arterial';
            location?: 'sacral' | 'foot_right' | 'foot_left' | 'heel' | 'buttock' | 'other';
            stage?: 'stage1' | 'stage2' | 'stage3' | 'stage4' | 'unstageable' | 'deep_tissue';
            depth?: 'skin' | 'fat' | 'muscle' | 'bone';
            laterality?: 'left' | 'right' | 'bilateral';
        };
        neoplasm?: {
            present: boolean;
            site?: string;
            primaryOrSecondary?: 'primary' | 'secondary';
            metastasis?: boolean;
            activeTreatment?: boolean;
        };
        injury?: {
            present: boolean;
            type?: 'fracture' | 'open_wound' | 'burn' | 'contusion' | 'laceration';
            bodyRegion?: string;
            laterality?: 'left' | 'right' | 'bilateral';
            encounterType?: 'initial' | 'subsequent' | 'sequela';
            externalCause?: {
                present: boolean;
                mechanism?: 'fall' | 'mvc' | 'assault' | 'sports' | 'other';
            };
        };
        social?: {
            smoking?: 'never' | 'current' | 'former';
            alcohol?: 'none' | 'yes';
            drugUse?: 'none' | 'yes';
            tobaccoDependence?: boolean;
        };
    };
}
