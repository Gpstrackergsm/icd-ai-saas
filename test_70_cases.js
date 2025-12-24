/**
 * UAE 70-Case Comprehensive Test Suite
 */

const uaeRules = require('./lib/uae-market-rules.js');

const CASES = [
    "Patient presents with sore throat and fever. Rapid strep test performed and returned positive for Group A Streptococcus.",
    "Incision and drainage performed for painful abscess on right index finger.",
    "Patient underwent scheduled hemodialysis session today. Dialysis access functioning normally.",
    "Chest X-ray shows right lower lobe consolidation consistent with pneumonia.",
    "Blood cultures positive for E. coli. Patient started on IV antibiotics.",
    "Left thigh abscess treated with incision and drainage in clinic.",
    "Patient advised to continue hypertension medication. Blood pressure monitored.",
    "Patient on insulin therapy for diabetes. Blood glucose monitored during visit.",
    "Rapid COVID-19 antigen test positive in clinic.",
    "Patient complains of headache. No tests or procedures documented.",
    "Ultrasound shows gallstones without cholecystitis.",
    "ECG shows atrial fibrillation. Rate controlled with medication.",
    "CT scan confirms acute appendicitis.",
    "Patient underwent wound debridement for infected diabetic foot ulcer.",
    "MRI brain shows acute ischemic stroke.",
    "Urinalysis positive for nitrites and leukocytes. Urine culture pending.",
    "Blood glucose level elevated. Patient counseled on diet.",
    "Rapid influenza A test positive.",
    "Patient underwent cataract extraction surgery today.",
    "Chest CT shows pulmonary embolism.",
    "Patient presents with chest pain. Troponin levels elevated.",
    "Endoscopy shows gastric ulcer.",
    "Blood cultures positive for Staphylococcus aureus.",
    "Patient underwent colonoscopy with biopsy.",
    "X-ray confirms fracture of left distal radius.",
    "Patient received chemotherapy infusion today.",
    "CT abdomen shows acute pancreatitis.",
    "Patient treated with nebulization for acute asthma symptoms.",
    "Rapid dengue test positive.",
    "Patient underwent cesarean section delivery.",
    "Ultrasound confirms intrauterine pregnancy at 10 weeks.",
    "Patient admitted for acute heart failure exacerbation.",
    "Blood test shows elevated creatinine. Renal ultrasound performed.",
    "Rapid RSV test positive in pediatric patient.",
    "Patient underwent pacemaker insertion.",
    "CT chest shows lung mass suspicious for malignancy.",
    "Patient treated for hypoglycemia with IV dextrose.",
    "Rapid malaria test positive.",
    "Patient underwent arthroscopic knee surgery.",
    "MRI spine shows lumbar disc herniation.",
    "Blood cultures positive for Klebsiella pneumoniae.",
    "Patient treated with IV fluids for dehydration.",
    "Chest X-ray shows bilateral pleural effusion.",
    "Patient underwent thyroidectomy.",
    "Rapid HIV screening test positive.",
    "Patient treated with antibiotics for infected surgical wound.",
    "CT head shows subdural hematoma.",
    "Patient received blood transfusion for anemia.",
    "Ultrasound confirms deep vein thrombosis in left leg.",
    "Patient underwent bronchoscopy with lavage.",
    "Rapid pregnancy test positive.",
    "Patient admitted with acute exacerbation of COPD.",
    "CT angiography shows aortic dissection.",
    "Patient treated for heat exhaustion.",
    "Blood cultures positive for Enterococcus species.",
    "Patient underwent dialysis catheter insertion.",
    "Chest X-ray shows pneumothorax.",
    "Rapid hepatitis B surface antigen test positive.",
    "Patient treated with IV antibiotics for cellulitis of right leg.",
    "MRI knee shows meniscal tear.",
    "Patient underwent upper GI endoscopy for dysphagia.",
    "Rapid tuberculosis PCR test positive.",
    "Patient treated with bronchodilators for wheezing.",
    "CT scan confirms renal stone.",
    "Patient admitted for acute gastroenteritis with dehydration.",
    "Blood cultures positive for Pseudomonas aeruginosa.",
    "Patient underwent excision of skin lesion.",
    "Rapid rotavirus test positive in child.",
    "Patient treated for syncope. ECG performed.",
    "Patient presents for routine follow-up. No complaints or tests documented."
];

console.log('# UAE 70-CASE TEST RESULTS\n');

CASES.forEach((narrative, index) => {
    const caseNum = index + 1;
    const result = uaeRules.checkUAEOverride(narrative, 'UAE');

    if (result && result.diagnoses && result.diagnoses.length > 0) {
        const code = result.diagnoses[0].code;
        const desc = result.diagnoses[0].description;
        console.log(`CASE ${caseNum}: ${code} - ${desc}`);
    } else {
        console.log(`CASE ${caseNum}: AUTO EXCLUDE (No override)`);
    }
});

console.log('\n# END OF RESULTS');
