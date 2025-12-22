const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_KEY || '';

if (!supabaseUrl || !supabaseKey) {
    console.warn('SUPABASE_URL or SUPABASE_KEY not set. Authentication will not work.');
}

const supabase = createClient(supabaseUrl, supabaseKey);

module.exports = { supabase };
