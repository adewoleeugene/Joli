const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkTableStructure() {
  try {
    console.log('=== CHECKING GAMES TABLE STRUCTURE ===');
    
    // Check if we can describe the table structure
    console.log('\n=== TESTING GAME CREATION WITH CORRECT SCHEMA ===');
    
    const organizerId = '4548f20c-5b15-4e73-83b2-a9454e4e8ef3';
    
    // Try with 'title' field (original schema)
    const testGameData1 = {
      title: 'Test Game',
      description: 'Test Description', 
      type: 'trivia',
      organizer_id: organizerId,
      status: 'draft'
    };
    
    console.log('Trying with title field:', testGameData1);
    const { data: result1, error: error1 } = await supabase
      .from('games')
      .insert(testGameData1)
      .select();
    
    if (error1) {
      console.error('Error with title field:', error1);
      
      // Try with 'name' field (migrated schema)
      const testGameData2 = {
        name: 'Test Game',
        description: 'Test Description',
        type: 'trivia', 
        organizer_id: organizerId,
        status: 'draft'
      };
      
      console.log('\nTrying with name field:', testGameData2);
      const { data: result2, error: error2 } = await supabase
        .from('games')
        .insert(testGameData2)
        .select();
      
      if (error2) {
        console.error('Error with name field:', error2);
      } else {
        console.log('Success with name field:', result2);
        // Clean up
        await supabase.from('games').delete().eq('id', result2[0].id);
      }
    } else {
      console.log('Success with title field:', result1);
      // Clean up
      await supabase.from('games').delete().eq('id', result1[0].id);
    }
    
  } catch (error) {
    console.error('Check error:', error);
  }
}

checkTableStructure();