import type { Category, Level, Exercise, Athlete, Session, MonthPlan, DayType, CategoryId } from './types';

export const CATEGORIES: Record<string, Category> = {
  traccion:           { id: 'traccion',           label: 'Tracción',                short: 'TRC', color: '#2E6BD6', iconKey: 'pull'      },
  empuje:             { id: 'empuje',             label: 'Empuje',                  short: 'EMP', color: '#D7474B', iconKey: 'push'      },
  zona_media:         { id: 'zona_media',         label: 'Zona Media',              short: 'ZM',  color: '#E8A33A', iconKey: 'core'      },
  arranque:           { id: 'arranque',           label: 'Derivados de Arranque',   short: 'ARR', color: '#6E59E0', iconKey: 'snatch'    },
  envion:             { id: 'envion',             label: 'Envión',                  short: 'ENV', color: '#1B2A57', iconKey: 'clean'     },
  jerk:               { id: 'jerk',               label: 'Jerk',                    short: 'JRK', color: '#0E1936', iconKey: 'jerk'      },
  pliometria_brazos:  { id: 'pliometria_brazos',  label: 'Pliometría de Brazos',    short: 'PLB', color: '#4A8AF0', iconKey: 'plyo-arm'  },
  pliometria_piernas: { id: 'pliometria_piernas', label: 'Pliometría de Piernas',   short: 'PLP', color: '#2BB673', iconKey: 'plyo-leg'  },
  lanzamientos:       { id: 'lanzamientos',       label: 'Lanzamientos',            short: 'LNZ', color: '#D7474B', iconKey: 'throw'     },
  aerobicos:          { id: 'aerobicos',          label: 'Aeróbicos',               short: 'AER', color: '#2BB673', iconKey: 'run'       },
  preventivos:        { id: 'preventivos',        label: 'Preventivos',             short: 'PRV', color: '#5C6480', iconKey: 'shield'    },
  movilidad:          { id: 'movilidad',          label: 'Movilidad General',       short: 'MOV', color: '#9098AE', iconKey: 'mobility'  },
  coordinacion:       { id: 'coordinacion',       label: 'Coordinación Compleja',   short: 'COR', color: '#6E59E0', iconKey: 'coord'     },
};

export const LEVELS: Record<string, Level> = {
  basico:     { id: 'basico',     label: 'Básico',     short: 'B', color: '#2BB673', index: 1 },
  intermedio: { id: 'intermedio', label: 'Intermedio', short: 'I', color: '#E8A33A', index: 2 },
  avanzado:   { id: 'avanzado',   label: 'Avanzado',   short: 'A', color: '#D7474B', index: 3 },
};

