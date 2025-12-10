import { SequencedCode } from '../rulesEngine';

export interface ValidationRuleResult {
  ruleId: string;
  valid: boolean;
  level: 'error' | 'warning';
  message: string;
}

export type ValidationRule = (codes: SequencedCode[], context?: any) => ValidationRuleResult | null;

// Helper functions
const hasCode = (codes: SequencedCode[], prefix: string) => codes.some(c => c.code.startsWith(prefix));
const hasRange = (codes: SequencedCode[], prefix: string) => codes.some(c => c.code.startsWith(prefix));
const getCode = (codes: SequencedCode[], prefix: string) => codes.find(c => c.code.startsWith(prefix));

export const highRiskRules: ValidationRule[] = [
  // 1. External Cause Codes
  // EXT-001: External Cause Never Principal
  (codes) => {
    if (codes.length === 0) return null;
    const pdx = codes[0];
    if (pdx.code >= 'V00' && pdx.code <= 'Y99') {
      return {
        ruleId: 'EXT-001',
        valid: false,
        level: 'error',
        message: `External Cause code (${pdx.code}) cannot be Principal Diagnosis. Sequence the injury first.`
      };
    }
    return null;
  },

  // EXT-002: Place of Occurrence Frequency Limit
  (codes) => {
    const y92 = codes.find(c => c.code.startsWith('Y92'));
    if (!y92) return null;
    
    // Check if ANY injury code has 7th char 'A'
    const hasInitial = codes.some(c => {
       const clean = c.code.replace('.', '');
       return (c.code.startsWith('S') || c.code.startsWith('T')) && clean.length >= 7 && clean.endsWith('A');
    });

    if (!hasInitial) {
        // Technically Y92 can be used on subsequent if new injury, but standard rule is Initial only.
        // If NO initial encounter injury exists, flag it.
         return {
            ruleId: 'EXT-002',
            valid: false,
            level: 'warning', // Warning because sometimes policy differs
            message: `Place of occurrence code (${y92.code}) typically only reported on initial encounter (7th char A).`
         };
    }
    return null;
  },

  // 2. Sepsis
  // SEP-001: Severe Sepsis Sequencing Restriction
  (codes) => {
    if (codes.length === 0) return null;
    const pdx = codes[0];
    if (pdx.code === 'R65.20' || pdx.code === 'R65.21') {
      return {
        ruleId: 'SEP-001',
        valid: false,
        level: 'error',
        message: `Severe Sepsis (${pdx.code}) can never be Principal Diagnosis. Sequence the underlying infection first.`
      };
    }
    return null;
  },

  // SEP-002: Urosepsis Invalid Code (Requires Text Context)
  (codes, context) => {
      // If we don't have text context, skip
      if (!context || !context.text) return null;
      const textLower = context.text.toLowerCase();
      
      if (textLower.includes('urosepsis')) {
          const hasSepsis = hasRange(codes, 'A40') || hasRange(codes, 'A41');
          const hasUTI = hasCode(codes, 'N39.0');
          
          if (hasUTI && !hasSepsis) {
              return {
                  ruleId: 'SEP-002',
                  valid: false,
                  level: 'warning',
                  message: `Term 'Urosepsis' is ambiguous. If Sepsis is clinically confirmed, assign A41.9 + N39.0. If only UTI, document 'UTI'.`
              };
          }
      }
      return null;
  },

  // 3. Diabetes & CKD
  // DM-001: Diabetes + CKD Combined Coding
  (codes) => {
      if (hasCode(codes, 'E11.9') && hasRange(codes, 'N18')) {
          return {
              ruleId: 'DM-001',
              valid: false,
              level: 'error',
              message: `Link Diabetes and CKD. Replace E11.9 with E11.22 when N18.x is present.`
          };
      }
      return null;
  },

  // DM-002: Type 1 vs Type 2 Specifier
  (codes) => {
      if (hasRange(codes, 'E10') && hasRange(codes, 'E11')) {
           return {
              ruleId: 'DM-002',
              valid: false,
              level: 'error',
              message: `Cannot code Type 1 (E10) and Type 2 (E11) diabetes on the same record.`
          };
      }
      return null;
  },

  // 4. CKD & HTN
  // CKD-001: Hypertensive CKD Linkage
  (codes) => {
      if (hasCode(codes, 'I10') && hasRange(codes, 'N18')) {
           return {
              ruleId: 'CKD-001',
              valid: false,
              level: 'error',
              message: `Use I12.x for Hypertensive CKD. Replace I10 with I12.9 (or I12.0 if Stage 5/ESRD).`
          };
      }
      return null;
  },

  // CKD-002: The Triple Threat
  (codes) => {
      if (hasCode(codes, 'I10') && hasRange(codes, 'I50') && hasRange(codes, 'N18')) {
           return {
              ruleId: 'CKD-002',
              valid: false,
              level: 'error',
              message: `Use I13.x (Hypertensive Heart & CKD) when HTN (I10), Heart Failure (I50), and CKD (N18) are all present.`
          };
      }
      return null;
  },

  // 5. Pregnancy
  // PREG-001: Trimester Specificity
  (codes, context) => {
      // Assuming 'Inpatient' context or just warning generally
      const isObs = codes.some(c => c.code.startsWith('O'));
      if (!isObs) return null;

      const unspecifiedTrimesterMap: Record<string, boolean> = {
         // Codes ending in 0 or 9 for trimester
         // This is complex to list all. Simplified check for high value codes.
         'O14.00': true, 'O14.10': true, 'O14.90': true, 
         'O10.019': true, 'O10.919': true // etc
      };
      
      // General logic: 5th or 6th char is 0 or 9 usually denotes unspecified trimester in O codes
      const unspecified = codes.find(c => {
          if (!c.code.startsWith('O')) return false;
          // Many O codes: Oxx.xXA ...
          // e.g. O14.00
          const parts = c.code.split('.');
          if (parts.length < 2) return false;
          const suffix = parts[1];
          // Check specific identified patterns or just blacklist specific codes
          return unspecifiedTrimesterMap[c.code];
      });

      if (unspecified) {
           return {
              ruleId: 'PREG-001',
              valid: false,
              level: 'error',
              message: `Obstetrics code ${unspecified.code} has unspecified trimester. Use specific trimester code.`
          };
      }
      return null;
  },

  // PREG-002: Normal Delivery Exclusivity
  (codes) => {
      if (hasCode(codes, 'O80')) {
          // Check for other Chapter 15 codes (O00-O9A) excluding Z37
          const otherOCode = codes.find(c => c.code.startsWith('O') && c.code !== 'O80');
          if (otherOCode) {
               return {
                  ruleId: 'PREG-002',
                  valid: false,
                  level: 'error',
                  message: `O80 (Normal Delivery) cannot be used with other pregnancy complications (${otherOCode.code}). Remove O80.`
              };
          }
      }
      return null;
  },

  // 6. Sequencing
  // SEQ-001: Manifestation Code Never Principal
  (codes) => {
      if (codes.length === 0) return null;
      const pdx = codes[0];
      const manifestations = ['F02', 'G21', 'I32', 'N16', 'B95', 'B96', 'B97']; // Add more as needed
      if (manifestations.some(prefix => pdx.code.startsWith(prefix))) {
           return {
              ruleId: 'SEQ-001',
              valid: false,
              level: 'error',
              message: `Code ${pdx.code} is a Manifestation code and cannot be Principal. Sequence underlying condition first.`
          };
      }
      return null;
  },

  // 7. Laterality
  // LAT-001: Laterality Required
  (codes) => {
     // Focus on S-codes, M-codes, C50, C34
     const needsLat = ['C50', 'C34', 'S42', 'S52', 'S72', 'S82', 'L89']; 
     const unspecifiedSideCodes = codes.filter(c => {
         const match = needsLat.some(prefix => c.code.startsWith(prefix));
         if (!match) return false;
         // Heuristic: Usually '0' or '9' in code indicates unspecified side
         // BUT it varies wildy. 
         // Most accurate: check Label text for "unspecified side"
         return c.label.toLowerCase().includes('unspecified side') || 
                (c.label.toLowerCase().includes('unspecified') && !c.label.toLowerCase().includes('left') && !c.label.toLowerCase().includes('right'));
     });

     if (unspecifiedSideCodes.length > 0) {
          return {
              ruleId: 'LAT-001',
              valid: false,
              level: 'warning', // Warning as sometimes side is truly unknown
              message: `Laterality unspecified for: ${unspecifiedSideCodes.map(c => c.code).join(', ')}. Please specify Right, Left, or Bilateral.`
          };
     }
     return null;
  },

  // 8. General High Risk
  // INJ-001: 7th Character Active Treatment
  (codes, context) => {
      if (context && context.isAftercare) { // Assuming context has this flag or we check Z-codes?
        // Or check text:
        const text = context.text ? context.text.toLowerCase() : '';
        const isAftercare = text.includes('aftercare') || text.includes('follow-up') || text.includes('cast removal');
        
        if (isAftercare) {
             const badInjuries = codes.filter(c => {
                 const clean = c.code.replace('.','');
                 return (c.code.startsWith('S') || c.code.startsWith('T')) && clean.length >= 7 && clean.endsWith('A');
             });
             
             if (badInjuries.length > 0) {
                 return {
                    ruleId: 'INJ-001',
                    valid: false,
                    level: 'error',
                    message: `Encounter is Aftercare/Follow-up, but codes ${badInjuries.map(c=>c.code).join(', ')} use 7th char 'A' (Active). Use 'D' (Subsequent).`
                };
             }
        }
      }
      return null;
  },

  // NEO-001: Secondary Malignancy Needs Primary
  (codes) => {
      const secondary = codes.filter(c => c.code.startsWith('C78') || c.code.startsWith('C79'));
      if (secondary.length > 0) {
          // Check for Primary (C00-C75, C81+) OR History (Z85)
          const hasPrimary = codes.some(c => (c.code >= 'C00' && c.code <= 'C75') || (c.code >= 'C81' && c.code <= 'C96') || c.code === 'C80.1');
          const hasHistory = codes.some(c => c.code.startsWith('Z85'));
          
          if (!hasPrimary && !hasHistory) {
               return {
                  ruleId: 'NEO-001',
                  valid: false,
                  level: 'error',
                  message: `Secondary malignancy (${secondary[0].code}) requires a Primary site code or Z85 personal history code.`
              };
          }
      }
      return null;
  },

  // OB-002: Outcome of Delivery Required
  (codes) => {
      const isDelivery = codes.some(c => c.code >= 'O80' && c.code <= 'O82'); // Simplification
      const hasZ37 = codes.some(c => c.code.startsWith('Z37'));
      
      if (isDelivery && !hasZ37) {
           return {
              ruleId: 'OB-002',
              valid: false,
              level: 'error',
              message: `Delivery encounters require a Z37.x code to indicate the outcome of delivery.`
          };
      }
      return null;
  }
];
