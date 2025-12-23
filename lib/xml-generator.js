/**
 * UAE XML Generator
 * Generates production-ready XML for Shafafiya (Abu Dhabi) and e-ClaimLink (Dubai)
 */

/**
 * Format date to UAE standard: DD/MM/YYYY:HH:mm
 */
function formatUAEDate(date) {
    const d = date instanceof Date ? date : new Date(date);

    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');

    return `${day}/${month}/${year}:${hours}:${minutes}`;
}

/**
 * Format date to DD/MM/YYYY (for dates without time)
 */
function formatUAEDateOnly(date) {
    const d = date instanceof Date ? date : new Date(date);

    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();

    return `${day}/${month}/${year}`;
}

/**
 * Escape XML special characters
 */
function escapeXML(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}

/**
 * Generate UUID for claim ID
 */
function generateClaimID() {
    return 'CLM-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9).toUpperCase();
}

/**
 * Generate Shafafiya XML (Abu Dhabi - DOH)
 */
function generateShafafiyaXML(claims, options = {}) {
    const disposition = options.isProduction ? 'PRODUCTION' : 'TEST';
    const dispositionMode = options.isProduction ? 'LIVE' : 'TEST';
    const transactionDate = formatUAEDate(new Date());
    const recordCount = claims.length;

    const claimsXML = claims.map((claim, index) => generateShafafiyaClaimXML(claim, index + 1)).join('\n');

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<tns:SubmissionBatch 
  xmlns:tns="http://www.doh.gov.ae/eClaim/Submission"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  
  <Header>
    <SenderID>${escapeXML(claims[0]?.provider?.senderID || 'UNKNOWN')}</SenderID>
    <ReceiverID>DOH</ReceiverID>
    <TransactionDate>${transactionDate}</TransactionDate>
    <RecordCount>${recordCount}</RecordCount>
    <Disposition>${disposition}</Disposition>
    <DispositionMode>${dispositionMode}</DispositionMode>
  </Header>
  
  <Claims>
${claimsXML}
  </Claims>
</tns:SubmissionBatch>`;

    return xml;
}

/**
 * Generate single claim XML for Shafafiya
 */
function generateShafafiyaClaimXML(claim, sequence) {
    const claimID = claim.claimID || generateClaimID();
    const encounterDate = formatUAEDateOnly(claim.encounterDate || new Date());

    // Diagnoses XML
    const diagnosesXML = (claim.diagnoses || []).map((diagnosis, index) => {
        const isPrincipal = index === 0;
        return `        <Diagnosis sequence="${index + 1}" type="${isPrincipal ? 'principal' : 'secondary'}">
          <Code system="ICD-10">${escapeXML(diagnosis.code)}</Code>
          <Description>${escapeXML(diagnosis.description)}</Description>
        </Diagnosis>`;
    }).join('\n');

    // Activities (CPT codes) XML
    const activitiesXML = (claim.activities || []).map((activity, index) => {
        const modifiersXML = (activity.modifiers || []).map(mod =>
            `          <Modifier>${escapeXML(mod)}</Modifier>`
        ).join('\n');

        const diagnosisRefs = (activity.diagnosisCodeReference || []).map(ref =>
            `          <DiagnosisCodeReference>${ref}</DiagnosisCodeReference>`
        ).join('\n');

        return `        <Activity sequence="${index + 1}">
          <Code system="CPT">${escapeXML(activity.code)}</Code>
          <Description>${escapeXML(activity.description)}</Description>
          <Quantity>${activity.quantity || 1}</Quantity>
          <Net currency="${claim.financial?.currency || 'AED'}">${(activity.net || 0).toFixed(2)}</Net>
${diagnosisRefs}
${modifiersXML ? `          <Modifiers>\n${modifiersXML}\n          </Modifiers>` : ''}
        </Activity>`;
    }).join('\n');

    const claimTotal = (claim.financial?.net || 0).toFixed(2);

    return `    <Claim sequence="${sequence}">
      <ClaimID>${escapeXML(claimID)}</ClaimID>
      <EncounterType>${claim.encounterType || 1}</EncounterType>
      <EncounterDate>${encounterDate}</EncounterDate>
      
      <Patient>
        <EmiratesID>${escapeXML(claim.patient?.emiratesID)}</EmiratesID>
        <MemberID>${escapeXML(claim.patient?.memberID)}</MemberID>
        <Name>${escapeXML(claim.patient?.name || 'PATIENT NAME')}</Name>
        <BirthDate>${escapeXML(claim.patient?.birthDate)}</BirthDate>
        <Gender>${escapeXML(claim.patient?.gender)}</Gender>
      </Patient>
      
      <Provider>
        <ClinicianID>${escapeXML(claim.provider?.clinicianID)}</ClinicianID>
        <ClinicianName>${escapeXML(claim.provider?.clinicianName || 'DOCTOR NAME')}</ClinicianName>
      </Provider>
      
      <Diagnoses>
${diagnosesXML}
      </Diagnoses>
      
      <Activities>
${activitiesXML}
      </Activities>
      
      <ClaimTotal currency="${claim.financial?.currency || 'AED'}">${claimTotal}</ClaimTotal>
    </Claim>`;
}

/**
 * Generate e-ClaimLink XML (Dubai - DHA)
 */
function generateEClaimLinkXML(claims, options = {}) {
    const disposition = options.isProduction ? 'PRODUCTION' : 'TEST';
    const transactionDate = formatUAEDate(new Date());
    const recordCount = claims.length;

    const claimsXML = claims.map((claim, index) => generateEClaimLinkClaimXML(claim, index + 1)).join('\n');

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<dha:ClaimSubmission 
  xmlns:dha="http://www.dha.gov.ae/eClaim/Submission"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  
  <Header>
    <ProviderID>${escapeXML(claims[0]?.provider?.senderID || 'UNKNOWN')}</ProviderID>
    <SubmissionDate>${transactionDate}</SubmissionDate>
    <ClaimCount>${recordCount}</ClaimCount>
    <Environment>${disposition}</Environment>
  </Header>
  
  <Claims>
${claimsXML}
  </Claims>
</dha:ClaimSubmission>`;

    return xml;
}

