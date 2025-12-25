# UAE Engine - 3-Layer Certification Gate

## Overview
The UAE medical coding engine is protected by a mandatory 3-layer certification gate. **NO deployment, NO merge, NO rule change** without passing all layers.

---

## Layer 1: CI Certification Gate (MANDATORY)

### What It Does
- Runs 100 adversarial test cases automatically on every PR and push to `main`
- **Blocks merge** on any failure
- **Blocks deployment** on any failure
- No bypass flags, no conditional skips, no "allow_failure"

### Workflow
- **File:** `.github/workflows/uae-certification.yml`
- **Trigger:** PR to main, push to main
- **Command:** `npm run test:uae-cert`
- **Result:** Exit code 1 = hard block

### Branch Protection
Main branch requires:
- ✅ UAE Certification check must pass
- ✅ No "merge without checks" allowed

---

## Layer 2: Production Replay Verification

### What It Does
- Tests all 100 certification cases against **LIVE production** endpoint
- Runs in BOTH UAE and USA modes
- Verifies exact matches with expected outcomes

### How to Run
```bash
npm run test:uae-prod-replay
```

### Assertions Per Case
- ✅ `decisionState` matches expected
- ✅ `reasonType` (if AUTO_CODE) is one of 3 allowed types
- ✅ No extra codes
- ✅ No missing codes
- ✅ Market isolation (UAE rules NEVER trigger in USA)

### Success Criteria
**PRODUCTION REPLAY: 100/100 MATCHED**

Any mismatch → Exit code 1 → Investigation required

---

## Layer 3: Drift Protection (Rule Freeze)

### What It Does
- Detects changes to UAE logic files
- Triggers certification automatically
- Requires explicit code owner approval

### Protected Files
```
/lib/uae-market-rules.js
/lib/uae/*
/lib/uae/featureFlags.js
/lib/uae/testOverrideRules.js
/test/uae_audit_certification_suite.js
```

### Workflow
- **File:** `.github/workflows/uae-drift-protection.yml`
- **Trigger:** PR with changes to UAE files
- **CODEOWNERS:** Explicit approval required

### Demonstration
✅ **Passing change:** Certification runs, 100/100, merge allowed  
❌ **Failing change:** Certification fails, merge blocked

---

## Absolute Prohibitions

❌ **DO NOT** add new inference rules  
❌ **DO NOT** expand coverage  
❌ **DO NOT** "improve accuracy"  
❌ **DO NOT** touch USA logic  
❌ **DO NOT** weaken negation, temporality, or uncertainty guards  
❌ **DO NOT** add shortcuts

**This is about CERTIFICATION, not features.**

---

## Files Created

1. **CI Workflow:** `.github/workflows/uae-certification.yml`
2. **Drift Protection:** `.github/workflows/uae-drift-protection.yml`
3. **Production Replay:** `test/test_uae_cert_prod_replay.js`
4. **Code Owners:** `CODEOWNERS`
5. **Documentation:** `test/UAE_CERTIFICATION_GATE.md` (this file)

---

## Success Definition

The 3-layer gate is **COMPLETE** when:

✅ CI blocks merges on UAE failure  
✅ Production replay matches 100/100  
✅ UAE logic cannot drift without detection

**Status:** ACTIVE AND ENFORCED
