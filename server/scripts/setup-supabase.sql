-- Joli Event Gamification Platform - Supabase Database Schema
-- Run this script in your Supabase SQL editor

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create custom types
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('organizer', 'participant');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE event_status AS ENUM ('draft', 'published', 'active', 'completed', 'cancelled');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE game_type AS ENUM ('quiz', 'photo_contest', 'video_contest', 'scavenger_hunt', 'trivia', 'poll');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE game_status AS ENUM ('draft', 'active', 'paused', 'completed');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE submission_status AS ENUM ('pending', 'approved', 'rejected', 'flagged');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  role user_role DEFAULT 'participant',
  avatar_url TEXT,
  phone VARCHAR(20),
  organization VARCHAR(255),
  organization_description TEXT,
  bio TEXT,
  is_active BOOLEAN DEFAULT true,
  email_verified BOOLEAN DEFAULT false,
  last_login TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Events table
CREATE TABLE IF NOT EXISTS events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  organizer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  start_date TIMESTAMP WITH TIME ZONE NOT NULL,
  end_date TIMESTAMP WITH TIME ZONE NOT NULL,
  registration_deadline TIMESTAMP WITH TIME ZONE,
  max_participants INTEGER,
  location VARCHAR(255),
  banner_url TEXT,
  status event_status DEFAULT 'draft',
  is_public BOOLEAN DEFAULT true,
  registration_required BOOLEAN DEFAULT true,
  tags TEXT[],
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ensure visibility column exists with default and constraint (idempotent)
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS visibility TEXT NOT NULL DEFAULT 'public';
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'events_visibility_check'
  ) THEN
    ALTER TABLE public.events
      ADD CONSTRAINT events_visibility_check
      CHECK (visibility IN ('public','private','unlisted'));
  END IF;
END
$$;
CREATE INDEX IF NOT EXISTS idx_events_visibility ON public.events (visibility);

-- Games table
CREATE TABLE IF NOT EXISTS games (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  type game_type NOT NULL,
  status game_status DEFAULT 'draft',
  start_time TIMESTAMP WITH TIME ZONE,
  end_time TIMESTAMP WITH TIME ZONE,
  max_score INTEGER DEFAULT 100,
  time_limit INTEGER, -- in minutes
  instructions TEXT,
  rules TEXT,
  media_url TEXT,
  questions JSONB DEFAULT '[]', -- for quiz/trivia games
  settings JSONB DEFAULT '{}', -- game-specific settings
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Event participants table (many-to-many relationship)
CREATE TABLE IF NOT EXISTS event_participants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  registered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  status VARCHAR(20) DEFAULT 'registered', -- registered, attended, cancelled
  UNIQUE(event_id, user_id)
);

-- Submissions table
CREATE TABLE IF NOT EXISTS submissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  content JSONB NOT NULL DEFAULT '{}', -- submission content (answers, media URLs, etc.)
  media_urls TEXT[], -- array of media file URLs
  score INTEGER DEFAULT 0,
  max_possible_score INTEGER DEFAULT 100,
  status submission_status DEFAULT 'pending',
  feedback TEXT,
  reviewed_by UUID REFERENCES users(id),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(game_id, user_id) -- one submission per user per game
);

-- Leaderboard/Rankings table
CREATE TABLE IF NOT EXISTS leaderboards (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  total_score INTEGER DEFAULT 0,
  games_completed INTEGER DEFAULT 0,
  rank INTEGER,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(event_id, user_id)
);

-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  type VARCHAR(50) DEFAULT 'info', -- info, success, warning, error
  is_read BOOLEAN DEFAULT false,
  related_entity_type VARCHAR(50), -- event, game, submission
  related_entity_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_events_organizer ON events(organizer_id);
