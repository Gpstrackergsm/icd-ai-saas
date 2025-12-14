export interface TestCase {
    num: number;
    text: string;
    expectedPrimary: string;
    expectedSecondary: string[];
    rationale: string;
}

export const respiratoryCases: TestCase[] = [
    // ======================================================================================
    // 1. COPD (Chronic Obstructive Pulmonary Disease) - 12 Cases
    // ======================================================================================

    // Case 1: Simple COPD Exacerbation
    // Guideline: J44.1 is used for acute exacerbation.
    {
        num: 1,
        text: "68-year-old male with history of COPD admitted for worsening shortness of breath and increased sputum. Diagnosed with acute COPD exacerbation.",
        expectedPrimary: "J44.1",
        expectedSecondary: [],
        rationale: "Acute exacerbation of COPD codes to J44.1 as principal."
    },
    // Case 2: COPD with Lower Respiratory Infection
    // Guideline: J44.0 used when infection is present. J44.1 implies acute exacerbation if not specified otherwise, but specificity matters.
    // If BOTH infection and exacerbation, use J44.1 AND J44.0? No, usually J44.1 takes precedence for DRG, but J44.0 is specific.
    // Note: ICD-10 2024/2025 guidelines say code both if both present.
    // Let's stick to standard rule: If exacerbation with infection -> J44.1 + Infection code? Or J44.0 + J44.1?
    // Rule: "If a patient with COPD is admitted with an acute exacerbation and a lower respiratory infection, code J44.1 and J44.0."
    {
        num: 2,
        text: "72-year-old female with COPD admitted with acute exacerbation triggered by acute bronchitis.",
        expectedPrimary: "J44.1",
        expectedSecondary: ["J44.0", "J20.9"],
        rationale: "COPD w/ Exacerbation (J44.1) and w/ Acute Lower Resp Infection (J44.0) + Infection (J20.9). J44.1 is Principal."
    },
    // Case 3: COPD with Pneumonia
    // Guideline: J44.0 + Pneumonia code.
    {
        num: 3,
        text: "80-year-old male with COPD admitted with left lower lobe pneumonia.",
        expectedPrimary: "J18.9",
        expectedSecondary: ["J44.0"],
        rationale: "Pneumonia (J18.9) is Principal. COPD with Lower Resp Infection (J44.0) is secondary. (Guideline: Code infection first if it's the reason for admission)"
    },
    // Case 4: Emphysema (Unspecified)
    {
        num: 4,
        text: "65-year-old male with emphysema seen for routine checkup.",
        expectedPrimary: "J43.9",
        expectedSecondary: [],
        rationale: "Emphysema, unspecified."
    },
    // Case 5: Chronic Bronchitis
    {
        num: 5,
        text: "55-year-old female with simple chronic bronchitis.",
        expectedPrimary: "J41.0",
        expectedSecondary: [],
        rationale: "Simple chronic bronchitis."
    },
    // Case 6: Asthma-COPD Overlap
    // Guideline: Code both J44.9 (or specific) and Asthma.
    {
        num: 6,
        text: "70-year-old male with Asthma and COPD. Admitted for difficulty breathing.",
        expectedPrimary: "J44.9",
        expectedSecondary: ["J45.909"],
        rationale: "COPD and Asthma coded separately."
    },
    // Case 7: COPD Exacerbation AND Asthma Exacerbation
    {
        num: 7,
        text: "62-year-old female with COPD and Asthma, both acutely exacerbated.",
        expectedPrimary: "J44.1",
        expectedSecondary: ["J45.901"],
        rationale: "Acute exacerbation of both. J44.1 Principal."
    },
    // Case 8: Emphysema with Exacerbation (Maps to COPD Exacerbation)
    {
        num: 8,
        text: "75-year-old male with emphysema admitted for acute exacerbation of emphysema.",
        expectedPrimary: "J44.1",
        // Emphysema falls under COPD for exacerbation rules in ICD-10 usually? 
        // Actually, J43.x doesn't have an 'exacerbation' code. Guidelines say use J44.1 for Emphysema with acute exacerbation.
        expectedSecondary: ["J43.9"],
        rationale: "Emphysema with acute exacerbation codes to J44.1 + J43.9."
    },
    // Case 9: COPD with Tobacco Use
    {
        num: 9,
        text: "60-year-old male smoker with COPD.",
        expectedPrimary: "J44.9",
        expectedSecondary: ["F17.210"],
        rationale: "COPD + Nicotine dependence (Smoker)."
    },
    // Case 10: Chronic Obstructive Asthma
    {
        num: 10,
        text: "58-year-old female with chronic obstructive asthma.",
        expectedPrimary: "J44.9",
        expectedSecondary: ["J45.909"],
        rationale: "Chronic obstructive asthma codes to J44.9 (COPD) and J45.909."
    },
    // Case 11: Decompensated COPD (implied exacerbation)
    {
        num: 11,
        text: "85-year-old male admitted for decompensated COPD.",
        expectedPrimary: "J44.1",
        expectedSecondary: [],
        rationale: "Decompensated implies Exacerbation -> J44.1."
    },
    // Case 12: COPD with Acute Bronchiolitis
    {
        num: 12,
        text: "40-year-old with COPD and acute bronchiolitis.",
        expectedPrimary: "J44.0",
        expectedSecondary: ["J21.9"],
        rationale: "COPD with acute lower resp infection -> J44.0 + Bronchiolitis."
    },

    // ======================================================================================
    // 2. PNEUMONIA - 10 Cases
    // ======================================================================================

    // Case 13: Bacterial Pneumonia (Unspecified)
    {
        num: 13,
        text: "70-year-old female with bacterial pneumonia.",
        expectedPrimary: "J15.9",
        expectedSecondary: [],
        rationale: "Unspecified bacterial pneumonia."
    },
    // Case 14: Strep Pneumoniae
    {
        num: 14,
        text: "45-year-old male with pneumonia due to Streptococcus pneumoniae.",
        expectedPrimary: "J13",
        expectedSecondary: [],
        rationale: "Specific code for Strep Pneumo."
    },
    // Case 15: MSSA Pneumonia
    {
        num: 15,
        text: "60-year-old with Methicillin-susceptible Staphylococcus aureus pneumonia.",
        expectedPrimary: "J15.211",
        expectedSecondary: [],
        rationale: "MSSA Pneumonia."
    },
    // Case 16: MRSA Pneumonia
    {
        num: 16,
        text: "80-year-old with Methicillin-resistant Staph aureus pneumonia.",
        expectedPrimary: "J15.212",
        expectedSecondary: [],
        rationale: "MRSA Pneumonia."
    },
    // Case 17: Pseudomonas Pneumonia
    {
        num: 17,
        text: "65-year-old with Pseudomonas aeruginosa pneumonia.",
        expectedPrimary: "J15.1",
        expectedSecondary: [],
        rationale: "Pseudomonas Pneumonia."
    },
    // Case 18: Mycoplasma Pneumonia
    {
        num: 18,
        text: "20-year-old with walking pneumonia (Mycoplasma pneumoniae).",
        expectedPrimary: "J15.7",
        expectedSecondary: [],
        rationale: "Mycoplasma Pneumonia."
    },
    // Case 19: Viral Pneumonia (Unspecified)
    {
        num: 19,
        text: "50-year-old with viral pneumonia.",
        expectedPrimary: "J12.9",
        expectedSecondary: [],
        rationale: "Viral pneumonia, unspecified."
    },
    // Case 20: Influenza Pneumonia
    {
        num: 20,
        text: "40-year-old with Influenza A pneumonia.",
        expectedPrimary: "J10.0",
        expectedSecondary: [],
        rationale: "Influenza with pneumonia codes to J10.0."
    },
    // Case 21: COVID-19 Pneumonia
    {
        num: 21,
        text: "55-year-old admitted with COVID-19 pneumonia.",
        expectedPrimary: "U07.1",
        expectedSecondary: ["J12.82"],
        rationale: "COVID-19 (U07.1) Principal, Pneumonia (J12.82) Secondary."
    },
    // Case 22: Aspiration Pneumonia
    {
        num: 22,
        text: "85-year-old nursing home resident with aspiration pneumonia.",
        expectedPrimary: "J69.0",
        expectedSecondary: [],
        rationale: "Pneumonitis due to inhalation of food/vomit."
    },

    // ======================================================================================
    // 3. RESPIRATORY FAILURE - 8 Cases
    // ======================================================================================

    // Case 23: Acute Respiratory Failure (Unspecified)
    {
        num: 23,
        text: "70-year-old admitted with acute respiratory failure.",
        expectedPrimary: "J96.00",
        expectedSecondary: [],
        rationale: "Acute respiratory failure, unspecified whether hypoxic or hypercapnic."
    },
    // Case 24: Acute Hypoxic Repiratory Failure
    {
        num: 24,
        text: "60-year-old with acute hypoxic respiratory failure.",
        expectedPrimary: "J96.01",
        expectedSecondary: [],
        rationale: "Acute respiratory failure with hypoxia."
    },
    // Case 25: Acute Hypercapnic Respiratory Failure
    {
        num: 25,
        text: "65-year-old with acute hypercapnic respiratory failure.",
        expectedPrimary: "J96.02",
        expectedSecondary: [],
        rationale: "Acute respiratory failure with hypercapnia."
    },
    // Case 26: Chronic Respiratory Failure
    {
        num: 26,
        text: "80-year-old on home oxygen with chronic respiratory failure.",
        expectedPrimary: "J96.10",
        expectedSecondary: ["Z99.81"],
        rationale: "Chronic respiratory failure (J96.10) + Long term oxygen (Z99.81)."
    },
    // Case 27: Acute on Chronic Respiratory Failure
    {
        num: 27,
        text: "75-year-old with acute on chronic respiratory failure.",
        expectedPrimary: "J96.20",
        expectedSecondary: [],
        rationale: "Acute and chronic respiratory failure."
    },
    // Case 28: Respiratory Failure Secondary to COPD (Sequencing)
    {
        num: 28,
        text: "68-year-old admitted for COPD exacerbation leading to acute respiratory failure.",
        expectedPrimary: "J44.1",
        expectedSecondary: ["J96.00"],
        rationale: "COPD Exacerbation Principal. Resp Failure Secondary (Chapter-specific guideline)."
    },
    // Case 29: Respiratory Failure Secondary to Pneumonia
    {
        num: 29,
        text: "72-year-old admitted with pneumonia resulting in acute hypoxic respiratory failure.",
        expectedPrimary: "J18.9",
        expectedSecondary: ["J96.01"],
        rationale: "Pneumonia principal. Resp Failure secondary."
    },
    // Case 30: Post-Procedural Respiratory Failure
    {
        num: 30,
        text: "50-year-old developed acute respiratory failure following surgery yesterday.",
        expectedPrimary: "J95.821",
        expectedSecondary: [],
        rationale: "Acute post-procedural respiratory failure."
    },

    // ======================================================================================
    // 4. COMPLEX & COMBINED SCENARIOS - 10 Cases
    // ======================================================================================

    // Case 31: COPD, Pneumonia, Acute Resp Failure
    {
        num: 31,
        text: "70-year-old male with COPD admitted for right lower lobe pneumonia and acute hypoxic respiratory failure.",
        expectedPrimary: "J18.9",
        expectedSecondary: ["J44.0", "J96.01"],
        rationale: "Pneumonia Principal (Reason for admission). COPD w/ Infection (J44.0) secondary. Resp Failure secondary."
    },
    // Case 32: COPD Exacerbation, Acute Hypercapnic Resp Failure
    {
        num: 32,
        text: "65-year-old female with COPD exacerbation and acute hypercapnic respiratory failure.",
        expectedPrimary: "J44.1",
        expectedSecondary: ["J96.02"],
        rationale: "COPD Exacerbation Principal. Resp Failure Secondary."
    },
    // Case 33: Ventilator Associated Pneumonia (VAP)
    {
        num: 33,
        text: "55-year-old on ventilator developed ventilator-associated pneumonia (Pseudomonas).",
        expectedPrimary: "J95.851",
        expectedSecondary: ["B96.5"],
        rationale: "VAP code (J95.851) + Organism (B96.5)."
    },
    // Case 34: Influenza, Pneumonia, Resp Failure
    {
        num: 34,
        text: "40-year-old with Influenza A, pneumonia, and acute respiratory failure.",
        expectedPrimary: "J10.0",
        expectedSecondary: ["J96.00"],
        rationale: "Influenza Principal. Resp Failure secondary."
    },
    // Case 35: Aspiration Pneumonia + COPD
    {
        num: 35,
        text: "80-year-old with COPD admitted for aspiration pneumonia.",
        expectedPrimary: "J69.0",
        expectedSecondary: ["J44.0"],
        rationale: "Aspiration Pneumonia Principal. COPD Secondary (Guideline I.C.10.a.1 requires J44.0 for lower respiratory infection)."
    },
    // Case 36: Asthma Exacerbation + Resp Failure
    {
        num: 36,
        text: "30-year-old with severe asthma exacerbation and acute respiratory failure.",
        expectedPrimary: "J45.901",
        expectedSecondary: ["J96.00"],
        rationale: "Asthma Exacerbation Principal. Resp Failure Secondary."
    },
    // Case 37: Pulmonary Edema (Non-cardiogenic)
    {
        num: 37,
        text: "60-year-old with acute pulmonary edema, non-cardiogenic.",
        expectedPrimary: "J81.0",
        expectedSecondary: [],
        rationale: "Acute pulmonary edema."
    },
    // Case 38: Pleural Effusion with CHF
    // Guideline: Code CHF principal usually.
    {
        num: 38,
        text: "75-year-old with Congestive Heart Failure and pleural effusion.",
        expectedPrimary: "I50.9",
        expectedSecondary: ["J91.8"],
        rationale: "Pleural effusion in other conditions classified elsewhere (J91.8)."
    },
    // Case 39: Pneumothorax (Spontaneous)
    {
        num: 39,
        text: "25-year-old male with spontaneous pneumothorax.",
        expectedPrimary: "J93.11", // or J93.83 Depending on 'primary' or 'secondary' spontaneous
        // Let's assume Primary Spontaneous for young male
        expectedSecondary: [],
        rationale: "Primary Spontaneous Pneumothorax."
    },
    // Case 40: Pulmonary Embolism
    {
        num: 40,
        text: "50-year-old female with acute saddle pulmonary embolism.",
        expectedPrimary: "I26.02",
        expectedSecondary: [],
        rationale: "Saddle embolus of pulmonary artery with acute cor pulmonale."
    }
];
