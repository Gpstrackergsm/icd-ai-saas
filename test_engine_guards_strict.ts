
import { parseInput } from './lib/structured/parser';
import { runStructuredRules } from './lib/structured/engine';

console.log('=== STRICT ENGINE GUARDS VERIFICATION ===');

function test(name: string, input: string, confirm: (codes: string[], logs: string[]) => void) {
    console.log(`\nTEST: ${name}`);
    console.log(`Input: "${input}"`);

    // Capture Logs
    const logs: string[] = [];
    const originalLog = console.log;
    console.log = (...args) => {
        logs.push(args.join(' '));
        originalLog(...args);
    };

    const { context } = parseInput(input);
    const output = runStructuredRules(context);

    // Restore Log
    console.log = originalLog;

    const codes = [];
    if (output.primary) codes.push(output.primary.code);
    if (output.secondary) codes.push(...output.secondary.map(s => s.code));

    console.log(`Codes: ${codes.join(', ')}`);
    // Print captured debug logs related to pregnancy
    const debugLogs = logs.filter(l => l.includes('DEBUG') || l.includes('PREGNANT'));
    if (debugLogs.length > 0) console.log('CAPTURED DEBUG LOGS:\n' + debugLogs.join('\n'));

    confirm(codes, logs);
}

// TEST 1: Pregnancy Leak Guard
test('Pregnancy Leak Guard', "59-year-old female with hypoxic encephalopathy following cardiac arrest.", (codes, logs) => {
    if (codes.includes('Z33.1')) console.log('[FAIL] LEAK DETECTED: Z33.1 present.');
    else if (codes.includes('G93.1')) console.log('[PASS] Z33.1 absent, G93.1 present.');
    else console.log('[FAIL] Codes missing.');
});

// TEST 3: Hepatic Encephalopathy Mapping
test('Hepatic Encephalopathy Mapping', "80-year-old male with hepatic encephalopathy and altered mental status.", (codes, logs) => {
    if (codes.includes('K72.90')) console.log('[FAIL] K72.90 present (User forbids it).');
    else if (codes.includes('G93.41')) console.log('[PASS] G93.41 present.');
    else console.log('[FAIL] Expected G93.41, got:', codes);
});

// TEST 4: Flow Log Correctness
test('Flow Log Correctness', "TIA with transient dysarthria resolved.", (codes, logs) => {
    const hasNeuro = logs.some(l => l.includes('[Flow] Reached Neuro block'));
    const hasRenal = logs.some(l => l.includes('[Flow] Reached Renal block'));

    if (hasNeuro && !hasRenal) console.log('[PASS] Neuro log present, Renal log absent.');
    else {
        if (!hasNeuro) console.log('[FAIL] Missing Neuro log.');
        if (hasRenal) console.log('[FAIL] Spurious Renal log detected.');
    }
});
