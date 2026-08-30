'use client';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { usePathname } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import { CATEGORIES, DAY_TYPES } from '@/lib/constants';
import { computeExerciseBests, type BestEntry } from '@/lib/exercise-bests';
import { computeMonthLoadSummary, type MonthLoadSummary } from '@/lib/monthly-load';
import { getCategoryIcon, PlusIcon, CopyIcon, LayersIcon, ChevronLeft, ChevronRight, ChevronDown, TrashIcon, PencilIcon, CheckIcon, XIcon, TrendIcon, GripIcon, DownloadIcon } from '@/components/icons';
import LevelBadge from '@/components/badges/LevelBadge';
import type { Athlete, DayType, CategoryId, LevelId } from '@/lib/types';

// ─── Types ──────────────────────────────────────────────────

interface DbSet {
  id: string;
  reps: string | null;
  load: string | null;
  rpe_target: number | null;
  rest: string | null;
  sort_order: number;
}

interface DbExercise {
  id: string;
  exercise_id: string | null;
  name: string;
  level: LevelId | null;
  note: string | null;
  sort_order: number;
  video_url: string | null;
  sets: DbSet[];
}

interface LibEx {
  id: string;
  name: string;
  level: LevelId;
  video_url: string | null;
  gif_url: string | null;
}

interface DbBlock {
  id: string;
  name: string;
  category: CategoryId;
  color: string | null;
  sort_order: number;
  session_exercises: DbExercise[];
}

interface DbSession {
  id: string;
  title: string;
  duration: number;
  rpe_target: number;
  date: string;
  session_blocks: DbBlock[];
}

// ─── Date helpers ────────────────────────────────────────────

function calendarStart(year: number, month: number): Date {
  const first = new Date(year, month - 1, 1);
  const dow = first.getDay();
  const offset = dow === 0 ? -6 : 1 - dow;
  return new Date(year, month - 1, 1 + offset);
}

function cellDate(year: number, month: number, w: number, d: number): Date {
  const start = calendarStart(year, month);
  return new Date(start.getFullYear(), start.getMonth(), start.getDate() + w * 7 + d);
}

function toISO(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// Number of Mon–Sun calendar rows needed to cover every day of the month
// (5 for most months, 6 when the month spans 6 weeks, e.g. August 2026).
function weeksInCalendarMonth(year: number, month: number): number {
  const start = calendarStart(year, month);
  const daysInMonth = new Date(year, month, 0).getDate();
  const offset = Math.round((new Date(year, month - 1, 1).getTime() - start.getTime()) / 86400000);
  return Math.ceil((daysInMonth + offset) / 7);
}

type PlanCell = DayType[];

function defaultPlan(weeks = 4): PlanCell[][] {
  return Array.from({ length: weeks }, () => Array.from({ length: 7 }, () => ['REST' as DayType]));
}

function normalizePlan(raw: any, weeks = 4): PlanCell[][] {
  if (!Array.isArray(raw)) return defaultPlan(weeks);
  return Array.from({ length: weeks }, (_, wi) => {
    const week = raw[wi];
    if (!Array.isArray(week)) return Array.from({ length: 7 }, () => ['REST' as DayType]);
    return Array.from({ length: 7 }, (_, di) => {
      const cell = week[di];
      if (Array.isArray(cell)) return cell.length > 0 ? (cell as DayType[]) : ['REST' as DayType];
      if (typeof cell === 'string') return [cell as DayType];
      return ['REST' as DayType];
    });
  });
}

function mapAthlete(a: any): Athlete {
  return {
    id: a.id, name: a.name, initials: a.initials, age: a.age,
    weeklyHours: a.weekly_hours, focus: a.focus,
    adherence: a.adherence, rpe7: a.rpe7, status: a.status, color: a.color,
  };
}

const MONTH_NAMES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

const RANK_COLORS = ['#F5A623', '#9098AE', '#CD7F32'];

function fmtLoad(v: number): string {
  return v % 1 === 0 ? String(v) : v.toFixed(1);
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '8px 10px', borderRadius: 8,
  border: '1px solid var(--border)', background: 'var(--surface)',
  fontSize: 13, fontFamily: 'inherit', color: 'var(--text)', boxSizing: 'border-box',
};

const lblStyle: React.CSSProperties = {
  fontSize: 10, fontWeight: 700, letterSpacing: '0.06em',
  textTransform: 'uppercase', color: 'var(--text-muted)', display: 'block', marginBottom: 5,
};

// ─── New Session Modal ────────────────────────────────────────

function NewSessionModal({ date, athleteId, onClose, onCreated }: {
  date: string; athleteId: string;
  onClose: () => void; onCreated: (session: DbSession) => void;
}) {
  const [title, setTitle] = useState('');
  const [duration, setDuration] = useState(60);
  const [rpe, setRpe] = useState(7);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) { setError('El título es obligatorio.'); return; }
    setSaving(true);
    const supabase = createClient();
    const { data, error: err } = await supabase
      .from('sessions')
      .insert({ athlete_id: athleteId, date, title: title.trim(), duration, rpe_target: rpe })
      .select('id, title, duration, rpe_target, date')
      .single();
    setSaving(false);
    if (err) { setError(err.message); return; }
    onCreated({ ...data, session_blocks: [] });
  }

  return (
    <div onClick={e => e.target === e.currentTarget && onClose()} style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(14,25,54,0.55)', display: 'grid', placeItems: 'center' }}>
      <div className="card admin-modal" style={{ width: 'min(440px, calc(100vw - 32px))', padding: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 18 }}>
          <div style={{ fontSize: 15, fontWeight: 700 }}>Nueva sesión · {date}</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 20 }}>×</button>
        </div>
        <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 14 }}>
          <div>
            <label style={lblStyle}>Título</label>
            <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="ej. Fuerza — Empuje + Zona Media" style={inputStyle}/>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={lblStyle}>Duración (min)</label>
              <input type="number" min={15} max={300} value={duration} onChange={e => setDuration(Number(e.target.value))} style={inputStyle}/>
            </div>
            <div>
              <label style={lblStyle}>RPE objetivo · {rpe}</label>
              <input type="range" min={1} max={10} step={0.5} value={rpe} onChange={e => setRpe(Number(e.target.value))} style={{ width: '100%', marginTop: 8 }}/>
            </div>
          </div>
          {error && <div style={{ fontSize: 12, color: 'var(--red)', padding: '7px 10px', background: 'rgba(215,71,75,0.08)', borderRadius: 6 }}>{error}</div>}
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button type="button" onClick={onClose} className="btn btn-ghost">Cancelar</button>
            <button type="submit" disabled={saving} className="btn btn-primary">{saving ? 'Guardando...' : 'Crear sesión'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Edit Session Modal ───────────────────────────────────────

function EditSessionModal({ session, onClose, onSaved }: {
  session: DbSession;
  onClose: () => void;
  onSaved: (updated: Pick<DbSession, 'title' | 'duration' | 'rpe_target'>) => void;
}) {
  const [title, setTitle] = useState(session.title);
  const [duration, setDuration] = useState(session.duration);
  const [rpe, setRpe] = useState(session.rpe_target);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) { setError('El título es obligatorio.'); return; }
    setSaving(true);
    const supabase = createClient();
    const { error: err } = await supabase.from('sessions')
      .update({ title: title.trim(), duration, rpe_target: rpe }).eq('id', session.id);
    setSaving(false);
    if (err) { setError(err.message); return; }
    onSaved({ title: title.trim(), duration, rpe_target: rpe });
    onClose();
  }

  return (
    <div onClick={e => e.target === e.currentTarget && onClose()} style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(14,25,54,0.55)', display: 'grid', placeItems: 'center' }}>
      <div className="card admin-modal" style={{ width: 'min(440px, calc(100vw - 32px))', padding: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 18 }}>
          <div style={{ fontSize: 15, fontWeight: 700 }}>Editar sesión</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 20 }}>×</button>
        </div>
        <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 14 }}>
          <div>
            <label style={lblStyle}>Título</label>
            <input type="text" value={title} onChange={e => setTitle(e.target.value)} style={inputStyle}/>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={lblStyle}>Duración (min)</label>
              <input type="number" min={15} max={300} value={duration} onChange={e => setDuration(Number(e.target.value))} style={inputStyle}/>
            </div>
            <div>
              <label style={lblStyle}>RPE objetivo · {rpe}</label>
              <input type="range" min={1} max={10} step={0.5} value={rpe} onChange={e => setRpe(Number(e.target.value))} style={{ width: '100%', marginTop: 8 }}/>
            </div>
          </div>
          {error && <div style={{ fontSize: 12, color: 'var(--red)', padding: '7px 10px', background: 'rgba(215,71,75,0.08)', borderRadius: 6 }}>{error}</div>}
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button type="button" onClick={onClose} className="btn btn-ghost">Cancelar</button>
            <button type="submit" disabled={saving} className="btn btn-primary">
              <CheckIcon size={13}/>{saving ? 'Guardando...' : 'Guardar cambios'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Add Block: one-click category chips ─────────────────────
// Clicking a chip creates the block immediately (name = category label),
// so mixing several categories in one session is just a few clicks.

function BlockCategoryChips({ onPick, onDone }: { onPick: (categoryId: CategoryId) => Promise<void>; onDone: () => void }) {
  const [pickingId, setPickingId] = useState<CategoryId | null>(null);

  async function handlePick(catId: CategoryId) {
    if (pickingId) return;
    setPickingId(catId);
    await onPick(catId);
    setPickingId(null);
  }

  return (
    <div style={{ marginTop: 8, padding: 10, background: 'rgba(46,107,214,0.05)', borderRadius: 10, border: '1px solid var(--border)' }}>
      <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 8 }}>Elige el tipo de bloque a añadir · puedes repetir para mezclar varios</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {Object.values(CATEGORIES).map(c => {
          const Ic = getCategoryIcon(c.id);
          const busy = pickingId === c.id;
          return (
            <button key={c.id} type="button" disabled={!!pickingId} onClick={() => handlePick(c.id as CategoryId)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px', borderRadius: 8,
                border: `1px solid ${c.color}40`, background: `${c.color}14`, color: c.color,
                cursor: pickingId ? 'default' : 'pointer', fontFamily: 'inherit', fontSize: 11, fontWeight: 700,
                opacity: pickingId && !busy ? 0.4 : 1,
              }}>
              <Ic size={12} stroke="currentColor"/>
              {busy ? '...' : c.label}
            </button>
          );
        })}
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
        <button type="button" onClick={onDone} className="btn btn-ghost btn-sm">Cerrar</button>
      </div>
    </div>
  );
}

// ─── Add Exercise: clickable card picker ─────────────────────
// Click a card to add that exercise instantly (pre-filled with the athlete's
// last logged sets when available), so several exercises can be added in a
// row without reopening a form each time. Loads are then edited cell-by-cell
// in the sets grid that appears right below (see the exercise render below).

interface LastLogSet { reps: number | null; load: number | null; rpe: number | null; }
interface LastLog { date: string; sets: LastLogSet[]; }

function fmtLastLogDate(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('es-CL', { day: 'numeric', month: 'short' });
}

const DEFAULT_SET_COUNT = 3;
const DEFAULT_REST = '2:00';

function ExercisePickerPanel({ blockId, category, athleteId, existingNames, onExerciseAdded, onDone }: {
  blockId: string; category: CategoryId; athleteId: string;
  existingNames: Set<string>;
  onExerciseAdded: (ex: DbExercise) => void;
  onDone: () => void;
}) {
  const [search, setSearch] = useState('');
  const [libExercises, setLibExercises] = useState<LibEx[]>([]);
  const [lastLogMap, setLastLogMap] = useState<Map<string, LastLog>>(new Map());
  const [addingKey, setAddingKey] = useState<string | null>(null);
  const [customName, setCustomName] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    createClient().from('exercises').select('id, name, level, video_url, gif_url').eq('category', category).order('name')
      .then(({ data }) => setLibExercises((data as LibEx[]) || []));
  }, [category]);

  useEffect(() => {
    if (!athleteId) return;
    createClient()
      .from('sessions')
      .select('date, session_blocks(session_exercises(name, sets(done, actual_reps, actual_load, actual_rpe, sort_order)))')
      .eq('athlete_id', athleteId)
      .order('date', { ascending: false })
      .limit(60)
      .then(({ data }) => {
        const map = new Map<string, LastLog>();
        for (const sess of (data as any[]) || []) {
          for (const block of sess.session_blocks || []) {
            for (const ex of block.session_exercises || []) {
              const key = (ex.name as string).trim().toLowerCase();
              if (map.has(key)) continue;
              const doneSets = (ex.sets || [])
                .filter((s: any) => s.done && (s.actual_reps != null || s.actual_load != null))
                .sort((a: any, b: any) => a.sort_order - b.sort_order);
              if (doneSets.length === 0) continue;
              map.set(key, {
                date: sess.date,
                sets: doneSets.map((s: any) => ({ reps: s.actual_reps ?? null, load: s.actual_load ?? null, rpe: s.actual_rpe ?? null })),
              });
            }
          }
        }
        setLastLogMap(map);
      });
  }, [athleteId]);

  const filtered = libExercises.filter(e => !search.trim() || e.name.toLowerCase().includes(search.trim().toLowerCase()));

  async function addExercise(name: string, exerciseId: string | null, level: LevelId, videoUrl: string | null) {
    const key = name.trim().toLowerCase();
    if (!name.trim() || addingKey) return;
    setAddingKey(key);
    setError('');
    const supabase = createClient();
    const { data: existing } = await supabase.from('session_exercises').select('sort_order').eq('block_id', blockId).order('sort_order', { ascending: false }).limit(1);
    const nextSort = ((existing?.[0]?.sort_order ?? -1) as number) + 1;
    const { data: exData, error: exErr } = await supabase
      .from('session_exercises')
      .insert({ block_id: blockId, exercise_id: exerciseId, name: name.trim(), level, note: null, sort_order: nextSort, video_url: videoUrl })
      .select('id, exercise_id, name, level, note, sort_order, video_url')
      .single();
    if (exErr || !exData) { setError(exErr?.message || 'Error al añadir el ejercicio.'); setAddingKey(null); return; }

    const lastLog = lastLogMap.get(key);
    const draftSets = lastLog && lastLog.sets.length > 0
      ? lastLog.sets.map(s => ({ reps: s.reps != null ? String(s.reps) : null, load: s.load != null ? String(s.load) : null, rpe_target: null as number | null, rest: DEFAULT_REST }))
      : Array.from({ length: DEFAULT_SET_COUNT }, () => ({ reps: null as string | null, load: null as string | null, rpe_target: null as number | null, rest: DEFAULT_REST }));

    const { data: setsData } = await supabase.from('sets').insert(
      draftSets.map((s, i) => ({ session_ex_id: exData.id, reps: s.reps, load: s.load, rpe_target: s.rpe_target, rest: s.rest, done: false, sort_order: i }))
    ).select('id, reps, load, rpe_target, rest, sort_order');

    onExerciseAdded({ ...exData, sets: (setsData || []) as DbSet[] } as DbExercise);
    setAddingKey(null);
  }

  return (
    <div style={{ marginTop: 8, padding: 12, background: 'rgba(46,107,214,0.05)', borderRadius: 10, border: '1px solid var(--border)', display: 'grid', gap: 10 }}>
      <input
        autoFocus
        placeholder="Buscar ejercicio..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        style={{ padding: '7px 10px', borderRadius: 7, border: '1px solid var(--border)', background: 'var(--surface)', fontSize: 12, fontFamily: 'inherit', color: 'var(--text)' }}
      />

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, maxHeight: 220, overflowY: 'auto' }}>
        {filtered.map(ex => {
          const key = ex.name.trim().toLowerCase();
          const already = existingNames.has(key);
          const last = lastLogMap.get(key);
          const busy = addingKey === key;
          return (
            <button key={ex.id} type="button" disabled={busy}
              onClick={() => addExercise(ex.name, ex.id, ex.level, ex.video_url || ex.gif_url || null)}
              title={already ? 'Ya está en este bloque · clic para añadirlo de nuevo' : 'Añadir al bloque'}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 2,
                padding: '7px 11px', borderRadius: 8, cursor: busy ? 'default' : 'pointer',
                border: already ? '1px solid rgba(43,182,115,0.4)' : '1px solid var(--border)',
                background: already ? 'rgba(43,182,115,0.08)' : 'var(--surface)',
                fontFamily: 'inherit', opacity: busy ? 0.5 : 1, textAlign: 'left',
              }}>
              <span style={{ fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5 }}>
                {already && <CheckIcon size={10} stroke="#2BB673"/>}
                {busy ? '...' : ex.name}
              </span>
              {last && !busy && (
                <span className="mono" style={{ fontSize: 9, color: 'var(--text-muted)' }}>
                  Últ: {last.sets[0]?.reps ?? '—'}×{last.sets[0]?.load ?? '—'}kg · {fmtLastLogDate(last.date)}
                </span>
              )}
            </button>
          );
        })}
        {filtered.length === 0 && (
          <div style={{ fontSize: 12, color: 'var(--text-muted)', padding: '8px 0' }}>Sin resultados en la biblioteca.</div>
        )}
      </div>

      <div style={{ display: 'flex', gap: 6, alignItems: 'center', paddingTop: 8, borderTop: '1px solid var(--border)' }}>
        <input placeholder="Ejercicio personalizado (no está en la biblioteca)" value={customName} onChange={e => setCustomName(e.target.value)}
          style={{ flex: 1, padding: '6px 9px', borderRadius: 7, border: '1px solid var(--border)', background: 'var(--surface)', fontSize: 12, fontFamily: 'inherit', color: 'var(--text)' }}/>
        <button type="button" disabled={!customName.trim() || !!addingKey} className="btn btn-ghost btn-sm"
          onClick={() => { const n = customName; setCustomName(''); addExercise(n, null, 'basico', null); }}>
          <PlusIcon size={10}/>Añadir
        </button>
      </div>

      {error && <div style={{ fontSize: 11, color: 'var(--red)', padding: '5px 8px', background: 'rgba(215,71,75,0.08)', borderRadius: 5 }}>{error}</div>}

      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button type="button" onClick={onDone} className="btn btn-primary btn-sm">Listo</button>
      </div>
    </div>
  );
}

