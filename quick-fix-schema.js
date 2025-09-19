const { supabase } = require('./server-organizer/config/supabase');

async function fixSchema() {
  console.log('Attempting to fix database schema...');
  
  try {
    // Try to query the games table to see current structure
    console.log('Checking current games table structure...');
    const { data: games, error: gamesError } = await supabase
      .from('games')
      .select('*')
      .limit(1);
    
    if (gamesError) {
      console.log('Games table error:', gamesError.message);
    } else {
      console.log('Games table accessible. Sample record keys:', games[0] ? Object.keys(games[0]) : 'No records');
    }
    
    // Check if we can access users table to get an organizer
    console.log('Checking for organizer users...');
    const { data: organizers, error: orgError } = await supabase
      .from('users')
      .select('id, email, role')
      .eq('role', 'organizer')
      .limit(1);
    
    if (orgError) {
      console.log('Users table error:', orgError.message);
    } else {
      console.log('Found organizers:', organizers.length);
      if (organizers.length > 0) {
        console.log('Sample organizer:', organizers[0]);
      }
    }
    
    console.log('\n=== MANUAL STEPS REQUIRED ===');
    console.log('1. Open your Supabase SQL Editor');
    console.log('2. Run this SQL command:');
    console.log('   ALTER TABLE games ADD COLUMN organizer_id UUID;');
    console.log('3. Then run:');
    console.log('   ALTER TABLE games ADD CONSTRAINT fk_games_organizer FOREIGN KEY (organizer_id) REFERENCES users(id);');
    console.log('4. Update existing games with an organizer_id');
    console.log('5. Make the column NOT NULL:');
    console.log('   ALTER TABLE games ALTER COLUMN organizer_id SET NOT NULL;');
    
  } catch (error) {
    console.error('Error:', error);
  }
}

fixSchema().then(() => {
  console.log('\nSchema check completed.');
  process.exit(0);
}).catch(err => {
  console.error('Failed:', err);
  process.exit(1);
});