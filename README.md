# icd-ai-saas
ICD-10-CM Smart Search and Coding Engine

## Features

- **ICD-10-CM 2025 Diagnosis Coding** - Deterministic, audit-defensible diagnosis detection
- **Manifestation Linking** - Automatic combination codes (Diabetes+CKD, COPD+Respiratory Failure)
- **POA Detection** - Present on Admission status using clinical intent classification
- **UAE Export (MVP)** - Diagnosis-only Shafafiya XML v2.0 skeleton export

## UAE MVP: Diagnosis-only Shafafiya Export

**Status:** Production Ready  
**Test Coverage:** 12/12 passing (100%)

### Modules

- `lib/uae/export.js` - UAE metadata wrapper & export status validation
- `lib/uae/shafafiyaXml.js` - Shafafiya XML v2.0 skeleton generator (diagnosis-only)
- `lib/uae/normalize.js` - UAE abbreviation normalizer (SOB, CAP, AECB, AKI, MI, etc.)
- `api/demo/uae.js` - Public UAE demo endpoint

### Usage

```javascript
POST /api/demo/uae
{
  "text": "Patient presenting with AECB and SOB",
  "metadata": {
    "facilityId": "FAC001",
    "payerId": "DHA001",
    "encounterId": "ENC123",
    "providerId": "PRV456",
    "patientId": "PAT789",
    "encounterDate": "2025-01-15"
  }
}
```

**Response includes:**
- Standard ICD-10-CM audit engine output (unchanged)
- UAE export payload with metadata
- Shafafiya XML v2.0 skeleton

**MVP Disclaimer:** Diagnosis-only export. Procedures/DRG/NCCI not included in MVP.

### Non-Modifying Adapter Layer

UAE modules sit ABOVE existing Levels 0-5. Existing diagnosis coding logic is **100% preserved** and unchanged.
