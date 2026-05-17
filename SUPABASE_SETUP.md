# Supabase Integration Setup Guide

## Overview
This guide explains how to set up your Supabase database to work with the TaskHub application.

## Database Schema

### 1. Profiles Table
This table stores user profile information.

**SQL:**
```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  username TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index on email for faster lookups
CREATE INDEX idx_profiles_email ON profiles(email);
CREATE INDEX idx_profiles_username ON profiles(username);

-- Enable RLS (Row Level Security)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own profile
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

-- Policy: Users can only update their own profile
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Policy: Users can insert their own profile
CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);
```

### 2. Tasks Table
This table stores all task data.

**SQL:**
```sql
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  done BOOLEAN NOT NULL DEFAULT FALSE,
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  due_date TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT valid_priority CHECK (priority IN ('low', 'medium', 'high'))
);

-- Create indexes for faster queries
CREATE INDEX idx_tasks_user_id ON tasks(user_id);
CREATE INDEX idx_tasks_created_at ON tasks(created_at DESC);
CREATE INDEX idx_tasks_done ON tasks(done);
CREATE INDEX idx_tasks_priority ON tasks(priority);

-- Enable RLS (Row Level Security)
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own tasks
CREATE POLICY "Users can view own tasks"
  ON tasks FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can only insert their own tasks
CREATE POLICY "Users can insert own tasks"
  ON tasks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can only update their own tasks
CREATE POLICY "Users can update own tasks"
  ON tasks FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can only delete their own tasks
CREATE POLICY "Users can delete own tasks"
  ON tasks FOR DELETE
  USING (auth.uid() = user_id);
```

## Setup Steps

### 1. Create Tables in Supabase
1. Go to your Supabase project dashboard
2. Navigate to SQL Editor
3. Create a new query
4. Copy and paste the SQL code above for both tables
5. Execute each query

### 2. Enable Authentication
1. Go to Authentication → Providers
2. Enable Email provider
3. Configure email templates if needed

### 3. Set Up Environment Keys
Your `supabase.ts` file already has the correct setup:
```typescript
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "YOUR_SUPABASE_URL";
const supabaseAnonKey = "YOUR_SUPABASE_ANON_KEY";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

## API Functions Available

### Authentication Functions
- `signUpWithEmail(email, password, username)` - Register new user
- `signInWithEmail(email, password)` - Sign in existing user
- `signOut()` - Sign out current user
- `getCurrentUser()` - Get current logged-in user

### Task Functions
- `createTask(userId, taskData)` - Create new task
- `getTasks(userId)` - Fetch all tasks for user
- `updateTask(taskId, updates)` - Update task details
- `deleteTask(taskId)` - Delete a task
- `toggleTask(taskId, currentStatus)` - Toggle task completion status

## Data Flow

### User Registration/Login
```
AuthScreen → signUpWithEmail/signInWithEmail 
→ Supabase Auth API 
→ Store profile in profiles table
→ Update App state with user data
```

### Task Management
```
App Component → Task Functions (createTask, updateTask, deleteTask, etc.)
→ Supabase Tasks API
→ Update local state
→ UI reflects changes
```

## Security Considerations

1. **Row Level Security (RLS)**: All tables have RLS enabled to ensure users can only access their own data
2. **Password Security**: Supabase handles password hashing and encryption
3. **Email Verification**: Consider enabling email verification in production
4. **API Rate Limiting**: Supabase includes built-in rate limiting

## Testing the Integration

### Test Sign Up
1. Launch the app
2. Go to "Sign Up" tab
3. Enter valid email, username, and password
4. Check Supabase dashboard → Authentication to see new user

### Test Task Creation
1. Sign in with your test account
2. Create a new task
3. Go to Supabase dashboard → SQL Editor
4. Run: `SELECT * FROM tasks WHERE user_id = 'your_user_id'`
5. Verify the task appears in the database

### Test Task Updates
1. Mark a task as complete
2. Edit a task
3. Delete a task
4. Verify changes in Supabase dashboard

## Troubleshooting

### "User doesn't exist" error
- Make sure the user was created successfully in the profiles table
- Check if the email exists in auth.users

### CORS errors
- Make sure your Supabase project allows requests from your app domain
- Check network tab in browser dev tools for specific error messages

### Tasks not loading
- Verify RLS policies are correctly set
- Check that user_id matches the authenticated user's ID
- Look at Supabase logs for any errors

## Production Considerations

1. **Enable Email Verification**: Require users to verify their email
2. **Add Rate Limiting**: Implement request throttling on the client
3. **Use Connection Pooling**: For backend services
4. **Monitor Usage**: Set up alerts for quota usage
5. **Backup Data**: Enable automated backups in Supabase settings
6. **Update Node Modules**: Keep @supabase/supabase-js updated for security patches

## Resources

- Supabase Documentation: https://supabase.com/docs
- Supabase Auth Docs: https://supabase.com/docs/guides/auth
- Row Level Security: https://supabase.com/docs/guides/auth/row-level-security
- React Native with Supabase: https://supabase.com/docs/guides/realtime/quickstarts/react-native
