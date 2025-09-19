const { connectSupabase } = require('./supabase');

const connectDB = async () => {
  try {
    const { supabase, supabaseAdmin } = await connectSupabase();
    
    // Make Supabase clients globally available
    global.supabase = supabase;
    global.supabaseAdmin = supabaseAdmin;
    
    console.log('Database connection established successfully');
  } catch (error) {
    console.error('Database connection failed:', error.message);
    process.exit(1);
  }
};

module.exports = connectDB;