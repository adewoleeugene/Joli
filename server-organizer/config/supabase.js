const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

// Supabase configuration
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
  console.warn('Warning: Missing Supabase environment variables. Using mock configuration.');
  // Use mock configuration for development
  const mockSupabase = {
    from: () => ({
      select: () => ({ single: () => Promise.resolve({ data: null, error: { code: 'PGRST116' } }) }),
      insert: () => ({ select: () => ({ single: () => Promise.resolve({ data: { id: 'mock-id' }, error: null }) }) }),
      update: () => ({ eq: () => ({ select: () => ({ single: () => Promise.resolve({ data: { id: 'mock-id' }, error: null }) }) }) }),
      delete: () => ({ eq: () => Promise.resolve({ error: null }) }),
      eq: function() { return this; },
      limit: function() { return this; },
      range: function() { return this; },
      order: function() { return this; },
      ilike: function() { return this; }
    }),
    auth: {
      getUser: () => Promise.resolve({ data: { user: null }, error: { message: 'Mock auth' } }),
      // Provide a stub to avoid runtime errors if called in mock mode
      signInWithPassword: async ({ email }) => ({ data: { session: { access_token: `dev|mock-user|${email}` } }, error: null })
    }
  };
  
  module.exports = {
    supabase: mockSupabase,
    supabaseAdmin: mockSupabase,
    connectSupabase: () => Promise.resolve(),
    isMockSupabase: true
  };
  return;
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
  connectSupabase,
  isMockSupabase: false
};