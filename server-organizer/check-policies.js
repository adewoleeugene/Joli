const { supabaseAdmin } = require('./config/supabase');

async function checkPolicies() {
  try {
    console.log('Checking current RLS policies...');
    
    // Query pg_policies to see current policies
    const { data: policies, error } = await supabaseAdmin
      .rpc('exec_sql', {
        query: `
          SELECT schemaname, tablename, policyname, cmd, qual 
          FROM pg_policies 
          WHERE tablename IN ('events', 'event_participants') 
          ORDER BY tablename, policyname;
        `
      });
    
    if (error) {
      console.error('Error querying policies:', error);
      
      // Try alternative approach - query information_schema
      const { data: tables, error: tablesError } = await supabaseAdmin
        .from('information_schema.tables')
        .select('table_name')
        .eq('table_schema', 'public')
        .in('table_name', ['events', 'event_participants']);
      
      if (tablesError) {
        console.error('Error querying tables:', tablesError);
      } else {
        console.log('Available tables:', tables);
      }
      
      // Try to query the tables directly to see if they exist
      const { data: eventsTest, error: eventsError } = await supabaseAdmin
        .from('events')
        .select('id')
        .limit(1);
      
      console.log('Events table test:', { data: eventsTest?.length || 0, error: eventsError?.message });
      
      const { data: participantsTest, error: participantsError } = await supabaseAdmin
        .from('event_participants')
        .select('id')
        .limit(1);
      
      console.log('Event participants table test:', { data: participantsTest?.length || 0, error: participantsError?.message });
      
      return;
    }
    
    console.log('Current RLS policies:');
    console.log(JSON.stringify(policies, null, 2));
    
  } catch (error) {
    console.error('Error checking policies:', error);
  }
}

checkPolicies().then(() => {
  console.log('Policy check completed');
  process.exit(0);
}).catch(error => {
  console.error('Script failed:', error);
  process.exit(1);
});