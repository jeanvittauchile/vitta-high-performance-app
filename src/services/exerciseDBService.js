// Requests go through our Next.js proxy to avoid CORS restrictions.
// The proxy forwards to https://oss.exercisedb.dev/api/v1 server-side.
const BASE_URL = '/api/exercisedb';
const CACHE_KEY = 'vitta_exdb_all';
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

// ─── ExerciseDB bodyPart → Vitta CategoryId ──────────────────
const BODY_PART_TO_CATEGORY = {
  back:           'traccion',
  chest:          'empuje',
  shoulders:      'empuje',
  'upper arms':   'empuje',
  'lower arms':   'traccion',
  waist:          'zona_media',
  'upper legs':   'pliometria_piernas',
  'lower legs':   'pliometria_piernas',
  neck:           'movilidad',
  cardio:         'aerobicos',
};

// ─── LocalStorage cache ──────────────────────────────────────

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
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ data, ts: Date.now() }));
  } catch { /* quota exceeded — skip */ }
}

// ─── Single source of truth: all exercises ───────────────────

let _memo = null; // in-memory pointer so we don't re-parse localStorage every call

export async function getAllExercises() {
  if (_memo) return _memo;

  const cached = getCache();
  if (cached) { _memo = cached; return cached; }

  // Try progressively smaller limits if the API caps results
  for (const limit of [1500, 1000, 500]) {
    const res = await fetch(`${BASE_URL}/exercises?limit=${limit}`);
    if (!res.ok) throw new Error(`ExerciseDB ${res.status}`);
    const json = await res.json();
    const data = Array.isArray(json) ? json
      : Array.isArray(json?.data) ? json.data
      : Array.isArray(json?.exercises) ? json.exercises
      : null;
    if (data && data.length > 0) {
      _memo = data;
      setCache(data);
      return data;
    }
  }
  throw new Error('ExerciseDB returned no exercises');
}

export function clearCache() {
  _memo = null;
  try { localStorage.removeItem(CACHE_KEY); } catch {}
}

// ─── Field helpers (OSS API uses arrays; old API used strings) ─

export function getBodyParts(ex)  { return ex.bodyParts     ?? (ex.bodyPart  ? [ex.bodyPart]  : []); }
export function getTargets(ex)    { return ex.targetMuscles ?? (ex.target    ? [ex.target]    : []); }
export function getEquipments(ex) { return ex.equipments    ?? (ex.equipment ? [ex.equipment] : []); }
export function getExId(ex)       { return ex.exerciseId    ?? ex.id ?? ''; }

// ─── Derived filter lists (built from real data) ─────────────

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

// ─── Supabase save ───────────────────────────────────────────

export function mapToVittaRow(ex) {
  const bodyPart = getBodyParts(ex)[0]  ?? '';
  const muscle   = getTargets(ex)[0]    ?? null;
  const equip    = getEquipments(ex)[0] ?? null;
  return {
    slug:      `exdb_${getExId(ex)}`,
    name:      ex.name,
    category:  BODY_PART_TO_CATEGORY[bodyPart] || 'movilidad',
    level:     'basico',
    muscle,
    equipment: equip,
    gif_url:   ex.gifUrl ?? null,
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
