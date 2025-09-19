const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Create a client with service role key for admin operations
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

async function addJoinCodeColumn() {
  try {
    console.log('🔄 Adding join_code column to games table...');
    
    // First, let's check current table structure
    console.log('📋 Checking current table structure...');
    
    const { data: currentGames, error: selectError } = await supabaseAdmin
      .from('games')
      .select('*')
      .limit(1);
    
    if (selectError) {
      console.error('❌ Error accessing games table:', selectError.message);
      return;
    }
    
    console.log('✅ Current games table columns:', currentGames[0] ? Object.keys(currentGames[0]) : 'No records');
    
    // Check if join_code already exists
    if (currentGames[0] && 'join_code' in currentGames[0]) {
      console.log('✅ join_code column already exists!');
      return;
    }
    
    console.log('🔧 Adding join_code column...');
    
    // Use the SQL editor approach - this requires manual execution
    const sqlCommands = [
      'ALTER TABLE games ADD COLUMN join_code VARCHAR(10);',
      'CREATE UNIQUE INDEX idx_games_join_code_unique ON games(join_code) WHERE join_code IS NOT NULL;',
      'COMMENT ON COLUMN games.join_code IS \'Unique code for participants to join private games\';'
    ];
    
    console.log('📝 SQL commands to execute:');
    sqlCommands.forEach((cmd, index) => {
      console.log(`${index + 1}. ${cmd}`);
    });
    
    console.log('\n⚠️  Please execute these SQL commands manually in your Supabase SQL editor:');
    console.log('1. Go to your Supabase dashboard');
    console.log('2. Navigate to SQL Editor');
    console.log('3. Execute the above commands one by one');
    console.log('\nAlternatively, you can run them all at once:');
    console.log('\n' + sqlCommands.join('\n'));
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

addJoinCodeColumn();