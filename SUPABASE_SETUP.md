# Supabase Setup Guide for Joli Event Platform

The current Supabase project URL in the environment variables doesn't exist. Follow these steps to create a new Supabase project and configure the application.

## Step 1: Create a New Supabase Project

1. Go to [https://supabase.com](https://supabase.com)
2. Sign up or log in to your account
3. Click "New Project"
4. Choose your organization
5. Fill in project details:
   - **Name**: `joli-events` (or your preferred name)
   - **Database Password**: Create a strong password (save this!)
   - **Region**: Choose the closest region to your users
6. Click "Create new project"
7. Wait for the project to be created (this may take a few minutes)

## Step 2: Get Your Project Credentials

Once your project is ready:

1. Go to **Settings** → **API** in your Supabase dashboard
2. Copy the following values:
   - **Project URL** (e.g., `https://your-project-ref.supabase.co`)
   - **anon public** key
   - **service_role** key (keep this secret!)

## Step 3: Update Environment Variables

Update the `.env` file in each server directory with your new credentials:

### Files to update:
- `/server/.env`
- Remove any legacy `/server-admin/.env` files if present (legacy privileged role deprecated)
- `/server-organizer/.env` (if exists)
- `/server-user/.env` (if exists)
- `/server-shared/.env` (if exists)

### Replace these values:
```env
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```

## Step 4: Set Up the Database Schema

1. In your Supabase dashboard, go to **SQL Editor**
2. Copy the contents of `/server/scripts/setup-supabase.sql`
3. Paste it into the SQL Editor
4. Click **Run** to execute the script

This will create:
- All necessary tables (users, events, games, submissions, etc.)
- Row Level Security (RLS) policies
- Database functions and triggers
- Sample organizer user (if needed)

## Step 5: Configure Authentication

1. Go to **Authentication** → **Settings** in your Supabase dashboard
2. Configure the following:
   - **Site URL**: `http://localhost:3000` (for development)
   - **Redirect URLs**: Add your frontend URLs:
     - `http://localhost:3000/**`
     - `http://localhost:3001/**`
     - `http://localhost:3002/**`

## Step 6: Test the Connection

After updating the environment variables:

1. Restart all your servers
2. Test the API endpoints:
   ```bash
   curl http://localhost:5004/api/health
   curl http://localhost:5004/api/events
   ```

## Step 7: Create Your First Organizer User

1. Go to **Authentication** → **Users** in your Supabase dashboard
2. Click **Add user**
3. Create a user with:
   - **Email**: `organizer@joli.com`
   - **Password**: Your chosen password
   - **Email Confirm**: Check this box
4. After creation, set the user's role to `organizer` in the `users` table (or via SQL), if not already set

## Troubleshooting

### Common Issues:

1. **"fetch failed" errors**: 
   - Check that your SUPABASE_URL is correct
   - Ensure your internet connection is stable
   - Verify the project is fully created and active

2. **"relation does not exist" errors**:
   - Make sure you ran the setup SQL script
   - Check that all tables were created successfully

3. **Permission errors**:
   - Verify your service role key is correct
   - Check that RLS policies are properly configured

### Verification Commands:

```bash
# Test Supabase connection directly
curl -H "apikey: YOUR_ANON_KEY" \
     -H "Authorization: Bearer YOUR_ANON_KEY" \
     "https://your-project-ref.supabase.co/rest/v1/users?select=*"
```

## Next Steps

Once Supabase is properly configured:
1. All API endpoints should work correctly
2. Authentication will function properly
3. The frontend applications can connect to the backend
4. You can start creating events and testing the full application

---

**Important**: Keep your service role key secure and never commit it to version control in production!