-- Create users table in Supabase
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/zccvoszbsvviovarkjbf/editor

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_login TIMESTAMPTZ
);

-- Create index on email for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Enable Row Level Security (RLS)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Create policy to allow service role to do everything
CREATE POLICY "Service role can do everything" ON users
    FOR ALL
    USING (true)
    WITH CHECK (true);
