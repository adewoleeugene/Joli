const { createClient } = require('@supabase/supabase-js');

// Supabase configuration
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing required Supabase environment variables');
}

// Client for user operations (uses anon key)
const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: false, // Server-side doesn't need session persistence
    detectSessionInUrl: false
  },
  db: {
    schema: 'public'
  },
  global: {
    headers: {
      'X-Client-Info': 'server-shared'
    }
  }
});

// Service-role client for privileged operations
const supabaseAdmin = supabaseServiceKey ? createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  },
  db: {
    schema: 'public'
  },
  global: {
    headers: {
      'X-Client-Info': 'server-shared-service'
    }
  }
}) : null;

// Test connection function
const connectSupabase = async () => {
  try {
    console.log('Testing Supabase connection...');
    
    // Test basic connection
    const { data, error } = await supabase
      .from('users')
      .select('count')
      .limit(1);
    
    if (error) {
      console.error('Supabase connection test failed:', error.message);
      return false;
    }
    
    console.log('✅ Supabase connection successful');
    
    // Test service-role connection if available
    if (supabaseAdmin) {
      const { data: adminData, error: adminError } = await supabaseAdmin
        .from('users')
        .select('count')
        .limit(1);
      
      if (adminError) {
        console.warn('⚠️ Supabase service-role connection failed:', adminError.message);
      } else {
        console.log('✅ Supabase service-role connection successful');
      }
    }
    
    return true;
  } catch (error) {
    console.error('Supabase connection error:', error);
    return false;
  }
};

// Helper function to handle Supabase errors
const handleSupabaseError = (error) => {
  console.error('Supabase error:', error);
  
  // Map common Supabase errors to user-friendly messages
  const errorMap = {
    'PGRST116': 'Resource not found',
    'PGRST301': 'Invalid request format',
    '23505': 'Duplicate entry',
    '23503': 'Referenced record not found',
    '42501': 'Insufficient permissions'
  };
  
  const code = error.code || error.error_code;
  return errorMap[code] || error.message || 'An unexpected error occurred';
};

// Export clients and utilities
module.exports = {
  supabase,
  supabaseAdmin,
  connectSupabase,
  handleSupabaseError
};