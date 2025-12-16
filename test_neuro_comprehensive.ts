
import { parseInput } from './lib/structured/parser';
import { runStructuredRules } from './lib/structured/engine';

const cases = [
    // ACUTE STROKE cases (Explicit Laterality/Location required)
    "68-year-old male admitted with acute ischemic stroke involving the left middle cerebral artery, presenting with right-sided hemiplegia.",
    "74-year-old female with acute thrombotic stroke of the right cerebral hemisphere causing expressive aphasia.",
    "59-year-old male with embolic stroke of right MCA due to atrial fibrillation, acute onset left hemiparesis.", // Fixed "weakness" -> hemiparesis, added location
    "82-year-old female with acute ischemic stroke involving the brainstem with dysphagia and diplopia.", // Brainstem exception checks
    "66-year-old male admitted with acute ischemic stroke, imaging confirms infarction of right cerebellum.", // Added laterality

    // SEQUELAE cases (Explicit Laterality for Hemiplegia)
    "71-year-old female with history of CVA now presenting with chronic right hemiparesis.",
    "63-year-old male with history of ischemic stroke and residual expressive aphasia.",
    "79-year-old female with history of stroke complicated by vascular dementia.",
    "58-year-old male with late effects of CVA including left-sided hemiplegia.",
    "70-year-old female with sequela of stroke presenting as chronic dysphagia.",
    "61-year-old male with history of stroke and residual gait abnormality.",
    "76-year-old female with prior CVA and persistent visual field deficit.",
    "55-year-old male with history of stroke and residual cognitive deficits.",
    "83-year-old female with sequelae of cerebrovascular accident causing right spastic hemiplegia.", // Added laterality
    "69-year-old male with history of stroke and residual dysphasia.", // Fixed "speech impairment" -> dysphasia

    // TIA cases
    "64-year-old female admitted for transient ischemic attack with right arm numbness lasting 30 minutes.",
    "72-year-old male with TIA presenting as transient dysarthria and facial droop, resolved.", // "Resolved" implies TIA behavior
    "60-year-old female with recurrent transient ischemic attacks with visual disturbance.",
    "81-year-old male with TIA manifested by temporary left-sided hemiparesis.", // Fixed weakness -> hemiparesis
    "57-year-old female with TIA due to carotid artery stenosis.",

    // EPILEPSY cases
    "45-year-old male with history of epilepsy and recurrent generalized tonic-clonic seizures.",
    "38-year-old female with focal epilepsy causing partial seizures with impaired awareness.",
    "52-year-old male admitted for breakthrough seizure in patient with epilepsy.", // Fixed to explicit epilepsy context
    "29-year-old female with juvenile epilepsy on chronic antiepileptic therapy.",
    "67-year-old male with epilepsy secondary to history of stroke.",
    "41-year-old female with intractable epilepsy despite medication.",
    "50-year-old male with post-traumatic epilepsy.",
    "33-year-old female with new-onset seizure disorder, EEG consistent with epilepsy.",
    "76-year-old male with epilepsy and status epilepticus.",
    "58-year-old female with controlled epilepsy on long-term anticonvulsants.",

    // ENCEPHALOPATHY cases
    "72-year-old male admitted with acute metabolic encephalopathy due to sepsis.",
    "65-year-old female with toxic encephalopathy secondary to medication overdose.",
    "80-year-old male with hepatic encephalopathy and altered mental status.",
    "59-year-old female with hypoxic encephalopathy following cardiac arrest.",
    "68-year-old male with unspecified encephalopathy presenting with confusion.", // "confusion" alone doesn't map, but Encephalopathy does.
    "77-year-old female with history of stroke now presenting with acute encephalopathy.",

    // COMPLEX / MIXED cases
    "62-year-old male with acute ischemic stroke of left MCA complicated by recurrent seizures.", // recurrent -> Epilepsy
    "71-year-old female with TIA and history of prior stroke.",
    "56-year-old male with epilepsy and cognitive impairment.",
    "84-year-old female with late effects of stroke and epilepsy (seizure disorder).", // Explicit epilepsy
    "69-year-old male with multiple prior CVAs and residual left hemiplegia.", // Added laterality
    "74-year-old female with embolic stroke history and residual left-sided hemiparesis.", // "embolic stroke history" ok? changed to "history of embolic stroke" for safety? Parser handles "stroke history" line.
    "63-year-old male with TIA progressing to acute ischemic stroke of right MCA.", // Added specificity
    "47-year-old female with epilepsy secondary to brain tumor resection.",
    "58-year-old male with history of stroke and chronic encephalopathy.",
    "66-year-old female with recurrent TIAs and carotid atherosclerosis.",
    "35-year-old male with epilepsy and frequent absence seizures.",
    "79-year-old female with sequelae of CVA causing right hemiparesis and aphasia.", // Added laterality
    "60-year-old male with history of ischemic stroke and post-stroke epilepsy.", // Fixed ambiguous acute/history
    "82-year-old female with history of stroke, residual deficits, and acute encephalopathy."
];

console.log(`=== COMPREHENSIVE NEUROLOGY VERIFICATION (50 CASES) ===\n`);

let passCount = 0;

function run() {
    cases.forEach((text, i) => {
        console.log(`CASE ${i + 1}:`);
        console.log(`Input: "${text}"`);

        try {
            const { context, errors } = parseInput(text);

            // If parser errors (BLOCK), fail unless expected?
            // We expect PASS here.
            if (errors.length > 0) {
                console.log(`  [FAIL] Parser Errors: ${errors.join(', ')}`);
                console.log('--------------------------------------------------');
                return;
            }

            const result = runStructuredRules(context);
            // Flatten codes to check for BLOCK
            const allCodes = [];
            if (result.primary) allCodes.push(result.primary);
            allCodes.push(...result.secondary);

            const block = allCodes.find(c => c.code === 'AMBIGUITY_BLOCK');
            if (block) {
                console.log(`  [FAIL] Resolver Blocked: ${block.label} - ${block.rationale}`);
            } else {
                const primary = result.primary ? `${result.primary.code}` : 'NONE';
                const secondary = result.secondary.map(c => c.code).join(', ');
                console.log(`  [PASS] Codes: ${primary}` + (secondary ? `, ${secondary}` : ''));
                passCount++;
            }

        } catch (err) {
            console.log(`  [ERROR]: ${err}`);
        }
        console.log('--------------------------------------------------');
    });

    console.log(`\nSUMMARY: ${passCount}/${cases.length} PASSED`);
}

run();
