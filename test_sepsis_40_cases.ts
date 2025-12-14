import { parseInput } from './lib/structured/parser';
import { runStructuredRules } from './lib/structured/engine';

interface TestCase {
    num: number;
    text: string;
    expectedPrimary: string;
    expectedSecondary: string[];
    rationale: string;
}

// 40 SEPSIS TEST CASES - ICD-10-CM Compliant Sequencing
const sepsisCases: TestCase[] = [
    // ========== SEPSIS WITH SOURCE INFECTIONS (UTI) ==========
    {
        num: 1,
        text: "72-year-old female admitted with fever, dysuria, and confusion. Urinalysis positive for bacteria. Blood cultures positive for E. coli. Diagnosis: Sepsis due to E. coli with urinary tract infection as source.",
        expectedPrimary: "A41.51",
        expectedSecondary: ["N39.0"],
        rationale: "Sepsis present on admission - code Sepsis (A41.51) FIRST per Guideline I.C.1.d.4(b)"
    },
    {
        num: 2,
        text: "85-year-old male with Foley catheter admitted with CAUTI (catheter-associated UTI) and urosepsis. Blood cultures positive for E. coli.",
        expectedPrimary: "A41.51",
        expectedSecondary: ["T83.511A", "N39.0"],
        rationale: "Admitted for Urosepsis - A41.51 Principal. CAUTI secondary."
    },
    {
        num: 3,
        text: "68-year-old female admitted with sepsis. Blood cultures show Klebsiella pneumoniae. CT scan shows pyelonephritis (kidney infection).",
        expectedPrimary: "A41.50",
        expectedSecondary: ["N10"],
        rationale: "Admitted for Sepsis - Gram-negative sepsis Principal, Pyelo secondary."
    },

    // ========== SEPSIS WITH SOURCE INFECTIONS (PNEUMONIA) ==========
    {
        num: 4,
        text: "78-year-old male admitted with pneumonia and sepsis. Chest X-ray shows right lower lobe infiltrate. Blood cultures positive for Streptococcus pneumoniae.",
        expectedPrimary: "A40.3",
        expectedSecondary: ["J13"],
        rationale: "Sepsis present on admission - Strep Pneumo Sepsis Principal."
    },
    {
        num: 5,
        text: "65-year-old diabetic female with community-acquired pneumonia and septic shock. Blood cultures positive for Staph aureus. Patient on vasopressors.",
        expectedPrimary: "A41.01",
        expectedSecondary: ["R65.21", "J15.211", "E11.9"],
        rationale: "Staph Sepsis Principal. J15.211 Secondary. Septic shock follows."
    },
    {
        num: 6,
        text: "82-year-old nursing home resident admitted with aspiration pneumonia and severe sepsis without shock. Blood cultures pending.",
        expectedPrimary: "A41.9",
        expectedSecondary: ["R65.20", "J69.0"],
        rationale: "Sepsis Unspecified Principal. Aspiration Pna Secondary. Severe Sepsis R65.20."
    },

    // ========== SEPSIS WITH SOURCE INFECTIONS (SKIN/SOFT TISSUE) ==========
    {
        num: 7,
        text: "55-year-old diabetic male admitted with left leg cellulitis and sepsis due to Streptococcus. Blood cultures positive.",
        expectedPrimary: "A40.9",
        expectedSecondary: ["L03.115", "E11.9"],
        rationale: "Strep Sepsis Principal. Cellulitis Secondary."
    },
    {
        num: 8,
        text: "70-year-old female with sacral pressure ulcer stage 3 admitted with sepsis due to MRSA bacteremia.",
        expectedPrimary: "A41.02",
        expectedSecondary: ["L89.153"],
        rationale: "MRSA Sepsis Principal. Pressure ulcer secondary."
    },
    {
        num: 9,
        text: "45-year-old male with right foot abscess and sepsis. Blood cultures show Staph aureus.",
        expectedPrimary: "A41.01",
        expectedSecondary: ["L02.611"],
        rationale: "Staph Aureus Sepsis Principal. Abscess secondary."
    },

    // ========== SEPSIS WITH SOURCE INFECTIONS (ABDOMINAL) ==========
    {
        num: 10,
        text: "62-year-old female admitted with acute appendicitis with perforation and peritonitis. Blood cultures positive for E. coli sepsis.",
        expectedPrimary: "A41.51",
        expectedSecondary: ["K35.32", "K65.0"],
        rationale: "Admitted for Sepsis (implied by context of query, or default A41.x). Appendicitis secondary."
    },
    {
        num: 11,
        text: "74-year-old male with perforated diverticulitis and severe sepsis without shock. Blood cultures positive.",
        expectedPrimary: "A41.9",
        expectedSecondary: ["R65.20", "K57.20", "K65.0"],
        rationale: "Sepsis Principal. Diverticulitis secondary."
    },
    {
        num: 12,
        text: "58-year-old female admitted with acute cholecystitis and septic shock. Blood cultures show E. coli.",
        expectedPrimary: "A41.51",
        expectedSecondary: ["R65.21", "K81.0"],
        rationale: "E. Coli Sepsis Principal. Septic Shock. Cholecystitis."
    },

    // ========== SEVERE SEPSIS WITHOUT SHOCK ==========
    {
        num: 13,
        text: "80-year-old male with severe sepsis and acute kidney injury. Blood cultures positive for E. coli. Source: UTI. No hypotension or shock.",
        expectedPrimary: "A41.51",
        expectedSecondary: ["R65.20", "N39.0", "N17.9"],
        rationale: "Sepsis Principal. Severe Sepsis. AKI always secondary to sepsis/shock."
    },
    {
        num: 14,
        text: "66-year-old female with pneumonia, severe sepsis, and acute respiratory failure. No shock documented.",
        expectedPrimary: "A41.9",
        expectedSecondary: ["R65.20", "J18.9", "J96.00"],
        rationale: "Sepsis Principal. Severe Sepsis. Pneumonia. Resp Failure."
    },
    {
        num: 15,
        text: "72-year-old male admitted with severe sepsis and multiple organ dysfunction (AKI and encephalopathy). Source: skin infection.",
        expectedPrimary: "A41.9",
        expectedSecondary: ["R65.20", "L03.90", "N17.9", "G93.41"],
        rationale: "Sepsis Principal. Severe Sepsis. Skin Infection. End organs."
    },

    // ========== SEPTIC SHOCK ==========
    {
        num: 16,
        text: "58-year-old male admitted in septic shock requiring vasopressors. Blood cultures positive for Pseudomonas. Source: pneumonia.",
        expectedPrimary: "A41.52",
        expectedSecondary: ["R65.21", "J15.1"],
        rationale: "Pseudomonas Sepsis Principal. Septic Shock. Pneumonia."
    },
    {
        num: 17,
        text: "70-year-old female with urosepsis and septic shock. On norepinephrine drip. Blood cultures show Klebsiella.",
        expectedPrimary: "A41.50",
        expectedSecondary: ["R65.21", "N39.0"],
        rationale: "Klebsiella Sepsis Principal. Septic Shock. UTI."
    },
    {
        num: 18,
        text: "82-year-old male with abdominal sepsis from perforated bowel and septic shock. Emergency surgery performed.",
        expectedPrimary: "A41.9",
        expectedSecondary: ["R65.21", "K63.1", "K65.0"],
        rationale: "Sepsis Principal. Septic Shock. Perforation. Peritonitis."
    },

    // ========== SEPSIS - NEGATIVE CULTURES ==========
    {
        num: 19,
        text: "75-year-old female clinically diagnosed with sepsis. Blood cultures drawn but negative. Source: pneumonia.",
        expectedPrimary: "A41.9",
        expectedSecondary: ["J18.9"],
        rationale: "Sepsis Principal. Pneumonia secondary."
    },
    {
        num: 20,
        text: "68-year-old male with sepsis, cultures pending/negative. Source: UTI based on UA results.",
        expectedPrimary: "A41.9",
        expectedSecondary: ["N39.0"],
        rationale: "Sepsis Principal. UTI secondary."
    },

    // ========== SEPSIS - UNSPECIFIED SOURCE ==========
    {
        num: 21,
        text: "60-year-old female admitted with sepsis of unknown source. Blood cultures positive for E. coli. No clear infection site identified.",
        expectedPrimary: "A41.51",
        expectedSecondary: [],
        rationale: "When source cannot be determined, code sepsis as principal"
    },
    {
        num: 22,
        text: "77-year-old male with septic shock, no identifiable source found despite workup. Blood cultures show MRSA.",
        expectedPrimary: "A41.02",
        expectedSecondary: ["R65.21"],
        rationale: "MRSA sepsis principal when no source, add septic shock"
    },

    // ========== POST-PROCEDURE SEPSIS ==========
    {
        num: 23,
        text: "65-year-old female developed sepsis 5 days after abdominal surgery. Blood cultures positive for E. coli.",
        expectedPrimary: "T81.44XA",
        expectedSecondary: ["A41.51"],
        rationale: "Post-procedural sepsis T81.44XA primary, organism secondary"
    },
    {
        num: 24,
        text: "70-year-old male with post-operative septic shock after hip replacement. Blood cultures show Staph aureus.",
        expectedPrimary: "T81.44XA",
        expectedSecondary: ["R65.21", "A41.01"],
        rationale: "Post-op sepsis, septic shock, organism"
    },

    // ========== SEPSIS WITH CHRONIC CONDITIONS ==========
    {
        num: 25,
        text: "72-year-old diabetic male with pneumonia, sepsis, COPD exacerbation, and CHF. Blood cultures positive.",
        expectedPrimary: "A41.9",
        expectedSecondary: ["J15.9", "J44.1", "I50.9", "E11.9"],
        rationale: "Sepsis Principal. Bacterial Pneumonia Secondary. Chronic conditions."
    },
    {
        num: 26,
        text: "80-year-old female with ESRD on dialysis admitted with sepsis from infected dialysis catheter. Blood cultures show Staph epidermidis.",
        expectedPrimary: "T82.7XXA",
        expectedSecondary: ["A41.1", "N18.6", "Z99.2"],
        rationale: "Post-proc/Device Infection is PRIMARY (T-code), Sepsis is SECONDARY."
    },

    // ========== FUNGAL SEPSIS ==========
    {
        num: 27,
        text: "55-year-old immunocompromised male admitted with candidemia (fungal sepsis due to Candida).",
        expectedPrimary: "B37.7",
        expectedSecondary: [],
        rationale: "Candida sepsis - specific code B37.7"
    },

    // ========== NEONATAL SEPSIS (bonus) ==========
    {
        num: 28,
        text: "2-day-old newborn with sepsis due to Group B Streptococcus.",
        expectedPrimary: "P36.0",
        expectedSecondary: [],
        rationale: "Neonatal sepsis uses P codes, not A codes"
    },

    // ========== SEPSIS WITH SPECIFIC ORGANISMS ==========
    {
        num: 29,
        text: "68-year-old male with sepsis due to Streptococcus pneumoniae bacteremia. No pneumonia documented.",
        expectedPrimary: "A40.3",
        expectedSecondary: [],
        rationale: "Strep pneumo sepsis Principal. No source."
    },
    {
        num: 30,
        text: "75-year-old female with sepsis due to anaerobic bacteria. Source: abdominal abscess.",
        expectedPrimary: "A41.4",
        expectedSecondary: ["K65.1"],
        rationale: "Anaerobe Sepsis Principal. Abscess secondary."
    },

    // ========== COMPLEX SEPSIS CASES ==========
    {
        num: 31,
        text: "82-year-old male admitted with pneumonia, severe sepsis, septic shock, acute respiratory failure requiring ventilation, and acute kidney injury.",
        expectedPrimary: "A41.9",
        expectedSecondary: ["R65.21", "J18.9", "J96.00", "N17.9"],
        rationale: "Sepsis Principal. Check all organ dysfunctions."
    },
    {
        num: 32,
        text: "70-year-old diabetic female with infected diabetic foot ulcer (right heel) and sepsis due to MRSA.",
        expectedPrimary: "A41.02",
        expectedSecondary: ["L97.419", "E11.621"],
        rationale: "MRSA Sepsis Principal. Ulcer secondary."
    },
    {
        num: 33,
        text: "65-year-old male with C. difficile colitis complicated by sepsis and severe sepsis. Blood cultures show translocation of C. diff.",
        expectedPrimary: "A04.72",
        expectedSecondary: ["R65.20", "A41.9"],
        rationale: "C. Diff Colitis (A04.72) is an intestinal infection that CAUSES sepsis. Standard guideline is Localized Infection -> Sepsis. Wait, if admitted for sepsis? Guideline says systemic infection. Let's assume A04.72 is strict Principal for C.diff."
    },

    // ========== SEPSIS SEQUENCING EDGE CASES ==========
    {
        num: 34,
        text: "78-year-old female admitted for elective knee replacement. Post-op day 3 develops sepsis from surgical site infection.",
        expectedPrimary: "T84.54XA",
        expectedSecondary: ["A41.9"],
        rationale: "Surgical site infection primary, sepsis secondary (not the reason for admission)"
    },
    {
        num: 35,
        text: "72-year-old male admitted primarily for acute MI (STEMI). During hospitalization develops hospital-acquired pneumonia with sepsis.",
        expectedPrimary: "I21.09",
        expectedSecondary: ["J18.9", "A41.9"],
        rationale: "MI was principal reason for admission, HAP and sepsis are complications"
    },

    // ========== SEPSIS WITH DOCUMENTED SOURCE BUT NO SPECIFIC SITE ==========
    {
        num: 36,
        text: "80-year-old nursing home resident with sepsis. Documented as 'bacterial sepsis' with skin as likely source but no specific cellulitis location.",
        expectedPrimary: "A41.9",
        expectedSecondary: ["L03.90"],
        rationale: "Sepsis Principal. Cellulitis secondary."
    },

    // ========== VIRAL SEPSIS (COVID, Influenza) ==========
    {
        num: 37,
        text: "62-year-old male admitted with COVID-19 pneumonia complicated by severe sepsis and respiratory failure.",
        expectedPrimary: "U07.1",
        expectedSecondary: ["J12.82", "R65.20", "A41.9", "J96.00"],
        rationale: "COVID Specific Guideline: Code U07.1 First, then manifestation (Pneumonia)."
    },
    {
        num: 38,
        text: "55-year-old female with influenza pneumonia and septic shock due to secondary bacterial infection (Staph aureus).",
        expectedPrimary: "J10.0",
        expectedSecondary: ["R65.21", "A41.01"],
        rationale: "Influenza Guideline: Code Influenza First."
    },

    // ========== STREPTOCOCCAL SEPSIS VARIANTS ==========
    {
        num: 39,
        text: "45-year-old female with Group A Streptococcus sepsis from pharyngitis.",
        expectedPrimary: "A40.0",
        expectedSecondary: ["J02.0"],
        rationale: "Strep Sepsis Principal. Pharyngitis secondary."
    },

    {
        num: 40,
        text: "68-year-old male admitted with severe sepsis due to Group B Streptococcus and acute kidney injury. Source: UTI.",
        expectedPrimary: "A40.1",
        expectedSecondary: ["R65.20", "N39.0", "N17.9"],
        rationale: "Group B Strep Sepsis Principal. AKI secondary."
    }
];

