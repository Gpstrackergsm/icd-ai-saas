"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.evaluatePoisoning = evaluatePoisoning;
exports.evaluateInsulinPumpFailure = evaluateInsulinPumpFailure;
const intentMap = {
    1: 'accidental',
    2: 'intentional self-harm',
    3: 'assault',
    4: 'undetermined',
    5: 'adverse effect',
    6: 'underdosing',
};
function pickIntent(text) {
    if (/underdos/.test(text))
        return 6;
    if (/adverse effect/.test(text))
        return 5;
    if (/intentional/.test(text))
        return 2;
    if (/assault/.test(text))
        return 3;
    if (/accidental/.test(text) || /overdos/.test(text))
        return 1;
    if (/undetermined/.test(text))
        return 4;
    return undefined;
}
function buildPoisoningCode(agent, intent) {
    const seventh = 'A';
    const filler = 'X';
    const fifth = intent;
    if (agent === 'insulin') {
        return `T38.3${filler}${fifth}${seventh}`;
    }
    return `T50.9${filler}${fifth}${seventh}`;
}
function evaluatePoisoning(text) {
    const lower = text.toLowerCase();
    const warnings = [];
    const intent = pickIntent(lower);
    const isInsulin = /insulin/.test(lower);
    const matched = Boolean(intent && (isInsulin || /medication|drug/.test(lower)));
    if (!matched)
        return { matched: false, sequence: [], warnings };
    const agent = isInsulin ? 'insulin' : 'unspecified drug';
    if (!intent)
        warnings.push('Intent not documented; poisoning intent cannot be assigned.');
    const code = intent ? buildPoisoningCode(isInsulin ? 'insulin' : 'other', intent) : undefined;
    const sequence = code
        ? [
            {
                code,
                label: `${intentMap[intent]} ${agent} event`,
                triggeredBy: 'poisoning_engine',
                hcc: false,
            },
        ]
        : [];
    return { matched: true, intent, agent, sequence, warnings };
}
function evaluateInsulinPumpFailure(text, diabeticCode) {
    const lower = text.toLowerCase();
    if (!/insulin pump/.test(lower)) {
        return { matched: false, sequence: [], warnings: [] };
    }
    const intent = /overdos|too much|excess/.test(lower)
        ? 1
        : /underdos|insufficient|missed/.test(lower)
            ? 6
            : undefined;
    if (!intent) {
        return { matched: false, sequence: [], warnings: ['Pump failure described but dose effect unclear'] };
    }
    const insulinCode = intent === 6 ? 'T38.3X6A' : 'T38.3X1A';
    const pumpMechanical = 'T85.6X9A';
    const sequence = [
        {
            code: pumpMechanical,
            label: 'Mechanical complication of insulin pump',
            triggeredBy: 'insulin_pump_failure',
            hcc: false,
        },
        {
            code: insulinCode,
            label: intent === 6 ? 'Underdosing of insulin and oral hypoglycemics' : 'Poisoning by insulin, accidental',
            triggeredBy: 'insulin_pump_failure',
            hcc: false,
        },
    ];
    if (diabeticCode) {
        sequence.push(diabeticCode);
    }
    else {
        const hyper = /hyperglyc/.test(lower);
        const hypo = /hypoglyc/.test(lower);
        const baseDiabetes = intent === 6 || hyper ? 'E11.65' : 'E11.649';
        sequence.push({
            code: baseDiabetes,
            label: intent === 6 || hyper ? 'Diabetes with hyperglycemia' : 'Diabetes with hypoglycemia',
            triggeredBy: 'insulin_pump_failure',
            hcc: true,
        });
    }
    return { matched: true, intent, agent: 'insulin pump', sequence, warnings: [] };
}
