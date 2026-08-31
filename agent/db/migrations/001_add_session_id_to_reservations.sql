-- Run in Supabase SQL Editor
ALTER TABLE reservations
ADD COLUMN IF NOT EXISTS session_id TEXT;

CREATE INDEX IF NOT EXISTS idx_reservations_session_id
ON reservations (session_id);
