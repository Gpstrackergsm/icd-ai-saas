/**
 * UAE Compliance Validator
 * Validates claims against Shafafiya (Abu Dhabi) and e-ClaimLink (Dubai) requirements
 */

/**
 * Validate Emirates ID
 * Format 1: 784-XXXX-XXXXXXX-X (15 digits with dashes)
 * Format 2: 15 consecutive digits
 */
function validateEmiratesID(emiratesID) {
    if (!emiratesID || emiratesID.trim() === '') {
        return {
            isValid: false,
            error: 'Emirates ID is mandatory',
            field: 'EmiratesID'
        };
    }

    const format1 = /^784-\d{4}-\d{7}-\d$/;
    const format2 = /^\d{15}$/;

    if (format1.test(emiratesID) || format2.test(emiratesID)) {
        return {
            isValid: true,
            field: 'EmiratesID'
        };
    }

    return {
        isValid: false,
        error: 'Emirates ID must be 15 digits or format 784-XXXX-XXXXXXX-X',
        field: 'EmiratesID',
        hint: 'Example: 784-1234-1234567-1'
    };
}

/**
 * Validate Member ID (Insurance Card Number)
 */
function validateMemberID(memberID) {
    if (!memberID || memberID.trim() === '') {
        return {
            isValid: false,
            error: 'Insurance card number (Member ID) is mandatory',
            field: 'MemberID'
        };
    }

    return {
        isValid: true,
        field: 'MemberID'
    };
}

/**
 * Validate Birth Date
 * Format: DD/MM/YYYY
 */
function validateBirthDate(birthDate) {
    if (!birthDate || birthDate.trim() === '') {
        return {
            isValid: false,
            error: 'Birth date is mandatory',
            field: 'BirthDate'
        };
    }

    const pattern = /^(\d{2})\/(\d{2})\/(\d{4})$/;
    const match = birthDate.match(pattern);

    if (!match) {
        return {
            isValid: false,
            error: 'Birth date must be in DD/MM/YYYY format',
            field: 'BirthDate',
            hint: 'Example: 15/03/1990'
        };
    }

    const [, day, month, year] = match;
    const dayNum = parseInt(day, 10);
    const monthNum = parseInt(month, 10);
    const yearNum = parseInt(year, 10);

    if (monthNum < 1 || monthNum > 12) {
        return {
            isValid: false,
            error: 'Invalid month in birth date',
            field: 'BirthDate'
        };
    }

    if (dayNum < 1 || dayNum > 31) {
        return {
            isValid: false,
            error: 'Invalid day in birth date',
            field: 'BirthDate'
        };
    }

    if (yearNum < 1900 || yearNum > new Date().getFullYear()) {
        return {
            isValid: false,
            error: 'Invalid year in birth date',
            field: 'BirthDate'
        };
    }

    return {
        isValid: true,
        field: 'BirthDate'
    };
}

/**
 * Validate Gender
 */
function validateGender(gender) {
    if (!gender || gender.trim() === '') {
        return {
            isValid: false,
            error: 'Gender is mandatory',
            field: 'Gender'
        };
    }

    const validGenders = ['M', 'F', 'Male', 'Female'];
    if (validGenders.includes(gender)) {
        return {
            isValid: true,
            field: 'Gender',
            normalized: gender === 'Male' ? 'M' : gender === 'Female' ? 'F' : gender
        };
    }

    return {
        isValid: false,
        error: 'Gender must be M or F',
        field: 'Gender'
    };
}

/**
 * Validate Sender ID (Facility License Number)
 */
function validateSenderID(senderID) {
    if (!senderID || senderID.trim() === '') {
        return {
            isValid: false,
            error: 'Facility license number (Sender ID) is mandatory',
            field: 'SenderID'
        };
    }

    const pattern = /^[A-Z0-9-]+$/;
    if (!pattern.test(senderID)) {
        return {
            isValid: false,
            error: 'Facility license must contain only letters, numbers, and hyphens',
            field: 'SenderID'
        };
    }

    return {
        isValid: true,
        field: 'SenderID'
    };
}

/**
 * Validate Clinician ID (Doctor License Number)
 */
function validateClinicianID(clinicianID) {
    if (!clinicianID || clinicianID.trim() === '') {
        return {
            isValid: false,
            error: 'Doctor license number (Clinician ID) is mandatory',
            field: 'ClinicianID'
        };
    }

    const pattern = /^[A-Z0-9-]+$/;
    if (!pattern.test(clinicianID)) {
        return {
            isValid: false,
            error: 'Doctor license must contain only letters, numbers, and hyphens',
            field: 'ClinicianID'
        };
    }

    return {
        isValid: true,
        field: 'ClinicianID'
    };
}

/**
 * Validate Net Amount
 */
function validateNet(net) {
    if (net === undefined || net === null || net === '') {
        return {
            isValid: false,
            error: 'Net amount is mandatory',
            field: 'Net'
        };
    }

    const amount = parseFloat(net);
    if (isNaN(amount)) {
        return {
            isValid: false,
            error: 'Net amount must be a valid number',
            field: 'Net'
        };
    }

    if (amount < 0) {
        return {
            isValid: false,
            error: 'Net amount cannot be negative',
            field: 'Net'
        };
    }

    return {
        isValid: true,
        field: 'Net',
        normalized: amount.toFixed(2)
    };
}

/**
 * Validate Currency
 */
