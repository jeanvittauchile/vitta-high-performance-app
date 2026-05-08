-- ============================================================
-- Vitta — Session Feedback
-- ============================================================

create table session_feedback (
  id            uuid primary key default uuid_generate_v4(),
  session_id    uuid not null references sessions(id) on delete cascade,
  sleep_hours   numeric(3,1),          -- 1.0–12.0
  energy_level  integer,               -- 1–10
  pain_level    text,                  -- 'ninguno' | 'leve' | 'moderado' | 'fuerte'
  notes         text,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now(),
  unique (session_id)
);

-- RLS
alter table session_feedback enable row level security;

-- Admins: full access
create policy "admin_all_feedback" on session_feedback
  for all using (
    exists (select 1 from auth.users u where u.id = auth.uid() and u.raw_user_meta_data->>'role' = 'admin')
  );

-- Athletes: own sessions only
create policy "athlete_own_feedback" on session_feedback
  for all using (
    exists (
      select 1 from sessions s
      join athletes a on a.id = s.athlete_id
      where s.id = session_feedback.session_id
        and a.user_id = auth.uid()
    )
  );
