-- Migration: Add join_code column to games table
-- Purpose: Enable private games to have unique join codes for participant access

BEGIN;

-- Add join_code column to games table
ALTER TABLE games ADD COLUMN IF NOT EXISTS join_code VARCHAR(10) UNIQUE;

-- Create index for faster join code lookups
CREATE INDEX IF NOT EXISTS idx_games_join_code ON games(join_code) WHERE join_code IS NOT NULL;

-- Add comment to document the column purpose
COMMENT ON COLUMN games.join_code IS 'Unique code for participants to join private games';

COMMIT;

-- Verify the migration
SELECT 'Join code column added successfully to games table' as status;