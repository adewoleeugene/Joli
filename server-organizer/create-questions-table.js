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

async function createQuestionsTable() {
  try {
    console.log('=== CHECKING AND CREATING QUESTIONS TABLE ===');
    
    // Try to query the questions table to see if it exists
    console.log('\n1. Testing if questions table exists...');
    const { data: testData, error: testError } = await supabaseAdmin
      .from('questions')
      .select('id')
      .limit(1);
    
    if (!testError) {
      console.log('✅ Questions table already exists');
      console.log(`Found ${testData ? testData.length : 0} questions`);
      return true;
    }
    
    if (testError.code === 'PGRST116' || testError.code === 'PGRST205') {
      console.log('❌ Questions table does not exist. Creating SQL file...');
      
      // Create the questions table SQL
      const createTableSQL = `-- Create questions table
CREATE TABLE IF NOT EXISTS public.questions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  game_id UUID NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  type VARCHAR(50) NOT NULL CHECK (type IN ('multiple_choice', 'true_false', 'short_answer')),
  options JSONB,
  correct_answer TEXT NOT NULL,
  points INTEGER DEFAULT 10,
  time_limit INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_questions_game_id ON public.questions(game_id);
CREATE INDEX IF NOT EXISTS idx_questions_type ON public.questions(type);

-- Enable RLS
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "questions_select_by_game_organizer" ON public.questions
  FOR SELECT USING (
    game_id IN (
      SELECT id FROM public.games WHERE organizer_id = auth.uid()
    )
  );

CREATE POLICY "questions_insert_by_game_organizer" ON public.questions
  FOR INSERT WITH CHECK (
    game_id IN (
      SELECT id FROM public.games WHERE organizer_id = auth.uid()
    )
  );

CREATE POLICY "questions_update_by_game_organizer" ON public.questions
  FOR UPDATE USING (
    game_id IN (
      SELECT id FROM public.games WHERE organizer_id = auth.uid()
    )
  );

CREATE POLICY "questions_delete_by_game_organizer" ON public.questions
  FOR DELETE USING (
    game_id IN (
      SELECT id FROM public.games WHERE organizer_id = auth.uid()
    )
  );

-- Verify table creation
SELECT 'Questions table created successfully' as status;`;
      
      // Write SQL to file for manual execution
      const fs = require('fs');
      const path = require('path');
      const sqlFilePath = path.join(__dirname, 'create-questions-table.sql');
      
      fs.writeFileSync(sqlFilePath, createTableSQL);
      
      console.log(`\n📋 SQL file created: ${sqlFilePath}`);
      console.log('\n🔧 MANUAL STEPS REQUIRED:');
      console.log('1. Go to your Supabase project dashboard');
      console.log('2. Navigate to SQL Editor');
      console.log('3. Copy and paste the contents of create-questions-table.sql');
      console.log('4. Execute the SQL');
      console.log('5. Restart your server after table creation');
      
      console.log('\n📄 SQL Content:');
      console.log('================');
      console.log(createTableSQL);
      console.log('================');
      
      return false;
    }
    
    console.error('❌ Unexpected error testing questions table:', testError);
    return false;
    
  } catch (error) {
    console.error('❌ Script error:', error);
    return false;
  }
}

// Run the script
createQuestionsTable().then(success => {
  if (success) {
    console.log('\n🎉 Questions table already exists and is ready!');
  } else {
    console.log('\n⚠️  Questions table needs to be created manually. Please follow the steps above.');
  }
  process.exit(success ? 0 : 1);
});