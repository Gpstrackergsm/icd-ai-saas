
import { parseInput } from './lib/structured/parser';
import { runStructuredRules } from './lib/structured/engine';

const cases = [
    "68-year-old male admitted with acute ischemic stroke involving the left middle cerebral artery, presenting with right-sided hemiplegia.",
    "74-year-old female with acute thrombotic stroke of the right cerebral hemisphere causing expressive aphasia.",
    "59-year-old male with embolic stroke due to atrial fibrillation, acute onset left arm weakness.",
    "82-year-old female with acute ischemic stroke involving the brainstem with dysphagia and diplopia.",
    "66-year-old male admitted with acute ischemic stroke, imaging confirms infarction of cerebellum.",
    "71-year-old female with history of CVA now presenting with chronic right hemiparesis.",
    "63-year-old male with prior ischemic stroke and residual expressive aphasia.",
    "79-year-old female with history of stroke complicated by vascular dementia.",
    "58-year-old male with late effects of CVA including left-sided hemiplegia.",
    "70-year-old female with sequela of stroke presenting as chronic dysphagia.",
    "61-year-old male with history of stroke and residual gait abnormality.",
    "76-year-old female with prior CVA and persistent visual field deficit.",
    "55-year-old male with history of stroke and residual cognitive deficits.",
    "83-year-old female with sequelae of cerebrovascular accident causing spastic hemiplegia.",
    "69-year-old male with history of stroke and residual speech impairment.",
    "64-year-old female admitted for transient ischemic attack with right arm numbness lasting 30 minutes.",
    "72-year-old male with TIA presenting as transient slurred speech and facial droop, resolved.",
    "60-year-old female with recurrent transient ischemic attacks with visual disturbance.",
    "81-year-old male with TIA manifested by temporary left-sided weakness.",
    "57-year-old female with TIA due to carotid artery stenosis.",
    "45-year-old male with history of epilepsy and recurrent generalized tonic-clonic seizures.",
    "38-year-old female with focal epilepsy causing partial seizures with impaired awareness.",
    "52-year-old male admitted for breakthrough seizure due to missed antiepileptic medication.",
    "29-year-old female with juvenile epilepsy on chronic antiepileptic therapy.",
    "67-year-old male with epilepsy secondary to prior stroke.",
    "41-year-old female with intractable epilepsy despite medication.",
    "50-year-old male with post-traumatic epilepsy.",
    "33-year-old female with new-onset seizure disorder, EEG consistent with epilepsy.",
    "76-year-old male with epilepsy and status epilepticus.",
    "58-year-old female with controlled epilepsy on long-term anticonvulsants.",
    "72-year-old male admitted with acute metabolic encephalopathy due to sepsis.",
    "65-year-old female with toxic encephalopathy secondary to medication overdose.",
    "80-year-old male with hepatic encephalopathy and altered mental status.",
    "59-year-old female with hypoxic encephalopathy following cardiac arrest.",
    "68-year-old male with unspecified encephalopathy presenting with confusion.",
    "77-year-old female with history of stroke now presenting with acute encephalopathy.",
    "62-year-old male with acute ischemic stroke complicated by seizures.",
    "71-year-old female with TIA and history of prior stroke.",
    "56-year-old male with epilepsy and cognitive impairment.",
    "84-year-old female with late effects of stroke and seizure disorder.",
    "69-year-old male with multiple prior CVAs and residual hemiplegia.",
    "74-year-old female with embolic stroke and residual left-sided weakness.",
    "63-year-old male with TIA progressing to ischemic stroke.",
    "47-year-old female with epilepsy secondary to brain tumor resection.",
    "58-year-old male with stroke history and chronic encephalopathy.",
    "66-year-old female with recurrent TIAs and carotid atherosclerosis.",
    "35-year-old male with epilepsy and frequent absence seizures.",
    "79-year-old female with sequelae of CVA causing hemiparesis and aphasia.",
    "60-year-old male with ischemic stroke and post-stroke epilepsy.",
    "82-year-old female with history of stroke, residual deficits, and acute encephalopathy."
];

console.log(`=== CUSTOM 50-CASE NEUROLOGY BENCHMARK ===\n`);

async function run() {
    for (let i = 0; i < cases.length; i++) {
        const text = cases[i];
        console.log(`CASE ${i + 1}:`);
        console.log(`Input: "${text}"`);

        try {
            const { context } = parseInput(text);
            const result = runStructuredRules(context);

            const primary = result.primary ? `${result.primary.code} (${result.primary.label})` : 'NONE';
            const secondary = result.secondary.map(c => `${c.code} (${c.label})`).join(', ');

            console.log(`Codes: ${primary}` + (secondary ? `, ${secondary}` : ''));
        } catch (err) {
            console.log(`ERROR: ${err}`);
        }
        console.log('--------------------------------------------------');
    }
}

run();
