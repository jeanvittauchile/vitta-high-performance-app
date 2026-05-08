-- ============================================================
-- Vitta — Fix RLS policies
--
-- Problem 1: admin policies used auth.jwt() ->> 'role' which
--   always returns 'authenticated', never 'admin'. The role
--   is stored in user_metadata, accessible via
--   auth.jwt() -> 'user_metadata' ->> 'role'.
--
-- Problem 2: athletes had no SELECT policies for
--   session_blocks, session_exercises, or sets, so the
--   today/session views returned empty blocks.
-- ============================================================

-- ─── Drop broken admin policies ────────────────────────────
drop policy if exists "admin_all_athletes"          on athletes;
drop policy if exists "admin_all_exercises"         on exercises;
drop policy if exists "admin_all_sessions"          on sessions;
drop policy if exists "admin_all_session_blocks"    on session_blocks;
drop policy if exists "admin_all_session_exercises" on session_exercises;
drop policy if exists "admin_all_sets"              on sets;
drop policy if exists "admin_all_month_plans"       on month_plans;
drop policy if exists "admin_all_messages"          on messages;
drop policy if exists "admin_all_feedback"          on session_feedback;

-- ─── Recreate admin policies with correct JWT path ─────────
create policy "admin_all_athletes"
  on athletes for all
  using ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

create policy "admin_all_exercises"
  on exercises for all
  using ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

create policy "admin_all_sessions"
  on sessions for all
  using ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

create policy "admin_all_session_blocks"
  on session_blocks for all
  using ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

create policy "admin_all_session_exercises"
  on session_exercises for all
  using ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

create policy "admin_all_sets"
  on sets for all
  using ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

create policy "admin_all_month_plans"
  on month_plans for all
  using ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

create policy "admin_all_messages"
  on messages for all
  using ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

create policy "admin_all_feedback"
  on session_feedback for all
  using ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

-- ─── Add missing athlete SELECT policies ───────────────────

-- session_blocks: athlete can read blocks of their sessions
create policy "athlete_own_session_blocks"
  on session_blocks for select
  using (
    session_id in (
      select s.id from sessions s
      join athletes a on a.id = s.athlete_id
      where a.user_id = auth.uid()
    )
  );

-- session_exercises: athlete can read exercises of their sessions
create policy "athlete_own_session_exercises"
  on session_exercises for select
  using (
    block_id in (
      select sb.id from session_blocks sb
      join sessions s on s.id = sb.session_id
      join athletes a on a.id = s.athlete_id
      where a.user_id = auth.uid()
    )
  );

-- sets: athlete can read (and update) their own sets
create policy "athlete_select_sets"
  on sets for select
  using (
    session_ex_id in (
      select se.id from session_exercises se
      join session_blocks sb on sb.id = se.block_id
      join sessions s on s.id = sb.session_id
      join athletes a on a.id = s.athlete_id
      where a.user_id = auth.uid()
    )
  );
