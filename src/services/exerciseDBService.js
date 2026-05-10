// Data source: yuhonas/free-exercise-db — 800+ exercises, no API key, open CORS
// JSON:   https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/dist/exercises.json
// Images: https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/<path>
const DATA_URL  = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/dist/exercises.json';
const IMAGE_BASE = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/';

const CACHE_KEY = 'vitta_exdb_all';
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 h (static dataset, no need to refresh often)

// ─── yuhonas level → Vitta LevelId ───────────────────────────
const LEVEL_MAP = { beginner: 'basico', intermediate: 'intermedio', expert: 'avanzado' };

// ─── yuhonas category → Vitta CategoryId ─────────────────────
const CATEGORY_MAP = {
  strength:               'empuje',
  stretching:             'movilidad',
  plyometrics:            'pliometria_piernas',
  cardio:                 'aerobicos',
  'olympic weightlifting':'arranque',
  strongman:              'traccion',
  powerlifting:           'empuje',
};

// ─── LocalStorage cache ───────────────────────────────────────

function getCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const { data, ts } = JSON.parse(raw);
    if (Date.now() - ts > CACHE_TTL) { localStorage.removeItem(CACHE_KEY); return null; }
    return data;
  } catch { return null; }
}

function setCache(data) {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify({ data, ts: Date.now() })); }
  catch { /* quota exceeded — skip */ }
}

// ─── Normalize to consistent shape ───────────────────────────
// The card and page always receive this format regardless of source.

function normalize(ex) {
  return {
    exerciseId:    ex.id,
    name:          ex.name,
    gifUrl:        ex.images?.[0] ? IMAGE_BASE + ex.images[0] : null,
    instructions:  ex.instructions ?? [],
    bodyParts:     ex.primaryMuscles ?? [],
    targetMuscles: ex.primaryMuscles ?? [],
    secondaryMuscles: ex.secondaryMuscles ?? [],
    equipments:    ex.equipment ? [ex.equipment] : [],
    _level:        ex.level,
    _category:     ex.category,
    _raw:          ex,
  };
}

// ─── In-memory pointer ────────────────────────────────────────

let _memo = null;

export async function getAllExercises(onProgress) {
  if (_memo) { onProgress?.(_memo.length); return _memo; }

  const cached = getCache();
  if (cached) { _memo = cached; onProgress?.(cached.length); return cached; }

  const res = await fetch(DATA_URL);
  if (!res.ok) throw new Error(`free-exercise-db ${res.status}`);

  const raw = await res.json();
  const data = raw.map(normalize);

  _memo = data;
  setCache(data);
  onProgress?.(data.length);
  return data;
}

export function clearCache() {
  _memo = null;
  try { localStorage.removeItem(CACHE_KEY); } catch {}
}

// ─── Field helpers ────────────────────────────────────────────

export function getBodyParts(ex)  { return ex.bodyParts  ?? []; }
export function getTargets(ex)    { return ex.targetMuscles ?? []; }
export function getEquipments(ex) { return ex.equipments ?? []; }
export function getExId(ex)       { return ex.exerciseId ?? ex.id ?? ''; }

// ─── Derived filter lists ─────────────────────────────────────

export async function fetchBodyParts() {
  const all = await getAllExercises();
  return [...new Set(all.flatMap(getBodyParts))].sort();
}

export async function fetchTargets() {
  const all = await getAllExercises();
  return [...new Set(all.flatMap(getTargets))].sort();
}

export async function fetchEquipmentList() {
  const all = await getAllExercises();
  return [...new Set(all.flatMap(getEquipments))].sort();
}

// ─── Supabase save ────────────────────────────────────────────

export function mapToVittaRow(ex) {
  return {
    slug:      `exdb_${getExId(ex)}`,
    name:      ex.name,
    category:  CATEGORY_MAP[ex._category?.toLowerCase()] || 'empuje',
    level:     LEVEL_MAP[ex._level] || 'basico',
    muscle:    getTargets(ex)[0]    ?? null,
    equipment: getEquipments(ex)[0] ?? null,
    gif_url:   ex.gifUrl            ?? null,
    cues:      ex.instructions?.length ? ex.instructions : null,
    source:    'exercisedb',
  };
}

export async function saveToSupabase(ex, supabase) {
  const row = mapToVittaRow(ex);
  const { error } = await supabase
    .from('exercises')
    .upsert(row, { onConflict: 'slug', ignoreDuplicates: true });
  if (error) throw error;
}
