// Bodyweight-relative strength standards (1RM estimate ÷ bodyweight) per lift,
// used to tell an athlete where they stand relative to five experience tiers.

export type StrengthLevel = 'principiante' | 'novato' | 'intermedio' | 'avanzado' | 'elite';
export type Gender = 'masculino' | 'femenino';
export type LiftId =
  | 'bench_press' | 'squat' | 'deadlift' | 'overhead_press' | 'barbell_row'
  | 'pull_ups' | 'front_squat' | 'hip_thrust' | 'leg_press';

export const STRENGTH_LEVELS: { id: StrengthLevel; label: string; color: string; duration: string; description: string }[] = [
  {
    id: 'principiante', label: 'Principiante', color: '#9098AE', duration: '0–6 meses',
    description: 'Nuevo en el entrenamiento estructurado. Aprendiendo la forma correcta y construyendo fuerza fundamental. La progresión lineal funciona bien.',
  },
  {
    id: 'novato', label: 'Novato', color: '#4A8AF0', duration: '6–12 meses',
    description: 'Progresión lineal constante. Construyendo fuerza en todos los ejercicios principales. La forma se está volviendo automática.',
  },
  {
    id: 'intermedio', label: 'Intermedio', color: '#2BB673', duration: '1–2 años',
    description: 'Base de fuerza establecida. El progreso requiere una programación más deliberada. Progresión semanal típica.',
  },
  {
    id: 'avanzado', label: 'Avanzado', color: '#E8A33A', duration: '2–5 años',
    description: 'Fuerte en todos los ejercicios principales. Progreso medido en meses, no semanas. La periodización se vuelve esencial.',
  },
  {
    id: 'elite', label: 'Elite', color: '#D7474B', duration: '5+ años',
    description: 'Niveles de fuerza excepcionales. Acercándose al potencial genético. Puede competir a alto nivel.',
  },
];

interface LiftDef {
  id: LiftId;
  label: string;
  // Normalized (lowercase, accent-stripped) substrings that identify this
  // lift from a logged exercise name.
  aliases: string[];
  // If any of these substrings are present, the match is rejected — used to
  // stop e.g. "sentadilla frontal" from also matching plain "Sentadilla".
  exclude?: string[];
}

export const LIFTS: LiftDef[] = [
  { id: 'bench_press',    label: 'Press de banca',     aliases: ['press banca', 'press de banca', 'bench press'] },
  { id: 'squat',          label: 'Sentadilla',         aliases: ['sentadilla', 'squat', 'back squat'], exclude: ['frontal', 'front'] },
  { id: 'deadlift',       label: 'Peso muerto',        aliases: ['peso muerto', 'deadlift', 'dead lift'] },
  { id: 'overhead_press', label: 'Press militar',      aliases: ['press militar', 'press de hombro', 'press hombro', 'overhead press', 'ohp', 'shoulder press', 'military press'] },
  { id: 'barbell_row',    label: 'Remo con barra',     aliases: ['remo con barra', 'remo barra', 'barbell row', 'bent over row', 'pendlay row', 'bb row'] },
  { id: 'pull_ups',       label: 'Dominadas',          aliases: ['dominada', 'pull up', 'pullup', 'chin up', 'chinup'] },
  { id: 'front_squat',    label: 'Sentadilla frontal', aliases: ['sentadilla frontal', 'front squat'] },
  { id: 'hip_thrust',     label: 'Hip thrust',         aliases: ['hip thrust', 'empuje de cadera', 'puente de cadera'] },
  { id: 'leg_press',      label: 'Prensa de piernas',  aliases: ['prensa', 'leg press'] },
];

// [principiante, novato, intermedio, avanzado, elite] — 1RM / peso corporal
type Multipliers = Record<LiftId, [number, number, number, number, number]>;