/**
 * Generate single claim XML for e-ClaimLink
 */
function generateEClaimLinkClaimXML(claim, sequence) {
    const claimID = claim.claimID || generateClaimID();
    const encounterDate = formatUAEDateOnly(claim.encounterDate || new Date());

    // Diagnoses XML
    const diagnosesXML = (claim.diagnoses || []).map((diagnosis, index) => {
        const isPrincipal = index === 0;
        return `        <Diagnosis>
          <Sequence>${index + 1}</Sequence>
          <Type>${isPrincipal ? 'Primary' : 'Secondary'}</Type>
          <CodeSystem>ICD-10-CM</CodeSystem>
          <Code>${escapeXML(diagnosis.code)}</Code>
          <Description>${escapeXML(diagnosis.description)}</Description>
        </Diagnosis>`;
    }).join('\n');

    // Services (CPT codes) XML
    const servicesXML = (claim.activities || []).map((activity, index) => {
        const modifiersXML = (activity.modifiers || []).map(mod =>
            `            <Modifier>${escapeXML(mod)}</Modifier>`
        ).join('\n');

        const linkedDiagnoses = (activity.diagnosisCodeReference || []).join(',');

        return `        <Service>
          <LineNumber>${index + 1}</LineNumber>
          <CodeSystem>CPT</CodeSystem>
          <Code>${escapeXML(activity.code)}</Code>
          <Description>${escapeXML(activity.description)}</Description>
          <Units>${activity.quantity || 1}</Units>
          <UnitPrice currency="AED">${((activity.net || 0) / (activity.quantity || 1)).toFixed(2)}</UnitPrice>
          <NetAmount currency="AED">${(activity.net || 0).toFixed(2)}</NetAmount>
          <LinkedDiagnoses>${linkedDiagnoses}</LinkedDiagnoses>
${modifiersXML ? `          <Modifiers>\n${modifiersXML}\n          </Modifiers>` : ''}
        </Service>`;
    }).join('\n');

    const claimTotal = (claim.financial?.net || 0).toFixed(2);

    return `    <Claim>
      <ClaimNumber>${escapeXML(claimID)}</ClaimNumber>
      <VisitType>${claim.encounterType || 1}</VisitType>
      <VisitDate>${encounterDate}</VisitDate>
      
      <Member>
        <EmiratesID>${escapeXML(claim.patient?.emiratesID)}</EmiratesID>
        <PolicyNumber>${escapeXML(claim.patient?.memberID)}</PolicyNumber>
        <FullName>${escapeXML(claim.patient?.name || 'PATIENT NAME')}</FullName>
        <DateOfBirth>${escapeXML(claim.patient?.birthDate)}</DateOfBirth>
        <Gender>${escapeXML(claim.patient?.gender)}</Gender>
      </Member>
      
      <Physician>
        <LicenseNumber>${escapeXML(claim.provider?.clinicianID)}</LicenseNumber>
        <Name>${escapeXML(claim.provider?.clinicianName || 'DOCTOR NAME')}</Name>
      </Physician>
      
      <Diagnoses>
${diagnosesXML}
      </Diagnoses>
      
      <Services>
${servicesXML}
      </Services>
      
      <TotalAmount currency="AED">${claimTotal}</TotalAmount>
    </Claim>`;
}

/**
 * Download XML file (browser)
 */
function downloadXML(xmlContent, filename, region = 'abudhabi') {
    const blob = new Blob([xmlContent], { type: 'application/xml' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.href = url;
    link.download = filename || `claim_${region}_${Date.now()}.xml`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

// Export functions
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        formatUAEDate,
        formatUAEDateOnly,
        escapeXML,
        generateClaimID,
        generateShafafiyaXML,
        generateEClaimLinkXML,
        downloadXML
    };
}
