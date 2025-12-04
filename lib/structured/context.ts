
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
            complications: Array<'ckd' | 'foot_ulcer' | 'retinopathy' | 'neuropathy' | 'pad' | 'hypoglycemia' | 'hyperosmolarity' | 'ketoacidosis' | 'hyperosmolar' | 'gangrene' | 'amputation' | 'unspecified'>;
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
                type: 'none' | 'acute' | 'chronic' | 'acute_on_chronic' | 'unspecified';
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
                organism?: 'pseudomonas' | 'e_coli' | 'mrsa' | 'mssa' | 'strep' | 'viral' | 'klebsiella' | 'influenza' | 'legionella' | 'streptococcus' | 'haemophilus' | 'unspecified';
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
            organism?: 'mrsa' | 'mssa' | 'e_coli' | 'pseudomonas' | 'staphylococcus' | 'streptococcus' | 'klebsiella' | 'enterococcus' | 'proteus' | 'candida' | 'bacteroides' | 'enterobacter' | 'serratia' | 'acinetobacter' | 'legionella' | 'influenza' | 'unspecified';
            sepsis?: {
                present: boolean;
                severe?: boolean;
                shock?: boolean;
            };
            hospitalAcquired?: boolean;
            hiv?: boolean;
            tuberculosis?: boolean;
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
            active?: boolean; // true = current disease, false = history only
            site?: 'lung' | 'breast' | 'colon' | 'prostate' | 'other';
            primaryOrSecondary?: 'primary' | 'secondary';
            metastasis?: boolean;
            metastaticSite?: 'bone' | 'brain' | 'liver' | 'lung';
            activeTreatment?: boolean;
            chemotherapy?: boolean;
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
        neurology?: {
            alteredMentalStatus?: boolean;
            encephalopathy?: {
                present: boolean;
                type?: 'metabolic' | 'toxic' | 'hepatic' | 'hypoxic';
            };
            seizure?: boolean;
            dementia?: {
                type: 'alzheimer' | 'vascular' | 'unspecified';
            };
            parkinsons?: boolean;
            coma?: boolean;
            gcs?: number;
            stroke?: boolean;
            hemiplegia?: {
                side: 'left' | 'right' | 'unspecified';
            };
        };
        musculoskeletal?: {
            osteoporosis?: boolean;
            pathologicalFracture?: {
                site: 'femur' | 'other';
            };
        };
        mental_health?: {
            depression?: {
                severity: 'mild' | 'moderate' | 'severe';
                psychoticFeatures?: boolean;
            };
        };
        gastro?: {
            liverDisease?: boolean;
            cirrhosis?: {
                type: 'alcoholic' | 'nash' | 'unspecified';
            };
            hepatitis?: {
                type: 'a' | 'b' | 'c' | 'alcoholic' | 'unspecified';
            };
            bleeding?: {
                site: 'upper' | 'lower' | 'unspecified';
            };
            pancreatitis?: {
                type: 'acute' | 'chronic' | 'unspecified';
            };
            ascites?: boolean;
        };
        hematology?: {
            anemia?: {
                type: 'iron_deficiency' | 'b12_deficiency' | 'chronic_disease' | 'acute_blood_loss' | 'unspecified';
            };
            coagulopathy?: boolean;
        };
        obstetric?: {
            pregnant?: boolean;
            trimester?: 1 | 2 | 3;
            gestationalAge?: number;
            delivery?: {
                occurred: boolean;
                type?: 'vaginal' | 'cesarean';
            };
            preeclampsia?: boolean;
            gestationalDiabetes?: boolean;
            postpartum?: boolean;
        };
    };
    social?: {
        smoking?: 'never' | 'current' | 'former';
        packYears?: number;
        alcoholUse?: 'use' | 'abuse' | 'dependence';
        drugUse?: {
            present: boolean;
            type?: 'opioid' | 'cocaine' | 'cannabis';
        };
        homeless?: boolean;
    };
}
