
export interface PatientContext {
    demographics: {
        age?: number;
        gender?: 'male' | 'female';
    };
    encounter: {
        type: 'initial' | 'subsequent' | 'sequela';
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
            mi?: {
                type: 'stemi' | 'nstemi';
                site?: 'anterior' | 'inferior' | 'other';
                acuity: 'acute' | 'old';
            };
        };
        respiratory?: {
            pneumonia?: {
                organism?: 'pseudomonas' | 'e_coli' | 'mrsa' | 'mss' | 'strep' | 'viral' | 'unspecified';
                type: 'aspiration' | 'bacterial' | 'viral' | 'unspecified';
            };
            copd?: {
                exacerbation: boolean;
                infection: boolean;
            };
            asthma?: {
                severity: 'mild' | 'moderate' | 'severe';
                frequency: 'intermittent' | 'persistent';
                exacerbation: boolean;
                statusAsthmaticus: boolean;
            };
            failure?: {
                acuity: 'acute' | 'chronic' | 'acute_on_chronic';
                postProcedural: boolean;
            };
        };
        infection?: {
            sepsis?: {
                present: boolean;
                severe: boolean;
                shock: boolean;
                postProcedural: boolean;
                organism?: string;
            };
        };
        injury?: {
            type: 'fracture' | 'laceration' | 'contusion' | 'burn';
            site: string;
            laterality?: 'left' | 'right' | 'bilateral';
            episode: 'initial' | 'subsequent' | 'sequela';
        };
    };
}
