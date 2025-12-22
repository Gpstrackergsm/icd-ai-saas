// Test what the LIVE production API is returning
const testNarrative = '68-year-old admitted for dehydration and weakness. Creatinine was elevated on admission and improved after intravenous fluids. Renal function was monitored during hospitalization. There was no documented diagnosis of acute kidney injury or chronic kidney disease.';

async function testLiveAPI() {
    console.log('Testing LIVE production API...\n');

    try {
        const response = await fetch('https://www.icd-10-cm.online/api/encode', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ text: testNarrative })
        });

        const data = await response.json();

        console.log('Response status:', response.status);
        console.log('Response data:');
        console.log(JSON.stringify(data, null, 2));
        console.log('');

        if (data.data) {
            console.log('Primary:', data.data.primary);
            console.log('Secondary:', data.data.secondary);
            console.log('Warnings:', data.data.warnings);
            console.log('ValidationErrors:', data.data.validationErrors);
            console.log('');

            if (data.data.validationErrors && data.data.validationErrors.length > 0) {
                console.log('✅ ValidationErrors present!');
                console.log('First error preview:', data.data.validationErrors[0].substring(0, 200) + '...');
            } else {
                console.log('❌ No validationErrors found');
                console.log('   The formal audit decision block will NOT display');
            }
        }
    } catch (error) {
        console.error('Error:', error.message);
    }
}

testLiveAPI();
