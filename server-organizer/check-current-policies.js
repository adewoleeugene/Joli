const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkCurrentPolicies() {
  try {
    console.log('=== CHECKING CURRENT RLS POLICIES ===');
    
    // Check if event_id column still exists
    console.log('\n1. Checking if event_id column exists...');
    const { data: columns, error: colError } = await supabase
      .rpc('exec_sql', {
        sql: `
          SELECT column_name 
          FROM information_schema.columns 
          WHERE table_name = 'games' 
          AND table_schema = 'public' 
          AND column_name = 'event_id';
        `
      });
    
    if (colError) {
      console.log('Cannot check columns directly, trying alternative...');
    } else {
      console.log('Event_id column check result:', columns);
    }
    
    // Check current policies using direct SQL
    console.log('\n2. Checking current RLS policies...');
    const { data: policies, error: polError } = await supabase
      .rpc('exec_sql', {
        sql: `
          SELECT 
            schemaname, 
            tablename, 
            policyname, 
            cmd,
            qual
          FROM pg_policies 
          WHERE tablename = 'games'
          ORDER BY policyname;
        `
      });
    
    if (polError) {
      console.error('Error checking policies:', polError);
    } else {
      console.log('Current policies on games table:');
      if (policies && policies.length > 0) {
        policies.forEach(policy => {
          console.log(`- ${policy.policyname} (${policy.cmd}): ${policy.qual}`);
        });
      } else {
        console.log('No policies found on games table');
      }
    }
    
    // Check RLS status
    console.log('\n3. Checking RLS status...');
    const { data: rlsStatus, error: rlsError } = await supabase
      .rpc('exec_sql', {
        sql: `
          SELECT 
            tablename,
            rowsecurity
          FROM pg_tables 
          WHERE tablename = 'games' 
          AND schemaname = 'public';
        `
      });
    
    if (rlsError) {
      console.error('Error checking RLS status:', rlsError);
    } else {
      console.log('RLS status:', rlsStatus);
    }
    
    // Test direct insert with service role
    console.log('\n4. Testing direct insert with service role...');
    const testData = {
      title: 'Service Role Test',
      description: 'Testing with service role',
      type: 'trivia',
      organizer_id: '4548f20c-5b15-4e73-83b2-a9454e4e8ef3',
      status: 'draft'
    };
    
    const { data: insertResult, error: insertError } = await supabase
      .from('games')
      .insert(testData)
      .select();
    
    if (insertError) {
      console.error('Service role insert failed:', insertError);
    } else {
      console.log('Service role insert successful:', insertResult);
      // Clean up
      await supabase.from('games').delete().eq('id', insertResult[0].id);
      console.log('Test record cleaned up');
    }
    
  } catch (error) {
    console.error('Check error:', error);
  }
}

checkCurrentPolicies();