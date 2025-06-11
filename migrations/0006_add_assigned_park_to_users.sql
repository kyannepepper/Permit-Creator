-- Add assigned_park_id column to users table
ALTER TABLE users ADD COLUMN assigned_park_id INTEGER REFERENCES parks(id);

-- Add index for better performance on park lookups
CREATE INDEX idx_users_assigned_park_id ON users(assigned_park_id);