
import { resolveTrauma } from './lib/traumaResolver';

const text = "Fall from bed and severe sepsis with acute kidney failure in 45-year-old Male";
console.log("Analyzing:", text);

const result = resolveTrauma(text);
console.log("Result:", JSON.stringify(result, null, 2));