// ─── Add Set inline form ─────────────────────────────────────

function AddSetForm({ exerciseId, onSaved, onClose }: {
  exerciseId: string;
  onSaved: (set: DbSet) => void;
  onClose: () => void;
}) {
  const [reps, setReps] = useState('');
  const [load, setLoad] = useState('');
  const [rpe, setRpe] = useState('');
  const [rest, setRest] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const inp: React.CSSProperties = {
    padding: '5px 7px', borderRadius: 6, border: '1px solid var(--border)',
    background: 'var(--surface)', fontSize: 11, fontFamily: 'inherit', color: 'var(--text)', width: '100%',
  };

  async function save() {
    setSaving(true);
    setError('');
    const supabase = createClient();
    const { data: existing } = await supabase.from('sets')
      .select('sort_order').eq('session_ex_id', exerciseId)
      .order('sort_order', { ascending: false }).limit(1);
    const nextSort = ((existing?.[0]?.sort_order ?? -1) as number) + 1;
    const { data, error: err } = await supabase.from('sets').insert({
      session_ex_id: exerciseId,
      reps: reps || null,
      load: load || null,
      rpe_target: rpe ? Number(rpe) : null,
      rest: rest || null,
      done: false,
      sort_order: nextSort,
    }).select('id, reps, load, rpe_target, rest, sort_order').single();
    setSaving(false);
    if (err) { setError(err.message); return; }
    if (data) {
      onSaved(data as DbSet);
      setReps(''); setLoad(''); setRpe(''); setRest('');
    }
  }

  return (
    <div style={{ borderTop: '1px solid var(--border)', background: 'rgba(46,107,214,0.04)', padding: '6px 12px 8px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr auto auto', gap: 5, alignItems: 'center' }}>
        <input placeholder="Reps" value={reps} onChange={e => setReps(e.target.value)} style={inp}/>
        <input placeholder="Kg" type="number" min={0} step={0.5} value={load} onChange={e => setLoad(e.target.value)} style={inp}/>
        <input placeholder="RPE" type="number" min={1} max={10} step={0.5} value={rpe} onChange={e => setRpe(e.target.value)} style={inp}/>
        <input placeholder="Descanso" value={rest} onChange={e => setRest(e.target.value)} style={inp}/>
        <button onClick={save} disabled={saving} className="btn btn-primary btn-sm" style={{ fontSize: 11, whiteSpace: 'nowrap' }}>
          {saving ? '...' : 'Añadir'}
        </button>
        <button onClick={onClose} className="btn btn-ghost btn-sm" style={{ fontSize: 13 }}>×</button>
      </div>
      {error && <div style={{ fontSize: 10, color: 'var(--red)', marginTop: 4 }}>{error}</div>}
    </div>
  );
}

// ─── Edit Block inline form ───────────────────────────────────

function EditBlockForm({ block, onSaved, onCancel }: {
  block: DbBlock;
  onSaved: (updated: DbBlock) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(block.name);
  const [category, setCategory] = useState<CategoryId>(block.category);
  const [saving, setSaving] = useState(false);
  const inp: React.CSSProperties = { padding: '6px 9px', borderRadius: 7, border: '1px solid var(--border)', background: 'var(--surface)', fontSize: 12, fontFamily: 'inherit', color: 'var(--text)' };

  async function save() {
    if (!name.trim()) return;
    setSaving(true);
    const supabase = createClient();
    const cat = CATEGORIES[category];
    const newColor = cat?.color || block.color || '#2E6BD6';
    const { error } = await supabase.from('session_blocks')
      .update({ name: name.trim(), category, color: newColor })
      .eq('id', block.id);
    setSaving(false);
    if (!error) onSaved({ ...block, name: name.trim(), category, color: newColor });
  }

  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flex: 1 }}>
      <input value={name} onChange={e => setName(e.target.value)} style={{ ...inp, flex: 1 }} placeholder="Nombre del bloque"/>
      <select value={category} onChange={e => setCategory(e.target.value as CategoryId)} style={inp}>
        {Object.values(CATEGORIES).map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
      </select>
      <button onClick={save} disabled={saving || !name.trim()} className="btn btn-primary btn-sm">{saving ? '...' : 'Guardar'}</button>
      <button onClick={onCancel} className="btn btn-ghost btn-sm">Cancelar</button>
    </div>
  );
}

// ─── Copy Plan to Another Athlete Modal ─────────────────────