const MALE: Multipliers = {
  bench_press:    [0.5,  0.75, 1.25, 1.75, 2],
  squat:          [0.75, 1,    1.75, 2.25, 2.5],
  deadlift:       [1,    1.25, 2,    2.5,  3],
  overhead_press: [0.35, 0.5,  0.75, 1,    1.2],
  barbell_row:    [0.5,  0.75, 1,    1.4,  1.75],
  pull_ups:       [0.1,  0.5,  1,    1.25, 1.5],
  front_squat:    [0.6,  0.85, 1.25, 1.75, 2],
  hip_thrust:     [0.75, 1.25, 1.75, 2.25, 2.75],
  leg_press:      [1.5,  2,    2.5,  3.5,  4.5],
};

const FEMALE: Multipliers = {
  bench_press:    [0.3,  0.45, 0.75, 1.15, 1.5],
  squat:          [0.5,  0.75, 1.25, 1.75, 2.25],
  deadlift:       [0.65, 0.95, 1.5,  2,    2.5],
  overhead_press: [0.2,  0.3,  0.55, 0.75, 1],
  barbell_row:    [0.3,  0.5,  0.7,  1,    1.3],
  pull_ups:       [0.05, 0.3,  0.7,  1,    1.3],
  front_squat:    [0.4,  0.55, 0.85, 1.25, 1.5],
  hip_thrust:     [0.5,  0.85, 1.25, 1.75, 2.25],
  leg_press:      [1,    1.5,  2,    2.75, 3.5],
};

export function getMultipliers(gender: Gender): Multipliers {
  return gender === 'femenino' ? FEMALE : MALE;
}

function normalize(s: string): string {
  return s
    .trim().toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[-_]/g, ' ')
    .replace(/\s+/g, ' ');
}

export interface BestLike { name: string; rm1: number; }

// For each lift, finds the best-matching logged exercise (highest 1RM) among `bests`.
export function matchLiftBests(bests: BestLike[]): Record<LiftId, BestLike | null> {
  const result = {} as Record<LiftId, BestLike | null>;
  for (const lift of LIFTS) {
    let best: BestLike | null = null;
    for (const b of bests) {
      const n = normalize(b.name);
      const hasAlias = lift.aliases.some(a => n.includes(a));
      const excluded = lift.exclude?.some(x => n.includes(x)) ?? false;
      if (hasAlias && !excluded && (!best || b.rm1 > best.rm1)) best = b;
    }
    result[lift.id] = best;
  }
  return result;
}

export interface LiftStandard {
  lift: LiftDef;
  matched: BestLike | null;
  ratio: number | null;
  level: StrengthLevel | null;     // null = below the "principiante" threshold
  nextLevel: StrengthLevel | null; // null once at "elite"
  progressToNext: number | null;  // 0-100, toward nextLevel
}

export function computeStrengthStandards(bests: BestLike[], bodyweightKg: number | null, gender: Gender): LiftStandard[] {
  const mult = getMultipliers(gender);
  const matches = matchLiftBests(bests);
  return LIFTS.map(lift => {
    const matched = matches[lift.id];
    if (!matched || !bodyweightKg) {
      return { lift, matched, ratio: null, level: null, nextLevel: null, progressToNext: null };
    }
    const ratio = matched.rm1 / bodyweightKg;
    const thresholds = mult[lift.id];
    let levelIdx = -1;
    for (let i = 0; i < thresholds.length; i++) {
      if (ratio >= thresholds[i]) levelIdx = i;
    }
    const level = levelIdx >= 0 ? STRENGTH_LEVELS[levelIdx].id : null;
    const nextIdx = levelIdx + 1;
    const nextLevel = nextIdx < STRENGTH_LEVELS.length ? STRENGTH_LEVELS[nextIdx].id : null;
    const progressToNext = nextLevel == null ? 100 : Math.max(0, Math.min(100,
      ((ratio - (levelIdx >= 0 ? thresholds[levelIdx] : 0)) / (thresholds[nextIdx] - (levelIdx >= 0 ? thresholds[levelIdx] : 0))) * 100
    ));
    return { lift, matched, ratio, level, nextLevel, progressToNext };
  });
}
