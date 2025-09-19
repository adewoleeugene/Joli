
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
