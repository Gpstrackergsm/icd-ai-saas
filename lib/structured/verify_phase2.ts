
import { runStructuredRules } from './engine';
import { PatientContext } from './context';

function runTest(name: string, ctx: PatientContext, expectedCodes: string[]) {
    console.log(`\n--- Test: ${name} ---`);
    const result = runStructuredRules(ctx);
    const generatedCodes = [result.primary, ...result.secondary].filter(c => c).map(c => c!.code);

    const missing = expectedCodes.filter(c => !generatedCodes.includes(c));
    const unexpected = generatedCodes.filter(c => !expectedCodes.includes(c));

    if (missing.length === 0 && unexpected.length === 0) {
        console.log('✅ PASS');
    } else {
        console.log('❌ FAIL');
        if (missing.length > 0) console.log('Missing:', missing);
        if (unexpected.length > 0) console.log('Unexpected:', unexpected);
        console.log('Generated:', generatedCodes);
    }
}

// Test 1: Neurology (Alzheimer's + AMS)
runTest('Neurology: Alzheimer\'s + AMS', {
    demographics: {},
    encounter: { type: 'initial' },
    conditions: {
        neurology: {
            dementia: { type: 'alzheimer' },
            alteredMentalStatus: true
        }
    }
}, ['G30.9', 'F02.80', 'R41.82']);

// Test 2: Gastroenterology (Alcoholic Cirrhosis + Ascites)
runTest('Gastro: Alcoholic Cirrhosis + Ascites', {
    demographics: {},
    encounter: { type: 'initial' },
    conditions: {
        gastro: {
            cirrhosis: { type: 'alcoholic' },
            ascites: true
        }
    }
}, ['K70.30', 'R18.8']);

// Test 3: Heme/Onc (Lung Cancer + Brain Mets + Anemia)
runTest('Heme/Onc: Lung Cancer + Brain Mets + Anemia', {
    demographics: {},
    encounter: { type: 'initial' },
    conditions: {
        neoplasm: {
            present: true,
            site: 'lung',
            metastasis: true,
            metastaticSite: 'brain'
        },
        hematology: {
            anemia: { type: 'chronic_disease' }
        }
    }
}, ['C34.90', 'C79.31', 'D63.0']); // D63.0 because neoplasm is present

// Test 4: OB/GYN (Pregnant + 30 weeks + Preeclampsia)
runTest('OB/GYN: Pregnant + 30 weeks + Preeclampsia', {
    demographics: {},
    encounter: { type: 'initial' },
    conditions: {
        obstetric: {
            pregnant: true,
            gestationalAge: 30,
            preeclampsia: true
        }
    }
}, ['O14.93', 'Z3A.30']);

// Test 5: Social (Current Smoker + Homeless)
runTest('Social: Current Smoker + Homeless', {
    demographics: {},
    encounter: { type: 'initial' },
    conditions: {},
    social: {
        smoking: 'current',
        homeless: true
    }
}, ['F17.210', 'Z59.00']);
