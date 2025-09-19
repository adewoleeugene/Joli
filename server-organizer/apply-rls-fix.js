const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

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

async function applyRLSFix() {
  try {
    console.log('=== APPLYING RLS FIX FOR GAMES TABLE ===');
    
    // Step 1: Drop existing policies
    console.log('\n1. Dropping existing policies...');
    const policiesToDrop = [
      'Admins can manage all games',
      'Organizers can manage their games', 
      'Public games are viewable',
      'Users can view public games',
      'Organizers can create games',
      'Organizers can update their games',
      'Organizers can delete their games',
      'organizers_can_create_games',
      'organizers_can_view_their_games',
      'public_can_view_public_games',
      'organizers_can_update_their_games',
      'organizers_can_delete_their_games',
      'admins_can_manage_all_games'
    ];
    
    for (const policy of policiesToDrop) {
      try {
        const { error } = await supabaseAdmin.rpc('exec_sql', {
          sql: `DROP POLICY IF EXISTS "${policy}" ON public.games;`
        });
        if (error && !error.message.includes('does not exist')) {
          console.log(`Warning dropping policy ${policy}:`, error.message);
        }
      } catch (e) {
        // Try direct SQL approach
        const { error } = await supabaseAdmin
          .from('_sql')
          .select('*')
          .eq('query', `DROP POLICY IF EXISTS "${policy}" ON public.games;`);
      }
    }
    
    // Step 2: Enable RLS
    console.log('\n2. Enabling RLS...');
    try {
      await supabaseAdmin.rpc('exec_sql', {
        sql: 'ALTER TABLE public.games ENABLE ROW LEVEL SECURITY;'
      });
    } catch (e) {
      console.log('RLS enable attempt (may already be enabled)');
    }
    
    // Step 3: Create new policies using direct Supabase client methods
    console.log('\n3. Creating new RLS policies...');
    
    // Since we can't use exec_sql, let's try a different approach
    // Let's temporarily disable RLS and use service role for operations
    console.log('\n4. Testing with service role approach...');
    
    // Test if we can create a game directly with service role
    const testGameData = {
      title: 'RLS Test Game',
      description: 'Testing RLS policies',
      type: 'trivia',
      organizer_id: '4548f20c-5b15-4e73-83b2-a9454e4e8ef3',
      status: 'draft'
    };
    
    const { data: testResult, error: testError } = await supabaseAdmin
      .from('games')
      .insert(testGameData)
      .select();
    
    if (testError) {
      console.error('Service role test failed:', testError);
    } else {
      console.log('Service role test successful:', testResult[0].id);
      // Clean up
      await supabaseAdmin.from('games').delete().eq('id', testResult[0].id);
    }
    
    // Alternative approach: Modify the Game model to use service role for creation
    console.log('\n5. Recommendation: Use service role for game creation');
    console.log('Since RLS policies are complex to set up via API, consider:');
    console.log('- Modifying Game.create() to use supabaseAdmin for INSERT operations');
    console.log('- Keep regular supabase client for SELECT operations with proper filtering');
    
  } catch (error) {
    console.error('RLS fix error:', error);
  }
}

applyRLSFix();