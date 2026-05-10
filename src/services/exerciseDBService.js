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

function extractArray(json) {
  if (Array.isArray(json)) return json;
  if (Array.isArray(json?.data)) return json.data;
  if (Array.isArray(json?.exercises)) return json.exercises;
  return [];
}

// Paginates through the full dataset (100 per request) until exhausted.
// onProgress(loaded) is called after each page so the UI can show progress.
export async function getAllExercises(onProgress) {
  if (_memo) { onProgress?.(_memo.length); return _memo; }

  const cached = getCache();
  if (cached) { _memo = cached; onProgress?.(cached.length); return cached; }

  const PAGE = 100;
  let all = [];
  let offset = 0;

  while (true) {
    const res = await fetch(`${BASE_URL}/exercises?limit=${PAGE}&offset=${offset}`);
    if (!res.ok) {
      if (all.length > 0) break; // use partial results rather than throwing
      throw new Error(`ExerciseDB ${res.status}`);
    }
    const page = extractArray(await res.json());
    if (page.length === 0) break;
    all = all.concat(page);
    onProgress?.(all.length);
    if (page.length < PAGE) break; // last page
    offset += PAGE;
  }

  if (all.length === 0) throw new Error('ExerciseDB no devolvió ejercicios');

  _memo = all;
  setCache(all);
  return all;
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
