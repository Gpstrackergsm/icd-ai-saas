"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPneumoniaLabel = getPneumoniaLabel;
// Helper function to get pneumonia label
function getPneumoniaLabel(code, organism) {
    const labels = {
        'J13': 'Pneumonia due to Streptococcus pneumoniae',
        'J14': 'Pneumonia due to Haemophilus influenzae',
        'J15.0': 'Pneumonia due to Klebsiella pneumoniae',
        'J15.1': 'Pneumonia due to Pseudomonas',
        'J15.211': 'Pneumonia due to Methicillin susceptible Staphylococcus aureus',
        'J15.212': 'Pneumonia due to Methicillin resistant Staphylococcus aureus',
        'J15.5': 'Pneumonia due to Escherichia coli',
        'J15.7': 'Pneumonia due to Mycoplasma pneumoniae',
        'J15.9': 'Unspecified bacterial pneumonia',
        'J12.9': 'Viral pneumonia, unspecified',
        'J18.9': 'Pneumonia, unspecified organism'
    };
    return labels[code] || 'Pneumonia';
}
