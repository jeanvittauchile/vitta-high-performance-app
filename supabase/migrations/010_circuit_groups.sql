-- Groups 2+ exercises within the same block into a circuit/superset:
-- they're performed back-to-back with no rest between them, then the
-- round repeats. Exercises sharing the same circuit_group are rendered
-- together and checked off one round at a time.
ALTER TABLE session_exercises ADD COLUMN IF NOT EXISTS circuit_group text;
