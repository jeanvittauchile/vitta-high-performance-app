-- ============================================================
-- Vitta — Plan Templates
-- ============================================================

create table plan_templates (
  id          uuid primary key default uuid_generate_v4(),
  name        text not null,
  description text,
  plan        jsonb not null,      -- DayType[4][7]
  exercises   jsonb default '{}',  -- Record<DayType, string[]>
  is_builtin  boolean default false,
  created_at  timestamptz default now()
);

alter table plan_templates enable row level security;

create policy "admin_all_plan_templates"
  on plan_templates for all
  using ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

create policy "auth_read_plan_templates"
  on plan_templates for select
  using (auth.uid() is not null);

-- ─── Seed built-in templates ───────────────────────────────

insert into plan_templates (name, description, plan, exercises, is_builtin) values
(
  'Estándar Vitta',
  'Push · Pull · Core + ENV · AER con descarga en S4',
  '[["EMP","TRC","ZM","MOV","ENV","AER","REST"],["EMP","TRC","ZM","MOV","ENV","AER","REST"],["EMP","TRC","ZM","MOV","ENV","AER","REST"],["DELOAD","REST","TRC","MOV","TEST","REST","REST"]]'::jsonb,
  '{"EMP":["Press banca","Press militar","Fondos en paralelas"],"TRC":["Dominadas","Remo con barra","Remo con mancuerna"],"ZM":["Plancha frontal","Press Pallof","Dead bug"],"ENV":["Sentadilla frontal","Tirón de envión","Power clean"],"AER":["Carrera Z2","Bici Sweet Spot"]}'::jsonb,
  true
),
(
  'Mesociclo Olímpico',
  'ARR · ENV · JRK con test y descarga en S4',
  '[["ARR","ENV","JRK","MOV","ARR","PRV","REST"],["ENV","ARR","JRK","MOV","ENV","PRV","REST"],["ARR","ENV","JRK","MOV","ARR","AER","REST"],["DELOAD","REST","MOV","REST","TEST","REST","REST"]]'::jsonb,
  '{"ARR":["Arranque colgante","Tirón de arranque","Power snatch","Snatch balance"],"ENV":["Power clean","Cargada colgante","Sentadilla frontal","Tirón de envión"],"JRK":["Split jerk","Push press","Push jerk"],"PRV":["Nordic curl","Copenhagen plank","Y-T-W de hombro"],"AER":["Carrera Z2"]}'::jsonb,
  true
),
(
  'Fuerza Base',
  'EMP y TRC alternados con ZM y AER',
  '[["EMP","TRC","ZM","REST","EMP","TRC","REST"],["ZM","EMP","TRC","MOV","EMP","TRC","REST"],["EMP","TRC","ZM","REST","EMP","AER","REST"],["TRC","REST","ZM","MOV","REST","REST","REST"]]'::jsonb,
  '{"EMP":["Press banca","Press militar","Fondos en paralelas","Press con mancuernas"],"TRC":["Dominadas","Remo con barra","Jalón al pecho"],"ZM":["Plancha frontal","Dead bug","Press Pallof","Elevación de piernas en barra"],"AER":["Carrera Z2","Intervalos VO2máx"]}'::jsonb,
  true
),
(
  'Aeróbico + Prevención',
  'AER diario con preventivos y movilidad',
  '[["AER","PRV","MOV","AER","PRV","AER","REST"],["AER","PRV","ZM","AER","PRV","AER","REST"],["AER","PRV","MOV","AER","COR","AER","REST"],["AER","REST","MOV","AER","REST","REST","REST"]]'::jsonb,
  '{"AER":["Carrera Z2","Carrera tempo","Intervalos VO2máx","Bici Sweet Spot"],"PRV":["Nordic curl","Copenhagen plank","Y-T-W de hombro","Elevación de gemelos"],"ZM":["Plancha frontal","Dead bug"],"COR":["Escalera de agilidad","Complejo con kettlebell"]}'::jsonb,
  true
);
