-- Create questions table
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
SELECT 'Questions table created successfully' as status;