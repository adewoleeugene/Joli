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

// Simple in-memory schema state flags
const schemaState = {
  hasVisibilityColumn: null,
  lastCheckedAt: null
};

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

// Detect whether events.visibility column exists (without crashing the app)
async function checkVisibilitySchema() {
  try {
    const { error } = await supabaseAdmin.from('events').select('visibility').limit(1);
    if (error) {
      // PostgREST returns a descriptive error if column doesn't exist
      schemaState.hasVisibilityColumn = false;
      schemaState.lastCheckedAt = new Date();
      console.warn('[Schema] events.visibility is missing. The application will gracefully default to public visibility and ignore visibility filters.');
      console.warn('[Schema] To add it, run this SQL in Supabase SQL editor:');
      console.warn("ALTER TABLE public.events ADD COLUMN IF NOT EXISTS visibility TEXT NOT NULL DEFAULT 'public';");
      console.warn("DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'events_visibility_check') THEN ALTER TABLE public.events ADD CONSTRAINT events_visibility_check CHECK (visibility IN ('public','private','unlisted')); END IF; END $$;");
      return false;
    }
    schemaState.hasVisibilityColumn = true;
    schemaState.lastCheckedAt = new Date();
    console.log('[Schema] events.visibility detected. Visibility filtering and access rules enabled.');
    return true;
  } catch (e) {
    // Network or unexpected error
    schemaState.hasVisibilityColumn = false;
    schemaState.lastCheckedAt = new Date();
    console.error('[Schema] Visibility schema check failed:', e.message);
    return false;
  }
}

function visibilityColumnSupported() {
  return schemaState.hasVisibilityColumn === true;
}

module.exports = {
  supabase,
  supabaseAdmin,
  connectSupabase,
  checkVisibilitySchema,
  visibilityColumnSupported
};