export const EXERCISES: Exercise[] = [
  { id: 'ex_pullup',     name: 'Dominadas',                        category: 'traccion',           level: 'avanzado',   muscle: 'Dorsal · Bíceps',              equipment: 'Barra fija' },
  { id: 'ex_row_b',      name: 'Remo con barra',                   category: 'traccion',           level: 'intermedio', muscle: 'Dorsal · Romboides',            equipment: 'Barra' },
  { id: 'ex_row_db',     name: 'Remo con mancuerna',               category: 'traccion',           level: 'basico',     muscle: 'Dorsal',                        equipment: 'Mancuerna + banco' },
  { id: 'ex_pulldown',   name: 'Jalón al pecho',                   category: 'traccion',           level: 'basico',     muscle: 'Dorsal',                        equipment: 'Polea' },
  { id: 'ex_bench',      name: 'Press banca',                      category: 'empuje',             level: 'intermedio', muscle: 'Pectoral · Tríceps',            equipment: 'Barra + banco' },
  { id: 'ex_ohp',        name: 'Press militar',                    category: 'empuje',             level: 'intermedio', muscle: 'Hombro · Tríceps',              equipment: 'Barra' },
  { id: 'ex_pushup',     name: 'Flexiones de brazos',              category: 'empuje',             level: 'basico',     muscle: 'Pectoral',                      equipment: '—' },
  { id: 'ex_dbpress',    name: 'Press con mancuernas',             category: 'empuje',             level: 'basico',     muscle: 'Pectoral',                      equipment: 'Mancuernas' },
  { id: 'ex_dip',        name: 'Fondos en paralelas',              category: 'empuje',             level: 'avanzado',   muscle: 'Tríceps · Pectoral',            equipment: 'Paralelas' },
  { id: 'ex_plank',      name: 'Plancha frontal',                  category: 'zona_media',         level: 'basico',     muscle: 'Core anterior',                 equipment: '—' },
  { id: 'ex_deadbug',    name: 'Dead bug',                         category: 'zona_media',         level: 'basico',     muscle: 'Core profundo',                 equipment: '—' },
  { id: 'ex_pallof',     name: 'Press Pallof',                     category: 'zona_media',         level: 'intermedio', muscle: 'Anti-rotación',                 equipment: 'Polea / banda' },
  { id: 'ex_hanging_leg',name: 'Elevación de piernas en barra',    category: 'zona_media',         level: 'avanzado',   muscle: 'Recto abdominal',               equipment: 'Barra fija' },
  { id: 'ex_snatch_pull',name: 'Tirón de arranque',                category: 'arranque',           level: 'intermedio', muscle: 'Cadena posterior',              equipment: 'Barra olímpica' },
  { id: 'ex_hang_snatch',name: 'Arranque colgante',                category: 'arranque',           level: 'avanzado',   muscle: 'Potencia total',                equipment: 'Barra olímpica' },
  { id: 'ex_pwr_snatch', name: 'Power snatch',                     category: 'arranque',           level: 'avanzado',   muscle: 'Potencia · Hombro',             equipment: 'Barra olímpica' },
  { id: 'ex_snatch_balance', name: 'Snatch balance',               category: 'arranque',           level: 'avanzado',   muscle: 'Estabilidad sobre cabeza',      equipment: 'Barra olímpica' },
  { id: 'ex_clean_pull', name: 'Tirón de envión',                  category: 'envion',             level: 'intermedio', muscle: 'Cadena posterior',              equipment: 'Barra olímpica' },
  { id: 'ex_hang_clean', name: 'Cargada colgante',                 category: 'envion',             level: 'avanzado',   muscle: 'Potencia',                      equipment: 'Barra olímpica' },
  { id: 'ex_pwr_clean',  name: 'Power clean',                      category: 'envion',             level: 'avanzado',   muscle: 'Potencia',                      equipment: 'Barra olímpica' },
  { id: 'ex_front_squat',name: 'Sentadilla frontal',               category: 'envion',             level: 'intermedio', muscle: 'Cuádriceps · Core',             equipment: 'Barra olímpica' },
  { id: 'ex_push_press', name: 'Push press',                       category: 'jerk',               level: 'intermedio', muscle: 'Hombro · Cadera',               equipment: 'Barra olímpica' },
  { id: 'ex_split_jerk', name: 'Split jerk',                       category: 'jerk',               level: 'avanzado',   muscle: 'Potencia hombro',               equipment: 'Barra olímpica' },
  { id: 'ex_push_jerk',  name: 'Push jerk',                        category: 'jerk',               level: 'avanzado',   muscle: 'Potencia hombro',               equipment: 'Barra olímpica' },
  { id: 'ex_plyo_pushup',name: 'Flexión pliométrica',              category: 'pliometria_brazos',  level: 'intermedio', muscle: 'Pectoral',                      equipment: '—' },
  { id: 'ex_clap_pushup',name: 'Flexión con palmada',              category: 'pliometria_brazos',  level: 'avanzado',   muscle: 'Potencia tren superior',        equipment: '—' },
  { id: 'ex_med_chest',  name: 'Pase de pecho con balón medicinal',category: 'pliometria_brazos',  level: 'basico',     muscle: 'Pectoral',                      equipment: 'Balón medicinal' },
  { id: 'ex_box_jump',   name: 'Salto al cajón',                   category: 'pliometria_piernas', level: 'intermedio', muscle: 'Cadena posterior',              equipment: 'Cajón 60cm' },
  { id: 'ex_broad_jump', name: 'Salto horizontal',                 category: 'pliometria_piernas', level: 'basico',     muscle: 'Potencia',                      equipment: '—' },
  { id: 'ex_depth_jump', name: 'Depth jump',                       category: 'pliometria_piernas', level: 'avanzado',   muscle: 'Reactividad',                   equipment: 'Cajón' },
  { id: 'ex_bound',      name: 'Multisaltos alternados',           category: 'pliometria_piernas', level: 'intermedio', muscle: 'Potencia unilateral',           equipment: '—' },
  { id: 'ex_throw_overh',name: 'Lanzamiento por encima de la cabeza', category: 'lanzamientos',   level: 'basico',     muscle: 'Cadena cinética',               equipment: 'Balón medicinal' },
  { id: 'ex_rot_throw',  name: 'Lanzamiento rotacional',           category: 'lanzamientos',       level: 'intermedio', muscle: 'Core rotacional',               equipment: 'Balón medicinal' },
  { id: 'ex_slam_ball',  name: 'Slam ball',                        category: 'lanzamientos',       level: 'basico',     muscle: 'Core total',                    equipment: 'Slam ball' },
  { id: 'ex_run_z2',     name: 'Carrera Z2',                       category: 'aerobicos',          level: 'basico',     muscle: 'Resistencia base',              equipment: '—' },
  { id: 'ex_intervals',  name: 'Intervalos VO2máx',                category: 'aerobicos',          level: 'avanzado',   muscle: 'VO2máx',                        equipment: 'Pista' },
  { id: 'ex_tempo',      name: 'Carrera tempo',                    category: 'aerobicos',          level: 'intermedio', muscle: 'Umbral',                        equipment: '—' },
  { id: 'ex_bike_ss',    name: 'Bici Sweet Spot',                  category: 'aerobicos',          level: 'intermedio', muscle: 'Umbral funcional',              equipment: 'Bici / rodillo' },
  { id: 'ex_nordic',     name: 'Nordic curl',                      category: 'preventivos',        level: 'avanzado',   muscle: 'Isquiosurales',                 equipment: 'Banco / partner' },
  { id: 'ex_copen',      name: 'Copenhagen plank',                 category: 'preventivos',        level: 'intermedio', muscle: 'Aductores',                     equipment: 'Banco' },
  { id: 'ex_yt_w',       name: 'Y-T-W de hombro',                  category: 'preventivos',        level: 'basico',     muscle: 'Manguito rotador',              equipment: 'Mancuernas ligeras' },
  { id: 'ex_calf_raise', name: 'Elevación de gemelos',             category: 'preventivos',        level: 'basico',     muscle: 'Tríceps sural',                 equipment: 'Step' },
  { id: 'ex_mob_hip',    name: '90/90 cadera',                     category: 'movilidad',          level: 'basico',     muscle: 'Cadera',                        equipment: 'Esterilla' },
  { id: 'ex_mob_thoracic',name: 'Movilidad torácica',              category: 'movilidad',          level: 'basico',     muscle: 'Columna torácica',              equipment: 'Foam roller' },
  { id: 'ex_mob_ankle',  name: 'Movilidad tobillo en pared',       category: 'movilidad',          level: 'basico',     muscle: 'Tobillo',                       equipment: '—' },
  { id: 'ex_mob_overh',  name: 'Movilidad sobre cabeza',           category: 'movilidad',          level: 'intermedio', muscle: 'Hombro · torácica',             equipment: 'Pica' },
  { id: 'ex_ladder',     name: 'Escalera de agilidad',             category: 'coordinacion',       level: 'basico',     muscle: 'Coordinación',                  equipment: 'Escalera' },
  { id: 'ex_complex_oly',name: 'Complejo olímpico (clean+jerk+squat)', category: 'coordinacion',  level: 'avanzado',   muscle: 'Coordinación inter-muscular',   equipment: 'Barra olímpica' },
  { id: 'ex_kb_complex', name: 'Complejo con kettlebell',          category: 'coordinacion',       level: 'intermedio', muscle: 'Coordinación',                  equipment: 'Kettlebell' },
];

