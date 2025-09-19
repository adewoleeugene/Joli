# Database Migration Steps - Remove Event Functionality

## Current Status
The application has been successfully updated to remove event functionality, but the database schema needs manual updates to complete the migration.

## Issues Found
- Games table is missing `organizer_id` column
- Server-organizer is getting "column games.organizer_id does not exist" errors
- WebSocket connections failing due to schema mismatches

## Available Organizer
- Found organizer: `a913bd68-5a71-46f0-a943-9ceaa95e9c76` (organizer_r4@example.com)

## Manual Steps Required

### Step 1: Add organizer_id column to games table
```sql
ALTER TABLE games ADD COLUMN organizer_id UUID;
```

### Step 2: Add foreign key constraint
```sql
ALTER TABLE games ADD CONSTRAINT fk_games_organizer 
  FOREIGN KEY (organizer_id) REFERENCES users(id) ON DELETE CASCADE;
```

### Step 3: Update existing games with organizer_id
```sql
-- Set all existing games to the available organizer
UPDATE games 
SET organizer_id = 'a913bd68-5a71-46f0-a943-9ceaa95e9c76' 
WHERE organizer_id IS NULL;
```

### Step 4: Make organizer_id NOT NULL
```sql
ALTER TABLE games ALTER COLUMN organizer_id SET NOT NULL;
```

### Step 5: (Optional) Complete Event Removal
If you want to completely remove event functionality, run the full migration:

```sql
-- See migration-remove-events.sql for complete event removal
-- This includes:
-- - Removing event_id from games and submissions tables
-- - Dropping event-related tables (events, event_participants, leaderboards)
-- - Updating RLS policies
-- - Removing event-related functions
```

## How to Execute

1. Open your Supabase Dashboard
2. Go to SQL Editor
3. Run the SQL commands above in order
4. Restart your servers after completion

## Files Modified
- `migration-remove-events.sql` - Complete migration script
- `quick-fix-schema.js` - Database structure checker
- All server socket handlers updated (join_game/leave_game)
- All models updated to remove event references
- Validation rules cleaned up

## Servers Status
- ✅ server-shared: Running on port 5003
- ✅ server-user: Running on port 5010 (with schema warnings)
- ❌ server-organizer: Running but failing due to missing organizer_id
- ✅ organizer frontend: Running on port 3001 (connection issues due to backend)

## Next Steps
1. Execute the manual SQL steps above
2. Restart server-organizer
3. Test organizer dashboard functionality
4. Verify all WebSocket connections work properly