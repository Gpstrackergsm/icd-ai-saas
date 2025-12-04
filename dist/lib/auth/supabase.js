"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.supabase = void 0;
const supabase_js_1 = require("@supabase/supabase-js");
const supabaseUrl = process.env.SUPABASE_URL || 'https://zccvoszbsvviovarkjbf.supabase.co';
const supabaseKey = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpjY3Zvc3pic3Z2aW92YXJramJmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ4MjMzNjksImV4cCI6MjA4MDM5OTM2OX0.q-7noMVvDzuRtyAT3QeWk5DjYnp28v_LU9C2QKBUKuA';
exports.supabase = (0, supabase_js_1.createClient)(supabaseUrl, supabaseKey);