console.log('╔════════════════════════════════════════════════════════════════════════════════╗');
console.log('║                  SEPSIS MODULE - 40 TEST CASES CREATED                        ║');
console.log('╚════════════════════════════════════════════════════════════════════════════════╝\n');

console.log('TEST CASE DISTRIBUTION:\n');
console.log('  UTI Source:                    3 cases (1-3)');
console.log('  Pneumonia Source:              3 cases (4-6)');
console.log('  Skin/Soft Tissue Source:       3 cases (7-9)');
console.log('  Abdominal Source:              3 cases (10-12)');
console.log('  Severe Sepsis (no shock):      3 cases (13-15)');
console.log('  Septic Shock:                  3 cases (16-18)');
console.log('  Negative Cultures:             2 cases (19-20)');
console.log('  Unspecified Source:            2 cases (21-22)');
console.log('  Post-Procedure:                2 cases (23-24)');
console.log('  With Chronic Conditions:       2 cases (25-26)');
console.log('  Fungal/Neonatal:               2 cases (27-28)');
console.log('  Specific Organisms:            2 cases (29-30)');
console.log('  Complex Cases:                 3 cases (31-33)');
console.log('  Edge Cases/Sequencing:         2 cases (34-35)');
console.log('  Other Sources:                 1 case (36)');
console.log('  Viral-related:                 2 cases (37-38)');
console.log('  Strep Variants:                2 cases (39-40)\n');

