const { createClient } = require('@supabase/supabase-js');

require('dotenv').config();

async function checkSchema() {
  console.log('Checking current database schema...');
  
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  try {
    // Check games table structure
    console.log('\n=== GAMES TABLE STRUCTURE ===');
    const { data: gamesColumns, error: gamesError } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type, is_nullable, column_default')
      .eq('table_name', 'games')
      .eq('table_schema', 'public');
    
    if (gamesError) {
      console.error('Error checking games table:', gamesError.message);
    } else {
      console.table(gamesColumns);
    }
    
    // Check if event_id column exists
    const hasEventId = gamesColumns?.some(col => col.column_name === 'event_id');
    console.log(`\nEvent ID column exists: ${hasEventId}`);
    
    if (hasEventId) {
      console.log('\n❌ Migration not applied - event_id column still exists');
      console.log('\n📋 Required actions:');
      console.log('1. Apply the migration to remove event_id column');
      console.log('2. Fix RLS policies');
      console.log('\nSQL to run in Supabase SQL Editor:');
      console.log('-- Remove event_id column');
      console.log('ALTER TABLE games DROP COLUMN IF EXISTS event_id;');
      console.log('\n-- Drop old RLS policies');
      console.log('DROP POLICY IF EXISTS "Games viewable by event participants" ON games;');
      console.log('DROP POLICY IF EXISTS "Event organizers can manage games" ON games;');
      console.log('DROP POLICY IF EXISTS "Public games are viewable" ON games;');
      console.log('DROP POLICY IF EXISTS "Organizers can manage their games" ON games;');
      console.log('\n-- Create new RLS policies');
      console.log('CREATE POLICY "Public games are viewable" ON games FOR SELECT USING (true);');
      console.log('CREATE POLICY "Organizers can manage their games" ON games FOR ALL USING (organizer_id = auth.uid());');
    } else {
      console.log('\n✅ Migration applied - event_id column removed');
      console.log('Only RLS policies need to be fixed.');
    }
    
    // Check current RLS policies
    console.log('\n=== CURRENT RLS POLICIES ===');
    const { data: policies, error: policiesError } = await supabase
      .from('pg_policies')
      .select('policyname, cmd, qual')
      .eq('tablename', 'games');
    
    if (policiesError) {
      console.error('Error checking policies:', policiesError.message);
    } else {
      console.table(policies);
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

checkSchema();