function validateCurrency(currency) {
    if (!currency || currency.trim() === '') {
        return {
            isValid: false,
            error: 'Currency is mandatory',
            field: 'Currency'
        };
    }

    if (currency !== 'AED') {
        return {
            isValid: false,
            error: 'Currency must be AED for UAE claims',
            field: 'Currency'
        };
    }

    return {
        isValid: true,
        field: 'Currency'
    };
}

/**
 * Validate Encounter Type
 */
function validateEncounterType(encounterType) {
    if (!encounterType) {
        return {
            isValid: false,
            error: 'Encounter type is mandatory',
            field: 'EncounterType'
        };
    }

    const validTypes = {
        '1': 'Outpatient',
        '2': 'Inpatient',
        '3': 'Emergency'
    };

    const typeStr = String(encounterType);
    if (!validTypes[typeStr]) {
        return {
            isValid: false,
            error: 'Encounter type must be 1 (Outpatient), 2 (Inpatient), or 3 (Emergency)',
            field: 'EncounterType'
        };
    }

    return {
        isValid: true,
        field: 'EncounterType',
        description: validTypes[typeStr]
    };
}

/**
 * Validate Diagnosis Code Reference (CPT-ICD linking)
 */
function validateDiagnosisLinking(activities) {
    const errors = [];
    const warnings = [];

    if (!activities || activities.length === 0) {
        return {
            isValid: true,
            warnings: ['No procedures (CPT codes) found']
        };
    }

    activities.forEach((activity, index) => {
        const sequence = index + 1;

        if (!activity.diagnosisCodeReference || activity.diagnosisCodeReference.length === 0) {
            errors.push({
                sequence: sequence,
                code: activity.code,
                description: activity.description,
                error: 'Every CPT code must be linked to at least one diagnosis'
            });
        }
    });

    return {
        isValid: errors.length === 0,
        errors: errors,
        warnings: warnings,
        field: 'DiagnosisLinking'
    };
}

/**
 * Validate Complete Claim
 */
function validateClaim(claim) {
    const results = {
        isValid: true,
        errors: [],
        warnings: [],
        validatedFields: {}
    };

    // Patient validation
    const emiratesIDResult = validateEmiratesID(claim.patient?.emiratesID);
    results.validatedFields.emiratesID = emiratesIDResult.isValid;
    if (!emiratesIDResult.isValid) {
        results.isValid = false;
        results.errors.push(emiratesIDResult);
    }

    const memberIDResult = validateMemberID(claim.patient?.memberID);
    results.validatedFields.memberID = memberIDResult.isValid;
    if (!memberIDResult.isValid) {
        results.isValid = false;
        results.errors.push(memberIDResult);
    }

    const birthDateResult = validateBirthDate(claim.patient?.birthDate);
    results.validatedFields.birthDate = birthDateResult.isValid;
    if (!birthDateResult.isValid) {
        results.isValid = false;
        results.errors.push(birthDateResult);
    }

    const genderResult = validateGender(claim.patient?.gender);
    results.validatedFields.gender = genderResult.isValid;
    if (!genderResult.isValid) {
        results.isValid = false;
        results.errors.push(genderResult);
    }

    // Provider validation
    const senderIDResult = validateSenderID(claim.provider?.senderID);
    results.validatedFields.senderID = senderIDResult.isValid;
    if (!senderIDResult.isValid) {
        results.isValid = false;
        results.errors.push(senderIDResult);
    }

    const clinicianIDResult = validateClinicianID(claim.provider?.clinicianID);
    results.validatedFields.clinicianID = clinicianIDResult.isValid;
    if (!clinicianIDResult.isValid) {
        results.isValid = false;
        results.errors.push(clinicianIDResult);
    }

    // Financial validation
    const netResult = validateNet(claim.financial?.net);
    results.validatedFields.net = netResult.isValid;
    if (!netResult.isValid) {
        results.isValid = false;
        results.errors.push(netResult);
    }

    const currencyResult = validateCurrency(claim.financial?.currency);
    results.validatedFields.currency = currencyResult.isValid;
    if (!currencyResult.isValid) {
        results.isValid = false;
        results.errors.push(currencyResult);
    }

    // Encounter validation
    const encounterTypeResult = validateEncounterType(claim.encounterType);
    results.validatedFields.encounterType = encounterTypeResult.isValid;
    if (!encounterTypeResult.isValid) {
        results.isValid = false;
        results.errors.push(encounterTypeResult);
    }

    // Diagnosis linking validation
    const linkingResult = validateDiagnosisLinking(claim.activities);
    results.validatedFields.allCPTsLinked = linkingResult.isValid;
    if (!linkingResult.isValid) {
        results.isValid = false;
        results.errors.push(...linkingResult.errors);
    }
    if (linkingResult.warnings && linkingResult.warnings.length > 0) {
        results.warnings.push(...linkingResult.warnings);
    }

    // Determine status
    if (results.isValid) {
        results.status = 'READY';
        results.message = 'All UAE Mandatory Fields Present. Ready to Submit.';
        results.canExport = true;
    } else {
        results.status = 'ERROR';
        results.message = `Missing ${results.errors.length} mandatory field(s)`;
        results.canExport = false;
    }

    return results;
}

// Export functions for use in Node.js or browser
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        validateEmiratesID,
        validateMemberID,
        validateBirthDate,
        validateGender,
        validateSenderID,
        validateClinicianID,
        validateNet,
        validateCurrency,
        validateEncounterType,
        validateDiagnosisLinking,
        validateClaim
    };
}
