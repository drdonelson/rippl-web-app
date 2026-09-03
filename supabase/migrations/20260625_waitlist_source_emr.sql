-- Add source and emr columns to waitlist table
ALTER TABLE waitlist ADD COLUMN IF NOT EXISTS source text;
ALTER TABLE waitlist ADD COLUMN IF NOT EXISTS emr text;
