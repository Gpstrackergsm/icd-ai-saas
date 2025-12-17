export interface PatientContext {
    demographics: {
        age?: number;
        gender?: 'male' | 'female';
        isNeonatal?: boolean; // For neonatal sepsis detection (P36.x codes)
    };
    encounter: {
        type: 'initial' | 'subsequent' | 'sequela' | 'inpatient' | 'outpatient' | 'ed';
        reasonForAdmission?: 'dialysis' | 'routine_followup' | 'mi' | 'other';
    };
    conditions: {
        endocrine?: {
            diabetes?: {
                type: 'type1' | 'type2' | 'secondary' | 'drug_induced' | 'unspecified';
                complicationDetails?: {
                    ketoacidosis?: boolean;
                    hyperosmolarity?: boolean;
                    hypoglycemia?: boolean;
                    coma?: boolean;
                    uncontrolled?: boolean;
                    secondaryCause?: string;
                    neuropathy?: boolean;
                    polyneuropathy?: boolean;
                    autonomic?: boolean;
                    gastroparesis?: boolean;
                    nephropathy?: boolean;
                    pvd?: boolean;
                    gangrene?: boolean;
                    footUlcer?: boolean;
                    skinComplication?: boolean;
                    retinopathy?: boolean;
                    retinopathyDetails?: {
                        stage?: 'mild_npdr' | 'moderate_npdr' | 'severe_npdr' | 'proliferative' | 'unspecified';
                        macularEdema?: boolean;
                        tractionDetachment?: boolean;
                    };
                };
                ulcerSite?: 'right_foot' | 'left_foot' | 'right_toe' | 'left_toe' | 'heel' | 'other';
                ulcerSeverity?: 'skin' | 'fat' | 'muscle' | 'bone' | 'unspecified';
                complications?: string[]; // Legacy/Auxiliary list
            };
            prediabetes?: boolean;
            hyperglycemia?: { present: boolean; type?: string; };
            insulinUse?: boolean;
            oralMeds?: boolean;
        };
        ckd?: {
            stage: '1' | '2' | '3' | '4' | '5' | 'esrd' | 'unspecified';
            onDialysis: boolean;
            dialysisType?: 'none' | 'temporary' | 'chronic';
            aki: boolean;
            transplantStatus: boolean;
            pneumothorax?: boolean;
            ards?: boolean; // Acute respiratory distress syndrome (J80)
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
            acuteFailure?: boolean; // N17.9 - Acute kidney injury
            cause?: string;
        };
        smoker?: boolean;
        sepsis?: {
            severity: 'unspecified' | 'severe' | 'shock';
            source: string;
        };
        neuro?: {
            metabolicEncephalopathy?: boolean; // G93.41
        };
        respiratory?: {
            failure?: {
                type: 'none' | 'acute' | 'chronic' | 'acute_on_chronic' | 'unspecified';
                withHypoxia?: boolean;
                withHypercapnia?: boolean;
                isPostProcedural?: boolean;
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
                'mssa' | 'mrsa' | 'e_coli' | 'mycoplasma' | 'viral' | 'influenza' | 'covid19' | 'unspecified';
                type?: 'aspiration' | 'bacterial' | 'viral' | 'influenza' | 'unspecified';
                ventilatorAssociated?: boolean;
            };
            mechanicalVent?: {
                present: boolean;
                duration?: number; // hours
            };
            emphysema?: boolean; // J43.9
            chronicBronchitis?: boolean; // J41.0
            bronchiolitis?: boolean; // J21.9
            pulmonaryEdema?: boolean;
            pleuralEffusion?: boolean;
            pneumothorax?: boolean;
            pulmonaryEmbolism?: boolean;
            oxygenDependence?: boolean;
            oxygenTherapy?: boolean; // Z99.81
            ards?: boolean; // J80 - Acute respiratory distress syndrome
        };
        infection?: {
            present: boolean;
            site?: 'lung' | 'urinary' | 'skin' | 'blood' | 'abdominal' | 'other';
            organism?: 'e_coli' | 'pseudomonas' | 'mrsa' | 'mssa' | 'klebsiella' | 'strep' | 'strep_group_a' | 'strep_group_b' | 'strep_pneumoniae' | 'proteus' | 'enterococcus' | 'bacteroides' | 'enterobacter' | 'candida' | 'staph' | 'staph_epidermidis' | 'gram_negative' | 'gram_positive' | 'viral' | 'unspecified';
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
            // Location-specific details for sepsis source coding
            cellulitisLocation?: {
                site: 'lower_limb' | 'upper_limb' | 'trunk' | 'face' | 'unspecified';
                laterality: 'left' | 'right' | 'bilateral' | 'unspecified';
            };
            abscessLocation?: 'right_foot' | 'left_foot' | 'right_hand' | 'left_hand' | 'abdominal' | 'cutaneous' | 'unspecified';
            pressureUlcerDetails?: {
                location: 'sacral' | 'hip' | 'heel' | 'buttock' | 'unspecified';
                stage: '1' | '2' | '3' | '4' | 'unstageable' | 'unspecified';
            };
            catheterAssociated?: boolean; // For CAUTI - T83.511A
            diabeticUlcerSource?: boolean; // For diabetic foot ulcer as sepsis source
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
            // Legacy / Simple Resolver Fields (Required for current Parser/Engine)
            type?: 'unspecified' | 'fracture' | 'burn' | 'open_wound' | 'contusion' | 'poisoning';
            bodyRegion?: string;
            laterality?: 'left' | 'right' | 'bilateral' | 'unspecified';
            encounterType?: 'initial' | 'subsequent' | 'sequela';

            general?: {
                type: 'unspecified' | 'fracture' | 'burn' | 'wound' | 'poisoning';
            }[]; // Array to handle multiple injuries
            fractures?: Array<{
                site: string; // e.g. "femur", "rib"
                laterality?: 'left' | 'right' | 'bilateral' | 'unspecified';
                type?: 'open' | 'closed';
                displaced?: boolean;
                encounter?: 'initial' | 'subsequent' | 'sequela';
            }>;
            burns?: Array<{
                site: string;
                degree: '1' | '2' | '3';
                tbsa?: number;
            }>;
            tbi?: {
                present: boolean;
                lossOfConsciousness?: string; // e.g. "30 min", ">24h"
                type?: 'concussion' | 'contusion' | 'subdural' | 'epidural' | 'diffuse';
            };
            externalCause?: {
                mechanism?: string; // MVC, Fall, etc.
                place?: string;
                present?: boolean; // Added for consistency
            };
            // Generic for simple resolver
            rawText?: string;
        };
        neurology?: {
            stroke?: {
                present: boolean;
                acute: boolean;
                ischemic: boolean;
                vessel?: string;
                territory?: string;
                laterality?: 'left' | 'right' | 'bilateral' | 'unspecified';
            };
            sequela?: {
                present: boolean;
                deficits: Array<{
                    type: 'hemiplegia' | 'aphasia' | 'dysphagia' | 'cognitive' | 'visual' | 'gait';
                    side?: 'left' | 'right' | 'dominant' | 'nondominant' | 'unspecified';
                }>;
            };
            tia?: {
                present: boolean;
            };
            epilepsy?: {
                present: boolean;
                type?: 'generalized' | 'focal' | 'unspecified';
                intractable?: boolean;
                statusEpilepticus?: boolean;
            };
            encephalopathy?: {
                present: boolean;
                type: 'metabolic' | 'toxic' | 'hepatic' | 'hypoxic' | 'unspecified';
            };
            dementia?: {
                type: 'unspecified' | 'alzheimer' | 'vascular' | 'lewy_body';
            };
            // Legacy / simple flags for validation (optional, can be inferred from above)
            alteredMentalStatus?: boolean;
            coma?: boolean;
            gcs?: number;
            seizure?: boolean; // Single seizure event vs Epilepsy
            parkinsons?: boolean;
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
            sickleCell?: { type: 'hgb_ss' | 'trait' | 'thalassemia' };
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
    }; // End of conditions

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
