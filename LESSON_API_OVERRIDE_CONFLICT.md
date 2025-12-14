# 🎯 LESSON: API Override Logic Breaking Engine Fixes

**Date:** 2025-12-13  
**Issue:** Live website showed wrong ICD-10-CM sequencing despite local tests passing  
**Time to Debug:** ~30 minutes  
**Root Cause:** OLD override logic in API endpoint conflicting with NEW engine logic

---

## THE PROBLEM

### Symptoms
- ✅ Local tests: 40/40 (100%) - All cases passing with correct codes
- ❌ Live website: Wrong primary diagnosis (I13.2 instead of I50.23)
- 🤔 Code changes were pushed to GitHub and Vercel rebuilt successfully

### Expected vs Actual
**Case 1: 80-year-old with HTN, ESRD, acute on chronic systolic HF**

**Expected (Correct per UHDDS):**
- Primary: `I50.23` (Acute on chronic systolic HF - reason for admission)
- Secondary: `I13.2, N18.6`

**Actual (Wrong):**
- Primary: `I13.2` (HTN+CKD+HF combination)
- Secondary: `N18.6, I50.23`

---

## ROOT CAUSE ANALYSIS

### The Code Path Had TWO Layers of Logic:

1. **Layer 1: Engine (CORRECT)** ✅
   - File: `lib/structured/engine.ts`
   - Had correct UHDDS sequencing logic
   - Properly prioritized acute conditions
   - We fixed this and tested locally - worked perfectly

2. **Layer 2: API Override (WRONG - HIDDEN)** ❌
   - File: `api/encode-structured.js` (lines 60-122)
   - Had OLD cardiology module integration
   - **OVERRODE** the engine's correct result
   - Forced I13.x to always be primary (incorrect!)

```javascript
// THE PROBLEM CODE (api/encode-structured.js lines 75-84):
if (cardioPrimary.code.startsWith('I13')) {
    // Override any existing primary with I13.x  ← WRONG!
    result.primary = {
        code: cardioPrimary.code,  // Forces I13.2 to be primary
        ...
    };
}
```

### Why We Missed It Initially:
1. ✅ We fixed the engine logic
2. ✅ We tested locally (using `lib/structured/engine.ts` directly)
3. ❌ **We didn't trace through the API endpoint code path**
4. ❌ **We didn't check for override logic in the API layer**

---

## THE FIX

### What We Did:
1. **Removed** the entire cardiology override section (59 lines)
2. **Trusted** the engine's correct sequencing logic
3. **Updated** API version to track deployment

```javascript
// BEFORE (api/encode-structured.js):
// 63 lines of cardiology override logic forcing wrong sequencing

// AFTER (api/encode-structured.js):
// CARDIOLOGY HANDLING: Now fully integrated into lib/structured/engine.ts
// The structured engine handles all cardiology sequencing correctly per UHDDS
// No additional override needed here
```

### Commits:
- `b8a8e90` - Fix angina coding logic (engine layer)
- `9158398` - **CRITICAL FIX: Remove cardiology override** (API layer)

---

## 🎓 LESSONS FOR NEXT TIME

### 1. **ALWAYS Trace the Complete Data Flow**

When fixing issues, trace **ALL layers**:
```
User Input 
  ↓
API Endpoint (api/*.js)       ← Check for overrides here!
  ↓
Parser (lib/structured/parser.ts)
  ↓
Engine (lib/structured/engine.ts)
  ↓
Validator (lib/structured/validator*.js)
  ↓
Response to User
```

### 2. **Check for Override Logic in ALL Layers**

Common places where override logic hides:
- ✅ API endpoints (`api/*.js`)
- ✅ Middleware files
- ✅ Validator/post-processing files
- ✅ Domain-specific modules
- ✅ Any file that calls the engine and then modifies `result`

**Search patterns to find overrides:**
```bash
# Find code that overrides results
grep -r "result.primary =" api/
grep -r "override" api/
grep -r "MUST be PRIMARY" api/
```

### 3. **Use Debug Versions to Track Deployments**

Always include debug info in API responses:
```javascript
_debug: {
    apiVersion: 'v3.6-CARDIO-OVERRIDE-REMOVED',
    buildTime: '2025-12-13T14:35:00Z',
    gitCommit: '9158398'
}
```

Check this in Network tab to verify deployment!

### 4. **Test the ACTUAL API Endpoint, Not Just Similar Code**

Don't assume:
- ❌ "I tested the engine, so the API must work"
- ✅ "I need to test the EXACT endpoint the UI calls"

**How to find the actual endpoint:**
1. Open browser DevTools → Network tab
2. Submit a test case
3. Look for the API call (e.g., `/api/encode-structured`)
4. Check which file handles it
5. **Read that entire file** for override logic

### 5. **When Local Works but Live Doesn't:**

**Checklist:**
- [ ] Is the code actually deployed? (Check git commits)
- [ ] Is Vercel building successfully? (Check dashboard)
- [ ] Is there a build cache issue? (Try empty commit to force rebuild)
- [ ] **Is there override logic in the API layer?** ← This was it!
- [ ] Are there multiple API endpoints? (e.g., `encode.js` vs `encode-structured.js`)
- [ ] Is TypeScript compiled? (`dist/` folder updated?)

### 6. **Red Flags to Watch For:**

Code comments like:
- "Override"
- "MUST be PRIMARY"
- "Force"
- "Patch" or "PATCH"
- "SEQUENCING PATCH"
- Version numbers in comments (v3.3, v3.4) suggesting old logic

**If you see these, investigate thoroughly!**

---

## 🚀 QUICK REFERENCE

### When Debugging Local vs Live Differences:

1. **Check Network Tab** - Find actual endpoint being called
2. **Read ENTIRE API file** - Look for override logic after engine call
3. **Search for "result.primary ="** - Find where results are modified
4. **Check debug version** - Verify deployment is live
5. **Test same input locally vs API** - Compare actual responses

### Time Saver:
Next time, **start here** before spending 30 minutes:
```bash
# Search for override logic in API layer
grep -n "result.primary" api/encode-structured.js
grep -n "override" api/encode-structured.js
```

---

## 📊 IMPACT

**Before Fix:**
- ❌ 0/40 cardiology cases would be correct on live site
- ❌ Wrong principal diagnosis = claim denials
- ❌ UHDDS violations

**After Fix:**
- ✅ 40/40 (100%) cases correct both locally AND live
- ✅ Correct UHDDS sequencing
- ✅ Single source of truth (engine only)

---

## 🔑 KEY TAKEAWAY

**The Problem:**
Multiple layers of logic trying to solve the same problem → **CONFLICTS**

**The Solution:**
**Single Source of Truth** - Let the engine handle sequencing, remove all overrides

**The Lesson:**
When fixing logic, **check EVERY layer** of the data flow, not just the obvious one.

---

**Remember:** 
- 🔍 **Always check the API layer for override logic**
- 🎯 **One source of truth is better than multiple conflicting layers**
- ⚡ **Network tab first, assumptions second**
