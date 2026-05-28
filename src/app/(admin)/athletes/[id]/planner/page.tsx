'use client';
import { useState, useEffect, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase';
import { CATEGORIES, DAY_TYPES } from '@/lib/constants';
import { getCategoryIcon, PlusIcon, CopyIcon, LayersIcon, ChevronLeft, ChevronRight, ChevronDown, SparkleIcon, TrashIcon, PencilIcon, CheckIcon, XIcon, TrendIcon } from '@/components/icons';
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

type PlanCell = DayType[];

function defaultPlan(): PlanCell[][] {
  return Array.from({ length: 4 }, () => Array.from({ length: 7 }, () => ['REST' as DayType]));
}

function normalizePlan(raw: any): PlanCell[][] {
  if (!Array.isArray(raw)) return defaultPlan();
  return Array.from({ length: 4 }, (_, wi) => {
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
      <div className="card" style={{ width: 440, padding: 24 }}>
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
      <div className="card" style={{ width: 440, padding: 24 }}>
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

// ─── Add Block inline form ───────────────────────────────────

function AddBlockForm({ sessionId, onSaved, onCancel }: { sessionId: string; onSaved: () => void; onCancel: () => void }) {
  const [name, setName] = useState('');
  const [category, setCategory] = useState<CategoryId>('empuje');
  const [saving, setSaving] = useState(false);

  const inp: React.CSSProperties = { padding: '6px 9px', borderRadius: 7, border: '1px solid var(--border)', background: 'var(--surface)', fontSize: 12, fontFamily: 'inherit', color: 'var(--text)' };

  async function save() {
    if (!name.trim()) return;
    setSaving(true);
    const cat = CATEGORIES[category];
    const supabase = createClient();
    await supabase.from('session_blocks').insert({ session_id: sessionId, name: name.trim(), category, color: cat?.color || '#2E6BD6', sort_order: 0 });
    setSaving(false);
    onSaved();
  }

  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '8px 0' }}>
      <input placeholder="Nombre del bloque" value={name} onChange={e => setName(e.target.value)} style={{ ...inp, flex: 1 }}/>
      <select value={category} onChange={e => setCategory(e.target.value as CategoryId)} style={inp}>
        {Object.values(CATEGORIES).map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
      </select>
      <button onClick={save} disabled={saving || !name.trim()} className="btn btn-primary btn-sm">{saving ? '...' : 'Añadir'}</button>
      <button onClick={onCancel} className="btn btn-ghost btn-sm">Cancelar</button>
    </div>
  );
}

// ─── Add Exercise inline form ────────────────────────────────

interface SetDraft { id: number; reps: string; load: string; rpe: string; rest: string; }

function AddExerciseForm({ blockId, category, onSaved, onCancel }: {
  blockId: string; category: CategoryId;
  onSaved: () => void; onCancel: () => void;
}) {
  const [name, setName] = useState('');
  const [level, setLevel] = useState<LevelId>('basico');
  const [note, setNote] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [exerciseId, setExerciseId] = useState<string | null>(null);
  const [draftSets, setDraftSets] = useState<SetDraft[]>([
    { id: 1, reps: '5', load: '', rpe: '7', rest: '2:00' },
    { id: 2, reps: '5', load: '', rpe: '7', rest: '2:00' },
    { id: 3, reps: '5', load: '', rpe: '7', rest: '2:00' },
  ]);
  const [counter, setCounter] = useState(4);
  const [libExercises, setLibExercises] = useState<LibEx[]>([]);
  const [showSugg, setShowSugg] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  const inp: React.CSSProperties = { padding: '6px 9px', borderRadius: 7, border: '1px solid var(--border)', background: 'var(--surface)', fontSize: 12, fontFamily: 'inherit', color: 'var(--text)' };
  const si: React.CSSProperties  = { padding: '5px 7px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--surface)', fontSize: 11, fontFamily: 'inherit', color: 'var(--text)', width: '100%' };

  useEffect(() => {
    createClient().from('exercises').select('id, name, level, video_url, gif_url').eq('category', category).order('name')
      .then(({ data }) => setLibExercises((data as LibEx[]) || []));
  }, [category]);

  const suggestions = libExercises.filter(e => !name.trim() || e.name.toLowerCase().includes(name.toLowerCase()));

  function addRow() {
    setDraftSets(prev => [...prev, { id: counter, reps: '', load: '', rpe: '', rest: '' }]);
    setCounter(c => c + 1);
  }

  function dupRow(idx: number) {
    const s = draftSets[idx];
    setDraftSets(prev => [...prev.slice(0, idx + 1), { ...s, id: counter }, ...prev.slice(idx + 1)]);
    setCounter(c => c + 1);
  }

  function delRow(idx: number) {
    setDraftSets(prev => prev.filter((_, i) => i !== idx));
  }

  function updateRow(idx: number, field: keyof Omit<SetDraft, 'id'>, value: string) {
    setDraftSets(prev => prev.map((s, i) => i === idx ? { ...s, [field]: value } : s));
  }

  async function save() {
    if (!name.trim()) return;
    setSaving(true); setSaveError('');
    const supabase = createClient();
    const { data: existing } = await supabase.from('session_exercises').select('sort_order').eq('block_id', blockId).order('sort_order', { ascending: false }).limit(1);
    const nextSort = ((existing?.[0]?.sort_order ?? -1) as number) + 1;
    const { data: exData, error: exErr } = await supabase
      .from('session_exercises')
      .insert({ block_id: blockId, exercise_id: exerciseId, name: name.trim(), level, note: note.trim() || null, sort_order: nextSort, video_url: videoUrl.trim() || null })
      .select('id').single();
    if (exErr) { setSaveError(exErr.message); setSaving(false); return; }
    if (exData && draftSets.length > 0) {
      const { error: setsErr } = await supabase.from('sets').insert(
        draftSets.map((s, i) => ({
          session_ex_id: exData.id,
          reps: s.reps || null,
          load: s.load || null,
          rpe_target: s.rpe ? Number(s.rpe) : null,
          rest: s.rest || null,
          done: false,
          sort_order: i,
        }))
      );
      if (setsErr) { setSaveError(setsErr.message); setSaving(false); return; }
    }
    setSaving(false);
    onSaved();
  }

  return (
    <div style={{ marginTop: 8, padding: 12, background: 'rgba(46,107,214,0.05)', borderRadius: 10, border: '1px solid var(--border)', display: 'grid', gap: 10 }}>

      {/* Name with dropdown + level */}
      <div style={{ display: 'flex', gap: 8 }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <div style={{ position: 'relative' }}>
            <input
              placeholder="Buscar en biblioteca de ejercicios..."
              value={name}
              onChange={e => { setName(e.target.value); setExerciseId(null); setShowSugg(true); }}
              onFocus={() => setShowSugg(true)}
              onBlur={() => setTimeout(() => setShowSugg(false), 160)}
              style={{ ...inp, width: '100%', boxSizing: 'border-box', paddingRight: 28 }}
            />
            <button
              type="button"
              onMouseDown={e => { e.preventDefault(); setShowSugg(v => !v); }}
              style={{ position: 'absolute', right: 7, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 2, display: 'grid', placeItems: 'center' }}
            >
              <ChevronDown size={11}/>
            </button>
          </div>
          {showSugg && suggestions.length > 0 && (
            <div style={{ position: 'absolute', top: 'calc(100% + 2px)', left: 0, right: 0, zIndex: 200, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, boxShadow: '0 6px 20px rgba(0,0,0,0.18)', maxHeight: 220, overflowY: 'auto' }}>
              {!name.trim() && (
                <div style={{ padding: '5px 12px 4px', fontSize: 9, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.06em', textTransform: 'uppercase', borderBottom: '1px solid var(--border)' }}>
                  Biblioteca · {suggestions.length} ejercicios
                </div>
              )}
              {suggestions.slice(0, 14).map((ex, i) => (
                <button key={ex.id} type="button"
                  onMouseDown={() => {
                    setName(ex.name);
                    setExerciseId(ex.id);
                    setLevel(ex.level);
                    if (ex.video_url || ex.gif_url) setVideoUrl(ex.video_url || ex.gif_url || '');
                    setShowSugg(false);
                  }}
                  style={{ width: '100%', padding: '8px 12px', textAlign: 'left', background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 12, color: 'var(--text)', borderTop: i > 0 ? '1px solid var(--border)' : 'none', fontFamily: 'inherit' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-2)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <span>{ex.name}</span>
                  {(ex.video_url || ex.gif_url) && <span style={{ fontSize: 10, color: 'var(--vitta-blue)', marginLeft: 6 }}>· video</span>}
                </button>
              ))}
              {suggestions.length > 14 && (
                <div style={{ padding: '5px 12px', fontSize: 10, color: 'var(--text-muted)', borderTop: '1px solid var(--border)', fontStyle: 'italic' }}>
                  + {suggestions.length - 14} más · escribe para filtrar
                </div>
              )}
            </div>
          )}
        </div>
        <select value={level} onChange={e => setLevel(e.target.value as LevelId)} style={inp}>
          <option value="basico">Básico</option>
          <option value="intermedio">Intermedio</option>
          <option value="avanzado">Avanzado</option>
        </select>
      </div>

      {/* Sets table */}
      <div style={{ background: 'var(--surface-2)', borderRadius: 8, border: '1px solid var(--border)', overflow: 'hidden' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '24px 1fr 1fr 48px 1fr 42px', gap: 6, padding: '5px 10px', fontSize: 9, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.06em', textTransform: 'uppercase', borderBottom: '1px solid var(--border)' }}>
          <div>#</div><div>REPS</div><div>KG</div><div>RPE</div><div>DESCANSO</div><div/>
        </div>
        {draftSets.map((s, i) => (
          <div key={s.id} style={{ display: 'grid', gridTemplateColumns: '24px 1fr 1fr 48px 1fr 42px', gap: 6, padding: '5px 10px', alignItems: 'center', borderTop: i > 0 ? '1px solid var(--border)' : undefined }}>
            <span className="mono" style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)' }}>{i + 1}</span>
            <input placeholder="5"   value={s.reps} onChange={e => updateRow(i, 'reps', e.target.value)} style={si}/>
            <input placeholder="—"   type="number" min={0} step={0.5} value={s.load} onChange={e => updateRow(i, 'load', e.target.value)} style={si}/>
            <input placeholder="7"   type="number" min={1} max={10} step={0.5} value={s.rpe} onChange={e => updateRow(i, 'rpe', e.target.value)} style={si}/>
            <input placeholder="2:00" value={s.rest} onChange={e => updateRow(i, 'rest', e.target.value)} style={si}/>
            <div style={{ display: 'flex', gap: 1 }}>
              <button type="button" onClick={() => dupRow(i)} title="Copiar serie"
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '2px 4px', borderRadius: 4, display: 'grid', placeItems: 'center' }}>
                <CopyIcon size={11}/>
              </button>
              <button type="button" onClick={() => delRow(i)} title="Eliminar serie" disabled={draftSets.length === 1}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#D7474B', padding: '2px 4px', borderRadius: 4, display: 'grid', placeItems: 'center', opacity: draftSets.length === 1 ? 0.25 : 0.7 }}>
                <XIcon size={11}/>
              </button>
            </div>
          </div>
        ))}
        <div style={{ padding: '6px 10px', borderTop: '1px solid var(--border)' }}>
          <button type="button" onClick={addRow} className="btn btn-ghost btn-sm" style={{ fontSize: 10 }}>
            <PlusIcon size={10}/>Añadir serie
          </button>
        </div>
      </div>

      <input placeholder="Nota / descripción (opcional)" value={note} onChange={e => setNote(e.target.value)} style={{ ...inp, width: '100%', boxSizing: 'border-box' }}/>
      <input placeholder="URL de video o GIF (opcional)" value={videoUrl} onChange={e => setVideoUrl(e.target.value)} style={{ ...inp, width: '100%', boxSizing: 'border-box' }}/>
      {saveError && <div style={{ fontSize: 11, color: 'var(--red)', padding: '5px 8px', background: 'rgba(215,71,75,0.08)', borderRadius: 5 }}>{saveError}</div>}
      <div style={{ display: 'flex', gap: 6 }}>
        <button onClick={save} disabled={saving || !name.trim()} className="btn btn-primary btn-sm">{saving ? '...' : 'Añadir ejercicio'}</button>
        <button onClick={onCancel} className="btn btn-ghost btn-sm">Cancelar</button>
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
      <div className="card thin-scroll" style={{ width: 600, padding: 24, maxHeight: '90vh', overflowY: 'auto' }}>
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
      <div className="card thin-scroll" style={{ width: 560, padding: 24, maxHeight: '90vh', overflowY: 'auto' }}>
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
      <div className="card" style={{ width: 380, padding: 24 }}>
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

// ─── Main page ───────────────────────────────────────────────

export default function PlannerPage() {
  const pathname = usePathname();
  const id = pathname.split('/athletes/')[1]?.split('/')[0] ?? '';

  const now = new Date();
  const [currentYear, setCurrentYear] = useState(now.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(now.getMonth() + 1);

  const [athlete, setAthlete] = useState<Athlete | null>(null);
  const [athleteLoading, setAthleteLoading] = useState(true);
  const [monthPlan, setMonthPlan] = useState<PlanCell[][]>(defaultPlan());
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
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [applyingTemplate, setApplyingTemplate] = useState(false);
  const [copyingSession, setCopyingSession] = useState<DbSession | null>(null);

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

  // ── Fetch month plan ───────────────────────────────────────
  useEffect(() => {
    if (!id) return;
    const supabase = createClient();
    supabase.from('month_plans').select('plan').eq('athlete_id', id).eq('year', currentYear).eq('month', currentMonth).maybeSingle()
      .then(({ data }) => setMonthPlan(normalizePlan(data?.plan)));
  }, [id, currentYear, currentMonth]);

  // ── Fetch session titles for calendar month ────────────────
  useEffect(() => {
    if (!id) return;
    const start = calendarStart(currentYear, currentMonth);
    const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 4 * 7 - 1);
    const supabase = createClient();
    supabase.from('sessions').select('date, title').eq('athlete_id', id).gte('date', toISO(start)).lte('date', toISO(end))
      .then(({ data }) => {
        const map = new Map<string, string>();
        for (const s of (data || [])) {
          if (!map.has(s.date)) map.set(s.date, s.title);
        }
        setMonthSessionMap(map);
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

  // ── Save month plan ────────────────────────────────────────
  async function savePlan(plan: PlanCell[][]) {
    const supabase = createClient();
    await supabase.from('month_plans').upsert(
      { athlete_id: id, year: currentYear, month: currentMonth, plan },
      { onConflict: 'athlete_id,year,month' }
    );
  }

  // ── Duplicate previous month plan ─────────────────────────
  async function handleDuplicatePrevMonth() {
    setDuplicating(true);
    const prevYear = currentMonth === 1 ? currentYear - 1 : currentYear;
    const prevMonthNum = currentMonth === 1 ? 12 : currentMonth - 1;
    const supabase = createClient();
    const { data } = await supabase.from('month_plans').select('plan')
      .eq('athlete_id', id).eq('year', prevYear).eq('month', prevMonthNum).maybeSingle();
    if (!data?.plan) {
      alert(`No hay plan guardado para ${MONTH_NAMES[prevMonthNum - 1]} ${prevYear}.`);
      setDuplicating(false);
      return;
    }
    const plan = normalizePlan(data.plan);
    await savePlan(plan);
    setMonthPlan(plan);
    setDuplicating(false);
  }

  async function handleApplyTemplate(tpl: DbPlanTemplate) {
    const plan = normalizePlan(tpl.plan);
    setApplyingTemplate(true);
    try {
      await savePlan(plan);

      if (Object.keys(tpl.exercises).length > 0) {
        const supabase = createClient();

        // Fetch existing session dates to avoid duplicates
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
    if (!confirm(`¿Eliminar el plan de ${MONTH_NAMES[currentMonth - 1]} ${currentYear}? Esta acción no se puede deshacer.`)) return;
    const supabase = createClient();
    await supabase.from('month_plans').delete()
      .eq('athlete_id', id).eq('year', currentYear).eq('month', currentMonth);
    setMonthPlan(defaultPlan());
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
  const FocusIcon = getCategoryIcon(athlete?.focus || 'empuje');
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
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', height: '100vh' }}>
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
      <div className="thin-scroll" style={{ overflow: 'auto', padding: '20px 24px 28px' }}>
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
          <div style={{ display: 'flex', gap: 6 }}>
            <Link href={`/athletes/${id}/progress`} className="btn btn-ghost" style={{ textDecoration: 'none' }}>
              <TrendIcon size={13}/>Progreso
            </Link>
            <button className="btn btn-ghost" onClick={handleDuplicatePrevMonth} disabled={duplicating}>
              <CopyIcon size={13}/>{duplicating ? 'Copiando...' : 'Duplicar mes anterior'}
            </button>
            <button className="btn btn-ghost" onClick={() => setShowTemplateModal(true)}>
              <LayersIcon size={13}/>Aplicar plantilla
            </button>
            <button className="btn btn-ghost" onClick={handleDeletePlan}
              style={{ color: '#D7474B' }}>
              <TrashIcon size={13}/>Eliminar plan
            </button>
            <button className="btn btn-primary"
              onClick={() => { if (!selectedDay) { alert('Selecciona un día en el calendario primero.'); return; } setShowNewSession(true); }}>
              <PlusIcon size={13}/>Añadir sesión
            </button>
          </div>
        </div>

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

          <div style={{ display: 'grid', gridTemplateColumns: '60px repeat(7, 1fr)', gap: 4, marginTop: 8 }}>
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

                  const displayColor = hasSession ? '#2E6BD6' : (isAllRest ? 'var(--text-muted)' : t.color);
                  const displayBg    = hasSession ? 'rgba(46,107,214,0.10)' : (isAllRest ? 'var(--surface-2)' : t.bg);

                  return (
                    <button key={`${wi}-${di}`} onClick={() => setSelectedDay({ w: wi, d: di })} style={{
                      padding: '8px 7px', borderRadius: 8, minHeight: 82,
                      background: displayBg,
                      border: isSelected ? `2px solid ${displayColor}` : `1px solid ${isToday ? displayColor : 'var(--border)'}`,
                      cursor: 'pointer', textAlign: 'left',
                      display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
                      gap: 3, fontFamily: 'inherit', opacity: inMonth ? 1 : 0.45,
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span className="mono" style={{ fontSize: 10, fontWeight: 700, color: isToday ? displayColor : 'var(--text-muted)' }}>{dayNum}</span>
                        {isToday && <span style={{ fontSize: 8, fontWeight: 700, color: displayColor, letterSpacing: '0.08em' }}>HOY</span>}
                      </div>
                      <div>
                        {hasSession ? (
                          <>
                            <div style={{ fontSize: 8, fontWeight: 700, color: '#2E6BD6', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Sesión</div>
                            <div style={{ fontSize: 9, fontWeight: 600, color: '#2E6BD6', lineHeight: 1.2, marginTop: 1, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                              {sessionTitle}
                            </div>
                          </>
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
                        <div key={block.id} style={{
                          background: isDone ? 'rgba(43,182,115,0.06)' : 'var(--surface-2)',
                          borderRadius: 10,
                          border: `1px solid ${isDone ? 'rgba(43,182,115,0.3)' : 'var(--border)'}`,
                          overflow: 'hidden',
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
                                        style={{ display: 'grid', gridTemplateColumns: '20px 1fr auto auto', gap: 8, alignItems: 'center', padding: '8px 10px', fontSize: 12, cursor: 'pointer' }}
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
                                        <button onClick={e => { e.stopPropagation(); deleteExercise(item.id, block.id); }}
                                          style={{ background: 'transparent', border: 'none', color: '#D7474B', cursor: 'pointer', padding: '2px 4px', opacity: 0.7 }}>
                                          <TrashIcon size={13}/>
                                        </button>
                                        <ChevronDown size={14} style={{ color: 'var(--text-muted)', transition: 'transform 0.15s', transform: isExpanded ? 'rotate(180deg)' : 'none', flexShrink: 0 }}/>
                                      </div>

                                      {isExpanded && (
                                        <div style={{ borderTop: '1px solid var(--border)' }}>
                                          {item.sets.length > 0 && (
                                            <>
                                              <div style={{ display: 'grid', gridTemplateColumns: '20px 1fr 1fr 46px 1fr 22px', gap: 6, padding: '5px 12px', fontSize: 9, color: 'var(--text-muted)', letterSpacing: '0.06em', textTransform: 'uppercase', fontWeight: 700 }}>
                                                <div>SET</div><div>REPS</div><div>KG</div><div>RPE</div><div>DESCANSO</div><div/>
                                              </div>
                                              {item.sets.map((s, si) => {
                                                const si_css: React.CSSProperties = { padding: '3px 5px', borderRadius: 4, border: '1px solid var(--border)', background: 'var(--surface-2)', fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text)', width: '100%', boxSizing: 'border-box' as const };
                                                return (
                                                <div key={s.id} onClick={e => e.stopPropagation()} style={{ display: 'grid', gridTemplateColumns: '20px 1fr 1fr 46px 1fr 22px', gap: 6, padding: '4px 12px', alignItems: 'center', borderTop: '1px solid var(--border)' }}>
                                                  <span className="mono" style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)' }}>{si + 1}</span>
                                                  <input defaultValue={s.reps ?? ''} placeholder="—" onBlur={e => updateSet(s.id, 'reps', e.target.value, item.id, block.id)} style={si_css}/>
                                                  <input defaultValue={s.load ?? ''} placeholder="—" type="number" min={0} step={0.5} onBlur={e => updateSet(s.id, 'load', e.target.value, item.id, block.id)} style={si_css}/>
                                                  <input defaultValue={s.rpe_target != null ? String(s.rpe_target) : ''} placeholder="—" type="number" min={1} max={10} step={0.5} onBlur={e => updateSet(s.id, 'rpe_target', e.target.value, item.id, block.id)} style={si_css}/>
                                                  <input defaultValue={s.rest ?? ''} placeholder="—" onBlur={e => updateSet(s.id, 'rest', e.target.value, item.id, block.id)} style={si_css}/>
                                                  <button onClick={e => { e.stopPropagation(); deleteSet(s.id, item.id, block.id); }}
                                                    style={{ background: 'transparent', border: 'none', color: '#D7474B', cursor: 'pointer', padding: '1px 0', opacity: 0.6, display: 'grid', placeItems: 'center' }}>
                                                    <XIcon size={11}/>
                                                  </button>
                                                </div>
                                                );
                                              })}
                                            </>
                                          )}
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
                                <AddExerciseForm
                                  blockId={block.id}
                                  category={block.category}
                                  onSaved={() => { setAddExerciseFor(null); fetchDaySessions(); }}
                                  onCancel={() => setAddExerciseFor(null)}
                                />
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {addBlockFor === session.id ? (
                    <div style={{ marginTop: 10 }}>
                      <AddBlockForm
                        sessionId={session.id}
                        onSaved={() => { setAddBlockFor(null); fetchDaySessions(); }}
                        onCancel={() => setAddBlockFor(null)}
                      />
                    </div>
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
      <div style={{ background: 'var(--surface)', borderLeft: '1px solid var(--border)', padding: '20px 18px', overflow: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: `${focusCat.color}1f`, color: focusCat.color, display: 'grid', placeItems: 'center' }}>
            <FocusIcon size={18} stroke="currentColor"/>
          </div>
          <div>
            <div style={{ fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700 }}>Foco principal</div>
            <div style={{ fontSize: 14, fontWeight: 700 }}>{athlete.focus || focusCat.label}</div>
          </div>
        </div>

        <div className="card" style={{ padding: 12, marginBottom: 12, background: 'var(--surface-2)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
            <SparkleIcon size={13} stroke="var(--vitta-blue)"/>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--vitta-blue)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Sugerencias del coach IA</div>
          </div>
          <div style={{ fontSize: 12, color: 'var(--text)', lineHeight: 1.45 }}>
            Para <b>{athlete.name.split(' ')[0]}</b> este mes, prioriza ejercicios de <b>{focusCat.label}</b> en intensidad media-alta (RPE 7-8). Mantén volumen de movilidad y preventivos diariamente.
          </div>
        </div>

        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 8 }}>
          Estadísticas del mes
        </div>
        <div style={{ display: 'grid', gap: 8 }}>
          {[
            { label: 'Adherencia', value: `${athlete.adherence}%` },
            { label: 'RPE medio',  value: String(athlete.rpe7) },
            { label: 'Estado',     value: athlete.status },
          ].map(s => (
            <div key={s.label} style={{ padding: '8px 10px', borderRadius: 8, background: 'white', border: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-muted)' }}>{s.label}</span>
              <span style={{ fontSize: 12, fontWeight: 700 }}>{s.value}</span>
            </div>
          ))}
        </div>

        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)', margin: '16px 0 8px' }}>
          Tipos de sesión
        </div>
        <div style={{ display: 'grid', gap: 5 }}>
          {Object.entries(DAY_TYPES).filter(([k]) => !['REST','DELOAD','TEST'].includes(k)).slice(0, 6).map(([key, t]) => (
            <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', borderRadius: 7, background: t.bg, border: `1px solid ${t.color}28` }}>
              <div style={{ width: 8, height: 8, borderRadius: 4, background: t.color }}/>
              <span style={{ fontSize: 11, fontWeight: 600, color: t.color }}>{t.label}</span>
              <span className="mono" style={{ fontSize: 10, color: 'var(--text-muted)', marginLeft: 'auto' }}>{key}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
