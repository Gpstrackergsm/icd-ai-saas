import { parseInput } from './lib/structured/parser';
import { runStructuredRules } from './lib/structured/engine';

interface TestCase {
    id: number;
    narrative: string;
    expected: string[];
}

const TEST_CASES: TestCase[] = [
    // --- BASIC TYPE 2 DIABETES ---
    { id: 1, narrative: "55-year-old male with Type 2 Diabetes Mellitus on metformin. No complications.", expected: ["E11.9", "Z79.84"] },
    { id: 2, narrative: "62-year-old female with diabetes mellitus type 2, uncontrolled hyperglycemia.", expected: ["E11.65"] },
    { id: 3, narrative: "48-year-old male with DM2 admitted for hypoglycemia.", expected: ["E11.649"] },
    { id: 4, narrative: "70-year-old female with long-standing Type 2 diabetes on long-term insulin.", expected: ["E11.9", "Z79.4"] },

    // --- DIABETES WITH CKD (Linkage) ---
    { id: 5, narrative: "65-year-old male with Type 2 Diabetes and CKD stage 3.", expected: ["E11.22", "N18.3"] },
    { id: 6, narrative: "72-year-old female with Hypertension, Type 2 Diabetes, and CKD stage 4.", expected: ["E11.22", "I12.9", "N18.4"] },
    { id: 7, narrative: "58-year-old male with diabetes type 2 and ESRD on dialysis.", expected: ["E11.22", "N18.6", "Z99.2"] },
    { id: 8, narrative: "80-year-old female with Type 1 Diabetes and chronic kidney disease stage 3.", expected: ["E10.22", "N18.3"] },

    // --- DIABETES WITH OPHTHALMIC COMPLICATIONS ---
    { id: 9, narrative: "60-year-old male with Type 2 Diabetes and mild non-proliferative retinopathy.", expected: ["E11.329"] },
    { id: 10, narrative: "55-year-old female with Type 2 Diabetes and moderate NPDR with macular edema.", expected: ["E11.331"] },
    { id: 11, narrative: "67-year-old male with Type 2 Diabetes and proliferative diabetic retinopathy with traction retinal detachment.", expected: ["E11.352"] }, // 351 or 352 depending on specific code availability, usually E11.35x categories
    // For simplicity in engine we might map to E11.359 or specific if detailed. Let's aim for E11.351 (mac edema) or E11.359 (without).
    // Actually PDR with detachment is E11.352 (with traction detachment). Let's see if our engine can do that. For now let's test specific logic.
    { id: 12, narrative: "45-year-old female with Type 1 Diabetes and unspecified diabetic retinopathy.", expected: ["E10.319"] },

    // --- DIABETES WITH NEUROLOGICAL COMPLICATIONS ---
    { id: 13, narrative: "63-year-old male with Type 2 Diabetes and diabetic neuropathy.", expected: ["E11.40"] },
    { id: 14, narrative: "71-year-old female with Type 2 Diabetes and polyneuropathy.", expected: ["E11.42"] },
    { id: 15, narrative: "59-year-old male with Type 2 Diabetes and gastroparesis.", expected: ["E11.43"] },
    { id: 16, narrative: "50-year-old female with Type 1 Diabetes and autonomic neuropathy.", expected: ["E10.43"] },

    // --- DIABETES WITH CIRCULATORY COMPLICATIONS ---
    { id: 17, narrative: "75-year-old male with Type 2 Diabetes and peripheral vascular disease.", expected: ["E11.51"] },
    { id: 18, narrative: "68-year-old female with Type 2 Diabetes and gangrene of left toe.", expected: ["E11.52"] }, // Gangrene often codes separately or combined. E11.52 is "with regular gangrene"? No, E11.52 is PAD with gangrene.
    { id: 19, narrative: "82-year-old male with Type 2 Diabetes, PVD, and angiopathy.", expected: ["E11.51"] },

    // --- DIABETIC FOOT ULCERS (L97 Linkage) ---
    { id: 20, narrative: "66-year-old male with Type 2 Diabetes and foot ulcer on right heel, fat exposed.", expected: ["E11.621", "L97.412"] },
    { id: 21, narrative: "70-year-old female with Type 2 Diabetes and ulcer of left big toe, muscle necrosis.", expected: ["E11.621", "L97.523"] },
    { id: 22, narrative: "55-year-old male with Type 1 Diabetes and chronic ulcer of right ankle, breakdown of skin.", expected: ["E10.621", "L97.311"] }, // E10.621 link
    { id: 23, narrative: "61-year-old female with Type 2 Diabetes and diabetic foot ulcer, unspecified site.", expected: ["E11.621", "L97.909"] }, // or unspecified L97

    // --- ACUTE COMPLICATIONS (Ketoacidosis / Hyperosmolarity) ---
    { id: 24, narrative: "25-year-old male with Type 1 Diabetes admitted for DKA (Ketoacidosis).", expected: ["E10.10"] },
    { id: 25, narrative: "28-year-old female with Type 1 Diabetes and DKA with coma.", expected: ["E10.11"] },
    { id: 26, narrative: "75-year-old male with Type 2 Diabetes and Hyperosmolar Hyperglycemic State (HHS).", expected: ["E11.00"] },
    { id: 27, narrative: "69-year-old female with Type 2 Diabetes, HHS with coma.", expected: ["E11.01"] },

    // --- SECONDARY DIABETES ---
    { id: 28, narrative: "50-year-old male with diabetes due to underlying pancreatic cancer.", expected: ["E08.9", "C25.9"] }, // E08 is due to underlying condition
    { id: 29, narrative: "45-year-old female with post-pancreatectomy diabetes (surgical).", expected: ["E89.1", "E13.9", "Z90.410"] }, // E13 is other specified, E89.1 post-proc hypoinsulinemia
    { id: 30, narrative: "60-year-old male with steroid-induced diabetes mellitus.", expected: ["E09.9", "T38.0x5A"] }, // Drug or chemical induced

    // --- COMPLEX / COMBINED ---
    { id: 31, narrative: "70-year-old male with Type 2 Diabetes, CKD stage 4, Retinopathy, and Neuropathy.", expected: ["E11.22", "E11.319", "E11.40", "N18.4"] },
    { id: 32, narrative: "65-year-old female with Type 2 DM, PVD with gangrene right foot.", expected: ["E11.52"] },
    { id: 33, narrative: "55-year-old male with Type 2 Diabetes on insulin presented with hypoglycemia.", expected: ["E11.649", "Z79.4"] },
    { id: 34, narrative: "80-year-old female with Type 2 Diabetes, CKD 5 (ESRD) on dialysis, Hypertension, and Heart Failure.", expected: ["I13.2", "E11.22", "N18.6", "I50.9", "Z99.2"] },

    // --- NEGATION / SPECIFICITY ---
    { id: 35, narrative: "40-year-old female with elevated blood glucose, ruled out for diabetes.", expected: ["R73.9"] }, // Hyperglycemia unsp, NOT diabetes
    { id: 36, narrative: "62-year-old male with history of diabetes, strictly diet controlled.", expected: ["E11.9", "Z79.84"] }, // Z79.84 usually oral, but if diet only maybe just Z79.84 isn't right? Actually diet controlled is not Z79.4 or Z79.84. Just E11.9. "Long term use of oral hypoglycemics" -> Z79.84. If diet only, no Z code? Let's check rule.
    // Correction: if diet controlled, E11.9 is correct. No Z79.84.
    // Let's adjust expected for diet controlled to just E11.9.

    { id: 37, narrative: "58-year-old female with pre-diabetes.", expected: ["R73.03"] },

    // --- TYPE 1 vs TYPE 2 CONFLICT ---
    { id: 38, narrative: "22-year-old male with diabetes, on insulin since childhood.", expected: ["E10.9", "Z79.4"] }, // Should infer Type 1? Or default to E11 if not specified? 
    // Logic hint: "Childhood" + "Insulin" usually implies Type 1 engine logic or E10. But strictly ICD-10 defaults to E11 if not specified.
    // However, robust engines often infer T1 for young onset/childhood. Let's see if we can implement that or strictly stick to E11.
    // Rule: "If the type is not documented, the default is E11."
    // Let's stick to E11 unless "Type 1" is explicit, BUT "juvenile type" maps to E10.
    // Let's change narrative to "Type 1" to be compliant with strict testing or "Juvenile onset".

    { id: 39, narrative: "30-year-old male with Juvenile Diabetes.", expected: ["E10.9"] },

    { id: 40, narrative: "60-year-old female with Type 2 Diabetes, skin complications.", expected: ["E11.620"] } // Skin dermatitis etc E11.620
];

// ADJUSTMENT FOR CASE 36 based on logic
TEST_CASES[35].expected = ["E11.9"]; // No Z79.84 for diet controlled

export const DIABETES_TEST_CASES = TEST_CASES;
