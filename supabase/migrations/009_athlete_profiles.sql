-- ============================================================
-- Vitta — Perfil Deportivo del Atleta
-- ============================================================

create table athlete_profiles (
  id                    uuid primary key default uuid_generate_v4(),
  athlete_id            uuid not null references athletes(id) on delete cascade,
  peso                  numeric(5,1),           -- kg
  estatura              integer,                -- cm
  dias_entrenamiento    integer,                -- total días entrenados
  promedio_kcal         integer,                -- kcal diarias promedio
  nivel_entrenamiento   smallint check (nivel_entrenamiento between 1 and 4),
  historial_lesiones    text,
  created_at            timestamptz default now()
);

create index athlete_profiles_athlete_idx
  on athlete_profiles(athlete_id, created_at desc);

alter table athlete_profiles enable row level security;

-- Atleta: puede leer y escribir su propio perfil
create policy "athlete_own_profiles_select"
  on athlete_profiles for select
  using (
    athlete_id in (
      select id from athletes where user_id = auth.uid()
    )
  );

create policy "athlete_own_profiles_insert"
  on athlete_profiles for insert
  with check (
    athlete_id in (
      select id from athletes where user_id = auth.uid()
    )
  );

create policy "athlete_own_profiles_update"
  on athlete_profiles for update
  using (
    athlete_id in (
      select id from athletes where user_id = auth.uid()
    )
  );

-- Admin: acceso total
create policy "admin_all_athlete_profiles"
  on athlete_profiles for all
  using ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');
