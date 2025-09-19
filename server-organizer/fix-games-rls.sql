-- Fix RLS policies for games table after migration
-- This removes event-based policies first, then drops event_id column, then adds organizer-based policies

-- Step 1: Drop old event-based policies that depend on event_id column
DROP POLICY IF EXISTS "Games viewable by event participants" ON games;
DROP POLICY IF EXISTS "Event organizers can manage games" ON games;
DROP POLICY IF EXISTS "Public games are viewable" ON games;
DROP POLICY IF EXISTS "Organizers can manage their games" ON games;

-- Step 2: Now drop the event_id column (no dependencies left)
ALTER TABLE games DROP COLUMN IF EXISTS event_id;

-- Step 3: Create new organizer-based policies for games
CREATE POLICY "Public games are viewable" ON games 
  FOR SELECT USING (true);

CREATE POLICY "Organizers can manage their games" ON games 
  FOR ALL USING (organizer_id = auth.uid());

-- Step 4: Update submissions policies to work with games instead of events
DROP POLICY IF EXISTS "Event organizers can view/manage submissions" ON submissions;
DROP POLICY IF EXISTS "Game organizers can view/manage submissions" ON submissions;

CREATE POLICY "Game organizers can view/manage submissions" ON submissions 
  FOR ALL USING (
    user_id = auth.uid() 
    OR 
    EXISTS (
      SELECT 1 FROM games 
      WHERE games.id = submissions.game_id 
      AND games.organizer_id = auth.uid()
    )
  );

-- Verify the policies
SELECT 
  schemaname, 
  tablename, 
  policyname, 
  cmd 
FROM pg_policies 
WHERE tablename IN ('games', 'submissions') 
ORDER BY tablename, policyname;