const { supabaseAdmin } = require('./config/supabase');

async function fixRLSPolicies() {
  try {
    console.log('Starting RLS policy fix using individual operations...');
    
    // Since exec_sql doesn't work, let's try to use the SQL editor approach
    // or create a manual SQL file that can be run in Supabase dashboard
    
    console.log('\n❌ Cannot execute SQL directly through Supabase client.');
    console.log('The exec_sql function is not available in this Supabase setup.');
    console.log('\n📝 Creating SQL file for manual execution...');
    
    const fixSQL = `
-- Fix for infinite recursion in RLS policies
-- Run this SQL in your Supabase SQL Editor

-- Step 1: Drop problematic policies that cause circular dependencies
DROP POLICY IF EXISTS "Event participants can view events" ON events;
DROP POLICY IF EXISTS "Event organizers can view participants" ON event_participants;

-- Step 2: Create new policies without circular dependencies

-- Events table: Allow public events and organizer access without checking participants
CREATE POLICY "Public events viewable" ON events 
  FOR SELECT USING (is_public = true);

CREATE POLICY "Organizers manage own events" ON events 
  FOR ALL USING (auth.uid() = organizer_id);

-- Event participants: Allow user access and organizer access without circular reference
CREATE POLICY "Users manage own participation" ON event_participants 
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Organizers view event participants" ON event_participants 
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM events 
      WHERE events.id = event_participants.event_id 
      AND events.organizer_id = auth.uid()
    )
  );

CREATE POLICY "Organizers manage event participants" ON event_participants 
  FOR INSERT, UPDATE, DELETE USING (
    EXISTS (
      SELECT 1 FROM events 
      WHERE events.id = event_participants.event_id 
      AND events.organizer_id = auth.uid()
    )
  );

-- Verify policies are working
SELECT 
  schemaname, 
  tablename, 
  policyname, 
  cmd 
FROM pg_policies 
WHERE tablename IN ('events', 'event_participants') 
ORDER BY tablename, policyname;
`;
    
    // Write the SQL to a file
    const fs = require('fs');
    const path = require('path');
    const sqlFilePath = path.join(__dirname, 'fix-rls-manual.sql');
    
    fs.writeFileSync(sqlFilePath, fixSQL);
    
    console.log(`\n✅ SQL file created: ${sqlFilePath}`);
    console.log('\n📋 Manual steps to fix the RLS policies:');
    console.log('1. Go to your Supabase project dashboard');
    console.log('2. Navigate to SQL Editor');
    console.log('3. Copy and paste the contents of fix-rls-manual.sql');
    console.log('4. Execute the SQL');
    console.log('5. Restart your server to clear any cached policies');
    
    console.log('\n🔍 Alternative: Check if you have direct database access');
    console.log('If you have psql or another PostgreSQL client, you can run:');
    console.log(`psql "your-database-url" -f "${sqlFilePath}"`);
    
    // Try a simple test to see if we can at least query without errors
    console.log('\n🧪 Testing current state...');
    
    try {
      const { data: testEvents, error: testError } = await supabaseAdmin
        .from('events')
        .select('id, title')
        .limit(1);
      
      if (testError) {
        console.log('❌ Admin query still has issues:', testError.message);
      } else {
        console.log('✅ Admin queries work fine');
      }
    } catch (testErr) {
      console.log('❌ Test query failed:', testErr.message);
    }
    
    return true;
    
  } catch (error) {
    console.error('❌ Script error:', error);
    return false;
  }
}

fixRLSPolicies().then((success) => {
  if (success) {
    console.log('\n✅ Script completed. Please run the manual SQL steps above.');
    process.exit(0);
  } else {
    console.log('\n❌ Script failed.');
    process.exit(1);
  }
}).catch(error => {
  console.error('\nScript failed:', error.message);
  process.exit(1);
});