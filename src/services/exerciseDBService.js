const BASE_URL = 'https://exercisedb.dev/api/v1';
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

// ─── Known filter values (fallback if list endpoints fail) ───
const FALLBACK_BODY_PARTS = [
  'back', 'cardio', 'chest', 'lower arms', 'lower legs',
  'neck', 'shoulders', 'upper arms', 'upper legs', 'waist',
];
const FALLBACK_TARGETS = [
  'abductors', 'abs', 'adductors', 'biceps', 'calves',
  'cardiovascular system', 'delts', 'forearms', 'glutes', 'hamstrings',
  'lats', 'pectorals', 'quads', 'traps', 'triceps', 'upper back',
];
const FALLBACK_EQUIPMENT = [
  'band', 'barbell', 'body weight', 'cable', 'dumbbell',
  'ez barbell', 'kettlebell', 'leverage machine', 'medicine ball',
  'olympic barbell', 'resistance band', 'rope', 'smith machine',
  'stability ball', 'weighted',
];

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

function cacheKey(path) {
  return 'vitta_exdb_' + path.replace(/[^a-z0-9]/gi, '_');
}

function getCache(key) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const { data, ts } = JSON.parse(raw);
    if (Date.now() - ts > CACHE_TTL) { localStorage.removeItem(key); return null; }
    return data;
  } catch { return null; }
}

function setCache(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify({ data, ts: Date.now() }));
  } catch { /* quota exceeded — skip */ }
}

// ─── Fetch helper ────────────────────────────────────────────

function extractArray(raw) {
  if (Array.isArray(raw)) return raw;
  if (raw && Array.isArray(raw.data)) return raw.data;
  if (raw && Array.isArray(raw.exercises)) return raw.exercises;
  return [];
}

async function apiFetch(path) {
  const key = cacheKey(path);
  const cached = getCache(key);
  if (cached !== null) return cached;

  const res = await fetch(`${BASE_URL}${path}`);
  if (!res.ok) throw new Error(`ExerciseDB ${res.status}: ${path}`);
  const json = await res.json();
  const data = Array.isArray(json) ? json : extractArray(json);
  setCache(key, data);
  return data;
}

// ─── Public API ──────────────────────────────────────────────

export async function fetchExercises(limit = 20, offset = 0) {
  return apiFetch(`/exercises?limit=${limit}&offset=${offset}`);
}

export async function fetchByBodyPart(bodyPart, limit = 20, offset = 0) {
  return apiFetch(`/exercises/bodyPart/${encodeURIComponent(bodyPart)}?limit=${limit}&offset=${offset}`);
}

export async function fetchByTarget(muscle, limit = 20, offset = 0) {
  return apiFetch(`/exercises/target/${encodeURIComponent(muscle)}?limit=${limit}&offset=${offset}`);
}

export async function fetchByEquipment(equipment, limit = 20, offset = 0) {
  return apiFetch(`/exercises/equipment/${encodeURIComponent(equipment)}?limit=${limit}&offset=${offset}`);
}

export async function fetchBodyParts() {
  try { return await apiFetch('/exercises/bodyPartList'); }
  catch { return FALLBACK_BODY_PARTS; }
}

export async function fetchTargets() {
  try { return await apiFetch('/exercises/targetList'); }
  catch { return FALLBACK_TARGETS; }
}

export async function fetchEquipmentList() {
  try { return await apiFetch('/exercises/equipmentList'); }
  catch { return FALLBACK_EQUIPMENT; }
}

// ─── Supabase save ───────────────────────────────────────────

export function mapToVittaRow(ex) {
  return {
    slug:      `exdb_${ex.id}`,
    name:      ex.name,
    category:  BODY_PART_TO_CATEGORY[ex.bodyPart] || 'movilidad',
    level:     'basico',
    muscle:    ex.target      || null,
    equipment: ex.equipment   || null,
    gif_url:   ex.gifUrl      || null,
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
