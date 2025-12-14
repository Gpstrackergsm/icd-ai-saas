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
        expectedPrimary: "N39.0",
        expectedSecondary: ["A41.51"],
        rationale: "UTI is the source infection - code source FIRST, then sepsis per ICD-10-CM guidelines"
    },
    {
        num: 2,
        text: "85-year-old male with Foley catheter admitted with CAUTI (catheter-associated UTI) and urosepsis. Blood cultures positive for E. coli.",
        expectedPrimary: "N39.0",
        expectedSecondary: ["A41.51", "T83.511A"],
        rationale: "UTI source first, sepsis second, then catheter complication"
    },
    {
        num: 3,
        text: "68-year-old female admitted with sepsis. Blood cultures show Klebsiella pneumoniae. CT scan shows pyelonephritis (kidney infection).",
        expectedPrimary: "N10",
        expectedSecondary: ["A41.50"],
        rationale: "Pyelonephritis (kidney infection) is source, code before sepsis"
    },

    // ========== SEPSIS WITH SOURCE INFECTIONS (PNEUMONIA) ==========
    {
        num: 4,
        text: "78-year-old male admitted with pneumonia and sepsis. Chest X-ray shows right lower lobe infiltrate. Blood cultures positive for Streptococcus pneumoniae.",
        expectedPrimary: "J13",
        expectedSecondary: ["A40.3"],
        rationale: "Pneumonia is source infection - code FIRST per UHDDS"
    },
    {
        num: 5,
        text: "65-year-old diabetic female with community-acquired pneumonia and septic shock. Blood cultures positive for Staph aureus. Patient on vasopressors.",
        expectedPrimary: "J15.211",
        expectedSecondary: ["R65.21", "E11.9"],
        rationale: "Pneumonia source first, septic shock second, diabetes third"
    },
    {
        num: 6,
        text: "82-year-old nursing home resident admitted with aspiration pneumonia and severe sepsis without shock. Blood cultures pending.",
        expectedPrimary: "J69.0",
        expectedSecondary: ["R65.20", "A41.9"],
        rationale: "Aspiration pneumonia source, severe sepsis, unspecified organism"
    },

    // ========== SEPSIS WITH SOURCE INFECTIONS (SKIN/SOFT TISSUE) ==========
    {
        num: 7,
        text: "55-year-old diabetic male admitted with left leg cellulitis and sepsis due to Streptococcus. Blood cultures positive.",
        expectedPrimary: "L03.115",
        expectedSecondary: ["A40.9", "E11.9"],
        rationale: "Cellulitis source first, strep sepsis second"
    },
    {
        num: 8,
        text: "70-year-old female with sacral pressure ulcer stage 3 admitted with sepsis due to MRSA bacteremia.",
        expectedPrimary: "L89.153",
        expectedSecondary: ["A41.02"],
        rationale: "Pressure ulcer source, MRSA sepsis secondary"
    },
    {
        num: 9,
        text: "45-year-old male with right foot abscess and sepsis. Blood cultures show Staph aureus.",
        expectedPrimary: "L02.611",
        expectedSecondary: ["A41.01"],
        rationale: "Abscess source, staph aureus sepsis"
    },

    // ========== SEPSIS WITH SOURCE INFECTIONS (ABDOMINAL) ==========
    {
        num: 10,
        text: "62-year-old female admitted with acute appendicitis with perforation and peritonitis. Blood cultures positive for E. coli sepsis.",
        expectedPrimary: "K35.32",
        expectedSecondary: ["K65.0", "A41.51"],
        rationale: "Appendicitis with perforation primary, peritonitis, then sepsis"
    },
    {
        num: 11,
        text: "74-year-old male with perforated diverticulitis and severe sepsis without shock. Blood cultures positive.",
        expectedPrimary: "K57.20",
        expectedSecondary: ["K65.0", "R65.20", "A41.9"],
        rationale: "Diverticulitis source, peritonitis, severe sepsis, unspecified organism"
    },
    {
        num: 12,
        text: "58-year-old female admitted with acute cholecystitis and septic shock. Blood cultures show E. coli.",
        expectedPrimary: "K81.0",
        expectedSecondary: ["R65.21", "A41.51"],
        rationale: "Cholecystitis source, septic shock (includes sepsis)"
    },

    // ========== SEVERE SEPSIS WITHOUT SHOCK ==========
    {
        num: 13,
        text: "80-year-old male with severe sepsis and acute kidney injury. Blood cultures positive for E. coli. Source: UTI. No hypotension or shock.",
        expectedPrimary: "N39.0",
        expectedSecondary: ["R65.20", "A41.51", "N17.9"],
        rationale: "UTI source, severe sepsis R65.20, sepsis organism, AKI organ dysfunction"
    },
    {
        num: 14,
        text: "66-year-old female with pneumonia, severe sepsis, and acute respiratory failure. No shock documented.",
        expectedPrimary: "J18.9",
        expectedSecondary: ["R65.20", "A41.9", "J96.00"],
        rationale: "Pneumonia source, severe sepsis, organism, respiratory failure"
    },
    {
        num: 15,
        text: "72-year-old male admitted with severe sepsis and multiple organ dysfunction (AKI and encephalopathy). Source: skin infection.",
        expectedPrimary: "L03.90",
        expectedSecondary: ["R65.20", "A41.9", "N17.9", "G93.41"],
        rationale: "Cellulitis source, severe sepsis, all organ dysfunctions listed"
    },

    // ========== SEPTIC SHOCK ==========
    {
        num: 16,
        text: "58-year-old male admitted in septic shock requiring vasopressors. Blood cultures positive for Pseudomonas. Source: pneumonia.",
        expectedPrimary: "J15.1",
        expectedSecondary: ["R65.21"],
        rationale: "Pneumonia source, R65.21 includes both severe sepsis AND septic shock"
    },
    {
        num: 17,
        text: "70-year-old female with urosepsis and septic shock. On norepinephrine drip. Blood cultures show Klebsiella.",
        expectedPrimary: "N39.0",
        expectedSecondary: ["R65.21", "A41.50"],
        rationale: "UTI source, septic shock R65.21, organism"
    },
    {
        num: 18,
        text: "82-year-old male with abdominal sepsis from perforated bowel and septic shock. Emergency surgery performed.",
        expectedPrimary: "K63.1",
        expectedSecondary: ["K65.0", "R65.21", "A41.9"],
        rationale: "Perforated bowel, peritonitis, septic shock"
    },

    // ========== SEPSIS - NEGATIVE CULTURES ==========
    {
        num: 19,
        text: "75-year-old female clinically diagnosed with sepsis. Blood cultures drawn but negative. Source: pneumonia.",
        expectedPrimary: "J18.9",
        expectedSecondary: ["A41.9"],
        rationale: "Pneumonia source, unspecified sepsis (A41.9 when organism unknown)"
    },
    {
        num: 20,
        text: "68-year-old male with sepsis, cultures pending/negative. Source: UTI based on UA results.",
        expectedPrimary: "N39.0",
        expectedSecondary: ["A41.9"],
        rationale: "UTI source, A41.9 for unspecified organism sepsis"
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
        expectedPrimary: "J15.9",
        expectedSecondary: ["A41.9", "J44.1", "I50.9", "E11.9"],
        rationale: "Pneumonia source primary, then sepsis, then chronic conditions"
    },
    {
        num: 26,
        text: "80-year-old female with ESRD on dialysis admitted with sepsis from infected dialysis catheter. Blood cultures show Staph epidermidis.",
        expectedPrimary: "T82.7XXA",
        expectedSecondary: ["A41.1", "N18.6", "Z99.2"],
        rationale: "Catheter infection primary, sepsis organism, ESRD, dialysis status"
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
        rationale: "Strep pneumoniae sepsis without lung involvement"
    },
    {
        num: 30,
        text: "75-year-old female with sepsis due to anaerobic bacteria. Source: abdominal abscess.",
        expectedPrimary: "K65.1",
        expectedSecondary: ["A41.4"],
        rationale: "Abdominal abscess source, anaerobic sepsis"
    },

    // ========== COMPLEX SEPSIS CASES ==========
    {
        num: 31,
        text: "82-year-old male admitted with pneumonia, severe sepsis, septic shock, acute respiratory failure requiring ventilation, and acute kidney injury.",
        expectedPrimary: "J18.9",
        expectedSecondary: ["R65.21", "A41.9", "J96.00", "N17.9"],
        rationale: "Pneumonia source, septic shock (includes severe sepsis), all organ dysfunctions"
    },
    {
        num: 32,
        text: "70-year-old diabetic female with infected diabetic foot ulcer (right heel) and sepsis due to MRSA.",
        expectedPrimary: "L97.419",
        expectedSecondary: ["A41.02", "E11.621"],
        rationale: "Diabetic foot ulcer source, MRSA sepsis, diabetes with foot ulcer"
    },
    {
        num: 33,
        text: "65-year-old male with C. difficile colitis complicated by sepsis and severe sepsis. Blood cultures show translocation of C. diff.",
        expectedPrimary: "A04.72",
        expectedSecondary: ["R65.20", "A41.9"],
        rationale: "C. diff colitis with sepsis - sequence colitis first"
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
        expectedPrimary: "L03.90",
        expectedSecondary: ["A41.9"],
        rationale: "Unspecified cellulitis source, unspecified bacterial sepsis"
    },

    // ========== VIRAL SEPSIS (COVID, Influenza) ==========
    {
        num: 37,
        text: "62-year-old male admitted with COVID-19 pneumonia complicated by severe sepsis and respiratory failure.",
        expectedPrimary: "J12.82",
        expectedSecondary: ["U07.1", "R65.20", "A41.9", "J96.00"],
        rationale: "COVID pneumonia, COVID code, severe sepsis, organism, resp failure"
    },
    {
        num: 38,
        text: "55-year-old female with influenza pneumonia and septic shock due to secondary bacterial infection (Staph aureus).",
        expectedPrimary: "J10.0",
        expectedSecondary: ["R65.21", "A41.01"],
        rationale: "Influenza pneumonia primary, septic shock, bacterial organism"
    },

    // ========== STREPTOCOCCAL SEPSIS VARIANTS ==========
    {
        num: 39,
        text: "45-year-old female with Group A Streptococcus sepsis from pharyngitis.",
        expectedPrimary: "J02.0",
        expectedSecondary: ["A40.0"],
        rationale: "Strep pharyngitis source, Group A strep sepsis"
    },

    {
        num: 40,
        text: "68-year-old male admitted with severe sepsis due to Group B Streptococcus and acute kidney injury. Source: UTI.",
        expectedPrimary: "N39.0",
        expectedSecondary: ["R65.20", "A40.1", "N17.9"],
        rationale: "UTI source, severe sepsis, Group B strep, AKI"
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
console.log('  ✓ Source infection BEFORE sepsis code (UHDDS principal)');
console.log('  ✓ R65.21 includes both severe sepsis AND septic shock');
console.log('  ✓ Organism code always required with sepsis');
console.log('  ✓ Organ dysfunction codes listed after sepsis');
console.log('  ✓ Post-procedure sepsis uses T81.44XA');
console.log('  ✓ When no source found, sepsis is principal\n');

console.log('━'.repeat(80));
console.log('✅ READY FOR PARSER & ENGINE DEVELOPMENT');
console.log('━'.repeat(80));

export { sepsisCases };
