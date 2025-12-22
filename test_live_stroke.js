// Test live API directly
const testCase = {
    text: '70-year-old with history of stroke. Provider documented "residual left-sided weakness from prior CVA".'
};

fetch('https://www.icd-10-cm.online/api/encode', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(testCase)
})
    .then(res => res.json())
    .then(data => {
        console.log('='.repeat(80));
        console.log('LIVE API RESPONSE TEST');
        console.log('='.repeat(80));
        console.log('');
        console.log('Decision State:', data.data?._debug?.decisionState);
        console.log('Primary:', data.data?.primary);
        console.log('Secondary:', data.data?.secondary);
        console.log('');
        console.log('Validation Errors:', data.data?.validationErrors?.length || 0);
        if (data.data?.validationErrors?.[0]) {
            const snippet = data.data.validationErrors[0].substring(0, 200);
            console.log('First 200 chars:', snippet);
        }
        console.log('');
        console.log('Full Response:');
        console.log(JSON.stringify(data, null, 2));
    })
    .catch(err => console.error('Error:', err));
