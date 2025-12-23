/**
 * Enhanced Shafafiya XML v2.0 Generator
 * Generates XML for UAE payers with Activities/CPT support
 * Includes scrubber integration
 */

/**
 * Generate Shafafiya XML v2.0 from UAE export payload
 * @param {Object} uaeExport - UAE export payload from export.js
 * @param {Object} options - Generation options (claimId, activities, scrubberFixes, queries)
 * @returns {string} XML string
 */
function generateShafafiyaXML(uaeExport, options = {}) {
    const {
        claimId = `CLM${Date.now()}`,
        transactionDate = new Date().toISOString().split('T')[0],
        activities = [],
        scrubberFixes = [],
        queries = []
    } = options;

    const missingFields = uaeExport.missingFields || [];
    const hasMissingFields = missingFields.length > 0;

    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<Claim xmlns="http://dhpo.gov.ae/Shafafiya/v2.0">\n';

    // Header
    xml += '  <Header>\n';
    xml += `    <ClaimID>${escapeXml(claimId)}</ClaimID>\n`;
    xml += `    <TransactionDate>${escapeXml(transactionDate)}</TransactionDate>\n`;
    xml += `    <FacilityID>${escapeXml(uaeExport.facility.id)}</FacilityID>\n`;
    xml += `    <FacilityName>${escapeXml(uaeExport.facility.name || 'N/A')}</FacilityName>\n`;
    xml += `    <PayerID>${escapeXml(uaeExport.payer.id)}</PayerID>\n`;
    xml += `    <PayerScheme>${escapeXml(uaeExport.payer.scheme)}</PayerScheme>\n`;
    xml += `    <SubmissionFormat>SHAFAFIYA_XML_V2</SubmissionFormat>\n`;
    xml += `    <CountryProfile>UAE</CountryProfile>\n`;
    xml += '  </Header>\n';

    // Patient
    xml += '  <Patient>\n';
    xml += `    <PatientID>${escapeXml(uaeExport.patient.id)}</PatientID>\n`;
    if (uaeExport.patient.emiratesId) xml += `    <EmiratesID>${escapeXml(uaeExport.patient.emiratesId)}</EmiratesID>\n`;
    if (uaeExport.patient.dateOfBirth) xml += `    <DateOfBirth>${escapeXml(uaeExport.patient.dateOfBirth)}</DateOfBirth>\n`;
    if (uaeExport.patient.gender) xml += `    <Gender>${escapeXml(uaeExport.patient.gender)}</Gender>\n`;
    if (uaeExport.patient.nationality) xml += `    <Nationality>${escapeXml(uaeExport.patient.nationality)}</Nationality>\n`;
    xml += '  </Patient>\n';

    // Encounter
    xml += '  <Encounter>\n';
    xml += `    <EncounterID>${escapeXml(uaeExport.encounter.id)}</EncounterID>\n`;
    xml += `    <EncounterType>${escapeXml(uaeExport.encounter.type)}</EncounterType>\n`;
    xml += `    <EncounterDate>${escapeXml(uaeExport.encounter.encounterDate)}</EncounterDate>\n`;
    if (uaeExport.encounter.admitDate) xml += `    <AdmitDate>${escapeXml(uaeExport.encounter.admitDate)}</AdmitDate>\n`;
    if (uaeExport.encounter.dischargeDate) xml += `    <DischargeDate>${escapeXml(uaeExport.encounter.dischargeDate)}</DischargeDate>\n`;
    xml += `    <ProviderID>${escapeXml(uaeExport.provider.id)}</ProviderID>\n`;
    if (uaeExport.provider.name) xml += `    <ProviderName>${escapeXml(uaeExport.provider.name)}</ProviderName>\n`;
    if (uaeExport.provider.licenseNumber) xml += `    <ProviderLicense>${escapeXml(uaeExport.provider.licenseNumber)}</ProviderLicense>\n`;
    xml += '  </Encounter>\n';

    // Diagnoses
    xml += '  <Diagnoses>\n';
    xml += `    <CodingStandard>ICD-10-CM</CodingStandard>\n`;
    xml += `    <CodingMethod>${escapeXml(uaeExport.diagnoses.codingMethod)}</CodingMethod>\n`;

    if (uaeExport.diagnoses.primary) {
        xml += '    <PrimaryDiagnosis>\n';
        xml += `      <Code>${escapeXml(uaeExport.diagnoses.primary)}</Code>\n`;
        xml += `      <Description>${escapeXml(uaeExport.diagnoses.primaryDescription || '')}</Description>\n`;
        if (uaeExport.diagnoses.primaryPOA) xml += `      <POA>${escapeXml(uaeExport.diagnoses.primaryPOA)}</POA>\n`;
        xml += '    </PrimaryDiagnosis>\n';
    }

    if (uaeExport.diagnoses.secondary && uaeExport.diagnoses.secondary.length > 0) {
        xml += '    <SecondaryDiagnoses>\n';
        uaeExport.diagnoses.secondary.forEach((diag, index) => {
            xml += `      <Diagnosis sequence="${index + 1}">\n`;
            xml += `        <Code>${escapeXml(diag.code)}</Code>\n`;
            xml += `        <Description>${escapeXml(diag.description)}</Description>\n`;
            if (diag.poa) xml += `        <POA>${escapeXml(diag.poa)}</POA>\n`;
            xml += '      </Diagnosis>\n';
        });
        xml += '    </SecondaryDiagnoses>\n';
    }

    xml += '  </Diagnoses>\n';

    // Activities (CPT Procedures)
    xml += '  <Activities>\n';
    xml += `    <CodingStandard>CPT</CodingStandard>\n`;

    if (activities.length > 0) {
        activities.forEach((activity, index) => {
            xml += `    <Activity sequence="${index + 1}" id="${activity.id || `ACT${index + 1}`}">\n`;
            xml += `      <CPTCode>${escapeXml(activity.cptCode)}</CPTCode>\n`;
            xml += `      <Description>${escapeXml(activity.description || '')}</Description>\n`;
            if (activity.diagnosisCodeReference) xml += `      <DiagnosisCodeReference>${escapeXml(activity.diagnosisCodeReference)}</DiagnosisCodeReference>\n`;
            if (activity.modifiers && activity.modifiers.length > 0) {
                xml += `      <Modifiers>\n`;
                activity.modifiers.forEach(mod => xml += `        <Modifier>${escapeXml(mod)}</Modifier>\n`);
                xml += `      </Modifiers>\n`;
            }
            if (activity.serviceDate) xml += `      <ServiceDate>${escapeXml(activity.serviceDate)}</ServiceDate>\n`;
            if (activity.units) xml += `      <Units>${escapeXml(activity.units)}</Units>\n`;
            xml += '    </Activity>\n';
        });
    } else {
        xml += '    <!-- No activities/procedures in this claim -->\n';
    }

    xml += '  </Activities>\n';

    // Scrubber Fixes
    if (scrubberFixes.length > 0) {
        xml += '  <ScrubberFixes>\n';
        scrubberFixes.forEach(fix => {
            xml += `    <Fix type="${escapeXml(fix.type)}">\n`;
            if (fix.activityId) xml += `      <ActivityID>${escapeXml(fix.activityId)}</ActivityID>\n`;
            if (fix.cptCode) xml += `      <CPTCode>${escapeXml(fix.cptCode)}</CPTCode>\n`;
            if (fix.modifier) xml += `      <Modifier>${escapeXml(fix.modifier)}</Modifier>\n`;
            if (fix.originalDiagnosis) xml += `      <OriginalDiagnosis>${escapeXml(fix.originalDiagnosis)}</OriginalDiagnosis>\n`;
            if (fix.newDiagnosis) xml += `      <NewDiagnosis>${escapeXml(fix.newDiagnosis)}</NewDiagnosis>\n`;
            xml += `      <Reason>${escapeXml(fix.reason)}</Reason>\n`;
            xml += '    </Fix>\n';
        });
        xml += '  </ScrubberFixes>\n';
    }

    // Queries
    if (queries.length > 0) {
        xml += '  <Queries>\n';
        queries.forEach(query => {
            xml += `    <Query>\n`;
            xml += `      <Field>${escapeXml(query.field)}</Field>\n`;
            xml += `      <Issue>${escapeXml(query.issue)}</Issue>\n`;
            if (query.currentValue) xml += `      <CurrentValue>${escapeXml(query.currentValue)}</CurrentValue>\n`;
            if (query.suggestedFix) xml += `      <SuggestedFix>${escapeXml(query.suggestedFix)}</SuggestedFix>\n`;
            if (query.requiredAction) xml += `      <RequiredAction>${escapeXml(query.requiredAction)}</RequiredAction>\n`;
            xml += '    </Query>\n';
        });
        xml += '  </Queries>\n';
    }

    // Missing Fields
    if (hasMissingFields) {
        xml += '  <MissingFields>\n';
        missingFields.forEach(field => xml += `    <Field>${escapeXml(field)}</Field>\n`);
        xml += '  </MissingFields>\n';
    }

    // Metadata
    xml += '  <Metadata>\n';
    xml += `    <ExportStatus>${escapeXml(uaeExport.exportStatus)}</ExportStatus>\n`;
    xml += `    <AuditDecision>${escapeXml(uaeExport.diagnoses.auditDecision)}</AuditDecision>\n`;
    xml += `    <ExportedAt>${escapeXml(uaeExport.exportedAt)}</ExportedAt>\n`;
    xml += `    <ExporterVersion>${escapeXml(uaeExport.exporterVersion)}</ExporterVersion>\n`;
    xml += '  </Metadata>\n';

    xml += '</Claim>\n';

    return xml;
}

function escapeXml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}

function validateXML(xml) {
    const hasOpening = xml.includes('<Claim');
    const hasClosing = xml.includes('</Claim>');
    const hasDiagnoses = xml.includes('<Diagnoses>');

    return {
        valid: hasOpening && hasClosing && hasDiagnoses,
        errors: []
    };
}

module.exports = {
    generateShafafiyaXML,
    validateXML,
    escapeXml
};
