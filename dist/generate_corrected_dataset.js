"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const fs = __importStar(require("fs"));
const inputFile = fs.readFileSync(process.env.HOME + '/Desktop/icd_results_2025-12-05.txt', 'utf-8');
const lines = inputFile.split('\n');
let output = '';
let currentCase = {};
let inCase = false;
for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.startsWith('CASE ')) {
        if (inCase && currentCase.id) {
            output += processCase(currentCase);
        }
        currentCase = {
            id: line.replace('CASE ', '').replace(':', '').trim(),
            lines: [],
            codes: []
        };
        inCase = true;
    }
    else if (line.startsWith('ICD_CODES:')) {
        // Skip original codes
    }
    else if (inCase && line) {
        currentCase.lines.push(line);
    }
}
if (inCase && currentCase.id) {
    output += processCase(currentCase);
}
function processCase(caseData) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p;
    const input = caseData.lines.join('\n');
    const lower = input.toLowerCase();
    let codes = [];
    // Traumatic wounds - FIX ALL S90.9xXA to S91.xxx
    if (lower.includes('type: traumatic')) {
        const location = ((_a = lower.match(/location:\s*([^\n]+)/)) === null || _a === void 0 ? void 0 : _a[1]) || '';
        const depth = ((_b = lower.match(/stage\/depth:\s*([^\n]+)/)) === null || _b === void 0 ? void 0 : _b[1]) || '';
        if (location.includes('heel')) {
            codes.push('S91.359A'); // Open wound of heel
        }
        else if (location.includes('right foot')) {
            codes.push('S91.301A'); // Open wound of right foot
        }
        else if (location.includes('left foot')) {
            codes.push('S91.302A'); // Open wound of left foot
        }
        else if (location.includes('ankle')) {
            codes.push('S91.009A'); // Open wound of ankle
        }
        else {
            codes.push('S91.309A'); // Open wound of unspecified foot
        }
    }
    // Pressure ulcers
    else if (lower.includes('type: pressure')) {
        const location = ((_c = lower.match(/location:\s*([^\n]+)/)) === null || _c === void 0 ? void 0 : _c[1]) || '';
        const stage = ((_d = lower.match(/stage\/depth:\s*([^\n]+)/)) === null || _d === void 0 ? void 0 : _d[1]) || '';
        if (location.includes('sacral')) {
            if (stage.includes('4'))
                codes.push('L89.154');
            else if (stage.includes('3'))
                codes.push('L89.153');
            else if (stage.includes('2'))
                codes.push('L89.152');
            else if (stage.includes('1'))
                codes.push('L89.151');
        }
        else if (location.includes('heel')) {
            if (stage.includes('4'))
                codes.push('L89.624');
            else if (stage.includes('3'))
                codes.push('L89.623');
            else if (stage.includes('2'))
                codes.push('L89.622');
            else if (stage.includes('1'))
                codes.push('L89.621');
        }
        else if (location.includes('right foot')) {
            if (stage.includes('4'))
                codes.push('L89.514');
            else if (stage.includes('3'))
                codes.push('L89.513');
            else if (stage.includes('2'))
                codes.push('L89.512');
            else if (stage.includes('1'))
                codes.push('L89.511');
        }
        else if (location.includes('left foot')) {
            if (stage.includes('4'))
                codes.push('L89.524');
            else if (stage.includes('3'))
                codes.push('L89.523');
            else if (stage.includes('2'))
                codes.push('L89.522');
            else if (stage.includes('1'))
                codes.push('L89.521');
        }
    }
    // HTN + HF + CKD
    if (lower.includes('hypertension: yes') && lower.includes('heart failure:') && lower.includes('ckd present: yes')) {
        const ckdStage = ((_e = lower.match(/ckd stage:\s*([^\n]+)/)) === null || _e === void 0 ? void 0 : _e[1]) || '';
        const hfType = ((_f = lower.match(/heart failure:\s*([^\n]+)/)) === null || _f === void 0 ? void 0 : _f[1]) || '';
        const hfAcuity = ((_g = lower.match(/heart failure acuity:\s*([^\n]+)/)) === null || _g === void 0 ? void 0 : _g[1]) || '';
        if (ckdStage.includes('esrd') || ckdStage.includes('5')) {
            codes.push('I13.2');
        }
        else {
            codes.push('I13.0');
        }
        // Add HF specificity
        if (hfType.includes('systolic')) {
            if (hfAcuity.includes('acute on chronic'))
                codes.push('I50.23');
            else if (hfAcuity.includes('acute'))
                codes.push('I50.21');
            else if (hfAcuity.includes('chronic'))
                codes.push('I50.22');
        }
        else if (hfType.includes('diastolic')) {
            if (hfAcuity.includes('acute on chronic'))
                codes.push('I50.33');
            else if (hfAcuity.includes('acute'))
                codes.push('I50.31');
            else if (hfAcuity.includes('chronic'))
                codes.push('I50.32');
        }
        else if (hfType.includes('combined')) {
            if (hfAcuity.includes('acute on chronic'))
                codes.push('I50.43');
            else if (hfAcuity.includes('acute'))
                codes.push('I50.41');
            else if (hfAcuity.includes('chronic'))
                codes.push('I50.42');
        }
        // Add CKD code
        if (ckdStage.includes('esrd'))
            codes.push('N18.6');
        else if (ckdStage.includes('5'))
            codes.push('N18.5');
        else if (ckdStage.includes('4'))
            codes.push('N18.4');
        else if (ckdStage.includes('3'))
            codes.push('N18.30');
        else if (ckdStage.includes('2'))
            codes.push('N18.2');
        else if (ckdStage.includes('1'))
            codes.push('N18.1');
    }
    // Sepsis
    if (lower.includes('sepsis: yes')) {
        const organism = ((_h = lower.match(/organism:\s*([^\n]+)/)) === null || _h === void 0 ? void 0 : _h[1]) || '';
        const site = ((_j = lower.match(/infection site:\s*([^\n]+)/)) === null || _j === void 0 ? void 0 : _j[1]) || '';
        const shock = lower.includes('septic shock: yes');
        if (organism.includes('viral'))
            codes.push('A41.89');
        else if (organism.includes('mrsa'))
            codes.push('A41.02');
        else if (organism.includes('e. coli'))
            codes.push('A41.51');
        else if (organism.includes('pseudomonas'))
            codes.push('A41.52');
        else
            codes.push('A41.9');
        if (shock)
            codes.push('R65.21');
        if (site.includes('lung')) {
            if (organism.includes('viral'))
                codes.push('J12.9');
            else if (organism.includes('mrsa'))
                codes.push('J15.212');
            else if (organism.includes('e. coli'))
                codes.push('J15.5');
            else if (organism.includes('pseudomonas'))
                codes.push('J15.1');
        }
        else if (site.includes('urinary')) {
            codes.push('N39.0');
        }
        else if (site.includes('skin')) {
            codes.push('L03.317');
        }
    }
    // COPD
    if (lower.includes('copd:')) {
        const copdType = ((_k = lower.match(/copd:\s*([^\n]+)/)) === null || _k === void 0 ? void 0 : _k[1]) || '';
        const hasPneumonia = lower.includes('pneumonia: yes');
        const respFailure = ((_l = lower.match(/respiratory failure:\s*([^\n]+)/)) === null || _l === void 0 ? void 0 : _l[1]) || '';
        if (respFailure.includes('acute'))
            codes.push('J96.00');
        else if (respFailure.includes('chronic'))
            codes.push('J96.10');
        if (copdType.includes('both') || (copdType.includes('exacerbation') && hasPneumonia)) {
            codes.push('J44.0');
            codes.push('J44.1');
        }
        else if (copdType.includes('exacerbation')) {
            codes.push('J44.1');
        }
        else if (copdType.includes('infection')) {
            codes.push('J44.0');
        }
        if (hasPneumonia) {
            const organism = ((_m = lower.match(/pneumonia organism:\s*([^\n]+)/)) === null || _m === void 0 ? void 0 : _m[1]) || '';
            if (organism.includes('mrsa'))
                codes.push('J15.212');
            else if (organism.includes('pseudomonas'))
                codes.push('J15.1');
            else if (organism.includes('e. coli'))
                codes.push('J15.5');
            else if (organism.includes('viral'))
                codes.push('J12.9');
            else
                codes.push('J18.9');
        }
    }
    // Diabetes with foot ulcer
    if (lower.includes('diabetes type:') && lower.includes('foot ulcer')) {
        const dmType = lower.includes('type 1') ? 'E10' : 'E11';
        const site = ((_o = lower.match(/ulcer site:\s*([^\n]+)/)) === null || _o === void 0 ? void 0 : _o[1]) || '';
        const severity = ((_p = lower.match(/ulcer severity:\s*([^\n]+)/)) === null || _p === void 0 ? void 0 : _p[1]) || '';
        codes.push(`${dmType}.621`);
        if (site.includes('right foot')) {
            if (severity.includes('bone'))
                codes.push('L97.514');
            else if (severity.includes('muscle'))
                codes.push('L97.515');
            else
                codes.push('L97.511');
        }
        else if (site.includes('left foot')) {
            if (severity.includes('bone'))
                codes.push('L97.524');
            else if (severity.includes('muscle'))
                codes.push('L97.525');
            else
                codes.push('L97.521');
        }
        else if (site.includes('right ankle')) {
            if (severity.includes('muscle'))
                codes.push('L97.515');
            else
                codes.push('L97.511');
        }
        else if (site.includes('left ankle')) {
            if (severity.includes('bone'))
                codes.push('L97.524');
            else if (severity.includes('muscle'))
                codes.push('L97.525');
            else if (severity.includes('skin'))
                codes.push('L97.521');
        }
        else if (site.includes('heel')) {
            codes.push('L97.595');
        }
    }
    let result = `CASE ${caseData.id}\n`;
    caseData.lines.forEach((line) => result += `  ${line}\n`);
    result += `\nICD_CODES:\n  ${codes.length > 0 ? codes.join(', ') : 'NO CODABLE DIAGNOSIS'}\n\n`;
    return result;
}
fs.writeFileSync(process.env.HOME + '/Desktop/corrected_structured_200_cases.txt', output.trim());
console.log('Generated: ~/Desktop/corrected_structured_200_cases.txt');
