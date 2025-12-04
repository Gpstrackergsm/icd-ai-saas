"use strict";
const test = "Nephropathy/CKD";
const lc = test.toLowerCase();
console.log('Test string:', test);
console.log('lc:', lc);
console.log('includes nephropathy:', lc.includes('nephropathy'));
console.log('includes ckd:', lc.includes('ckd'));
console.log('includes ckd && !includes nephropathy:', lc.includes('ckd') && !lc.includes('nephropathy'));
// Better approach: check if it's ONLY nephropathy (no CKD mention)
const isOnlyNephropathy = lc.includes('nephropathy') && !lc.includes('ckd');
console.log('isOnlyNephropathy:', isOnlyNephropathy);
