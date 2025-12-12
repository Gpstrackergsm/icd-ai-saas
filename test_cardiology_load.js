// Simple test to verify cardiology module loads
try {
    const { parseCardiology, resolveCardiologyCodes } = require('./lib/domains/cardiology/module');
    console.log('✅ Cardiology module loaded successfully');

    const text = "HTN and HF";
    const attrs = parseCardiology(text);
    console.log('✅ parseCardiology works:', attrs.hypertension, attrs.heart_failure);

    const codes = resolveCardiologyCodes(attrs);
    console.log('✅ resolveCardiologyCodes works:', codes.length, 'codes');

} catch (err) {
    console.log('❌ Error loading cardiology module:', err.message);
    process.exit(1);
}
