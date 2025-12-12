
export interface PatientContext {
    demographics: {
        age?: number;
        gender?: 'male' | 'female';
    };
    encounter: {
        type: 'initial' | 'subsequent' | 'sequela' | 'inpatient' | 'outpatient' | 'ed';
        reasonForAdmission?: 'dialysis' | 'routine_followup' | 'other';
    };
    conditions: {
        diabetes?: {
            type: 'type1' | 'type2' | 'secondary' | 'drug_induced';
            complications: ('retinopathy' | 'neuropathy' | 'nephropathy' | 'ckd' | 'foot_ulcer' | 'pad' | 'gangrene' | 'ketoacidosis' | 'hypoglycemia' | 'coma' | 'amputation' | 'unspecified')[];
            macular_edema?: boolean; // For retinopathy with macular edema
            ulcerSite?: 'right_foot' | 'left_foot' | 'right_toe' | 'left_toe' | 'heel' | 'other';
            ulcerSeverity?: 'skin' | 'fat' | 'muscle' | 'bone' | 'unspecified';
            insulinUse?: boolean;
            neuropathyType?: 'polyneuropathy' | 'peripheral' | 'autonomic' | 'unspecified';
        };
        ckd?: {
            stage: '1' | '2' | '3' | '4' | '5' | 'esrd' | 'unspecified';
            onDialysis: boolean;
            dialysisType?: 'none' | 'temporary' | 'chronic';
            aki: boolean;
            transplantStatus: boolean;
        };
        cardiovascular?: {
            hypertension: boolean;
            secondaryHypertension?: boolean;
            hypertensionCause?: 'renal' | 'endocrine';
            heartDisease?: boolean; // For "Hypertensive Heart Disease" without HF
            heartFailure?: {
                type: 'systolic' | 'diastolic' | 'combined' | 'unspecified';
                acuity: 'acute' | 'chronic' | 'acute_on_chronic' | 'unspecified';
            };
            cad?: { present: boolean };
            previousMI?: boolean;
            mi?: {
                type: 'stemi' | 'nstemi' | 'unspecified';
                timing: 'initial' | 'subsequent' | 'old';
                location?: 'anterior' | 'inferior' | 'lateral' | 'posterior';
            };
            angina?: {
                type: 'stable' | 'unstable' | 'unspecified';
            };
            atrialFibrillation?: {
                type: 'paroxysmal' | 'persistent' | 'permanent' | 'chronic' | 'unspecified';
            };
            cardiomyopathy?: {
                type: 'dilated' | 'hypertrophic' | 'restrictive' | 'unspecified';
            };
            atrialFib?: boolean; // Legacy field
            historyOfMI?: boolean;
        };
        renal?: {
            ckd?: {
                stage: '1' | '2' | '3' | '4' | '5' | 'esrd' | 'unspecified';
            };
            aki?: boolean;
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
                severity: 'mild_intermittent' | 'mild_persistent' | 'moderate_persistent' | 'severe_persistent' | 'unspecified';
                status: 'uncomplicated' | 'exacerbation' | 'status_asthmaticus';
            };
            pneumonia?: {
                organism?: 'strep_pneumoniae' | 'h_influenzae' | 'klebsiella' | 'pseudomonas' |
                'mssa' | 'mrsa' | 'e_coli' | 'mycoplasma' | 'viral' | 'unspecified';
                type?: 'aspiration' | 'bacterial' | 'viral' | 'unspecified';
                ventilatorAssociated?: boolean;
            };
            mechanicalVent?: {
                present: boolean;
                duration?: number; // hours
            };
        };
        infection?: {
            present: boolean;
            site?: 'lung' | 'urinary' | 'skin' | 'blood' | 'abdominal' | 'other';
            organism?: 'e_coli' | 'pseudomonas' | 'mrsa' | 'mssa' | 'klebsiella' | 'strep' | 'proteus' | 'enterococcus' | 'bacteroides' | 'enterobacter' | 'candida' | 'staph' | 'gram_negative' | 'gram_positive' | 'viral' | 'unspecified';
            source?: string; // e.g., "urinary tract infection", "pneumonia", "cellulitis"
            sepsis?: {
                present: boolean;
                severe?: boolean;
                shock?: boolean;
            };
            hospitalAcquired?: boolean;
            hiv?: boolean;
            tuberculosis?: boolean;
            covid19?: boolean;
        };
        wounds?: {
            present: boolean;
            type?: 'pressure' | 'diabetic' | 'traumatic' | 'venous' | 'arterial';
            location?: 'sacral' | 'foot_right' | 'foot_left' | 'foot' | 'ankle' | 'heel' | 'heel_right' | 'heel_left' | 'buttock' | 'other';
            stage?: 'stage1' | 'stage2' | 'stage3' | 'stage4' | 'muscle_necrosis' | 'bone_necrosis' | 'unstageable' | 'deep_tissue';
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
                type: 'unspecified' | 'iron_deficiency' | 'b12_deficiency' | 'chronic_disease' | 'acute_blood_loss';
                cause?: 'chronic_blood_loss' | 'other';
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
            preeclampsia?: {
                present: boolean;
                severity?: 'mild' | 'severe' | 'hellp' | 'unspecified';
            };
            gestationalDiabetes?: boolean;
            labor?: {
                prolongedFirstStage?: boolean;
                prolongedSecondStage?: boolean;
                arrestDilation?: boolean;
                arrestDescent?: boolean;
                failureToProgress?: boolean;
                primaryInertia?: boolean;
                secondaryInertia?: boolean;
            };
            perinealLaceration?: {
                degree: '1' | '2' | '3' | '4' | 'unspecified';
            };
            postpartum?: boolean;
            // Enhanced OB Fields
            hemorrhage?: boolean; // Postpartum hemorrhage (O72)
            multipleGestation?: boolean; // Twins/Triplets (O30)
            multipleGestationDetail?: 'dichorionic_diamniotic' | 'monochorionic_monoamniotic' | 'monochorionic_diamniotic' | 'unspecified';
            vbac?: boolean; // Vaginal birth after cesarean (O75.82)
            failedVbac?: boolean; // Failed trial of labor after cesarean (O66.41)
            prom?: boolean; // Premature rupture of membranes (O42)
            historyOfCesarean?: boolean; // For O34.21
            termDocumentation?: 'term' | 'full_term' | 'preterm' | 'post_term'; // For validation checks
            cSectionIndication?: string; // Captured indication logic if needed
            outcome?: {
                deliveryCount: number; // 1 for single, 2 for twins
                liveborn: number;
                stillborn: number;
            };
        };
    };
    social?: {
        smoking?: 'never' | 'current' | 'former';
        packYears?: number;
        alcoholUse?: 'use' | 'abuse' | 'dependence';
        drugUse?: {
            present: boolean;
            type?: 'opioid' | 'cocaine' | 'cannabis';
            status?: 'abuse' | 'dependence';
        };
        homeless?: boolean;
    };
}
