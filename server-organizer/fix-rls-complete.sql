-- Complete RLS policy fix - Drop ALL existing policies and recreate
-- Run this SQL in your Supabase SQL Editor

-- Step 1: Drop ALL existing policies on both tables
DROP POLICY IF EXISTS "Event participants can view events" ON events;
DROP POLICY IF EXISTS "Event organizers can view participants" ON event_participants;
DROP POLICY IF EXISTS "Public events viewable" ON events;
DROP POLICY IF EXISTS "Organizers manage own events" ON events;
DROP POLICY IF EXISTS "Users manage own participation" ON event_participants;
DROP POLICY IF EXISTS "Organizers view event participants" ON event_participants;
DROP POLICY IF EXISTS "Organizers insert event participants" ON event_participants;
DROP POLICY IF EXISTS "Organizers update event participants" ON event_participants;
DROP POLICY IF EXISTS "Organizers delete event participants" ON event_participants;
DROP POLICY IF EXISTS "Admins can manage all events" ON events;
DROP POLICY IF EXISTS "Admins can manage all participations" ON event_participants;
DROP POLICY IF EXISTS "Users can register for events" ON event_participants;
DROP POLICY IF EXISTS "Users can view their participations" ON event_participants;
DROP POLICY IF EXISTS "Organizers can manage their events" ON events;
DROP POLICY IF EXISTS "Public events are viewable" ON events;

-- Step 2: Create simple, non-recursive policies

-- Events table policies
CREATE POLICY "events_select_public" ON events 
  FOR SELECT USING (is_public = true);

CREATE POLICY "events_all_organizer" ON events 
  FOR ALL USING (auth.uid() = organizer_id);

-- Event participants policies (no reference to events table)
CREATE POLICY "participants_all_user" ON event_participants 
  FOR ALL USING (auth.uid() = user_id);

-- Separate policy for organizers to manage participants (using subquery)
CREATE POLICY "participants_select_organizer" ON event_participants 
  FOR SELECT USING (
    event_id IN (
      SELECT id FROM events WHERE organizer_id = auth.uid()
    )
  );

CREATE POLICY "participants_insert_organizer" ON event_participants 
  FOR INSERT WITH CHECK (
    event_id IN (
      SELECT id FROM events WHERE organizer_id = auth.uid()
    )
  );

CREATE POLICY "participants_update_organizer" ON event_participants 
  FOR UPDATE USING (
    event_id IN (
      SELECT id FROM events WHERE organizer_id = auth.uid()
    )
  );

CREATE POLICY "participants_delete_organizer" ON event_participants 
  FOR DELETE USING (
    event_id IN (
      SELECT id FROM events WHERE organizer_id = auth.uid()
    )
  );

-- Verify new policies
SELECT 
  schemaname, 
  tablename, 
  policyname, 
  cmd 
FROM pg_policies 
WHERE tablename IN ('events', 'event_participants') 
ORDER BY tablename, policyname;