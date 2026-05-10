-- Add ExerciseDB integration fields to exercises table
ALTER TABLE exercises ADD COLUMN IF NOT EXISTS source  text;
ALTER TABLE exercises ADD COLUMN IF NOT EXISTS gif_url text;
