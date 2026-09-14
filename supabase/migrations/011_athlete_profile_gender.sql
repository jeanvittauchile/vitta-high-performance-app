-- Needed to pick the correct (masculino/femenino) strength standards table
-- when comparing an athlete's 1RM estimates against bodyweight multipliers.
ALTER TABLE athlete_profiles ADD COLUMN IF NOT EXISTS genero text CHECK (genero IN ('masculino', 'femenino'));
