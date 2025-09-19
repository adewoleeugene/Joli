-- Fix for infinite recursion in Supabase RLS policies
-- This script resolves circular dependencies between events and event_participants tables

-- Drop problematic policies that cause infinite recursion
DROP POLICY IF EXISTS "Event participants can view events" ON events;
DROP POLICY IF EXISTS "Event organizers can view participants" ON event_participants;
DROP POLICY IF EXISTS "Games viewable by event participants" ON games;
DROP POLICY IF EXISTS "Event organizers can view/manage submissions" ON submissions;

-- Create new policies without circular dependencies

-- Events table: Allow viewing without referencing event_participants
CREATE POLICY "Event participants can view events" ON events FOR SELECT USING (
  -- Public events are viewable by anyone
  (is_public = true AND status = 'published')
  OR
  -- Organizers can view their own events
  (organizer_id = auth.uid())
);

-- Event_participants table: Allow viewing without referencing events
CREATE POLICY "Event organizers can view participants" ON event_participants FOR SELECT USING (
  -- Users can view their own participations
  (user_id = auth.uid())
  OR
  -- Check if user is organizer by joining with events table in a non-recursive way
  (auth.uid() IN (
    SELECT organizer_id FROM events WHERE id = event_participants.event_id
  ))
);

-- Games table: Simplified policy without circular reference
CREATE POLICY "Games viewable by event participants" ON games FOR SELECT USING (
  -- Games are viewable if the associated event is public
  EXISTS (SELECT 1 FROM events WHERE id = games.event_id AND is_public = true AND status = 'published')
  OR
  -- Games are viewable by event organizers
  EXISTS (SELECT 1 FROM events WHERE id = games.event_id AND organizer_id = auth.uid())
  OR
  -- Games are viewable by registered participants (direct check)
  (auth.uid() IN (
    SELECT user_id FROM event_participants WHERE event_id = games.event_id
  ))
);

-- Submissions table: Simplified policy without circular reference
CREATE POLICY "Event organizers can view/manage submissions" ON submissions FOR ALL USING (
  -- Users can manage their own submissions
  (user_id = auth.uid())
  OR
  -- Event organizers can manage submissions for their events
  (auth.uid() IN (
    SELECT organizer_id FROM events WHERE id = submissions.event_id
  ))
);

-- Additional policy for event_participants to allow organizers to manage participants
CREATE POLICY "Event organizers can manage participants" ON event_participants FOR ALL USING (
  -- Users can manage their own participations
  (user_id = auth.uid())
  OR
  -- Event organizers can manage participants for their events
  (auth.uid() IN (
    SELECT organizer_id FROM events WHERE id = event_participants.event_id
  ))
);

COMMIT;