export const ATHLETES: Athlete[] = [
  { id: 'a1', name: 'Camila Rojas',   focus: 'aerobicos',           age: 28, weeklyHours: 7,  adherence: 92, initials: 'CR', rpe7: 7.2, status: 'on-track', color: '#E8A33A' },
  { id: 'a2', name: 'Mateo Herrera',  focus: 'envion',              age: 32, weeklyHours: 5,  adherence: 88, initials: 'MH', rpe7: 8.1, status: 'peak',     color: '#1B2A57' },
  { id: 'a3', name: 'Lucía Mendoza',  focus: 'aerobicos',           age: 35, weeklyHours: 12, adherence: 96, initials: 'LM', rpe7: 6.8, status: 'on-track', color: '#6E59E0' },
  { id: 'a4', name: 'Diego Salinas',  focus: 'preventivos',         age: 41, weeklyHours: 9,  adherence: 78, initials: 'DS', rpe7: 5.9, status: 'deload',   color: '#2BB673' },
  { id: 'a5', name: 'Ana Vargas',     focus: 'movilidad',           age: 24, weeklyHours: 10, adherence: 84, initials: 'AV', rpe7: 7.5, status: 'on-track', color: '#4A8AF0' },
  { id: 'a6', name: 'Tomás Ríos',     focus: 'pliometria_piernas',  age: 19, weeklyHours: 6,  adherence: 70, initials: 'TR', rpe7: 6.2, status: 'missed',   color: '#2BB673' },
  { id: 'a7', name: 'Valentina Paz',  focus: 'coordinacion',        age: 22, weeklyHours: 8,  adherence: 95, initials: 'VP', rpe7: 7.0, status: 'on-track', color: '#E8A33A' },
  { id: 'a8', name: 'Nicolás Vidal',  focus: 'arranque',            age: 29, weeklyHours: 7,  adherence: 90, initials: 'NV', rpe7: 7.8, status: 'peak',     color: '#6E59E0' },
];