function CopyPlanToAthleteModal({ currentAthleteId, year, month, plan, onClose }: {
  currentAthleteId: string;
  year: number;
  month: number;
  plan: PlanCell[][];
  onClose: () => void;
}) {
  const [athletes, setAthletes] = useState<{ id: string; name: string; initials: string; color: string }[]>([]);
  const [targetId, setTargetId]     = useState<string | null>(null);
  const [withSessions, setWithSessions] = useState(false);
  const [copying, setCopying]       = useState(false);
  const [error, setError]           = useState('');
  const [done, setDone]             = useState(false);

  useEffect(() => {
    createClient().from('athletes').select('id, name, initials, color').neq('id', currentAthleteId).order('name')
      .then(({ data }) => setAthletes(data || []));
  }, [currentAthleteId]);

  async function handleCopy() {
    if (!targetId) return;
    setCopying(true); setError('');
    const supabase = createClient();

    const { error: planErr } = await supabase.from('month_plans').upsert(
      { athlete_id: targetId, year, month, plan },
      { onConflict: 'athlete_id,year,month' }
    );
    if (planErr) { setError(planErr.message); setCopying(false); return; }

    if (withSessions) {
      const start = calendarStart(year, month);
      const end   = new Date(start.getFullYear(), start.getMonth(), start.getDate() + weeksInCalendarMonth(year, month) * 7 - 1);
      const { data: sessions } = await supabase
        .from('sessions')
        .select(`id, title, duration, rpe_target, date, session_blocks ( id, name, category, color, sort_order, session_exercises ( id, exercise_id, name, level, note, sort_order, video_url, sets ( id, reps, load, rpe_target, rest, sort_order ) ) )`)
        .eq('athlete_id', currentAthleteId)
        .gte('date', toISO(start)).lte('date', toISO(end));

      for (const s of (sessions || []) as any[]) {
        const { data: ns } = await supabase.from('sessions')
          .insert({ athlete_id: targetId, date: s.date, title: s.title, duration: s.duration, rpe_target: s.rpe_target })
          .select('id').single();
        if (!ns) continue;
        const blocks = [...(s.session_blocks || [])].sort((a: any, b: any) => a.sort_order - b.sort_order);
        for (const bl of blocks) {
          const { data: nb } = await supabase.from('session_blocks')
            .insert({ session_id: ns.id, name: bl.name, category: bl.category, color: bl.color, sort_order: bl.sort_order })
            .select('id').single();
          if (!nb) continue;
          const exs = [...(bl.session_exercises || [])].sort((a: any, b: any) => a.sort_order - b.sort_order);
          for (const ex of exs) {
            const { data: ne } = await supabase.from('session_exercises')
              .insert({ block_id: nb.id, exercise_id: ex.exercise_id, name: ex.name, level: ex.level, note: ex.note, sort_order: ex.sort_order, video_url: ex.video_url })
              .select('id').single();
            if (!ne) continue;
            const sets = [...(ex.sets || [])].sort((a: any, b: any) => a.sort_order - b.sort_order);
            if (sets.length > 0) {
              await supabase.from('sets').insert(
                sets.map((st: any) => ({ session_ex_id: ne.id, reps: st.reps, load: st.load, rpe_target: st.rpe_target, rest: st.rest, sort_order: st.sort_order, done: false }))
              );
            }
          }
        }
      }
    }

    setCopying(false); setDone(true);
  }

  return (
    <div onClick={e => e.target === e.currentTarget && onClose()} style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(14,25,54,0.55)', display: 'grid', placeItems: 'center' }}>
      <div className="card admin-modal" style={{ padding: 24 }}>
        {done ? (
          <>
            <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 10 }}>Plan copiado correctamente</div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20 }}>
              {MONTH_NAMES[month - 1]} {year} fue pegado en el atleta destino.
            </div>
            <button onClick={onClose} className="btn btn-primary">Cerrar</button>
          </>
        ) : (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700 }}>Copiar plan a otro atleta</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3 }}>{MONTH_NAMES[month - 1]} {year} · selecciona el atleta destino</div>
              </div>
              <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 20, lineHeight: 1 }}>×</button>
            </div>

            <div className="thin-scroll" style={{ display: 'grid', gap: 5, maxHeight: 260, overflowY: 'auto', marginBottom: 14 }}>
              {athletes.length === 0 ? (
                <div style={{ fontSize: 12, color: 'var(--text-muted)', padding: '12px 0' }}>No hay otros atletas registrados.</div>
              ) : athletes.map(a => (
                <button key={a.id} onClick={() => setTargetId(a.id)}
                  style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '9px 12px', borderRadius: 8, border: `2px solid ${targetId === a.id ? '#2E6BD6' : 'var(--border)'}`, background: targetId === a.id ? 'rgba(46,107,214,0.08)' : 'var(--surface-2)', cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit', width: '100%' }}>
                  <div style={{ width: 32, height: 32, borderRadius: 16, background: a.color || '#2E6BD6', color: '#fff', display: 'grid', placeItems: 'center', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>
                    {a.initials}
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 600, flex: 1 }}>{a.name}</span>
                  {targetId === a.id && <CheckIcon size={14} stroke="#2E6BD6" strokeWidth={2.5}/>}
                </button>
              ))}
            </div>

            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer', marginBottom: 16, padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface-2)' }}>
              <input type="checkbox" checked={withSessions} onChange={e => setWithSessions(e.target.checked)} style={{ width: 14, height: 14 }}/>
              <div>
                <div style={{ fontWeight: 600 }}>Incluir sesiones y ejercicios</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>Copia bloques, ejercicios y series (cargas incluidas)</div>
              </div>
            </label>

            {error && <div style={{ fontSize: 12, color: '#D7474B', padding: '7px 10px', background: 'rgba(215,71,75,0.08)', borderRadius: 6, marginBottom: 12 }}>{error}</div>}

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={onClose} className="btn btn-ghost">Cancelar</button>
              <button onClick={handleCopy} disabled={!targetId || copying} className="btn btn-primary">
                <CopyIcon size={13}/>{copying ? 'Copiando...' : 'Pegar en atleta destino'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Plan Templates ──────────────────────────────────────────

interface DbPlanTemplate {
  id: string;
  name: string;
  description: string | null;
  plan: any;
  exercises: Record<string, string[]>;
  is_builtin: boolean;
}

const DAY_TYPE_KEYS = Object.keys(DAY_TYPES) as DayType[];

const DAY_TYPE_TO_CATEGORY: Partial<Record<DayType, string>> = {
  'EMP': 'empuje', 'TRC': 'traccion', 'ZM': 'zona_media',
  'ARR': 'arranque', 'ENV': 'envion', 'JRK': 'jerk',
  'PLB': 'pliometria_brazos', 'PLP': 'pliometria_piernas', 'LNZ': 'lanzamientos',
  'AER': 'aerobicos', 'PRV': 'preventivos', 'MOV': 'movilidad', 'COR': 'coordinacion',
};

// ── Create / Edit Template Modal ──────────────────────────────

function CreateTemplateModal({ onClose, onCreated, initialTemplate }: {
  onClose: () => void;
  onCreated: (tpl: DbPlanTemplate) => void;
  initialTemplate?: DbPlanTemplate;
}) {
  const isEdit = !!initialTemplate;
  const [name, setName]               = useState(initialTemplate?.name || '');
  const [description, setDescription] = useState(initialTemplate?.description || '');
  const [grid, setGrid]               = useState<PlanCell[][]>(
    initialTemplate ? normalizePlan(initialTemplate.plan) : defaultPlan()
  );
  const [exercises, setExercises]     = useState<Record<string, string>>(
    initialTemplate
      ? Object.fromEntries(Object.entries(initialTemplate.exercises || {}).map(([k, v]) =>
          [k, Array.isArray(v) ? v.join(', ') : String(v)]
        ))
      : {}
  );
  const [libExByType, setLibExByType] = useState<Record<string, LibEx[]>>({});
  const [saving, setSaving]           = useState(false);
  const [error, setError]             = useState('');

  const usedTypes = Array.from(new Set(
    grid.flat(2).filter(d => !['REST','MOV','DELOAD','TEST'].includes(d))
  )) as DayType[];

  useEffect(() => {
    if (usedTypes.length === 0) return;
    const supabase = createClient();
    Promise.all(usedTypes.map(type => {
      const catId = DAY_TYPE_TO_CATEGORY[type];
      return (catId
        ? supabase.from('exercises').select('id, name, level, video_url, gif_url').eq('category', catId).order('name').limit(30)
        : supabase.from('exercises').select('id, name, level, video_url, gif_url').order('name').limit(10)
      ).then(({ data }) => [type, (data || []) as LibEx[]] as [DayType, LibEx[]]);
    })).then(results => setLibExByType(Object.fromEntries(results)));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usedTypes.join(',')]);

  function addTypeToCell(wi: number, di: number, type: DayType) {
    if (!type) return;
    setGrid(prev => prev.map((w, i) => i === wi
      ? w.map((c, j) => j === di
          ? (c.includes(type) ? c : (c[0] === 'REST' && c.length === 1 ? [type] : [...c, type]))
          : c)
      : w
    ));
  }

  function removeTypeFromCell(wi: number, di: number, type: DayType) {
    setGrid(prev => prev.map((w, i) => i === wi
      ? w.map((c, j) => {
          if (j !== di) return c;
          const filtered = c.filter(t => t !== type);
          return filtered.length > 0 ? filtered : ['REST' as DayType];
        })
      : w
    ));
  }

  async function save() {
    if (!name.trim()) { setError('El nombre es obligatorio.'); return; }
    setSaving(true);
    const exMap: Record<string, string[]> = {};
    for (const [type, str] of Object.entries(exercises)) {
      const list = str.split(',').map(s => s.trim()).filter(Boolean);
      if (list.length) exMap[type] = list;
    }
    const supabase = createClient();
    if (isEdit && initialTemplate) {
      const { data, error: err } = await supabase
        .from('plan_templates')
        .update({ name: name.trim(), description: description.trim() || null, plan: grid, exercises: exMap })
        .eq('id', initialTemplate.id)
        .select().single();
      setSaving(false);
      if (err) { setError(err.message); return; }
      onCreated(data as DbPlanTemplate);
    } else {
      const { data, error: err } = await supabase
        .from('plan_templates')
        .insert({ name: name.trim(), description: description.trim() || null, plan: grid, exercises: exMap, is_builtin: false })
        .select().single();
      setSaving(false);
      if (err) { setError(err.message); return; }
      onCreated(data as DbPlanTemplate);
    }
  }

  const inp: React.CSSProperties = {
    width: '100%', padding: '8px 10px', borderRadius: 8,
    border: '1px solid var(--border)', background: 'var(--surface)',
    fontSize: 13, fontFamily: 'inherit', color: 'var(--text)', boxSizing: 'border-box',
  };

  return (
    <div onClick={e => e.target === e.currentTarget && onClose()}
      style={{ position: 'fixed', inset: 0, zIndex: 1001, background: 'rgba(14,25,54,0.55)', display: 'grid', placeItems: 'center' }}>
      <div className="card thin-scroll admin-modal" style={{ width: 'min(600px, calc(100vw - 32px))', padding: 24, maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 18 }}>
          <div style={{ fontSize: 15, fontWeight: 700 }}>
            {isEdit ? 'Editar plantilla mensual' : 'Nueva plantilla mensual'}
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 20 }}>×</button>
        </div>

        <div style={{ display: 'grid', gap: 12, marginBottom: 16 }}>
          <div>
            <label style={lblStyle}>Nombre</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="ej. Fuerza + Olímpico" style={inp}/>
          </div>
          <div>
            <label style={lblStyle}>Descripción</label>
            <input value={description} onChange={e => setDescription(e.target.value)} placeholder="Breve descripción del mesociclo" style={inp}/>
          </div>
        </div>

        <div style={{ fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700, marginBottom: 6 }}>
          Estructura semanal · uno o más objetivos por día
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 10 }}>
          Cada celda muestra los tipos asignados. Haz clic en <b>+</b> para añadir un objetivo al día y en <b>×</b> para quitarlo.
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '24px repeat(7, 1fr)', gap: 3, marginBottom: 16 }}>
          <div/>
          {['L','M','X','J','V','S','D'].map(d => (
            <div key={d} style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-muted)', textAlign: 'center', padding: '2px 0' }}>{d}</div>
          ))}
          {grid.map((week, wi) => (
            <>
              <div key={`lbl${wi}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: 'var(--text-muted)' }}>S{wi+1}</div>
              {week.map((cell, di) => (
                <div key={`${wi}-${di}`} style={{
                  display: 'flex', flexDirection: 'column', gap: 2, padding: 3,
                  borderRadius: 5, border: '1px solid var(--border)', background: 'var(--surface-2)', minHeight: 44,
                }}>
                  {cell.map((type, ti) => {
                    const t = DAY_TYPES[type] || DAY_TYPES.REST;
                    return (
                      <div key={`${type}-${ti}`} style={{ display: 'flex', alignItems: 'center', gap: 1, background: t.bg, border: `1px solid ${t.color}40`, borderRadius: 3, padding: '1px 3px' }}>
                        <span style={{ fontSize: 8, fontWeight: 700, color: t.color, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}>{type}</span>
                        <button
                          type="button"
                          onClick={() => removeTypeFromCell(wi, di, type)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: t.color, padding: '0 1px', fontSize: 10, lineHeight: 1, flexShrink: 0 }}
                        >×</button>
                      </div>
                    );
                  })}
                  <select
                    value=""
                    onChange={e => { if (e.target.value) addTypeToCell(wi, di, e.target.value as DayType); }}
                    style={{ fontSize: 7, padding: '1px 0', borderRadius: 3, border: '1px dashed var(--border)', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer', fontFamily: 'inherit', width: '100%', marginTop: 'auto' }}
                  >
                    <option value="">+</option>
                    {DAY_TYPE_KEYS.filter(k => !cell.includes(k)).map(k => <option key={k} value={k}>{k}</option>)}
                  </select>
                </div>
              ))}
            </>
          ))}
        </div>

        {usedTypes.length > 0 && (
          <>
            <div style={{ fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700, marginBottom: 8 }}>
              Ejercicios predefinidos por tipo de sesión
            </div>
            <div style={{ display: 'grid', gap: 12, marginBottom: 16 }}>
              {usedTypes.map(type => {
                const t = DAY_TYPES[type] || DAY_TYPES.REST;
                const libExs = libExByType[type] || [];
                return (
                  <div key={type}>
                    <label style={{ ...lblStyle, color: t.color }}>{t.label} ({type})</label>
                    <input
                      value={exercises[type] || ''}
                      onChange={e => setExercises(prev => ({ ...prev, [type]: e.target.value }))}
                      placeholder="Press banca, Dominadas, Press militar..."
                      style={inp}
                    />
                    {libExs.length > 0 && (
                      <div style={{ marginTop: 5, display: 'flex', flexWrap: 'wrap', gap: 3 }}>
                        <span style={{ fontSize: 9, color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.04em', width: '100%' }}>
                          BIBLIOTECA · click para añadir:
                        </span>
                        {libExs.slice(0, 10).map(ex => (
                          <button
                            key={ex.id}
                            type="button"
                            onClick={() => {
                              const current = exercises[type]?.trim() || '';
                              const list = current.split(',').map(s => s.trim()).filter(Boolean);
                              if (!list.includes(ex.name)) {
                                setExercises(prev => ({ ...prev, [type]: [...list, ex.name].join(', ') }));
                              }
                            }}
                            style={{
                              fontSize: 10, padding: '2px 8px', borderRadius: 5,
                              border: `1px solid ${t.color}40`, background: t.bg, color: t.color,
                              cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600,
                            }}
                          >+ {ex.name}</button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}

        {error && <div style={{ fontSize: 12, color: 'var(--red)', padding: '7px 10px', background: 'rgba(215,71,75,0.08)', borderRadius: 6, marginBottom: 12 }}>{error}</div>}

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button onClick={onClose} className="btn btn-ghost">Cancelar</button>
          <button onClick={save} disabled={saving} className="btn btn-primary">
            <CheckIcon size={13}/>{saving ? 'Guardando...' : (isEdit ? 'Guardar cambios' : 'Crear plantilla')}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Templates Modal ───────────────────────────────────────────

function TemplatesModal({ onClose, onApply, applying }: {
  onClose: () => void;
  onApply: (tpl: DbPlanTemplate) => void;
  applying?: boolean;
}) {
  const [templates, setTemplates] = useState<DbPlanTemplate[]>([]);
  const [loading, setLoading]     = useState(true);
  const [selected, setSelected]   = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<DbPlanTemplate | null>(null);
  const [deleting, setDeleting]   = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.from('plan_templates').select('*').order('created_at').then(({ data }) => {
      const list = (data || []) as DbPlanTemplate[];
      setTemplates(list);
      if (list.length) setSelected(list[0].id);
      setLoading(false);
    });
  }, []);

  async function deleteTemplate(id: string) {
    if (!confirm('¿Eliminar esta plantilla?')) return;
    setDeleting(id);
    const supabase = createClient();
    await supabase.from('plan_templates').delete().eq('id', id);
    setTemplates(prev => {
      const next = prev.filter(t => t.id !== id);
      if (selected === id) setSelected(next[0]?.id ?? null);
      return next;
    });
    setDeleting(null);
  }

  const tpl = templates.find(t => t.id === selected) ?? null;

  if (showCreate || editingTemplate) {
    return (
      <CreateTemplateModal
        initialTemplate={editingTemplate || undefined}
        onClose={() => { setShowCreate(false); setEditingTemplate(null); }}
        onCreated={newTpl => {
          if (editingTemplate) {
            setTemplates(prev => prev.map(t => t.id === newTpl.id ? newTpl : t));
          } else {
            setTemplates(prev => [...prev, newTpl]);
          }
          setSelected(newTpl.id);
          setShowCreate(false);
          setEditingTemplate(null);
        }}
      />
    );
  }

  return (
    <div onClick={e => e.target === e.currentTarget && onClose()}
      style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(14,25,54,0.55)', display: 'grid', placeItems: 'center' }}>
      <div className="card thin-scroll admin-modal" style={{ width: 'min(560px, calc(100vw - 32px))', padding: 24, maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 18 }}>
          <div style={{ fontSize: 15, fontWeight: 700 }}>Plantillas mensuales</div>
          <button onClick={onClose} disabled={applying} style={{ background: 'none', border: 'none', cursor: applying ? 'default' : 'pointer', color: 'var(--text-muted)', fontSize: 20, opacity: applying ? 0.4 : 1 }}>×</button>
        </div>

        {loading ? (
          <div style={{ padding: '24px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>Cargando...</div>
        ) : (
          <>
            <div style={{ display: 'grid', gap: 6, marginBottom: 16 }}>
              {templates.length === 0 && (
                <div style={{ padding: '16px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                  No hay plantillas. Crea una nueva.
                </div>
              )}
              {templates.map(t => (
                <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <button onClick={() => setSelected(t.id)} style={{
                    flex: 1, padding: '10px 14px', borderRadius: 8, textAlign: 'left', cursor: 'pointer',
                    border: selected === t.id ? '2px solid var(--vitta-blue)' : '1px solid var(--border)',
                    background: selected === t.id ? 'rgba(46,107,214,0.08)' : 'var(--surface-2)',
                    fontFamily: 'inherit',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{t.name}</span>
                      {t.is_builtin && (
                        <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-muted)', background: 'var(--surface)', padding: '1px 6px', borderRadius: 4, border: '1px solid var(--border)' }}>
                          predefinida
                        </span>
                      )}
                    </div>
                    {t.description && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3 }}>{t.description}</div>}
                  </button>
                  {!t.is_builtin && (
                    <>
                      <button onClick={() => setEditingTemplate(t)} title="Editar plantilla"
                        style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                        <PencilIcon size={14}/>
                      </button>
                      <button onClick={() => deleteTemplate(t.id)} disabled={deleting === t.id} title="Eliminar plantilla"
                        style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', color: '#D7474B', cursor: 'pointer', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                        <TrashIcon size={14}/>
                      </button>
                    </>
                  )}
                </div>
              ))}
            </div>

            {tpl && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700, marginBottom: 8 }}>
                  Vista previa · {tpl.name}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 3, marginBottom: 10 }}>
                  {['L','M','X','J','V','S','D'].map(d => (
                    <div key={d} style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-muted)', textAlign: 'center', padding: '2px 0' }}>{d}</div>
                  ))}
                  {normalizePlan(tpl.plan).map((week, wi) =>
                    week.map((cell, di) => {
                      const primary = cell.find(t => t !== 'REST') || 'REST';
                      const t2 = DAY_TYPES[primary] || DAY_TYPES.REST;
                      return (
                        <div key={`${wi}-${di}`} style={{
                          padding: '4px 2px', borderRadius: 4, textAlign: 'center',
                          background: t2.bg, color: t2.color, fontSize: 7, fontWeight: 700, lineHeight: 1.4,
                        }}>
                          {cell.length > 1 ? cell.join('/') : primary}
                        </div>
                      );
                    })
                  )}
                </div>
                {Object.keys(tpl.exercises).length > 0 && (
                  <div style={{ display: 'grid', gap: 6 }}>
                    <div style={{ fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700 }}>
                      Ejercicios predefinidos
                    </div>
                    {Object.entries(tpl.exercises).map(([type, exs]) => {
                      const t2 = DAY_TYPES[type] || DAY_TYPES.REST;
                      return (
                        <div key={type} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                          <span style={{ fontSize: 10, fontWeight: 700, color: t2.color, background: t2.bg, padding: '2px 8px', borderRadius: 4, whiteSpace: 'nowrap', flexShrink: 0 }}>
                            {type}
                          </span>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.6 }}>
                            {exs.join(' · ')}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </>
        )}

        <div style={{ display: 'flex', gap: 8, justifyContent: 'space-between', borderTop: '1px solid var(--border)', paddingTop: 14, marginTop: 4 }}>
          <button onClick={() => setShowCreate(true)} className="btn btn-ghost">
            <PlusIcon size={13}/>Nueva plantilla
          </button>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={onClose} className="btn btn-ghost">Cancelar</button>
            <button onClick={() => tpl && !applying && onApply(tpl)} disabled={!tpl || applying} className="btn btn-primary">
              <LayersIcon size={13}/>{applying ? 'Aplicando...' : 'Aplicar plantilla'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Copy Session Modal ──────────────────────────────────────

function CopySessionModal({ session, athleteId, onClose, onCopied }: {
  session: DbSession;
  athleteId: string;
  onClose: () => void;
  onCopied: (targetDate: string) => void;
}) {
  const [targetDate, setTargetDate] = useState(session.date);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleCopy() {
    if (!targetDate) { setError('Selecciona una fecha.'); return; }
    setSaving(true);
    setError('');
    const supabase = createClient();

    const { data: newSession, error: e1 } = await supabase
      .from('sessions')
      .insert({ athlete_id: athleteId, date: targetDate, title: session.title, duration: session.duration, rpe_target: session.rpe_target })
      .select('id')
      .single();
    if (e1 || !newSession) { setError(e1?.message || 'Error al copiar sesión.'); setSaving(false); return; }

    for (const block of session.session_blocks) {
      const { data: newBlock, error: e2 } = await supabase
        .from('session_blocks')
        .insert({ session_id: newSession.id, name: block.name, category: block.category, color: block.color, sort_order: block.sort_order })
        .select('id')
        .single();
      if (e2 || !newBlock) continue;

      for (const ex of block.session_exercises) {
        const { data: newEx, error: e3 } = await supabase
          .from('session_exercises')
          .insert({ block_id: newBlock.id, exercise_id: ex.exercise_id, name: ex.name, level: ex.level, note: ex.note, sort_order: ex.sort_order, video_url: ex.video_url })
          .select('id')
          .single();
        if (e3 || !newEx) continue;

        if (ex.sets.length > 0) {
          await supabase.from('sets').insert(
            ex.sets.map(s => ({ session_ex_id: newEx.id, reps: s.reps, load: s.load, rpe_target: s.rpe_target, rest: s.rest, sort_order: s.sort_order, done: false }))
          );
        }
      }
    }

    setSaving(false);
    onCopied(targetDate);
    onClose();
  }

  return (
    <div onClick={e => e.target === e.currentTarget && onClose()} style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(14,25,54,0.55)', display: 'grid', placeItems: 'center' }}>
      <div className="card admin-modal" style={{ width: 'min(380px, calc(100vw - 32px))', padding: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 18 }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700 }}>Copiar sesión</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 3 }}>{session.title}</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 20 }}>×</button>
        </div>
        <div style={{ display: 'grid', gap: 14 }}>
          <div>
            <label style={lblStyle}>Fecha destino</label>
            <input
              type="date"
              value={targetDate}
              onChange={e => setTargetDate(e.target.value)}
              style={inputStyle}
            />
          </div>
          {error && <div style={{ fontSize: 12, color: 'var(--red)', padding: '7px 10px', background: 'rgba(215,71,75,0.08)', borderRadius: 6 }}>{error}</div>}
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button onClick={onClose} className="btn btn-ghost">Cancelar</button>
            <button onClick={handleCopy} disabled={saving || !targetDate} className="btn btn-primary">
              <CopyIcon size={13}/>{saving ? 'Copiando...' : 'Copiar sesión'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Copy Sessions to Athletes Modal (multi-session, multi-athlete) ──

async function copySessionToAthlete(
  supabase: ReturnType<typeof createClient>,
  session: DbSession,
  targetAthleteId: string,
  targetDate: string
) {
  const { data: newSession, error: e1 } = await supabase
    .from('sessions')
    .insert({ athlete_id: targetAthleteId, date: targetDate, title: session.title, duration: session.duration, rpe_target: session.rpe_target })
    .select('id')
    .single();
  if (e1 || !newSession) return false;

  const blocks = [...session.session_blocks].sort((a, b) => a.sort_order - b.sort_order);
  for (const block of blocks) {
    const { data: newBlock, error: e2 } = await supabase
      .from('session_blocks')
      .insert({ session_id: newSession.id, name: block.name, category: block.category, color: block.color, sort_order: block.sort_order })
      .select('id')
      .single();
    if (e2 || !newBlock) continue;

    const exs = [...block.session_exercises].sort((a, b) => a.sort_order - b.sort_order);
    for (const ex of exs) {
      const { data: newEx, error: e3 } = await supabase
        .from('session_exercises')
        .insert({ block_id: newBlock.id, exercise_id: ex.exercise_id, name: ex.name, level: ex.level, note: ex.note, sort_order: ex.sort_order, video_url: ex.video_url })
        .select('id')
        .single();
      if (e3 || !newEx) continue;

      if (ex.sets.length > 0) {
        await supabase.from('sets').insert(
          ex.sets.map(s => ({ session_ex_id: newEx.id, reps: s.reps, load: s.load, rpe_target: s.rpe_target, rest: s.rest, sort_order: s.sort_order, done: false }))
        );
      }
    }
  }
  return true;
}

function CopySessionsToAthletesModal({ sessions, currentAthleteId, onClose, onDone }: {
  sessions: DbSession[];
  currentAthleteId: string;
  onClose: () => void;
  onDone: () => void;
}) {
  const [athletes, setAthletes] = useState<{ id: string; name: string; initials: string; color: string }[]>([]);
  const [targetIds, setTargetIds] = useState<Set<string>>(new Set());
  const [copying, setCopying] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  useEffect(() => {
    createClient().from('athletes').select('id, name, initials, color').neq('id', currentAthleteId).order('name')
      .then(({ data }) => setAthletes(data || []));
  }, [currentAthleteId]);

  function toggleTarget(aid: string) {
    setTargetIds(prev => {
      const next = new Set(prev);
      if (next.has(aid)) next.delete(aid); else next.add(aid);
      return next;
    });
  }

  async function handleCopy() {
    if (targetIds.size === 0 || sessions.length === 0) return;
    setCopying(true); setError('');
    const supabase = createClient();

    let failed = 0;
    for (const targetId of targetIds) {
      for (const session of sessions) {
        const ok = await copySessionToAthlete(supabase, session, targetId, session.date);
        if (!ok) failed++;
      }
    }

    setCopying(false);
    if (failed > 0) setError(`${failed} sesión(es) no se pudieron copiar.`);
    setDone(true);
  }

  return (
    <div onClick={e => e.target === e.currentTarget && onClose()} style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(14,25,54,0.55)', display: 'grid', placeItems: 'center' }}>
      <div className="card admin-modal" style={{ padding: 24 }}>
        {done ? (
          <>
            <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 10 }}>Sesiones copiadas</div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20 }}>
              {sessions.length} sesión(es) copiada(s) a {targetIds.size} atleta(s).
            </div>
            {error && <div style={{ fontSize: 12, color: '#D7474B', padding: '7px 10px', background: 'rgba(215,71,75,0.08)', borderRadius: 6, marginBottom: 16 }}>{error}</div>}
            <button onClick={() => { onDone(); onClose(); }} className="btn btn-primary">Cerrar</button>
          </>
        ) : (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700 }}>Copiar sesiones a atletas</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3 }}>
                  {sessions.length} sesión(es) seleccionada(s) · elige uno o más atletas destino
                </div>
              </div>
              <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 20, lineHeight: 1 }}>×</button>
            </div>

            <div className="thin-scroll" style={{ display: 'grid', gap: 4, maxHeight: 110, overflowY: 'auto', marginBottom: 14, padding: '8px 10px', border: '1px solid var(--border)', borderRadius: 8, background: 'var(--surface-2)' }}>
              {sessions.map(s => (
                <div key={s.id} style={{ fontSize: 12, display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                  <span style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.title}</span>
                  <span style={{ color: 'var(--text-muted)', flexShrink: 0 }}>{s.date}</span>
                </div>
              ))}
            </div>

            <div className="thin-scroll" style={{ display: 'grid', gap: 5, maxHeight: 260, overflowY: 'auto', marginBottom: 14 }}>
              {athletes.length === 0 ? (
                <div style={{ fontSize: 12, color: 'var(--text-muted)', padding: '12px 0' }}>No hay otros atletas registrados.</div>
              ) : athletes.map(a => {
                const checked = targetIds.has(a.id);
                return (
                  <button key={a.id} onClick={() => toggleTarget(a.id)}
                    style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '9px 12px', borderRadius: 8, border: `2px solid ${checked ? '#2E6BD6' : 'var(--border)'}`, background: checked ? 'rgba(46,107,214,0.08)' : 'var(--surface-2)', cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit', width: '100%' }}>
                    <input type="checkbox" checked={checked} readOnly style={{ width: 14, height: 14, pointerEvents: 'none' }}/>
                    <div style={{ width: 32, height: 32, borderRadius: 16, background: a.color || '#2E6BD6', color: '#fff', display: 'grid', placeItems: 'center', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>
                      {a.initials}
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 600, flex: 1 }}>{a.name}</span>
                    {checked && <CheckIcon size={14} stroke="#2E6BD6" strokeWidth={2.5}/>}
                  </button>
                );
              })}
            </div>

            {error && <div style={{ fontSize: 12, color: '#D7474B', padding: '7px 10px', background: 'rgba(215,71,75,0.08)', borderRadius: 6, marginBottom: 12 }}>{error}</div>}

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={onClose} className="btn btn-ghost">Cancelar</button>
              <button onClick={handleCopy} disabled={targetIds.size === 0 || copying} className="btn btn-primary">
                <CopyIcon size={13}/>{copying ? 'Copiando...' : `Copiar a ${targetIds.size || ''} atleta(s)`}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Main page ───────────────────────────────────────────────

export default function PlannerPage() {
  const pathname = usePathname();
  const id = pathname.split('/athletes/')[1]?.split('/')[0] ?? '';

  const now = new Date();
  const [currentYear, setCurrentYear] = useState(now.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(now.getMonth() + 1);
  const prevMonthLabel = useMemo(() => {
    const prevYear = currentMonth === 1 ? currentYear - 1 : currentYear;
    const prevMonthNum = currentMonth === 1 ? 12 : currentMonth - 1;
    return `${MONTH_NAMES[prevMonthNum - 1]} ${prevYear}`;
  }, [currentYear, currentMonth]);

  const [athlete, setAthlete] = useState<Athlete | null>(null);
  const [athleteLoading, setAthleteLoading] = useState(true);
  const [bests, setBests] = useState<BestEntry[]>([]);
  const [bestsLoading, setBestsLoading] = useState(true);
  const [prevLoadSummary, setPrevLoadSummary] = useState<MonthLoadSummary | null>(null);
  const [prevLoadLoading, setPrevLoadLoading] = useState(true);
  const [dragOverBlock, setDragOverBlock] = useState<string | null>(null);
  const [dragBlock, setDragBlock] = useState<{ id: string; sessionId: string } | null>(null);
  const [monthPlan, setMonthPlan] = useState<PlanCell[][]>(defaultPlan(weeksInCalendarMonth(now.getFullYear(), now.getMonth() + 1)));
  // date -> first session title (for calendar display)
  const [monthSessionMap, setMonthSessionMap] = useState<Map<string, string>>(new Map());
  const [selectedDay, setSelectedDay] = useState<{ w: number; d: number } | null>(null);
  const [daySessions, setDaySessions] = useState<DbSession[]>([]);
  const [showNewSession, setShowNewSession] = useState(false);
  const [editSession, setEditSession] = useState<DbSession | null>(null);
  const [addBlockFor, setAddBlockFor] = useState<string | null>(null);
  const [editBlockId, setEditBlockId] = useState<string | null>(null);
  const [addExerciseFor, setAddExerciseFor] = useState<string | null>(null);
  const [expandedEx, setExpandedEx] = useState<Set<string>>(new Set());
  const [addSetFor, setAddSetFor] = useState<string | null>(null);
  const [doneBlocks, setDoneBlocks] = useState<Set<string>>(new Set());
  const [collapsedBlocks, setCollapsedBlocks] = useState<Set<string>>(new Set());
  const [duplicating, setDuplicating] = useState(false);
  const [dupMsg, setDupMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [applyingTemplate, setApplyingTemplate] = useState(false);
  const [copyingSession, setCopyingSession] = useState<DbSession | null>(null);
  const [showCopyPlanModal, setShowCopyPlanModal] = useState(false);
  const [selectSessionsMode, setSelectSessionsMode] = useState(false);
  const [selectedSessions, setSelectedSessions] = useState<Map<string, DbSession>>(new Map());
  const [showCopySessionsModal, setShowCopySessionsModal] = useState(false);
  const [completedDates, setCompletedDates] = useState<Map<string, 'done' | 'partial'>>(new Map());
  // calendar drag state
  const [calDragging, setCalDragging] = useState<string | null>(null);
  const [calDropOver, setCalDropOver] = useState<string | null>(null);

  // ── Fetch athlete ──────────────────────────────────────────
  useEffect(() => {
    if (!id) return;
    setAthleteLoading(true);
    const supabase = createClient();
    supabase.from('athletes').select('*').eq('id', id).maybeSingle().then(({ data }) => {
      if (data) setAthlete(mapAthlete(data));
      setAthleteLoading(false);
    });
  }, [id]);

  // ── Fetch exercise bests for progress panel ────────────────
  useEffect(() => {
    if (!id) return;
    setBestsLoading(true);
    const supabase = createClient();
    supabase
      .from('sessions')
      .select(`session_blocks ( session_exercises ( name, sets ( done, actual_reps, actual_load ) ) )`)
      .eq('athlete_id', id)
      .then(({ data }) => {
        setBests(computeExerciseBests(data ?? []));
        setBestsLoading(false);
      });
  }, [id]);

  // ── Fetch month plan ───────────────────────────────────────
  useEffect(() => {
    if (!id) return;
    const supabase = createClient();
    supabase.from('month_plans').select('plan').eq('athlete_id', id).eq('year', currentYear).eq('month', currentMonth).maybeSingle()
      .then(({ data }) => setMonthPlan(normalizePlan(data?.plan, weeksInCalendarMonth(currentYear, currentMonth))));
  }, [id, currentYear, currentMonth]);

  // ── Fetch previous month's training load (relative to the month being planned) ──
  useEffect(() => {
    if (!id) return;
    setPrevLoadLoading(true);
    const prevYear = currentMonth === 1 ? currentYear - 1 : currentYear;
    const prevMonthNum = currentMonth === 1 ? 12 : currentMonth - 1;
    const start = toISO(new Date(prevYear, prevMonthNum - 1, 1));
    const end = toISO(new Date(prevYear, prevMonthNum, 0));
    const supabase = createClient();
    supabase
      .from('sessions')
      .select(`date, duration, rpe_target,
        session_feedback(duration_seconds, sleep_hours),
        session_blocks(session_exercises(sets(done, actual_reps, actual_load, actual_rpe)))`)
      .eq('athlete_id', id)
      .gte('date', start).lte('date', end)
      .then(({ data }) => {
        setPrevLoadSummary(computeMonthLoadSummary((data ?? []) as any));
        setPrevLoadLoading(false);
      });
  }, [id, currentYear, currentMonth]);

  // ── Fetch session titles + completion status for calendar month ──
  useEffect(() => {
    if (!id) return;
    const start = calendarStart(currentYear, currentMonth);
    const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + weeksInCalendarMonth(currentYear, currentMonth) * 7 - 1);
    const supabase = createClient();
    supabase.from('sessions')
      .select('date, title, session_feedback(id)')
      .eq('athlete_id', id).gte('date', toISO(start)).lte('date', toISO(end))
      .then(({ data }) => {
        const titleMap = new Map<string, string>();
        const compMap = new Map<string, 'done' | 'partial'>();
        for (const s of (data || [])) {
          if (!titleMap.has(s.date)) titleMap.set(s.date, s.title);
          const fb = Array.isArray(s.session_feedback) ? s.session_feedback : [];
          if (fb.length > 0) compMap.set(s.date, 'done');
        }
        setMonthSessionMap(titleMap);
        setCompletedDates(compMap);
      });
  }, [id, currentYear, currentMonth]);

  // ── Fetch sessions + blocks + exercises + sets for selected day ─
  const fetchDaySessions = useCallback(async () => {
    if (!selectedDay || !id) return;
    const date = toISO(cellDate(currentYear, currentMonth, selectedDay.w, selectedDay.d));
    const supabase = createClient();
    const { data } = await supabase
      .from('sessions')
      .select(`
        id, title, duration, rpe_target, date,
        session_blocks (
          id, name, category, color, sort_order,
          session_exercises (
            id, exercise_id, name, level, note, sort_order, video_url,
            sets ( id, reps, load, rpe_target, rest, sort_order )
          )
        )
      `)
      .eq('athlete_id', id)
      .eq('date', date)
      .order('created_at');
    const sessions = (data || []).map((s: any) => ({
      ...s,
      session_blocks: (s.session_blocks || [])
        .sort((a: any, b: any) => a.sort_order - b.sort_order)
        .map((bl: any) => ({
          ...bl,
          session_exercises: (bl.session_exercises || [])
            .sort((a: any, b: any) => a.sort_order - b.sort_order)
            .map((ex: any) => ({
              ...ex,
              sets: (ex.sets || []).sort((a: any, b: any) => a.sort_order - b.sort_order),
            })),
        })),
    }));
    setDaySessions(sessions);
    setExpandedEx(new Set());
    setAddSetFor(null);
    setDoneBlocks(new Set());
    setCollapsedBlocks(new Set());
  }, [id, selectedDay, currentYear, currentMonth]);

  useEffect(() => { fetchDaySessions(); }, [fetchDaySessions]);

  // ── Toggle block done / collapse ──────────────────────────
  function toggleBlockDone(blockId: string) {
    setDoneBlocks(prev => {
      const n = new Set(prev);
      if (n.has(blockId)) {
        n.delete(blockId);
        setCollapsedBlocks(pb => { const nb = new Set(pb); nb.delete(blockId); return nb; });
      } else {
        n.add(blockId);
        setCollapsedBlocks(pb => { const nb = new Set(pb); nb.add(blockId); return nb; });
      }
      return n;
    });
  }

  function toggleBlockCollapse(blockId: string) {
    setCollapsedBlocks(prev => {
      const n = new Set(prev);
      if (n.has(blockId)) n.delete(blockId); else n.add(blockId);
      return n;
    });
  }

  // ── Toggle exercise expand ─────────────────────────────────
  function toggleEx(exId: string) {
    setExpandedEx(prev => {
      const next = new Set(prev);
      if (next.has(exId)) { next.delete(exId); } else { next.add(exId); }
      return next;
    });
  }

  // ── Delete session ─────────────────────────────────────────
  async function deleteSession(sessionId: string) {
    if (!confirm('¿Eliminar esta sesión? Se borrarán todos sus bloques y ejercicios.')) return;
    const supabase = createClient();
    const { data: blocks } = await supabase.from('session_blocks').select('id').eq('session_id', sessionId);
    if (blocks?.length) {
      const blockIds = blocks.map((b: any) => b.id);
      const { data: exercises } = await supabase.from('session_exercises').select('id').in('block_id', blockIds);
      if (exercises?.length) {
        const exIds = exercises.map((e: any) => e.id);
        await supabase.from('sets').delete().in('session_ex_id', exIds);
        await supabase.from('session_exercises').delete().in('id', exIds);
      }
      await supabase.from('session_blocks').delete().in('id', blockIds);
    }
    await supabase.from('sessions').delete().eq('id', sessionId);
    const dateStr = daySessions.find(s => s.id === sessionId)?.date;
    setDaySessions(prev => prev.filter(s => s.id !== sessionId));
    if (dateStr) {
      setMonthSessionMap(prev => {
        const remaining = daySessions.filter(s => s.id !== sessionId && s.date === dateStr);
        if (remaining.length === 0) { const next = new Map(prev); next.delete(dateStr); return next; }
        return prev;
      });
    }
  }

  // ── Download monthly plan as PDF ──────────────────────────
  async function downloadMonthPDF() {
    const supabase = createClient();
    const start = calendarStart(currentYear, currentMonth);
    const pdfWeeks = weeksInCalendarMonth(currentYear, currentMonth);
    const endDate = new Date(start.getFullYear(), start.getMonth(), start.getDate() + pdfWeeks * 7 - 1);
    const { data } = await supabase
      .from('sessions')
      .select(`id, title, duration, rpe_target, date,
        session_blocks ( id, name, category, color, sort_order,
          session_exercises ( id, name, level, note, sort_order,
            sets ( id, reps, load, rpe_target, rest, sort_order )
          )
        )`)
      .eq('athlete_id', id)
      .gte('date', toISO(start))
      .lte('date', toISO(endDate))
      .order('date');

    const sessionsByDate = new Map<string, any[]>();
    for (const s of (data || [])) {
      if (!sessionsByDate.has(s.date)) sessionsByDate.set(s.date, []);
      sessionsByDate.get(s.date)!.push({
        ...s,
        session_blocks: (s.session_blocks || [])
          .sort((a: any, b: any) => a.sort_order - b.sort_order)
          .map((bl: any) => ({
            ...bl,
            session_exercises: (bl.session_exercises || [])
              .sort((a: any, b: any) => a.sort_order - b.sort_order)
              .map((ex: any) => ({ ...ex, sets: (ex.sets || []).sort((a: any, b: any) => a.sort_order - b.sort_order) })),
          })),
      });
    }

    const dayNames = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
    const dayNamesFull = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
    const monthLabel = `${MONTH_NAMES[currentMonth - 1]} ${currentYear}`;
    const athleteName = athlete?.name || '';

    const fmt = (val: string | number | null | undefined, suffix = '') =>
      val != null && val !== '' && val !== '—' ? `${val}${suffix}` : '—';

    let html = `<!DOCTYPE html><html><head><meta charset="utf-8">
    <title>Plan ${athleteName} · ${monthLabel}</title>
    <style>
      *{margin:0;padding:0;box-sizing:border-box}
      body{font-family:'Helvetica Neue',Arial,sans-serif;font-size:10px;color:#111;background:#fff}
      .page{padding:20px 24px 24px;page-break-before:always}
      .page:first-child{page-break-before:auto}
      .page-header{display:flex;justify-content:space-between;align-items:flex-end;padding-bottom:10px;border-bottom:2.5px solid #0E1936;margin-bottom:14px}
      .athlete-name{font-size:18px;font-weight:800;color:#0E1936;letter-spacing:-.02em}
      .month-sub{font-size:9.5px;color:#777;margin-top:3px;letter-spacing:.06em;text-transform:uppercase;font-weight:600}
      .week-badge{font-size:22px;font-weight:800;color:#2E6BD6;letter-spacing:-.03em;line-height:1}
      .rest-strip{background:#f6f6f6;border:1px solid #e8e8e8;border-radius:6px;padding:7px 12px;font-size:9px;color:#aaa;margin-bottom:10px;letter-spacing:.04em}
      .rest-strip strong{color:#bbb;text-transform:uppercase;font-size:8px;letter-spacing:.08em;margin-right:6px}
      .day-card{border:1px solid #ddd;border-radius:8px;overflow:hidden;margin-bottom:10px;page-break-inside:avoid}
      .day-header{background:#0E1936;color:#fff;padding:8px 14px;display:flex;justify-content:space-between;align-items:center}
      .day-label{font-size:11px;font-weight:700;letter-spacing:.04em;text-transform:uppercase}
      .sess-meta{font-size:9.5px;color:rgba(255,255,255,.75);font-weight:500}
      .sess-body{padding:10px 14px}
      .block-wrap{margin-bottom:10px}
      .block-wrap:last-child{margin-bottom:0}
      .block-header{display:flex;align-items:center;gap:6px;margin-bottom:6px}
      .block-dot{width:8px;height:8px;border-radius:2px;flex-shrink:0}
      .block-name{font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:.08em}
      .ex-wrap{margin-bottom:8px;padding-left:14px}
      .ex-wrap:last-child{margin-bottom:0}
      .ex-name{font-size:10.5px;font-weight:700;color:#0E1936;margin-bottom:3px}
      .ex-note{font-size:8.5px;color:#888;font-style:italic;margin-bottom:3px}
      .sets-table{width:100%;border-collapse:collapse;font-size:9px}
      .sets-table thead tr{border-bottom:1px solid #e8e8e8}
      .sets-table th{text-align:left;color:#aaa;font-weight:700;padding:2px 8px 3px 0;letter-spacing:.05em;text-transform:uppercase;font-size:7.5px}
      .sets-table td{padding:3px 8px 3px 0;color:#333;vertical-align:middle}
      .sets-table tbody tr:not(:last-child){border-bottom:1px solid #f0f0f0}
      .set-num{color:#bbb;font-weight:700;width:18px}
      .val-load{font-weight:700;color:#0E1936}
      .val-rpe{display:inline-block;background:#2E6BD622;color:#2E6BD6;border-radius:3px;padding:0 4px;font-weight:700}
      .no-sets{font-size:9px;color:#bbb;font-style:italic;padding-left:0}
      .footer{font-size:8px;color:#bbb;text-align:center;padding-top:10px;border-top:1px solid #eee;margin-top:4px;letter-spacing:.04em}
      @media print{
        .page{page-break-before:always}
        .page:first-child{page-break-before:auto}
        .day-card{page-break-inside:avoid}
      }
    </style></head><body>`;

    for (let wi = 0; wi < pdfWeeks; wi++) {
      // collect rest days and training days for this week
      const trainingDays: { di: number; date: Date; dateISO: string; sessions: any[] }[] = [];
      const restDayNames: string[] = [];

      for (let di = 0; di < 7; di++) {
        const date = cellDate(currentYear, currentMonth, wi, di);
        const dateISO = toISO(date);
        const sessions = sessionsByDate.get(dateISO) || [];
        const inMonth = date.getMonth() + 1 === currentMonth;
        if (!inMonth) continue;
        if (sessions.length > 0) {
          trainingDays.push({ di, date, dateISO, sessions });
        } else {
          restDayNames.push(dayNames[di]);
        }
      }

      html += `<div class="page">`;
      html += `<div class="page-header">
        <div>
          <div class="athlete-name">${athleteName}</div>
          <div class="month-sub">${monthLabel} · Plan de entrenamiento</div>
        </div>
        <div class="week-badge">S${wi + 1}</div>
      </div>`;

      if (restDayNames.length > 0) {
        html += `<div class="rest-strip"><strong>Descanso</strong>${restDayNames.join(' · ')}</div>`;
      }

      if (trainingDays.length === 0) {
        html += `<div style="text-align:center;padding:30px 0;color:#ccc;font-size:11px">Semana de descanso completa</div>`;
      }

      for (const { di, date, sessions } of trainingDays) {
        const dateFormatted = `${dayNamesFull[di]} ${date.getDate()} ${MONTH_NAMES[currentMonth - 1].toLowerCase()}`;
        for (const sess of sessions) {
          html += `<div class="day-card">
            <div class="day-header">
              <span class="day-label">${dateFormatted}</span>
              <span class="sess-meta">${sess.title} &nbsp;·&nbsp; ${sess.duration} min &nbsp;·&nbsp; RPE objetivo ${sess.rpe_target}</span>
            </div>
            <div class="sess-body">`;

          for (const block of sess.session_blocks) {
            const bc = block.color || '#2E6BD6';
            html += `<div class="block-wrap">
              <div class="block-header">
                <div class="block-dot" style="background:${bc}"></div>
                <span class="block-name" style="color:${bc}">${block.name}</span>
              </div>`;

            for (const ex of block.session_exercises) {
              html += `<div class="ex-wrap">
                <div class="ex-name">${ex.name}${ex.level ? ` <span style="font-size:8px;color:#aaa;font-weight:500">(${ex.level})</span>` : ''}</div>`;
              if (ex.note) html += `<div style="font-size:9px;color:#444;font-style:italic;margin:2px 0 4px"><span style="font-style:normal;font-weight:700;color:#888;margin-right:4px">Nota:</span>${ex.note}</div>`;

              if (ex.sets.length === 0) {
                html += `<div class="no-sets">Sin series registradas</div>`;
              } else {
                html += `<table class="sets-table">
                  <thead><tr>
                    <th></th><th>Reps</th><th>Carga</th><th>RPE</th><th>Descanso</th>
                  </tr></thead><tbody>`;
                ex.sets.forEach((s: any, i: number) => {
                  const load = s.load && s.load !== '—' ? `<span class="val-load">${s.load} kg</span>` : '<span style="color:#ccc">—</span>';
                  const rpe = s.rpe_target ? `<span class="val-rpe">${s.rpe_target}</span>` : '<span style="color:#ccc">—</span>';
                  const rest = fmt(s.rest);
                  html += `<tr>
                    <td class="set-num">${i + 1}</td>
                    <td><strong>${fmt(s.reps)}</strong></td>
                    <td>${load}</td>
                    <td>${rpe}</td>
                    <td style="color:#888">${rest}</td>
                  </tr>`;
                });
                html += `</tbody></table>`;
              }
              html += `</div>`;
            }
            html += `</div>`;
          }
          html += `</div></div>`;
        }
      }

      html += `<div class="footer">Vitta High Performance &nbsp;·&nbsp; ${athleteName} &nbsp;·&nbsp; ${monthLabel}</div>`;
      html += `</div>`;
    }

    html += `</body></html>`;

    const win = window.open('', '_blank');
    if (win) {
      win.document.write(html);
      win.document.close();
      win.focus();
      setTimeout(() => win.print(), 400);
    }
  }

  // ── Move block up / down ───────────────────────────────────
  async function moveBlock(blockId: string, sessionId: string, dir: 'up' | 'down') {
    const session = daySessions.find(s => s.id === sessionId);
    if (!session) return;
    const sorted = [...session.session_blocks].sort((a, b) => a.sort_order - b.sort_order);
    const idx = sorted.findIndex(b => b.id === blockId);
    const swapIdx = dir === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= sorted.length) return;
    const a = sorted[idx];
    const b = sorted[swapIdx];
    const supabase = createClient();
    await supabase.from('session_blocks').update({ sort_order: b.sort_order }).eq('id', a.id);
    await supabase.from('session_blocks').update({ sort_order: a.sort_order }).eq('id', b.id);
    setDaySessions(prev => prev.map(s =>
      s.id !== sessionId ? s : {
        ...s,
        session_blocks: s.session_blocks.map(bl => {
          if (bl.id === a.id) return { ...bl, sort_order: b.sort_order };
          if (bl.id === b.id) return { ...bl, sort_order: a.sort_order };
          return bl;
        }).sort((x, y) => x.sort_order - y.sort_order),
      }
    ));
  }

  // ── Add block from a category chip (one click, no form) ─────
  async function addBlockFromCategory(sessionId: string, categoryId: CategoryId) {
    const session = daySessions.find(s => s.id === sessionId);
    const nextSort = session ? Math.max(-1, ...session.session_blocks.map(b => b.sort_order)) + 1 : 0;
    const cat = CATEGORIES[categoryId];
    const supabase = createClient();
    const { data: newBlock, error } = await supabase.from('session_blocks')
      .insert({ session_id: sessionId, name: cat?.label || categoryId, category: categoryId, color: cat?.color || '#2E6BD6', sort_order: nextSort })
      .select('id, name, category, color, sort_order')
      .single();
    if (error || !newBlock) return;
    setDaySessions(prev => prev.map(s =>
      s.id === sessionId ? { ...s, session_blocks: [...s.session_blocks, { ...newBlock, session_exercises: [] } as DbBlock] } : s
    ));
    setAddExerciseFor(newBlock.id);
  }

  async function reorderBlocks(dragId: string, dropId: string, sessionId: string) {
    const session = daySessions.find(s => s.id === sessionId);
    if (!session) return;
    const sorted = [...session.session_blocks].sort((a, b) => a.sort_order - b.sort_order);
    const dragIdx = sorted.findIndex(b => b.id === dragId);
    const dropIdx = sorted.findIndex(b => b.id === dropId);
    if (dragIdx === -1 || dropIdx === -1 || dragIdx === dropIdx) return;
    const reordered = [...sorted];
    const [dragged] = reordered.splice(dragIdx, 1);
    reordered.splice(dropIdx, 0, dragged);
    const supabase = createClient();
    await Promise.all(reordered.map((b, i) =>
      supabase.from('session_blocks').update({ sort_order: i }).eq('id', b.id)
    ));
    setDaySessions(prev => prev.map(s =>
      s.id !== sessionId ? s : { ...s, session_blocks: reordered.map((b, i) => ({ ...b, sort_order: i })) }
    ));
  }

  // ── Delete block ───────────────────────────────────────────
  async function deleteBlock(blockId: string, sessionId: string) {
    if (!confirm('¿Eliminar este bloque? Se borrarán todos sus ejercicios y series.')) return;
    const supabase = createClient();
    const { data: exercises } = await supabase.from('session_exercises').select('id').eq('block_id', blockId);
    if (exercises?.length) {
      const exIds = exercises.map((e: any) => e.id);
      await supabase.from('sets').delete().in('session_ex_id', exIds);
      await supabase.from('session_exercises').delete().in('id', exIds);
    }
    await supabase.from('session_blocks').delete().eq('id', blockId);
    setDaySessions(prev => prev.map(s =>
      s.id === sessionId ? { ...s, session_blocks: s.session_blocks.filter(b => b.id !== blockId) } : s
    ));
  }

  // ── Delete exercise ────────────────────────────────────────
  async function deleteExercise(exerciseId: string, blockId: string) {
    if (!confirm('¿Eliminar este ejercicio?')) return;
    const supabase = createClient();
    await supabase.from('sets').delete().eq('session_ex_id', exerciseId);
    await supabase.from('session_exercises').delete().eq('id', exerciseId);
    setDaySessions(prev => prev.map(s => ({
      ...s,
      session_blocks: s.session_blocks.map(b =>
        b.id === blockId ? { ...b, session_exercises: b.session_exercises.filter(e => e.id !== exerciseId) } : b
      ),
    })));
  }

  // ── Update exercise note ───────────────────────────────────
  async function updateExerciseNote(exerciseId: string, blockId: string, note: string) {
    const value = note.trim() || null;
    const supabase = createClient();
    const { error } = await supabase.from('session_exercises').update({ note: value }).eq('id', exerciseId);
    if (error) { console.error('Error saving note:', error); return; }
    setDaySessions(prev => prev.map(s => ({
      ...s,
      session_blocks: s.session_blocks.map(b =>
        b.id === blockId ? {
          ...b,
          session_exercises: b.session_exercises.map(e =>
            e.id === exerciseId ? { ...e, note: value } : e
          ),
        } : b
      ),
    })));
  }

  // ── Duplicate set ──────────────────────────────────────────
  async function duplicateSet(setId: string, exerciseId: string, blockId: string) {
    const session = daySessions.find(s => s.session_blocks.some(b => b.id === blockId));
    if (!session) return;
    const block = session.session_blocks.find(b => b.id === blockId);
    if (!block) return;
    const ex = block.session_exercises.find(e => e.id === exerciseId);
    if (!ex) return;
    const set = ex.sets.find(s => s.id === setId);
    if (!set) return;
    const supabase = createClient();
    const nextSort = Math.max(...ex.sets.map(s => s.sort_order)) + 1;
    const { data: newSet } = await supabase.from('sets')
      .insert({ session_ex_id: exerciseId, reps: set.reps, load: set.load, rpe_target: set.rpe_target, rest: set.rest, done: false, sort_order: nextSort })
      .select('id, reps, load, rpe_target, rest, sort_order').single();
    if (newSet) {
      setDaySessions(prev => prev.map(s => ({
        ...s,
        session_blocks: s.session_blocks.map(b =>
          b.id === blockId ? {
            ...b,
            session_exercises: b.session_exercises.map(e =>
              e.id === exerciseId ? { ...e, sets: [...e.sets, newSet as DbSet] } : e
            ),
          } : b
        ),
      })));
    }
  }

  // ── Move exercise up / down ────────────────────────────────
  async function moveExercise(exerciseId: string, blockId: string, dir: 'up' | 'down') {
    const session = daySessions.find(s => s.session_blocks.some(b => b.id === blockId));
    if (!session) return;
    const block = session.session_blocks.find(b => b.id === blockId);
    if (!block) return;
    const sorted = [...block.session_exercises].sort((a, b) => a.sort_order - b.sort_order);
    const idx = sorted.findIndex(e => e.id === exerciseId);
    const swapIdx = dir === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= sorted.length) return;
    const a = sorted[idx];
    const b = sorted[swapIdx];
    const supabase = createClient();
    await supabase.from('session_exercises').update({ sort_order: b.sort_order }).eq('id', a.id);
    await supabase.from('session_exercises').update({ sort_order: a.sort_order }).eq('id', b.id);
    setDaySessions(prev => prev.map(s => ({
      ...s,
      session_blocks: s.session_blocks.map(bl =>
        bl.id !== blockId ? bl : {
          ...bl,
          session_exercises: bl.session_exercises.map(e => {
            if (e.id === a.id) return { ...e, sort_order: b.sort_order };
            if (e.id === b.id) return { ...e, sort_order: a.sort_order };
            return e;
          }).sort((x, y) => x.sort_order - y.sort_order),
        }
      ),
    })));
  }

  // ── Update set field ───────────────────────────────────────
  async function updateSet(setId: string, field: 'reps' | 'load' | 'rpe_target' | 'rest', raw: string, exerciseId: string, blockId: string) {
    const value = field === 'rpe_target' ? (raw ? parseFloat(raw) : null) : (raw.trim() || null);
    const supabase = createClient();
    await supabase.from('sets').update({ [field]: value }).eq('id', setId);
    setDaySessions(prev => prev.map(s => ({
      ...s,
      session_blocks: s.session_blocks.map(b =>
        b.id === blockId ? {
          ...b,
          session_exercises: b.session_exercises.map(e =>
            e.id === exerciseId ? { ...e, sets: e.sets.map(st => st.id === setId ? { ...st, [field]: value } : st) } : e
          ),
        } : b
      ),
    })));
  }

  // ── Delete set ─────────────────────────────────────────────
  async function deleteSet(setId: string, exerciseId: string, blockId: string) {
    const supabase = createClient();
    await supabase.from('sets').delete().eq('id', setId);
    setDaySessions(prev => prev.map(s => ({
      ...s,
      session_blocks: s.session_blocks.map(b =>
        b.id === blockId ? {
          ...b,
          session_exercises: b.session_exercises.map(e =>
            e.id === exerciseId ? { ...e, sets: e.sets.filter(st => st.id !== setId) } : e
          ),
        } : b
      ),
    })));
  }

  // ── Move session to another date (calendar drag-drop) ─────
  async function handleMoveSession(fromDate: string, toDate: string) {
    if (fromDate === toDate) return;
    const supabase = createClient();
    await supabase.from('sessions').update({ date: toDate }).eq('athlete_id', id).eq('date', fromDate);
    setMonthSessionMap(prev => {
      const next = new Map(prev);
      const title = next.get(fromDate);
      next.delete(fromDate);
      if (title) next.set(toDate, title);
      return next;
    });
    if (selectedDay) {
      const srcDate = toISO(cellDate(currentYear, currentMonth, selectedDay.w, selectedDay.d));
      if (srcDate === fromDate) {
        for (let w = 0; w < monthPlan.length; w++) {
          for (let d = 0; d < 7; d++) {
            if (toISO(cellDate(currentYear, currentMonth, w, d)) === toDate) {
              setSelectedDay({ w, d });
              setDaySessions(prev => prev.map(s => ({ ...s, date: toDate })));
            }
          }
        }
      }
    }
  }

  // ── Save month plan ────────────────────────────────────────
  async function savePlan(plan: PlanCell[][]) {
    const supabase = createClient();
    await supabase.from('month_plans').upsert(
      { athlete_id: id, year: currentYear, month: currentMonth, plan },
      { onConflict: 'athlete_id,year,month' }
    );
  }

  // ── Duplicate previous month sessions ─────────────────────
  async function handleDuplicatePrevMonth() {
    setDuplicating(true);
    setDupMsg(null);
    const prevYear = currentMonth === 1 ? currentYear - 1 : currentYear;
    const prevMonthNum = currentMonth === 1 ? 12 : currentMonth - 1;
    try {
      const supabase = createClient();
      const prevStart = calendarStart(prevYear, prevMonthNum);
      const prevWeeks = weeksInCalendarMonth(prevYear, prevMonthNum);
      const prevEnd = new Date(prevStart.getFullYear(), prevStart.getMonth(), prevStart.getDate() + prevWeeks * 7 - 1);

      const { data: prevSessions, error: sessErr } = await supabase
        .from('sessions')
        .select(`
          id, title, duration, rpe_target, date,
          session_blocks (
            id, name, category, color, sort_order,
            session_exercises (
              id, exercise_id, name, level, note, sort_order, video_url,
              sets ( id, reps, load, rpe_target, rest, sort_order, done )
            )
          )
        `)
        .eq('athlete_id', id)
        .gte('date', toISO(prevStart))
        .lte('date', toISO(prevEnd))
        .order('date');
      if (sessErr) throw sessErr;

      if (!prevSessions || prevSessions.length === 0) {
        setDupMsg({ type: 'err', text: `No hay sesiones en ${MONTH_NAMES[prevMonthNum - 1]} ${prevYear}.` });
        return;
      }

      const currStart = calendarStart(currentYear, currentMonth);
      const currWeeks = weeksInCalendarMonth(currentYear, currentMonth);
      const currEnd = new Date(currStart.getFullYear(), currStart.getMonth(), currStart.getDate() + currWeeks * 7 - 1);
      const { data: existingSessions } = await supabase
        .from('sessions').select('date')
        .eq('athlete_id', id)
        .gte('date', toISO(currStart))
        .lte('date', toISO(currEnd));
      const existingDates = new Set<string>((existingSessions || []).map((s: { date: string }) => s.date));

      const newSessionMap = new Map<string, string>();
      let copied = 0;

      for (const session of prevSessions) {
        const prevDate = new Date(session.date + 'T12:00:00');
        const dayOffset = Math.round((prevDate.getTime() - prevStart.getTime()) / 86400000);
        if (dayOffset < 0 || dayOffset >= prevWeeks * 7) continue;
        const w = Math.floor(dayOffset / 7);
        const d = dayOffset % 7;
        if (w >= currWeeks) continue;
        const targetDate = toISO(cellDate(currentYear, currentMonth, w, d));
        if (existingDates.has(targetDate)) continue;

        const { data: newSession, error: nsErr } = await supabase
          .from('sessions')
          .insert({ athlete_id: id, date: targetDate, title: session.title, duration: session.duration, rpe_target: session.rpe_target })
          .select('id').single();
        if (nsErr || !newSession) continue;

        newSessionMap.set(targetDate, session.title);
        copied++;

        const blocks = ((session as any).session_blocks || []).sort((a: any, b: any) => a.sort_order - b.sort_order);
        for (const block of blocks) {
          const { data: newBlock, error: nbErr } = await supabase
            .from('session_blocks')
            .insert({ session_id: newSession.id, name: block.name, category: block.category, color: block.color, sort_order: block.sort_order })
            .select('id').single();
          if (nbErr || !newBlock) continue;

          const exercises = (block.session_exercises || []).sort((a: any, b: any) => a.sort_order - b.sort_order);
          for (const ex of exercises) {
            const { data: newEx, error: neErr } = await supabase
              .from('session_exercises')
              .insert({ block_id: newBlock.id, exercise_id: ex.exercise_id, name: ex.name, level: ex.level, note: ex.note, sort_order: ex.sort_order, video_url: ex.video_url })
              .select('id').single();
            if (neErr || !newEx) continue;

            const sets = (ex.sets || []).sort((a: any, b: any) => a.sort_order - b.sort_order);
            for (const set of sets) {
              await supabase.from('sets').insert({ session_ex_id: newEx.id, reps: set.reps, load: set.load, rpe_target: set.rpe_target, rest: set.rest, sort_order: set.sort_order, done: false });
            }
          }
        }
      }

      if (copied === 0) {
        setDupMsg({ type: 'err', text: 'Todas las fechas del mes actual ya tienen sesiones.' });
        return;
      }

      setMonthSessionMap(prev => {
        const next = new Map(prev);
        for (const [date, title] of newSessionMap) {
          if (!next.has(date)) next.set(date, title);
        }
        return next;
      });
      setDupMsg({ type: 'ok', text: `${copied} sesión${copied !== 1 ? 'es' : ''} duplicada${copied !== 1 ? 's' : ''} de ${MONTH_NAMES[prevMonthNum - 1]}.` });
      setTimeout(() => setDupMsg(null), 4000);
    } catch (err) {
      console.error('[duplicar] error:', err);
      setDupMsg({ type: 'err', text: 'Error al duplicar. Ver consola.' });
    } finally {
      setDuplicating(false);
    }
  }

  async function handleApplyTemplate(tpl: DbPlanTemplate) {
    const plan = normalizePlan(tpl.plan, weeksInCalendarMonth(currentYear, currentMonth));
    setApplyingTemplate(true);
    try {
      await savePlan(plan);

      if (Object.keys(tpl.exercises).length > 0) {
        const supabase = createClient();

        // Fetch existing session dates to avoid duplicates. Bounded to the template's
        // own 4-week pattern (below), not the month's real week count — weeks 5–6 of
        // longer months are left for the coach to fill in by hand.
        const start = calendarStart(currentYear, currentMonth);
        const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 27);
        const { data: existingSessions } = await supabase
          .from('sessions').select('date')
          .eq('athlete_id', id)
          .gte('date', toISO(start))
          .lte('date', toISO(end));
        const existingDates = new Set<string>((existingSessions || []).map((s: { date: string }) => s.date));

        // Batch-fetch exercises by name
        const allNames = Array.from(new Set(Object.values(tpl.exercises).flat()));
        const exerciseByName = new Map<string, { id: string; level: LevelId; video_url: string | null }>();
        if (allNames.length > 0) {
          const { data: exData } = await supabase
            .from('exercises').select('id, name, level, video_url')
            .in('name', allNames);
          for (const e of (exData || [])) exerciseByName.set(e.name, e);
        }

        const newSessionMap = new Map<string, string>();

        for (let wi = 0; wi < 4; wi++) {
          for (let di = 0; di < 7; di++) {
            const cell = plan[wi][di];
            const date = toISO(cellDate(currentYear, currentMonth, wi, di));
            if (existingDates.has(date)) continue;

            const typesWithEx = cell.filter(
              t => t !== 'REST' && t !== 'DELOAD' && (tpl.exercises[t]?.length ?? 0) > 0
            ) as DayType[];
            if (typesWithEx.length === 0) continue;

            const sessionTitle = typesWithEx.map(t => DAY_TYPES[t]?.label || t).join(' + ');
            const { data: newSession } = await supabase
              .from('sessions')
              .insert({ athlete_id: id, date, title: sessionTitle, duration: 60, rpe_target: 7 })
              .select('id').single();
            if (!newSession) continue;

            newSessionMap.set(date, sessionTitle);

            let blockOrder = 0;
            for (const type of typesWithEx) {
              const catId = (DAY_TYPE_TO_CATEGORY[type] || 'empuje') as CategoryId;
              const cat = CATEGORIES[catId];
              const { data: newBlock } = await supabase
                .from('session_blocks')
                .insert({ session_id: newSession.id, name: DAY_TYPES[type]?.label || type, category: catId, color: cat?.color || '#2E6BD6', sort_order: blockOrder++ })
                .select('id').single();
              if (!newBlock) continue;

              let exOrder = 0;
              for (const exName of tpl.exercises[type]) {
                const libEx = exerciseByName.get(exName);
                const { data: newEx } = await supabase
                  .from('session_exercises')
                  .insert({ block_id: newBlock.id, exercise_id: libEx?.id ?? null, name: exName, level: libEx?.level ?? 'basico', note: null, sort_order: exOrder++, video_url: libEx?.video_url ?? null })
                  .select('id').single();
                if (!newEx) continue;
                await supabase.from('sets').insert({ session_ex_id: newEx.id, reps: null, load: null, rpe_target: null, rest: '2:00', sort_order: 0, done: false });
              }
            }
          }
        }

        if (newSessionMap.size > 0) {
          setMonthSessionMap(prev => {
            const next = new Map(prev);
            for (const [date, title] of newSessionMap) {
              if (!next.has(date)) next.set(date, title);
            }
            return next;
          });
        }
      }
    } finally {
      setMonthPlan(plan);
      setApplyingTemplate(false);
      setShowTemplateModal(false);
    }
  }

  async function handleDeletePlan() {
    if (!confirm(`¿Eliminar TODO el plan de ${MONTH_NAMES[currentMonth - 1]} ${currentYear}?\n\nSe borrarán el calendario, todas las sesiones, bloques, ejercicios y series del mes. Esta acción no se puede deshacer.`)) return;
    const supabase = createClient();
    const monthStart = `${currentYear}-${String(currentMonth).padStart(2, '0')}-01`;
    const monthEnd = `${currentYear}-${String(currentMonth).padStart(2, '0')}-31`;
    const { data: monthSessions } = await supabase
      .from('sessions')
      .select('id')
      .eq('athlete_id', id)
      .gte('date', monthStart)
      .lte('date', monthEnd);
    if (monthSessions?.length) {
      const sessionIds = monthSessions.map((s: any) => s.id);
      const { data: blocks } = await supabase
        .from('session_blocks').select('id').in('session_id', sessionIds);
      if (blocks?.length) {
        const blockIds = blocks.map((b: any) => b.id);
        const { data: exercises } = await supabase
          .from('session_exercises').select('id').in('block_id', blockIds);
        if (exercises?.length) {
          const exIds = exercises.map((e: any) => e.id);
          await supabase.from('sets').delete().in('session_ex_id', exIds);
          await supabase.from('session_exercises').delete().in('id', exIds);
        }
        await supabase.from('session_blocks').delete().in('id', blockIds);
      }
      await supabase.from('sessions').delete().in('id', sessionIds);
    }
    await supabase.from('month_plans').delete()
      .eq('athlete_id', id).eq('year', currentYear).eq('month', currentMonth);
    setMonthPlan(defaultPlan(weeksInCalendarMonth(currentYear, currentMonth)));
    setMonthSessionMap(new Map());
    setDaySessions([]);
    setSelectedDay(null);
  }

  // ── Save current month as template ────────────────────────
  async function handleSaveAsTemplate() {
    const name = window.prompt(
      `Guardar ${MONTH_NAMES[currentMonth - 1]} ${currentYear} como plantilla\n\nNombre de la plantilla:`,
      `${athlete?.name ? athlete.name + ' · ' : ''}${MONTH_NAMES[currentMonth - 1]} ${currentYear}`
    );
    if (!name || !name.trim()) return;
    const supabase = createClient();
    const { error } = await supabase.from('plan_templates').insert({
      name: name.trim(),
      description: `Generada desde el plan de ${MONTH_NAMES[currentMonth - 1]} ${currentYear}`,
      plan: monthPlan,
      exercises: {},
      is_builtin: false,
    });
    if (error) { alert('Error al guardar la plantilla: ' + error.message); return; }
    alert(`Plantilla "${name.trim()}" guardada correctamente.`);
  }

  // ── Navigate months ────────────────────────────────────────
  function prevMonth() {
    if (currentMonth === 1) { setCurrentYear(y => y - 1); setCurrentMonth(12); } else setCurrentMonth(m => m - 1);
    setSelectedDay(null);
  }
  function nextMonth() {
    if (currentMonth === 12) { setCurrentYear(y => y + 1); setCurrentMonth(1); } else setCurrentMonth(m => m + 1);
    setSelectedDay(null);
  }
  function goToday() {
    const n = new Date();
    setCurrentYear(n.getFullYear()); setCurrentMonth(n.getMonth() + 1); setSelectedDay(null);
  }

  // ── Derived values ─────────────────────────────────────────
  const focusCat = CATEGORIES[athlete?.focus || 'empuje'] || CATEGORIES.empuje;

  const todayISO = toISO(now);

  const selectedDate = selectedDay
    ? toISO(cellDate(currentYear, currentMonth, selectedDay.w, selectedDay.d))
    : null;

  const selectedDateLabel = selectedDate
    ? new Date(selectedDate + 'T12:00:00').toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' })
    : null;

  if (athleteLoading) return <div style={{ display: 'grid', placeItems: 'center', height: '100%', color: 'var(--text-muted)', fontSize: 14 }}>Cargando...</div>;
  if (!athlete) return <div style={{ display: 'grid', placeItems: 'center', height: '100%', color: 'var(--text-muted)', fontSize: 14 }}>Atleta no encontrado.</div>;

  return (
    <div className="planner-layout" style={{ display: 'grid', gridTemplateColumns: '1fr 380px', height: '100dvh' }}>
      {showNewSession && selectedDate && (
        <NewSessionModal date={selectedDate} athleteId={id} onClose={() => setShowNewSession(false)}
          onCreated={session => {
            setDaySessions(prev => [...prev, session]);
            setMonthSessionMap(prev => { const next = new Map(prev); if (!next.has(selectedDate)) next.set(selectedDate, session.title); return next; });
            setShowNewSession(false);
          }}
        />
      )}
      {showTemplateModal && (
        <TemplatesModal onClose={() => !applyingTemplate && setShowTemplateModal(false)} onApply={handleApplyTemplate} applying={applyingTemplate} />
      )}
      {copyingSession && (
        <CopySessionModal
          session={copyingSession}
          athleteId={id}
          onClose={() => setCopyingSession(null)}
          onCopied={targetDate => {
            setMonthSessionMap(prev => {
              const next = new Map(prev);
              if (!next.has(targetDate)) next.set(targetDate, copyingSession.title);
              return next;
            });
          }}
        />
      )}
      {showCopyPlanModal && (
        <CopyPlanToAthleteModal
          currentAthleteId={id}
          year={currentYear}
          month={currentMonth}
          plan={monthPlan}
          onClose={() => setShowCopyPlanModal(false)}
        />
      )}
      {showCopySessionsModal && (
        <CopySessionsToAthletesModal
          sessions={Array.from(selectedSessions.values())}
          currentAthleteId={id}
          onClose={() => setShowCopySessionsModal(false)}
          onDone={() => { setSelectedSessions(new Map()); setSelectSessionsMode(false); }}
        />
      )}
      {editSession && (
        <EditSessionModal session={editSession} onClose={() => setEditSession(null)}
          onSaved={updated => {
            setDaySessions(prev => prev.map(s => s.id === editSession.id ? { ...s, ...updated } : s));
            setMonthSessionMap(prev => {
              const next = new Map(prev);
              if (selectedDate) next.set(selectedDate, updated.title);
              return next;
            });
          }}
        />
      )}


      {/* ─── Main area ──────────────────────────────────────── */}
      <div className="thin-scroll planner-main" style={{ overflow: 'auto', padding: '20px 24px 28px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 44, height: 44, borderRadius: 22, background: athlete.color || focusCat.color, color: '#fff', display: 'grid', placeItems: 'center', fontSize: 14, fontWeight: 700 }}>
              {athlete.initials}
            </div>
            <div>
              <div style={{ fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700 }}>Atleta · Plan mensual</div>
              <div style={{ fontSize: 20, fontWeight: 700 }}>{athlete.name}</div>
            </div>
          </div>
          <div className="planner-header-actions" style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <button className="btn btn-ghost" onClick={() => window.open(`/athletes/${id}/report`, '_blank')} title="Ver informe mensual del atleta">
              <TrendIcon size={13}/>Informe
            </button>
            <button className="btn btn-ghost" onClick={downloadMonthPDF} title="Descargar plan mensual en PDF">
              <DownloadIcon size={13}/>PDF
            </button>
            <button className="btn btn-ghost" onClick={handleDuplicatePrevMonth} disabled={duplicating} title="Duplicar mes anterior">
              <CopyIcon size={13}/>{duplicating ? 'Copiando...' : 'Duplicar mes'}
            </button>
            {dupMsg && (
              <span style={{ fontSize: 12, color: dupMsg.type === 'ok' ? 'var(--accent)' : '#D7474B', fontWeight: 600 }}>
                {dupMsg.text}
              </span>
            )}
            <button className="btn btn-ghost" onClick={() => setShowCopyPlanModal(true)} title="Copiar plan a otro atleta">
              <CopyIcon size={13}/>Copiar a atleta
            </button>
            <button
              className={selectSessionsMode ? 'btn btn-primary' : 'btn btn-ghost'}
              onClick={() => { setSelectSessionsMode(m => !m); setSelectedSessions(new Map()); }}
              title="Copiar sesiones sueltas a otros atletas">
              <CheckIcon size={13}/>{selectSessionsMode ? 'Cancelar selección' : 'Seleccionar sesiones'}
            </button>
            <div style={{ width: 1, height: 18, background: 'var(--border)', flexShrink: 0 }}/>
            <button className="btn btn-ghost" onClick={handleDeletePlan} style={{ color: '#D7474B' }}>
              <TrashIcon size={13}/>Eliminar plan
            </button>
            <button className="btn btn-primary"
              onClick={() => { if (!selectedDay) { alert('Selecciona un día en el calendario primero.'); return; } setShowNewSession(true); }}>
              <PlusIcon size={13}/>Añadir sesión
            </button>
          </div>
        </div>

        {selectSessionsMode && (
          <div className="card" style={{ padding: '10px 16px', marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid #2E6BD6', background: 'rgba(46,107,214,0.06)' }}>
            <div style={{ fontSize: 12.5, fontWeight: 600 }}>
              {selectedSessions.size === 0
                ? 'Marca las sesiones que quieras copiar (usa el checkbox de cada sesión en el editor de abajo).'
                : `${selectedSessions.size} sesión(es) seleccionada(s)`}
            </div>
            <button className="btn btn-primary btn-sm" disabled={selectedSessions.size === 0} onClick={() => setShowCopySessionsModal(true)}>
              <CopyIcon size={12}/>Copiar a atletas
            </button>
          </div>
        )}

        {/* Calendar */}
        <div className="card" style={{ padding: 16, marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div>
              <div style={{ fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700 }}>Mesociclo</div>
              <div style={{ fontSize: 16, fontWeight: 600, marginTop: 2 }}>{MONTH_NAMES[currentMonth - 1]} {currentYear} · Plan mensual</div>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <button className="btn btn-ghost btn-sm" onClick={prevMonth}><ChevronLeft size={12}/></button>
              <button className="btn btn-ghost btn-sm" onClick={goToday}>Hoy</button>
              <button className="btn btn-ghost btn-sm" onClick={nextMonth}><ChevronRight size={12}/></button>
            </div>
          </div>

          <div className="admin-table-scroll">
          <div style={{ display: 'grid', gridTemplateColumns: '60px repeat(7, minmax(70px, 1fr))', minWidth: 580, gap: 4, marginTop: 8 }}>
            <div/>
            {['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'].map(d => (
              <div key={d} style={{ fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 700, color: 'var(--text-muted)', textAlign: 'center', padding: '4px 0' }}>{d}</div>
            ))}
            {monthPlan.map((week, wi) => (
              <>
                <div key={`s${wi}`} style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: 2 }}>
                  <div className="display" style={{ fontSize: 16 }}>S{wi + 1}</div>
                </div>
                {week.map((cellTypes, di) => {
                  const primaryType = cellTypes.find(t => t !== 'REST') || 'REST';
                  const t = DAY_TYPES[primaryType] || DAY_TYPES.REST;
                  const isAllRest = cellTypes.every(ct => ct === 'REST');
                  const isSelected = selectedDay?.w === wi && selectedDay?.d === di;
                  const date = cellDate(currentYear, currentMonth, wi, di);
                  const dateISO = toISO(date);
                  const isToday = dateISO === todayISO;
                  const dayNum = date.getDate();
                  const inMonth = date.getMonth() + 1 === currentMonth;
                  const sessionTitle = monthSessionMap.get(dateISO);
                  const hasSession = !!sessionTitle;

                  const isDropTarget = !!calDragging && calDragging !== dateISO && !hasSession;
                  const isDraggingThis = calDragging === dateISO;
                  const isDropOver = calDropOver === dateISO;
                  const isDone = inMonth && completedDates.get(dateISO) === 'done';

                  const displayColor = isDone ? '#2BB673' : (hasSession ? '#2E6BD6' : (isAllRest ? 'var(--text-muted)' : t.color));
                  let displayBg = isDone ? 'rgba(43,182,115,0.18)' : (hasSession ? 'rgba(46,107,214,0.10)' : (isAllRest ? 'var(--surface-2)' : t.bg));
                  if (isDropOver) displayBg = 'rgba(43,182,115,0.18)';

                  let borderStyle: string;
                  if (isDropOver) borderStyle = '2px dashed #2BB673';
                  else if (isSelected) borderStyle = `2px solid ${displayColor}`;
                  else if (isDropTarget && calDragging) borderStyle = '1px dashed #2BB673';
                  else borderStyle = `1px solid ${isToday ? displayColor : 'var(--border)'}`;

                  return (
                    <button
                      key={`${wi}-${di}`}
                      draggable={hasSession}
                      onClick={() => setSelectedDay({ w: wi, d: di })}
                      onDragStart={e => {
                        if (!hasSession) return;
                        e.dataTransfer.effectAllowed = 'move';
                        e.dataTransfer.setData('cal/date', dateISO);
                        setCalDragging(dateISO);
                      }}
                      onDragEnd={() => { setCalDragging(null); setCalDropOver(null); }}
                      onDragOver={e => {
                        if (!calDragging || calDragging === dateISO || hasSession) return;
                        e.preventDefault();
                        e.dataTransfer.dropEffect = 'move';
                        if (calDropOver !== dateISO) setCalDropOver(dateISO);
                      }}
                      onDragLeave={e => {
                        if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                          if (calDropOver === dateISO) setCalDropOver(null);
                        }
                      }}
                      onDrop={async e => {
                        e.preventDefault();
                        const from = e.dataTransfer.getData('cal/date') || calDragging;
                        if (!from || from === dateISO || hasSession) return;
                        setCalDragging(null); setCalDropOver(null);
                        await handleMoveSession(from, dateISO);
                      }}
                      style={{
                        padding: '8px 7px', borderRadius: 8, minHeight: 82,
                        background: displayBg,
                        border: borderStyle,
                        cursor: hasSession ? (isDraggingThis ? 'grabbing' : 'grab') : 'pointer',
                        textAlign: 'left',
                        display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
                        gap: 3, fontFamily: 'inherit',
                        opacity: isDraggingThis ? 0.45 : (inMonth ? 1 : 0.45),
                        transition: 'background 0.1s, border-color 0.1s',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span className="mono" style={{ fontSize: 10, fontWeight: 700, color: isToday ? displayColor : 'var(--text-muted)' }}>{dayNum}</span>
                        {isToday && <span style={{ fontSize: 8, fontWeight: 700, color: displayColor, letterSpacing: '0.08em' }}>HOY</span>}
                      </div>
                      <div>
                        {hasSession ? (
                          <>
                            <div style={{ fontSize: 8, fontWeight: 700, color: displayColor, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                              {isDone ? '✓ Completado' : 'Sesión'}
                            </div>
                            <div style={{ fontSize: 9, fontWeight: 600, color: displayColor, lineHeight: 1.2, marginTop: 1, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                              {sessionTitle}
                            </div>
                          </>
                        ) : isDropOver ? (
                          <div style={{ fontSize: 9, fontWeight: 700, color: '#2BB673' }}>Mover aquí</div>
                        ) : isAllRest ? (
                          <div style={{ fontSize: 10, fontWeight: 600, color: displayColor }}>{t.label}</div>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                            {cellTypes.filter(type => type !== 'REST').map((type, idx) => {
                              const tt = DAY_TYPES[type] || DAY_TYPES.REST;
                              return <div key={idx} style={{ fontSize: 9, fontWeight: 700, color: tt.color, lineHeight: 1.2 }}>{tt.label}</div>;
                            })}
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </>
            ))}
          </div>
          </div>
        </div>

        {/* Day editor */}
        <div className="card" style={{ padding: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div>
              <div style={{ fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700 }}>
                Editor de sesión {selectedDateLabel ? `· ${selectedDateLabel}` : ''}
              </div>
              <div style={{ fontSize: 16, fontWeight: 600, marginTop: 2 }}>
                {!selectedDay ? 'Selecciona un día en el calendario' :
                 daySessions.length === 0 ? 'Sin sesiones planificadas' :
                 daySessions[0].title}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <button className="btn btn-ghost btn-sm"
                onClick={() => { if (selectedDate) window.open(`/athletes/${id}/today?date=${selectedDate}`, '_blank'); else alert('Selecciona un día primero.'); }}>
                Vista atleta
              </button>
              {selectedDay && (
                <button className="btn btn-primary btn-sm" onClick={() => setShowNewSession(true)}>
                  <PlusIcon size={11}/>Nueva sesión
                </button>
              )}
            </div>
          </div>

          {!selectedDay ? (
            <div style={{ padding: '24px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
              Haz clic en un día del calendario para ver o crear sesiones.
            </div>
          ) : daySessions.length === 0 ? (
            <div style={{ padding: '24px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
              No hay sesiones para este día.{' '}
              <button onClick={() => setShowNewSession(true)} style={{ color: 'var(--vitta-blue)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, fontFamily: 'inherit' }}>
                Crear una →
              </button>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: 20 }}>
              {daySessions.map(session => (
                <div key={session.id}>
                  {/* Session header */}
                  <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: 12 }}>
                    {selectSessionsMode && (
                      <button
                        onClick={() => setSelectedSessions(prev => {
                          const next = new Map(prev);
                          if (next.has(session.id)) next.delete(session.id); else next.set(session.id, session);
                          return next;
                        })}
                        title="Marcar sesión para copiar a otros atletas"
                        style={{ background: selectedSessions.has(session.id) ? 'rgba(46,107,214,0.1)' : 'transparent', border: `2px solid ${selectedSessions.has(session.id) ? '#2E6BD6' : 'var(--border)'}`, borderRadius: 8, cursor: 'pointer', padding: '8px 10px', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                        <input type="checkbox" checked={selectedSessions.has(session.id)} readOnly style={{ width: 15, height: 15, pointerEvents: 'none' }}/>
                      </button>
                    )}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, flex: 1 }}>
                      {[
                        { label: 'Duración',     value: `${session.duration} min` },
                        { label: 'RPE objetivo', value: session.rpe_target },
                        { label: 'Bloques',      value: session.session_blocks.length },
                      ].map(f => (
                        <div key={f.label} style={{ background: 'var(--surface-2)', borderRadius: 8, padding: '8px 10px', border: '1px solid var(--border)' }}>
                          <div style={{ fontSize: 9, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700 }}>{f.label}</div>
                          <div style={{ fontSize: 13, fontWeight: 600, marginTop: 3 }}>{f.value}</div>
                        </div>
                      ))}
                    </div>
                    <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                      <button
                        onClick={() => setCopyingSession(session)}
                        title="Copiar sesión a otro día"
                        style={{ background: 'transparent', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-muted)', cursor: 'pointer', padding: '8px 10px', display: 'grid', placeItems: 'center' }}>
                        <CopyIcon size={14}/>
                      </button>
                      <button
                        onClick={() => setEditSession(session)}
                        title="Editar sesión"
                        style={{ background: 'transparent', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-muted)', cursor: 'pointer', padding: '8px 10px', display: 'grid', placeItems: 'center' }}>
                        <PencilIcon size={14}/>
                      </button>
                      <button
                        onClick={() => deleteSession(session.id)}
                        title="Eliminar sesión"
                        style={{ background: 'transparent', border: '1px solid var(--border)', borderRadius: 8, color: '#D7474B', cursor: 'pointer', padding: '8px 10px', display: 'grid', placeItems: 'center' }}>
                        <TrashIcon size={14}/>
                      </button>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gap: 10 }}>
                    {session.session_blocks.map((block, bi) => {
                      const Ic = getCategoryIcon(block.category);
                      const blockColor = block.color || CATEGORIES[block.category]?.color || '#2E6BD6';
                      const isDone = doneBlocks.has(block.id);
                      const isCollapsed = isDone || collapsedBlocks.has(block.id);
                      return (
                        <div key={block.id}
                          draggable
                          onDragStart={e => {
                            setDragBlock({ id: block.id, sessionId: session.id });
                            e.dataTransfer.setData('block/id', block.id);
                            e.dataTransfer.effectAllowed = 'move';
                          }}
                          onDragEnd={() => { setDragBlock(null); setDragOverBlock(null); }}
                          onDragOver={e => { e.preventDefault(); setDragOverBlock(block.id); }}
                          onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOverBlock(null); }}
                          onDrop={e => {
                            e.preventDefault();
                            setDragOverBlock(null);
                            const srcBlockId = e.dataTransfer.getData('block/id');
                            if (srcBlockId && srcBlockId !== block.id) {
                              reorderBlocks(srcBlockId, block.id, session.id);
                            }
                          }}
                          style={{
                            background: dragOverBlock === block.id && dragBlock ? 'rgba(46,107,214,0.08)' : dragOverBlock === block.id ? `${blockColor}18` : isDone ? 'rgba(43,182,115,0.06)' : 'var(--surface-2)',
                            borderRadius: 10,
                            border: dragOverBlock === block.id && dragBlock ? '2px dashed #2E6BD6' : `2px solid ${dragOverBlock === block.id ? blockColor : isDone ? 'rgba(43,182,115,0.3)' : 'var(--border)'}`,
                            overflow: 'hidden',
                            transition: 'border-color 0.12s, background 0.12s',
                            opacity: dragBlock?.id === block.id ? 0.5 : 1,
                            cursor: 'grab',
                          }}>
                          {/* Block header */}
                          <div style={{ padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
                            {editBlockId === block.id ? (
                              <EditBlockForm
                                block={block}
                                onSaved={updated => {
                                  setDaySessions(prev => prev.map(s => ({
                                    ...s,
                                    session_blocks: s.session_blocks.map(b => b.id === block.id ? { ...b, ...updated } : b),
                                  })));
                                  setEditBlockId(null);
                                }}
                                onCancel={() => setEditBlockId(null)}
                              />
                            ) : isDone ? (
                              <>
                                <div style={{ width: 26, height: 26, borderRadius: 13, background: '#2BB673', color: '#fff', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                                  <CheckIcon size={13} stroke="#fff" strokeWidth={2.5}/>
                                </div>
                                <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8, minWidth: 0, overflow: 'hidden' }}>
                                  <span style={{ fontSize: 10, fontWeight: 700, color: '#2BB673', letterSpacing: '0.08em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                                    BLQ {String.fromCharCode(65 + bi)}
                                  </span>
                                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {block.name}
                                  </span>
                                  <span style={{ fontSize: 10, fontWeight: 600, color: '#2BB673', background: 'rgba(43,182,115,0.12)', padding: '1px 6px', borderRadius: 4, whiteSpace: 'nowrap', flexShrink: 0 }}>
                                    ✓ Completado
                                  </span>
                                  <span style={{ fontSize: 10, color: 'var(--text-muted)', whiteSpace: 'nowrap', flexShrink: 0 }}>
                                    {block.session_exercises.length} ejerc.
                                  </span>
                                </div>
                                <button onClick={() => toggleBlockDone(block.id)}
                                  style={{ background: 'transparent', border: '1px solid rgba(43,182,115,0.4)', borderRadius: 6, color: '#2BB673', cursor: 'pointer', padding: '4px 10px', fontSize: 11, fontWeight: 600, fontFamily: 'inherit', whiteSpace: 'nowrap', flexShrink: 0 }}>
                                  Reabrir
                                </button>
                              </>
                            ) : (
                              <>
                                <div style={{ color: 'var(--text-muted)', opacity: 0.4, cursor: 'grab', padding: '2px 2px', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                                  <GripIcon size={13}/>
                                </div>
                                <button onClick={() => toggleBlockCollapse(block.id)}
                                  style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '2px 3px', color: 'var(--text-muted)', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                                  <ChevronDown size={14} style={{ transition: 'transform 0.15s', transform: isCollapsed ? 'rotate(-90deg)' : 'none' }}/>
                                </button>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
                                  <div style={{ width: 26, height: 26, borderRadius: 6, background: `${blockColor}22`, color: blockColor, display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                                    <Ic size={13} stroke="currentColor"/>
                                  </div>
                                  <div style={{ minWidth: 0 }}>
                                    <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.08em' }}>BLOQUE {String.fromCharCode(65 + bi)}</span>
                                    <span style={{ fontSize: 13, fontWeight: 600, marginLeft: 6 }}>{block.name}</span>
                                  </div>
                                </div>
                                <div style={{ display: 'flex', gap: 4, alignItems: 'center', flexShrink: 0 }}>
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                                    <button onClick={() => moveBlock(block.id, session.id, 'up')} disabled={bi === 0} title="Subir bloque"
                                      style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: bi === 0 ? 'default' : 'pointer', padding: '1px 3px', opacity: bi === 0 ? 0.25 : 0.65, lineHeight: 1 }}>
                                      <ChevronDown size={11} style={{ transform: 'rotate(180deg)', display: 'block' }}/>
                                    </button>
                                    <button onClick={() => moveBlock(block.id, session.id, 'down')} disabled={bi === session.session_blocks.length - 1} title="Bajar bloque"
                                      style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: bi === session.session_blocks.length - 1 ? 'default' : 'pointer', padding: '1px 3px', opacity: bi === session.session_blocks.length - 1 ? 0.25 : 0.65, lineHeight: 1 }}>
                                      <ChevronDown size={11} style={{ display: 'block' }}/>
                                    </button>
                                  </div>
                                  <button onClick={() => setEditBlockId(block.id)} title="Editar bloque"
                                    style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '3px 5px', borderRadius: 5 }}>
                                    <PencilIcon size={12}/>
                                  </button>
                                  <button onClick={() => deleteBlock(block.id, session.id)} title="Eliminar bloque"
                                    style={{ background: 'transparent', border: 'none', color: '#D7474B', cursor: 'pointer', padding: '3px 5px', borderRadius: 5 }}>
                                    <TrashIcon size={12}/>
                                  </button>
                                  <button className="btn btn-ghost btn-sm" onClick={() => setAddExerciseFor(addExerciseFor === block.id ? null : block.id)}>
                                    <PlusIcon size={11}/>Añadir ejercicio
                                  </button>
                                  <button onClick={() => toggleBlockDone(block.id)}
                                    style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 9px', borderRadius: 6, border: '1px solid rgba(43,182,115,0.45)', background: 'transparent', color: '#2BB673', cursor: 'pointer', fontSize: 11, fontWeight: 700, fontFamily: 'inherit' }}>
                                    <CheckIcon size={11} stroke="#2BB673" strokeWidth={2.5}/>OK
                                  </button>
                                </div>
                              </>
                            )}
                          </div>

                          {/* Collapsible content */}
                          {!isCollapsed && (
                            <div style={{ borderTop: '1px solid var(--border)', padding: '10px 12px 12px' }}>
                              <div style={{ display: 'grid', gap: 5 }}>
                                {block.session_exercises.map((item, idx) => {
                                  const isExpanded = expandedEx.has(item.id);
                                  const setsSummary = item.sets.length > 0
                                    ? `${item.sets.length}×${item.sets[0].reps || '—'}` + (item.sets[0].load ? ` · ${item.sets[0].load}kg` : '')
                                    : null;
                                  return (
                                    <div key={item.id} style={{ background: 'white', borderRadius: 6, border: '1px solid var(--border)', overflow: 'hidden' }}>
                                      <div
                                        style={{ display: 'grid', gridTemplateColumns: '20px 1fr auto auto auto', gap: 8, alignItems: 'center', padding: '8px 10px', fontSize: 12, cursor: 'pointer' }}
                                        onClick={() => toggleEx(item.id)}
                                      >
                                        <span className="mono" style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                                          {String.fromCharCode(65 + bi)}{idx + 1}
                                        </span>
                                        <div>
                                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                                            <span style={{ fontWeight: 600 }}>{item.name}</span>
                                            {item.level && <LevelBadge level={item.level} size="sm"/>}
                                            {setsSummary && (
                                              <span className="mono" style={{ fontSize: 10, color: 'var(--text-muted)', background: 'var(--surface-2)', padding: '1px 5px', borderRadius: 4 }}>
                                                {setsSummary}
                                              </span>
                                            )}
                                          </div>
                                          {item.note && <div className="muted" style={{ fontSize: 10, marginTop: 2 }}>{item.note}</div>}
                                        </div>
                                        <div onClick={e => e.stopPropagation()} style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                                          <button onClick={e => { e.stopPropagation(); moveExercise(item.id, block.id, 'up'); }}
                                            disabled={idx === 0}
                                            title="Subir ejercicio"
                                            style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: idx === 0 ? 'default' : 'pointer', padding: '1px 3px', opacity: idx === 0 ? 0.25 : 0.65, lineHeight: 1 }}>
                                            <ChevronDown size={11} style={{ transform: 'rotate(180deg)', display: 'block' }}/>
                                          </button>
                                          <button onClick={e => { e.stopPropagation(); moveExercise(item.id, block.id, 'down'); }}
                                            disabled={idx === block.session_exercises.length - 1}
                                            title="Bajar ejercicio"
                                            style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: idx === block.session_exercises.length - 1 ? 'default' : 'pointer', padding: '1px 3px', opacity: idx === block.session_exercises.length - 1 ? 0.25 : 0.65, lineHeight: 1 }}>
                                            <ChevronDown size={11} style={{ display: 'block' }}/>
                                          </button>
                                        </div>
                                        <button onClick={e => { e.stopPropagation(); deleteExercise(item.id, block.id); }}
                                          style={{ background: 'transparent', border: 'none', color: '#D7474B', cursor: 'pointer', padding: '2px 4px', opacity: 0.7 }}>
                                          <TrashIcon size={13}/>
                                        </button>
                                        <ChevronDown size={14} style={{ color: 'var(--text-muted)', transition: 'transform 0.15s', transform: isExpanded ? 'rotate(180deg)' : 'none', flexShrink: 0 }}/>
                                      </div>

                                      {isExpanded && (
                                        <div style={{ borderTop: '1px solid var(--border)' }}>
                                          {item.sets.length > 0 && (
                                            <div className="admin-table-scroll">
                                            <div style={{ minWidth: 320 }}>
                                              <div style={{ display: 'grid', gridTemplateColumns: '20px 1fr 1fr 46px 1fr 22px 22px', gap: 6, padding: '5px 12px', fontSize: 9, color: 'var(--text-muted)', letterSpacing: '0.06em', textTransform: 'uppercase', fontWeight: 700 }}>
                                                <div>SET</div><div>REPS</div><div>KG</div><div>RPE</div><div>DESCANSO</div><div/><div/>
                                              </div>
                                              {item.sets.map((s, si) => {
                                                const si_css: React.CSSProperties = { padding: '3px 5px', borderRadius: 4, border: '1px solid var(--border)', background: 'var(--surface-2)', fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text)', width: '100%', boxSizing: 'border-box' as const };
                                                return (
                                                <div key={s.id} onClick={e => e.stopPropagation()} style={{ display: 'grid', gridTemplateColumns: '20px 1fr 1fr 46px 1fr 22px 22px', gap: 6, padding: '4px 12px', alignItems: 'center', borderTop: '1px solid var(--border)' }}>
                                                  <span className="mono" style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)' }}>{si + 1}</span>
                                                  <input defaultValue={s.reps ?? ''} placeholder="—" onBlur={e => updateSet(s.id, 'reps', e.target.value, item.id, block.id)} style={si_css}/>
                                                  <input defaultValue={s.load ?? ''} placeholder="—" type="number" min={0} step={0.5} onBlur={e => updateSet(s.id, 'load', e.target.value, item.id, block.id)} style={si_css}/>
                                                  <input defaultValue={s.rpe_target != null ? String(s.rpe_target) : ''} placeholder="—" type="number" min={1} max={10} step={0.5} onBlur={e => updateSet(s.id, 'rpe_target', e.target.value, item.id, block.id)} style={si_css}/>
                                                  <input defaultValue={s.rest ?? ''} placeholder="—" onBlur={e => updateSet(s.id, 'rest', e.target.value, item.id, block.id)} style={si_css}/>
                                                  <button onClick={e => { e.stopPropagation(); duplicateSet(s.id, item.id, block.id); }}
                                                    title="Duplicar serie"
                                                    style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '1px 0', opacity: 0.6, display: 'grid', placeItems: 'center' }}>
                                                    <CopyIcon size={11}/>
                                                  </button>
                                                  <button onClick={e => { e.stopPropagation(); deleteSet(s.id, item.id, block.id); }}
                                                    style={{ background: 'transparent', border: 'none', color: '#D7474B', cursor: 'pointer', padding: '1px 0', opacity: 0.6, display: 'grid', placeItems: 'center' }}>
                                                    <XIcon size={11}/>
                                                  </button>
                                                </div>
                                                );
                                              })}
                                            </div>
                                            </div>
                                          )}
                                          <div onClick={e => e.stopPropagation()} style={{ padding: '6px 12px', borderTop: '1px solid var(--border)' }}>
                                            <textarea
                                              key={item.id + (item.note ?? '')}
                                              defaultValue={item.note ?? ''}
                                              placeholder="Añadir nota o descripción..."
                                              onBlur={e => updateExerciseNote(item.id, block.id, e.target.value)}
                                              rows={2}
                                              style={{ width: '100%', boxSizing: 'border-box' as const, fontSize: 11, padding: '4px 6px', borderRadius: 4, border: '1px solid var(--border)', background: 'var(--surface-2)', color: 'var(--text)', resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.4 }}
                                            />
                                          </div>
                                          {addSetFor === item.id ? (
                                            <AddSetForm
                                              exerciseId={item.id}
                                              onSaved={newSet => {
                                                setDaySessions(prev => prev.map(s => ({
                                                  ...s,
                                                  session_blocks: s.session_blocks.map(b =>
                                                    b.id === block.id ? {
                                                      ...b,
                                                      session_exercises: b.session_exercises.map(e =>
                                                        e.id === item.id ? { ...e, sets: [...e.sets, newSet] } : e
                                                      ),
                                                    } : b
                                                  ),
                                                })));
                                              }}
                                              onClose={() => setAddSetFor(null)}
                                            />
                                          ) : (
                                            <div style={{ padding: '5px 12px 7px' }}>
                                              <button onClick={e => { e.stopPropagation(); setAddSetFor(item.id); }} className="btn btn-ghost btn-sm" style={{ fontSize: 10 }}>
                                                <PlusIcon size={10}/>Añadir serie
                                              </button>
                                            </div>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>

                              {block.session_exercises.length === 0 && (
                                <div style={{ fontSize: 12, color: 'var(--text-muted)', padding: '6px 0' }}>Sin ejercicios. Añade uno arriba.</div>
                              )}

                              {addExerciseFor === block.id && (
                                <ExercisePickerPanel
                                  blockId={block.id}
                                  category={block.category}
                                  athleteId={id}
                                  existingNames={new Set(block.session_exercises.map(e => e.name.trim().toLowerCase()))}
                                  onExerciseAdded={newEx => {
                                    setDaySessions(prev => prev.map(s => ({
                                      ...s,
                                      session_blocks: s.session_blocks.map(b =>
                                        b.id === block.id ? { ...b, session_exercises: [...b.session_exercises, newEx] } : b
                                      ),
                                    })));
                                    setExpandedEx(prev => new Set([...prev, newEx.id]));
                                  }}
                                  onDone={() => setAddExerciseFor(null)}
                                />
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {addBlockFor === session.id ? (
                    <BlockCategoryChips
                      onPick={async categoryId => { await addBlockFromCategory(session.id, categoryId); }}
                      onDone={() => setAddBlockFor(null)}
                    />
                  ) : (
                    <button className="btn btn-ghost btn-sm" style={{ marginTop: 10 }} onClick={() => setAddBlockFor(session.id)}>
                      <PlusIcon size={11}/>Añadir bloque
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ─── Suggestion panel ───────────────────────────────── */}
      <div className="planner-sidebar" style={{ background: 'var(--surface)', borderLeft: '1px solid var(--border)', padding: '20px 18px', overflow: 'auto' }}>
        {/* Previous month's training load, for reference while planning */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700 }}>Carga · {prevMonthLabel}</div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 1 }}>Mes anterior al que estás planificando</div>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={() => window.open(`/athletes/${id}/report`, '_blank')} title="Ver informe mensual completo">
            <TrendIcon size={12}/>
          </button>
        </div>
        {prevLoadLoading ? (
          <div style={{ fontSize: 12, color: 'var(--text-muted)', padding: '12px 0', textAlign: 'center' }}>Calculando...</div>
        ) : !prevLoadSummary || (prevLoadSummary.entrenados + prevLoadSummary.parciales + prevLoadSummary.noEntrenados === 0) ? (
          <div style={{ fontSize: 12, color: 'var(--text-muted)', padding: '12px 0', textAlign: 'center' }}>Sin datos registrados ese mes</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 16 }}>
            <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '8px 10px' }}>
              <div style={{ fontSize: 9, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Carga total</div>
              <div className="mono tnum" style={{ fontSize: 16, fontWeight: 800, marginTop: 2 }}>{Math.round(prevLoadSummary.loadTotal)} <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-muted)' }}>UA</span></div>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '8px 10px' }}>
              <div style={{ fontSize: 9, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Sesiones</div>
              <div className="mono tnum" style={{ fontSize: 16, fontWeight: 800, marginTop: 2 }}>{prevLoadSummary.entrenados}<span style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-muted)' }}>/{prevLoadSummary.entrenados + prevLoadSummary.parciales + prevLoadSummary.noEntrenados}</span></div>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '8px 10px' }}>
              <div style={{ fontSize: 9, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>RPE prom.</div>
              <div className="mono tnum" style={{ fontSize: 16, fontWeight: 800, marginTop: 2 }}>{prevLoadSummary.avgRpe != null ? (Math.round(prevLoadSummary.avgRpe * 10) / 10) : '—'}</div>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '8px 10px' }}>
              <div style={{ fontSize: 9, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Sueño prom.</div>
              <div className="mono tnum" style={{ fontSize: 16, fontWeight: 800, marginTop: 2 }}>{prevLoadSummary.avgSleep != null ? `${Math.round(prevLoadSummary.avgSleep * 10) / 10}h` : '—'}</div>
            </div>
          </div>
        )}

        {/* Progress: exercise bests */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <TrendIcon size={16} stroke="var(--vitta-blue-bright)"/>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700 }}>Mejores series · Ranking</div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 1 }}>1RM estimado · Brzycki</div>
          </div>
        </div>
        {bestsLoading ? (
          <div style={{ fontSize: 12, color: 'var(--text-muted)', padding: '12px 0', textAlign: 'center' }}>Calculando...</div>
        ) : bests.length === 0 ? (
          <div style={{ fontSize: 12, color: 'var(--text-muted)', padding: '12px 0', textAlign: 'center' }}>Sin series completadas aún</div>
        ) : (
          <div style={{ display: 'grid', gap: 6, marginBottom: 14 }}>
            {bests.slice(0, 5).map((entry, i) => {
              const rankColor = RANK_COLORS[i] ?? 'rgba(255,255,255,0.35)';
              return (
                <div key={entry.name} style={{
                  background: i < 3 ? `${rankColor}14` : 'rgba(255,255,255,0.03)',
                  border: `1px solid ${i < 3 ? `${rankColor}35` : 'rgba(255,255,255,0.08)'}`,
                  borderRadius: 10, padding: '10px 12px',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <div style={{
                      width: 22, height: 22, borderRadius: 11, flexShrink: 0,
                      background: i < 3 ? rankColor : 'rgba(255,255,255,0.12)',
                      color: i < 3 ? '#0E1936' : 'rgba(255,255,255,0.5)',
                      display: 'grid', placeItems: 'center',
                      fontSize: 10, fontWeight: 800,
                    }}>{i + 1}</div>
                    <div style={{ flex: 1, minWidth: 0, fontSize: 12, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {entry.name}
                    </div>
                    <div className="mono" style={{ fontSize: 12, fontWeight: 800, color: rankColor, flexShrink: 0 }}>
                      {entry.reps}×{fmtLoad(entry.load)}kg
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 3 }}>
                    {[
                      { label: '1RM', value: entry.rm1, accent: true },
                      { label: '3RM', value: entry.rm3, accent: false },
                      { label: '6RM', value: entry.rm6, accent: false },
                      { label: '8RM', value: entry.rm8, accent: false },
                    ].map(rm => (
                      <div key={rm.label} style={{
                        background: rm.accent ? 'rgba(46,107,214,0.18)' : 'rgba(255,255,255,0.05)',
                        border: `1px solid ${rm.accent ? 'rgba(46,107,214,0.35)' : 'rgba(255,255,255,0.08)'}`,
                        borderRadius: 6, padding: '4px 3px', textAlign: 'center',
                      }}>
                        <div style={{ fontSize: 7, color: rm.accent ? 'rgba(74,138,240,0.9)' : 'rgba(255,255,255,0.4)', fontWeight: 700, textTransform: 'uppercase' }}>{rm.label}</div>
                        <div className="mono tnum" style={{ fontSize: 11, fontWeight: 800, color: rm.accent ? '#4A8AF0' : 'var(--text)', marginTop: 1 }}>{fmtLoad(rm.value)}</div>
                        <div style={{ fontSize: 7, color: 'var(--text-muted)' }}>kg</div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
