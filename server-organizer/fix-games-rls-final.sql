-- Final RLS fix for games table
-- This script will properly configure RLS policies for game creation

-- First, let's check and drop any problematic policies
DO $$
BEGIN
    -- Drop existing policies that might be causing issues
    DROP POLICY IF EXISTS "Admins can manage all games" ON public.games;
    DROP POLICY IF EXISTS "Organizers can manage their games" ON public.games;
    DROP POLICY IF EXISTS "Public games are viewable" ON public.games;
    DROP POLICY IF EXISTS "Users can view public games" ON public.games;
    DROP POLICY IF EXISTS "Organizers can create games" ON public.games;
    DROP POLICY IF EXISTS "Organizers can update their games" ON public.games;
    DROP POLICY IF EXISTS "Organizers can delete their games" ON public.games;
END $$;

-- Ensure RLS is enabled
ALTER TABLE public.games ENABLE ROW LEVEL SECURITY;

-- Create comprehensive RLS policies

-- 1. Allow organizers to INSERT games
CREATE POLICY "organizers_can_create_games" ON public.games
    FOR INSERT
    TO authenticated
    WITH CHECK (
        -- Check if user is an organizer and the organizer_id matches their user ID
        auth.uid() = organizer_id::uuid
        AND 
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE auth.users.id = auth.uid()
            AND auth.users.raw_user_meta_data->>'role' = 'organizer'
        )
    );

-- 2. Allow organizers to SELECT their own games
CREATE POLICY "organizers_can_view_their_games" ON public.games
    FOR SELECT
    TO authenticated
    USING (
        auth.uid() = organizer_id::uuid
        OR 
        -- Also allow if user is admin
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE auth.users.id = auth.uid()
            AND auth.users.raw_user_meta_data->>'role' = 'admin'
        )
    );

-- 3. Allow public to view public games
CREATE POLICY "public_can_view_public_games" ON public.games
    FOR SELECT
    TO authenticated, anon
    USING (status = 'active' OR status = 'published');

-- 4. Allow organizers to UPDATE their own games
CREATE POLICY "organizers_can_update_their_games" ON public.games
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = organizer_id::uuid)
    WITH CHECK (auth.uid() = organizer_id::uuid);

-- 5. Allow organizers to DELETE their own games
CREATE POLICY "organizers_can_delete_their_games" ON public.games
    FOR DELETE
    TO authenticated
    USING (auth.uid() = organizer_id::uuid);

-- 6. Allow admins to do everything
CREATE POLICY "admins_can_manage_all_games" ON public.games
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE auth.users.id = auth.uid()
            AND auth.users.raw_user_meta_data->>'role' = 'admin'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE auth.users.id = auth.uid()
            AND auth.users.raw_user_meta_data->>'role' = 'admin'
        )
    );

-- Verify the policies were created
SELECT 
    schemaname, 
    tablename, 
    policyname, 
    cmd,
    roles,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'games'
ORDER BY policyname;

-- Test the setup with a sample query (this will show what policies are active)
SELECT 'RLS policies created successfully for games table' as status;