export const TODAY_SESSION: Session = {
  title: 'Sesión integral · Empuje + Zona Media',
  block: 'Mesociclo 2 · Semana 3 · Acumulación',
  duration: 75,
  rpe_target: 7.5,
  blocks: [
    {
      id: 'warm', name: 'Movilidad General', color: '#9098AE', category: 'movilidad',
      items: [
        { id: 'w1', exId: 'ex_mob_hip',      name: 'Movilidad cadera 90/90', level: 'basico', sets: [{ r: '8/lado', l: '—', rest: '—' }], note: 'Lento, controlado' },
        { id: 'w2', exId: 'ex_mob_thoracic', name: 'Movilidad torácica',     level: 'basico', sets: [{ r: '10 reps', l: '—', rest: '—' }] },
      ],
    },
    {
      id: 'prev', name: 'Preventivos', color: '#5C6480', category: 'preventivos',
      items: [
        { id: 'p1', exId: 'ex_yt_w', name: 'Y-T-W de hombro', level: 'basico',
          sets: [{ r: 10, l: 2, rest: '30s' }, { r: 10, l: 2, rest: '30s' }], note: 'Activación previa al empuje' },
      ],
    },
    {
      id: 'main', name: 'Empuje', color: '#D7474B', category: 'empuje',
      items: [
        { id: 'm1', exId: 'ex_bench', name: 'Press banca', level: 'intermedio',
          sets: [
            { r: 6, l: 60, rpe: 7, rest: '2:00' },
            { r: 6, l: 70, rpe: 8, rest: '2:00' },
            { r: 6, l: 75, rpe: 8.5, rest: '2:30' },
            { r: 6, l: 75, rpe: 9, rest: '—' },
          ],
          note: 'Codos a 45°. Pies firmes.' },
        { id: 'm2', exId: 'ex_ohp', name: 'Press militar', level: 'intermedio',
          sets: [
            { r: 5, l: 40, rpe: 7, rest: '2:00' },
            { r: 5, l: 45, rpe: 8, rest: '2:00' },
            { r: 5, l: 47, rpe: 8.5, rest: '—' },
          ],
          note: 'Glúteo activo, ribs abajo' },
      ],
    },
    {
      id: 'core', name: 'Zona Media', color: '#E8A33A', category: 'zona_media',
      items: [
        { id: 'c1', exId: 'ex_pallof', name: 'Press Pallof', level: 'intermedio',
          sets: [
            { r: '10/lado', l: 15, rpe: 7, rest: '45s' },
            { r: '10/lado', l: 15, rpe: 7, rest: '45s' },
            { r: '10/lado', l: 18, rpe: 7.5, rest: '—' },
          ],
          note: 'Anti-rotación · sin bloquear caderas' },
        { id: 'c2', exId: 'ex_plank', name: 'Plancha frontal', level: 'basico',
          sets: [{ r: '45s', l: '—', rest: '30s' }, { r: '45s', l: '—', rest: '—' }] },
      ],
    },
  ],
};