CREATE INDEX IF NOT EXISTS idx_events_status ON events(status);
CREATE INDEX IF NOT EXISTS idx_events_dates ON events(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_games_event ON games(event_id);
CREATE INDEX IF NOT EXISTS idx_games_type ON games(type);
CREATE INDEX IF NOT EXISTS idx_games_status ON games(status);
CREATE INDEX IF NOT EXISTS idx_event_participants_event ON event_participants(event_id);
CREATE INDEX IF NOT EXISTS idx_event_participants_user ON event_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_submissions_game ON submissions(game_id);
CREATE INDEX IF NOT EXISTS idx_submissions_user ON submissions(user_id);
CREATE INDEX IF NOT EXISTS idx_submissions_event ON submissions(event_id);
CREATE INDEX IF NOT EXISTS idx_submissions_status ON submissions(status);
CREATE INDEX IF NOT EXISTS idx_leaderboards_event ON leaderboards(event_id);
CREATE INDEX IF NOT EXISTS idx_leaderboards_rank ON leaderboards(event_id, rank);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(user_id, is_read);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add updated_at triggers
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS update_events_updated_at ON events;
CREATE TRIGGER update_events_updated_at BEFORE UPDATE ON events FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS update_games_updated_at ON games;
CREATE TRIGGER update_games_updated_at BEFORE UPDATE ON games FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS update_submissions_updated_at ON submissions;
CREATE TRIGGER update_submissions_updated_at BEFORE UPDATE ON submissions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE games ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE leaderboards ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies for users table
DROP POLICY IF EXISTS "Users can view their own profile" ON users;
CREATE POLICY "Users can view their own profile" ON users FOR SELECT USING (auth.uid() = id);
DROP POLICY IF EXISTS "Users can update their own profile" ON users;
CREATE POLICY "Users can update their own profile" ON users FOR UPDATE USING (auth.uid() = id);
DROP POLICY IF EXISTS "Users can insert their own profile" ON users;
CREATE POLICY "Users can insert their own profile" ON users FOR INSERT WITH CHECK (auth.uid() = id);
DROP POLICY IF EXISTS "Admins can view all users" ON users;
DROP POLICY IF EXISTS "Admins can update all users" ON users;
-- Removed admin-wide users policies; admin role deprecated
DROP POLICY IF EXISTS "Public user profiles viewable" ON users;
CREATE POLICY "Public user profiles viewable" ON users FOR SELECT USING (
  is_active = true
);

-- RLS Policies for events table
DROP POLICY IF EXISTS "Public events are viewable" ON events;
CREATE POLICY "Public events are viewable" ON events FOR SELECT USING (is_public = true AND status = 'published');
DROP POLICY IF EXISTS "Organizers can manage their events" ON events;
CREATE POLICY "Organizers can manage their events" ON events FOR ALL USING (organizer_id = auth.uid());
DROP POLICY IF EXISTS "Admins can manage all events" ON events;
-- Removed admin-wide events policies; admin role deprecated
DROP POLICY IF EXISTS "Event participants can view events" ON events;
CREATE POLICY "Event participants can view events" ON events FOR SELECT USING (
  EXISTS (SELECT 1 FROM event_participants WHERE event_id = events.id AND user_id = auth.uid())
);

-- RLS Policies for games table
DROP POLICY IF EXISTS "Games viewable by event participants" ON games;
CREATE POLICY "Games viewable by event participants" ON games FOR SELECT USING (
  EXISTS (SELECT 1 FROM event_participants WHERE event_id = games.event_id AND user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM events WHERE id = games.event_id AND is_public = true)
);
DROP POLICY IF EXISTS "Event organizers can manage games" ON games;
CREATE POLICY "Event organizers can manage games" ON games FOR ALL USING (
  EXISTS (SELECT 1 FROM events WHERE id = games.event_id AND organizer_id = auth.uid())
);
DROP POLICY IF EXISTS "Admins can manage all games" ON games;
-- Removed admin-wide games policies; admin role deprecated

-- RLS Policies for event_participants table
DROP POLICY IF EXISTS "Users can view their participations" ON event_participants;
CREATE POLICY "Users can view their participations" ON event_participants FOR SELECT USING (user_id = auth.uid());
DROP POLICY IF EXISTS "Users can register for events" ON event_participants;
CREATE POLICY "Users can register for events" ON event_participants FOR INSERT WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "Event organizers can view participants" ON event_participants;
CREATE POLICY "Event organizers can view participants" ON event_participants FOR SELECT USING (
  EXISTS (SELECT 1 FROM events WHERE id = event_participants.event_id AND organizer_id = auth.uid())
);
DROP POLICY IF EXISTS "Admins can manage all participations" ON event_participants;
-- Removed admin-wide participations policies; admin role deprecated

-- RLS Policies for submissions table
DROP POLICY IF EXISTS "Users can view their own submissions" ON submissions;
CREATE POLICY "Users can view their own submissions" ON submissions FOR SELECT USING (user_id = auth.uid());
DROP POLICY IF EXISTS "Users can create their own submissions" ON submissions;
CREATE POLICY "Users can create their own submissions" ON submissions FOR INSERT WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "Users can update their pending submissions" ON submissions;
CREATE POLICY "Users can update their pending submissions" ON submissions FOR UPDATE USING (
  user_id = auth.uid() AND status = 'pending'
);
DROP POLICY IF EXISTS "Event organizers can view/manage submissions" ON submissions;
CREATE POLICY "Event organizers can view/manage submissions" ON submissions FOR ALL USING (
  EXISTS (SELECT 1 FROM events WHERE id = submissions.event_id AND organizer_id = auth.uid())
);
DROP POLICY IF EXISTS "Admins can manage all submissions" ON submissions;
-- Removed admin-wide submissions policies; admin role deprecated

-- RLS Policies for leaderboards table
DROP POLICY IF EXISTS "Leaderboards are publicly viewable" ON leaderboards;
CREATE POLICY "Leaderboards are publicly viewable" ON leaderboards FOR SELECT USING (true);
DROP POLICY IF EXISTS "Event organizers can manage leaderboards" ON leaderboards;
CREATE POLICY "Event organizers can manage leaderboards" ON leaderboards FOR ALL USING (
  EXISTS (SELECT 1 FROM events WHERE id = leaderboards.event_id AND organizer_id = auth.uid())
);
DROP POLICY IF EXISTS "Admins can manage all leaderboards" ON leaderboards;
-- Removed admin-wide leaderboards policies; admin role deprecated

-- RLS Policies for notifications table
DROP POLICY IF EXISTS "Users can view their own notifications" ON notifications;
CREATE POLICY "Users can view their own notifications" ON notifications FOR SELECT USING (user_id = auth.uid());
DROP POLICY IF EXISTS "Users can update their own notifications" ON notifications;
CREATE POLICY "Users can update their own notifications" ON notifications FOR UPDATE USING (user_id = auth.uid());
DROP POLICY IF EXISTS "System can create notifications" ON notifications;
CREATE POLICY "System can create notifications" ON notifications FOR INSERT WITH CHECK (true);

-- Functions for leaderboard calculation
CREATE OR REPLACE FUNCTION calculate_leaderboard(event_uuid UUID)
RETURNS TABLE(
  user_id UUID,
  total_score BIGINT,
  games_completed BIGINT,
  rank BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.user_id,
    COALESCE(SUM(s.score), 0) as total_score,
    COUNT(DISTINCT s.game_id) as games_completed,
    ROW_NUMBER() OVER (ORDER BY COALESCE(SUM(s.score), 0) DESC, COUNT(DISTINCT s.game_id) DESC) as rank
  FROM submissions s
  WHERE s.event_id = event_uuid AND s.status = 'approved'
  GROUP BY s.user_id
  ORDER BY total_score DESC, games_completed DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to update leaderboard
CREATE OR REPLACE FUNCTION update_leaderboard_for_event(event_uuid UUID)
RETURNS void AS $$
BEGIN
  -- Delete existing leaderboard entries for this event
  DELETE FROM leaderboards WHERE event_id = event_uuid;
  
  -- Insert new leaderboard entries
  INSERT INTO leaderboards (event_id, user_id, total_score, games_completed, rank)
  SELECT 
    event_uuid,
    lb.user_id,
    lb.total_score::INTEGER,
    lb.games_completed::INTEGER,
    lb.rank::INTEGER
  FROM calculate_leaderboard(event_uuid) lb;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update leaderboard when submissions change
CREATE OR REPLACE FUNCTION trigger_update_leaderboard()
RETURNS TRIGGER AS $$
BEGIN
  -- Update leaderboard for the affected event
  PERFORM update_leaderboard_for_event(COALESCE(NEW.event_id, OLD.event_id));
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_leaderboard_on_submission_change ON submissions;
CREATE TRIGGER update_leaderboard_on_submission_change
  AFTER INSERT OR UPDATE OR DELETE ON submissions
  FOR EACH ROW
  EXECUTE FUNCTION trigger_update_leaderboard();

-- Admin seed removed; admin role deprecated

COMMIT;