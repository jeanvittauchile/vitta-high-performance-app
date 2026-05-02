-- ============================================================
-- Vitta High Performance — Initial Schema
-- ============================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ─── Athletes ──────────────────────────────────────────────
create table athletes (
  id            uuid primary key default uuid_generate_v4(),
  user_id       uuid references auth.users(id) on delete cascade,
  name          text not null,
  initials      text not null,
  age           integer,
  weekly_hours  integer default 5,
  focus         text not null,                  -- CategoryId
  adherence     integer default 0,
  rpe7          numeric(3,1) default 7.0,
  status        text default 'on-track',        -- AthleteStatus
  color         text default '#2E6BD6',
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

-- ─── Exercises ─────────────────────────────────────────────
create table exercises (
  id          uuid primary key default uuid_generate_v4(),
  slug        text unique not null,             -- stable id like "ex_bench"
  name        text not null,
  category    text not null,                    -- CategoryId
  level       text not null,                    -- LevelId
  muscle      text,
  equipment   text,
  video_url   text,
  cues        text[],
  created_at  timestamptz default now()
);

-- ─── Sessions ──────────────────────────────────────────────
create table sessions (
  id          uuid primary key default uuid_generate_v4(),
  athlete_id  uuid references athletes(id) on delete cascade,
  date        date not null,
  title       text not null,
  block       text,
  duration    integer default 60,               -- minutes
  rpe_target  numeric(3,1) default 7.0,
  created_at  timestamptz default now()
);

-- ─── Session Blocks ────────────────────────────────────────
create table session_blocks (
  id          uuid primary key default uuid_generate_v4(),
  session_id  uuid references sessions(id) on delete cascade,
  name        text not null,
  category    text not null,
  color       text,
  sort_order  integer default 0
);

-- ─── Session Exercises ─────────────────────────────────────
create table session_exercises (
  id          uuid primary key default uuid_generate_v4(),
  block_id    uuid references session_blocks(id) on delete cascade,
  exercise_id uuid references exercises(id),
  name        text not null,                    -- may differ from exercise.name
  level       text,
  note        text,
  sort_order  integer default 0
);

-- ─── Sets ──────────────────────────────────────────────────
create table sets (
  id              uuid primary key default uuid_generate_v4(),
  session_ex_id   uuid references session_exercises(id) on delete cascade,
  reps            text,                         -- "6", "8/lado", "45s"
  load            text,                         -- "75", "—"
  rpe_target      numeric(3,1),
  rest            text,                         -- "2:00", "—"
  done            boolean default false,
  actual_reps     integer,
  actual_load     numeric(5,1),
  actual_rpe      numeric(3,1),
  sort_order      integer default 0
);

-- ─── Month Plans ───────────────────────────────────────────
create table month_plans (
  id          uuid primary key default uuid_generate_v4(),
  athlete_id  uuid references athletes(id) on delete cascade,
  year        integer not null,
  month       integer not null,                 -- 1-12
  plan        jsonb not null,                   -- DayType[4][7]
  created_at  timestamptz default now(),
  unique (athlete_id, year, month)
);

-- ─── Messages ──────────────────────────────────────────────
create table messages (
  id            uuid primary key default uuid_generate_v4(),
  thread_id     uuid not null,                  -- = athlete.id
  from_role     text not null,                  -- 'coach' | 'athlete'
  text          text not null,
  attachment_name text,
  attachment_url  text,
  attachment_type text,
  created_at    timestamptz default now()
);

-- ─── Row Level Security ────────────────────────────────────
alter table athletes         enable row level security;
alter table exercises        enable row level security;
alter table sessions         enable row level security;
alter table session_blocks   enable row level security;
alter table session_exercises enable row level security;
alter table sets             enable row level security;
alter table month_plans      enable row level security;
alter table messages         enable row level security;

-- Admin can see/modify everything
create policy "admin_all_athletes"          on athletes          for all using (auth.jwt() ->> 'role' = 'admin');
create policy "admin_all_exercises"         on exercises         for all using (auth.jwt() ->> 'role' = 'admin');
create policy "admin_all_sessions"          on sessions          for all using (auth.jwt() ->> 'role' = 'admin');
create policy "admin_all_session_blocks"    on session_blocks    for all using (auth.jwt() ->> 'role' = 'admin');
create policy "admin_all_session_exercises" on session_exercises for all using (auth.jwt() ->> 'role' = 'admin');
create policy "admin_all_sets"              on sets              for all using (auth.jwt() ->> 'role' = 'admin');
create policy "admin_all_month_plans"       on month_plans       for all using (auth.jwt() ->> 'role' = 'admin');
create policy "admin_all_messages"          on messages          for all using (auth.jwt() ->> 'role' = 'admin');

-- Athletes can see their own data
create policy "athlete_own_profile"   on athletes   for select using (user_id = auth.uid());
create policy "athlete_own_sessions"  on sessions   for select using (athlete_id in (select id from athletes where user_id = auth.uid()));
create policy "athlete_own_plans"     on month_plans for select using (athlete_id in (select id from athletes where user_id = auth.uid()));
create policy "athlete_read_exercises" on exercises  for select using (true);
create policy "athlete_own_messages"  on messages   for select using (thread_id in (select id from athletes where user_id = auth.uid()));
create policy "athlete_send_messages" on messages   for insert with check (from_role = 'athlete' and thread_id in (select id from athletes where user_id = auth.uid()));

-- Athletes can mark their own sets as done
create policy "athlete_update_sets" on sets for update using (
  session_ex_id in (
    select se.id from session_exercises se
    join session_blocks sb on sb.id = se.block_id
    join sessions s on s.id = sb.session_id
    join athletes a on a.id = s.athlete_id
    where a.user_id = auth.uid()
  )
);

-- ─── Seed: exercise library ────────────────────────────────
insert into exercises (slug, name, category, level, muscle, equipment) values
  ('ex_pullup',      'Dominadas',                        'traccion',           'avanzado',   'Dorsal · Bíceps',              'Barra fija'),
  ('ex_row_b',       'Remo con barra',                   'traccion',           'intermedio', 'Dorsal · Romboides',            'Barra'),
  ('ex_row_db',      'Remo con mancuerna',               'traccion',           'basico',     'Dorsal',                        'Mancuerna + banco'),
  ('ex_pulldown',    'Jalón al pecho',                   'traccion',           'basico',     'Dorsal',                        'Polea'),
  ('ex_bench',       'Press banca',                      'empuje',             'intermedio', 'Pectoral · Tríceps',            'Barra + banco'),
  ('ex_ohp',         'Press militar',                    'empuje',             'intermedio', 'Hombro · Tríceps',              'Barra'),
  ('ex_pushup',      'Flexiones de brazos',              'empuje',             'basico',     'Pectoral',                      '—'),
  ('ex_dbpress',     'Press con mancuernas',             'empuje',             'basico',     'Pectoral',                      'Mancuernas'),
  ('ex_dip',         'Fondos en paralelas',              'empuje',             'avanzado',   'Tríceps · Pectoral',            'Paralelas'),
  ('ex_plank',       'Plancha frontal',                  'zona_media',         'basico',     'Core anterior',                 '—'),
  ('ex_deadbug',     'Dead bug',                         'zona_media',         'basico',     'Core profundo',                 '—'),
  ('ex_pallof',      'Press Pallof',                     'zona_media',         'intermedio', 'Anti-rotación',                 'Polea / banda'),
  ('ex_hanging_leg', 'Elevación de piernas en barra',    'zona_media',         'avanzado',   'Recto abdominal',               'Barra fija'),
  ('ex_snatch_pull', 'Tirón de arranque',                'arranque',           'intermedio', 'Cadena posterior',              'Barra olímpica'),
  ('ex_hang_snatch', 'Arranque colgante',                'arranque',           'avanzado',   'Potencia total',                'Barra olímpica'),
  ('ex_pwr_snatch',  'Power snatch',                     'arranque',           'avanzado',   'Potencia · Hombro',             'Barra olímpica'),
  ('ex_snatch_balance','Snatch balance',                 'arranque',           'avanzado',   'Estabilidad sobre cabeza',      'Barra olímpica'),
  ('ex_clean_pull',  'Tirón de envión',                  'envion',             'intermedio', 'Cadena posterior',              'Barra olímpica'),
  ('ex_hang_clean',  'Cargada colgante',                 'envion',             'avanzado',   'Potencia',                      'Barra olímpica'),
  ('ex_pwr_clean',   'Power clean',                      'envion',             'avanzado',   'Potencia',                      'Barra olímpica'),
  ('ex_front_squat', 'Sentadilla frontal',               'envion',             'intermedio', 'Cuádriceps · Core',             'Barra olímpica'),
  ('ex_push_press',  'Push press',                       'jerk',               'intermedio', 'Hombro · Cadera',               'Barra olímpica'),
  ('ex_split_jerk',  'Split jerk',                       'jerk',               'avanzado',   'Potencia hombro',               'Barra olímpica'),
  ('ex_push_jerk',   'Push jerk',                        'jerk',               'avanzado',   'Potencia hombro',               'Barra olímpica'),
  ('ex_plyo_pushup', 'Flexión pliométrica',              'pliometria_brazos',  'intermedio', 'Pectoral',                      '—'),
  ('ex_clap_pushup', 'Flexión con palmada',              'pliometria_brazos',  'avanzado',   'Potencia tren superior',        '—'),
  ('ex_med_chest',   'Pase de pecho con balón medicinal','pliometria_brazos',  'basico',     'Pectoral',                      'Balón medicinal'),
  ('ex_box_jump',    'Salto al cajón',                   'pliometria_piernas', 'intermedio', 'Cadena posterior',              'Cajón 60cm'),
  ('ex_broad_jump',  'Salto horizontal',                 'pliometria_piernas', 'basico',     'Potencia',                      '—'),
  ('ex_depth_jump',  'Depth jump',                       'pliometria_piernas', 'avanzado',   'Reactividad',                   'Cajón'),
  ('ex_bound',       'Multisaltos alternados',           'pliometria_piernas', 'intermedio', 'Potencia unilateral',           '—'),
  ('ex_throw_overh', 'Lanzamiento por encima de la cabeza','lanzamientos',     'basico',     'Cadena cinética',               'Balón medicinal'),
  ('ex_rot_throw',   'Lanzamiento rotacional',           'lanzamientos',       'intermedio', 'Core rotacional',               'Balón medicinal'),
  ('ex_slam_ball',   'Slam ball',                        'lanzamientos',       'basico',     'Core total',                    'Slam ball'),
  ('ex_run_z2',      'Carrera Z2',                       'aerobicos',          'basico',     'Resistencia base',              '—'),
  ('ex_intervals',   'Intervalos VO2máx',                'aerobicos',          'avanzado',   'VO2máx',                        'Pista'),
  ('ex_tempo',       'Carrera tempo',                    'aerobicos',          'intermedio', 'Umbral',                        '—'),
  ('ex_bike_ss',     'Bici Sweet Spot',                  'aerobicos',          'intermedio', 'Umbral funcional',              'Bici / rodillo'),
  ('ex_nordic',      'Nordic curl',                      'preventivos',        'avanzado',   'Isquiosurales',                 'Banco / partner'),
  ('ex_copen',       'Copenhagen plank',                 'preventivos',        'intermedio', 'Aductores',                     'Banco'),
  ('ex_yt_w',        'Y-T-W de hombro',                  'preventivos',        'basico',     'Manguito rotador',              'Mancuernas ligeras'),
  ('ex_calf_raise',  'Elevación de gemelos',             'preventivos',        'basico',     'Tríceps sural',                 'Step'),
  ('ex_mob_hip',     '90/90 cadera',                     'movilidad',          'basico',     'Cadera',                        'Esterilla'),
  ('ex_mob_thoracic','Movilidad torácica',               'movilidad',          'basico',     'Columna torácica',              'Foam roller'),
  ('ex_mob_ankle',   'Movilidad tobillo en pared',       'movilidad',          'basico',     'Tobillo',                       '—'),
  ('ex_mob_overh',   'Movilidad sobre cabeza',           'movilidad',          'intermedio', 'Hombro · torácica',             'Pica'),
  ('ex_ladder',      'Escalera de agilidad',             'coordinacion',       'basico',     'Coordinación',                  'Escalera'),
  ('ex_complex_oly', 'Complejo olímpico (clean+jerk+squat)','coordinacion',    'avanzado',   'Coordinación inter-muscular',   'Barra olímpica'),
  ('ex_kb_complex',  'Complejo con kettlebell',          'coordinacion',       'intermedio', 'Coordinación',                  'Kettlebell');
