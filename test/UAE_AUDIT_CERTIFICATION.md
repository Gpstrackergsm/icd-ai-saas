# UAE Audit Certification Suite

## Overview
The UAE Audit Certification Suite is a **mandatory deployment gate** consisting of 100 adversarial test cases. **Any single failure blocks deployment.**

## Test Distribution

| Category | Count | Purpose |
|----------|-------|---------|
| **A) Negative/Refusal** | 40 | Labs only, imaging only, medications only, vitals only, unapproved procedures → Must AUTO_EXCLUDE |
| **B) Positive/Allowed** | 30 | Diagnostic tests (positive, with context), approved procedures (I&D, Dialysis) → Must AUTO_CODE |
| **C) Adversarial Edge** | 20 | Conflicting signals, ambiguous wording, tricks intended to fool inference → Must handle correctly |
| **D) Jurisdiction Isolation** | 10 | Same narrative in UAE vs USA mode → UAE allows override, USA does not |
| **TOTAL** | **100** | **PASS REQUIRED FOR DEPLOYMENT** |

## Running Tests

```bash
# Run certification suite
npm run test:uae-cert

# Suite exits 0 on 100/100 pass
# Suite exits 1 on any failure (blocks CI/CD)
```

## CI Integration

The suite is wired into GitHub Actions:
- **File:** `.github/workflows/uae-certification.yml`
- **Trigger:** Push to `main`, `develop`, or any PR
- **Behavior:** Non-zero exit blocks merge and deployment

## Success Criteria

✅ **100/100 tests PASS**  
✅ **Zero false positives**  
✅ **USA mode unaffected** (jurisdiction isolation)  
✅ **Deterministic results** (same input = same output)  
✅ **Full audit trail** for every AUTO_CODE

## Failure Policy

**ANY FAILURE = DEPLOY BLOCK (NON-NEGOTIABLE)**

When a test fails:
1. CI exits with status 1
2. Merge is blocked
3. Deployment is blocked
4. Failing test ID and violation are logged

**No exceptions. No bypasses.**

## Allowed reasonType Values

AUTO_CODE is ONLY allowed for diagnoses with one of these reasonTypes:
- `EXPLICIT_PROVIDER_DX`
- `POSITIVE_NAMED_DIAGNOSTIC_TEST`  
- `APPROVED_PROCEDURE_IMPLIED_DX`

Any other reasonType → FAIL

## Test Structure

Every test asserts:
- `decisionState` matches expected (AUTO_CODE or AUTO_EXCLUDE)
- `reasonType` is present AND in allowed list (if AUTO_CODE)
- `reason` text references exact phrase from input
- No secondary codes unless explicitly justified
- Debug metadata includes correct market (UAE or USA)

## File Location

**Test Suite:** `test/uae_audit_certification_suite.js`  
**CI Config:** `.github/workflows/uae-certification.yml`  
**package.json:** Contains `test:uae-cert` script

---

**STATUS:** MANDATORY DEPLOYMENT GATE  
**ENFORCEMENT:** 100% PASS REQUIRED