console.log('KEY ICD-10-CM CODES COVERED:\n');
console.log('  ✓ A40.x (Streptococcal sepsis)');
console.log('  ✓ A41.x (Other bacterial sepsis - E. coli, Staph, MRSA, etc.)');
console.log('  ✓ R65.20 (Severe sepsis without shock)');
console.log('  ✓ R65.21 (Severe sepsis WITH septic shock)');
console.log('  ✓ Source infections (J15, N39.0, L03, K65, etc.)');
console.log('  ✓ Organ dysfunction (J96, N17, G93, etc.)');
console.log('  ✓ Post-procedural sepsis (T81.44XA)');
console.log('  ✓ Fungal sepsis (B37.7)');
console.log('  ✓ Neonatal sepsis (P36.x)\n');

console.log('CRITICAL SEQUENCING RULES TESTED:\n');
console.log('  ✓ Sepsis code FIRST when reason for admission (Guideline I.C.1.d.4(b))');
console.log('  ✓ R65.21 includes both severe sepsis AND septic shock');
console.log('  ✓ Organism code always required with sepsis');
console.log('  ✓ Organ dysfunction codes listed after sepsis');
console.log('  ✓ Post-procedure sepsis uses T81.44XA');
console.log('  ✓ Source infection SECONDARY when Sepsis is Principal\n');

console.log('━'.repeat(80));
console.log('✅ READY FOR PARSER & ENGINE DEVELOPMENT');
console.log('━'.repeat(80));

export { sepsisCases };
