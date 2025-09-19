-- Migration: Remove 'admin' from user_role enum safely and idempotently
-- Purpose: Replace existing user_role (which may contain 'admin') with a new enum
--          that only includes 'organizer' and 'participant', remapping any
--          existing 'admin' rows to 'organizer'.
--
-- Safe to run multiple times. It will:
-- 1) Create user_role_new enum if it doesn't exist
-- 2) If users.role currently uses user_role, remap 'admin' -> 'organizer' and
--    change the column type to user_role_new
-- 3) Drop old user_role type if it still exists
-- 4) Rename user_role_new -> user_role (if not already) and restore default

BEGIN;

-- 1) Create the new enum if it doesn't already exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'user_role_new'
  ) THEN
    CREATE TYPE user_role_new AS ENUM ('organizer', 'participant');
  END IF;
END$$;

-- 2) If users.role uses user_role, migrate to user_role_new and remap values
DO $$
DECLARE
  col_type text;
  has_admin boolean;
  new_type_exists boolean;
BEGIN
  -- Whether the temporary new enum type exists
  SELECT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role_new') INTO new_type_exists;
  -- Current column type of public.users.role
  SELECT atttypid::regtype::text
    INTO col_type
  FROM pg_attribute a
  JOIN pg_class c ON a.attrelid = c.oid
  JOIN pg_namespace n ON c.relnamespace = n.oid
  WHERE c.relname = 'users'
    AND n.nspname = 'public'
    AND a.attname = 'role'
    AND a.attnum > 0
    AND NOT a.attisdropped
  LIMIT 1;

  -- Whether the existing user_role enum still contains the 'admin' label
  SELECT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE t.typname = 'user_role' AND e.enumlabel = 'admin'
  ) INTO has_admin;

  IF col_type = 'user_role' THEN
    -- Drop default (if any) to avoid cast issues during type change
    EXECUTE 'ALTER TABLE public.users ALTER COLUMN role DROP DEFAULT';

    -- If there are any rows with 'admin', remap them to 'organizer' first
    IF has_admin THEN
      EXECUTE $q$UPDATE public.users SET role = 'organizer'::user_role WHERE role::text = 'admin'$q$;
    END IF;

    -- Change the column type to the new enum using a text cast
    EXECUTE $q$ALTER TABLE public.users ALTER COLUMN role TYPE user_role_new USING (role::text::user_role_new)$q$;

    -- Restore default on the column using the new enum
    EXECUTE $q$ALTER TABLE public.users ALTER COLUMN role SET DEFAULT 'participant'::user_role_new$q$;
  END IF;
END$$;

-- 3) Drop the old enum type if it still exists (after column migration)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
    -- user_role column should now point to user_role_new, so this drop should succeed
    DROP TYPE user_role;
  END IF;
END$$;

-- 4) Rename user_role_new -> user_role if not already, then ensure default uses final type
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role_new')
     AND NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
    ALTER TYPE user_role_new RENAME TO user_role;
  END IF;
END$$;

-- Ensure the users.role default is set to 'participant' of the final user_role type
ALTER TABLE public.users ALTER COLUMN role SET DEFAULT 'participant'::user_role;

COMMIT;