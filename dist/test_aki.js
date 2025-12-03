"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const renalResolver_1 = require("./lib/renalResolver");
const text = "67-year-old female patient admitted with acute exacerbation of congestive heart failure and acute kidney injury";
console.log('Testing Renal Resolver for AKI Detection\n');
console.log('Input:', text);
console.log('\nResult:', JSON.stringify((0, renalResolver_1.resolveRenal)(text), null, 2));
