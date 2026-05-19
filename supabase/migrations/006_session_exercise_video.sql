-- Add video/gif URL directly to session_exercises so coaches can set them per exercise
ALTER TABLE session_exercises ADD COLUMN IF NOT EXISTS video_url text;
ALTER TABLE session_exercises ADD COLUMN IF NOT EXISTS gif_url   text;
