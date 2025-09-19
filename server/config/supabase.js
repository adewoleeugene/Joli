const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Supabase configuration
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
  throw new Error('Missing Supabase environment variables');
}

// Client for public operations (with RLS)
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Service-role client for server-side operations (bypasses RLS)
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Initialize Supabase connection
const connectSupabase = async () => {
  try {
    // Test the connection
    const { data, error } = await supabaseAdmin.from('users').select('count').limit(1);
    
    if (error && error.code !== 'PGRST116') { // PGRST116 is "relation does not exist" which is expected initially
      console.warn('Supabase connection warning:', error.message);
    }
    
    console.log('Supabase initialized successfully');
    console.log('Environment:', process.env.NODE_ENV || 'development');
    
    return { supabase, supabaseAdmin };
  } catch (error) {
    console.error('Supabase initialization failed:', error.message);
    throw error;
  }
};

module.exports = {
  supabase,
  supabaseAdmin,
  connectSupabase
};