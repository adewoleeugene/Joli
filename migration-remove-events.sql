-- Migration: Remove event functionality and update games table
-- Purpose: Remove event_id from games table and add organizer_id
-- This migration removes event dependencies from the system

BEGIN;

-- Step 1: Add organizer_id column to games table if it doesn't exist
ALTER TABLE games ADD COLUMN IF NOT EXISTS organizer_id UUID;

-- Step 2: Update existing games to have organizer_id from their associated events
-- (This assumes existing games have event_id and we want to preserve the organizer relationship)
UPDATE games 
SET organizer_id = events.organizer_id 
FROM events 
WHERE games.event_id = events.id 
AND games.organizer_id IS NULL;

-- Step 3: Make organizer_id NOT NULL and add foreign key constraint
ALTER TABLE games ALTER COLUMN organizer_id SET NOT NULL;
ALTER TABLE games ADD CONSTRAINT fk_games_organizer 
  FOREIGN KEY (organizer_id) REFERENCES users(id) ON DELETE CASCADE;

-- Step 4: Remove event_id column from games table
ALTER TABLE games DROP COLUMN IF EXISTS event_id;

-- Step 5: Remove event_id from submissions table
ALTER TABLE submissions DROP COLUMN IF EXISTS event_id;

-- Step 6: Update submissions table to reference organizer through game
-- Add index for better performance on game_id lookups
CREATE INDEX IF NOT EXISTS idx_submissions_game_id ON submissions(game_id);

-- Step 7: Drop event-related tables (in dependency order)
DROP TABLE IF EXISTS event_participants CASCADE;
DROP TABLE IF EXISTS leaderboards CASCADE;
DROP TABLE IF EXISTS events CASCADE;

-- Step 8: Drop event-related types
DROP TYPE IF EXISTS event_status CASCADE;

-- Step 9: Update RLS policies for games table to use organizer_id
DROP POLICY IF EXISTS "Games viewable by event participants" ON games;
DROP POLICY IF EXISTS "Event organizers can manage games" ON games;

-- New policies for games without events
CREATE POLICY "Public games are viewable" ON games 
  FOR SELECT USING (true);

CREATE POLICY "Organizers can manage their games" ON games 
  FOR ALL USING (organizer_id = auth.uid());

-- Step 10: Update RLS policies for submissions table
DROP POLICY IF EXISTS "Event organizers can view/manage submissions" ON submissions;

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

-- Step 11: Remove event-related functions
DROP FUNCTION IF EXISTS calculate_leaderboard(UUID);
DROP FUNCTION IF EXISTS update_leaderboard_for_event(UUID);

COMMIT;

-- Note: Run this migration in your Supabase SQL editor
-- Make sure to backup your database before running this migration