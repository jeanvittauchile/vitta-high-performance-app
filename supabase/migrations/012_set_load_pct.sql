-- Persists the %1RM used to calculate a set's load (when the coach used the
-- %1RM helper instead of typing an absolute weight). This lets "copy session"
-- reapply the percentage against the target athlete's own 1RM instead of
-- blindly copying the source athlete's kg.
ALTER TABLE sets ADD COLUMN IF NOT EXISTS load_pct numeric(5,1);