export const MONTH_PLAN: MonthPlan = [
  ['EMP','TRC','ZM','MOV','ENV','AER','REST'],
  ['EMP','TRC','ZM','MOV','ENV','AER','REST'],
  ['EMP','TRC','ZM','MOV','ENV','AER','REST'],
  ['DELOAD','REST','TRC','MOV','TEST','REST','REST'],
];

export const DAY_TYPES: Record<string, { label: string; color: string; bg: string }> = {
  'REST':   { label: 'Descanso',         color: '#5C6480', bg: 'rgba(92,100,128,0.08)'  },
  'MOV':    { label: 'Movilidad',        color: '#9098AE', bg: 'rgba(144,152,174,0.14)' },
  'EMP':    { label: 'Empuje',           color: '#D7474B', bg: 'rgba(215,71,75,0.14)'   },
  'TRC':    { label: 'Tracción',         color: '#2E6BD6', bg: 'rgba(46,107,214,0.14)'  },
  'ZM':     { label: 'Zona Media',       color: '#E8A33A', bg: 'rgba(232,163,58,0.14)'  },
  'ARR':    { label: 'Arranque',         color: '#6E59E0', bg: 'rgba(110,89,224,0.14)'  },
  'ENV':    { label: 'Envión',           color: '#1B2A57', bg: 'rgba(27,42,87,0.12)'    },
  'JRK':    { label: 'Jerk',             color: '#0E1936', bg: 'rgba(14,25,54,0.12)'    },
  'PLB':    { label: 'Pliometría brazos',color: '#4A8AF0', bg: 'rgba(74,138,240,0.14)'  },
  'PLP':    { label: 'Pliometría piernas',color:'#2BB673', bg: 'rgba(43,182,115,0.14)'  },
  'LNZ':    { label: 'Lanzamientos',     color: '#D7474B', bg: 'rgba(215,71,75,0.10)'   },
  'AER':    { label: 'Aeróbico',         color: '#2BB673', bg: 'rgba(43,182,115,0.14)'  },
  'PRV':    { label: 'Preventivos',      color: '#5C6480', bg: 'rgba(92,100,128,0.14)'  },
  'COR':    { label: 'Coord. compleja',  color: '#6E59E0', bg: 'rgba(110,89,224,0.14)'  },
  'TEST':   { label: 'Test',             color: '#1B2A57', bg: 'rgba(27,42,87,0.14)'    },
  'DELOAD': { label: 'Descarga',         color: '#9098AE', bg: 'rgba(144,152,174,0.18)' },
};
