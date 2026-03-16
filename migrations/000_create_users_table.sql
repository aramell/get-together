-- Create users table to store user profile data
-- Uses Cognito's sub (subject/user ID) as the primary key
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(128) PRIMARY KEY,  -- Cognito sub claim
  email VARCHAR(255) NOT NULL UNIQUE,
  display_name VARCHAR(255),
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index on email for fast lookups
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
