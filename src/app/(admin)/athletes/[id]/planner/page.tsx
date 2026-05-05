'use client';
import { useState, useEffect, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import { CATEGORIES, DAY_TYPES } from '@/lib/constants';
import { getCategoryIcon, PlusIcon, CopyIcon, LayersIcon, ChevronLeft, ChevronRight, SparkleIcon, TrashIcon } from '@/components/icons';
import LevelBadge from '@/components/badges/LevelBadge';
import type { Athlete, DayType, CategoryId, LevelId } from '@/lib/types';

// ─── Types ──────────────────────────────────────────────────

interface DbExercise {
  id: string;
  name: string;
  level: LevelId | null;
  note: string | null;
  sort_order: number;
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

function defaultPlan(): DayType[][] {
  return Array.from({ length: 4 }, () => Array(7).fill('REST') as DayType[]);
}

function mapAthlete(a: any): Athlete {
  return {
    id:          a.id,
    name:        a.name,
    initials:    a.initials,
    age:         a.age,
    weeklyHours: a.weekly_hours,
    focus:       a.focus,
    adherence:   a.adherence,
    rpe7:        a.rpe7,
    status:      a.status,
    color:       a.color,
  };
}

const MONTH_NAMES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

// ─── New Session Modal ────────────────────────────────────────

interface NewSessionModalProps {
  date: string;
  athleteId: string;
  onClose: () => void;
  onCreated: (session: DbSession) => void;
}

function NewSessionModal({ date, athleteId, onClose, onCreated }: NewSessionModalProps) {
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

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '8px 10px', borderRadius: 8,
    border: '1px solid var(--border)', background: 'var(--surface)',
    fontSize: 13, fontFamily: 'inherit', color: 'var(--text)', boxSizing: 'border-box',
  };

  return (
    <div onClick={e => e.target === e.currentTarget && onClose()} style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(14,25,54,0.55)', display: 'grid', placeItems: 'center' }}>
      <div className="card" style={{ width: 440, padding: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 18 }}>
          <div style={{ fontSize: 15, fontWeight: 700 }}>Nueva sesión · {date}</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 20 }}>×</button>
        </div>
        <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 14 }}>
          <div>
            <label style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-muted)', display: 'block', marginBottom: 5 }}>Título</label>
            <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="ej. Fuerza — Empuje + Zona Media" style={inputStyle}/>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-muted)', display: 'block', marginBottom: 5 }}>Duración (min)</label>
              <input type="number" min={15} max={300} value={duration} onChange={e => setDuration(Number(e.target.value))} style={inputStyle}/>
            </div>
            <div>
              <label style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-muted)', display: 'block', marginBottom: 5 }}>RPE objetivo · {rpe}</label>
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

// ─── Add Block inline form ───────────────────────────────────

function AddBlockForm({ sessionId, onSaved, onCancel }: { sessionId: string; onSaved: () => void; onCancel: () => void }) {
  const [name, setName] = useState('');
  const [category, setCategory] = useState<CategoryId>('empuje');
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!name.trim()) return;
    setSaving(true);
    const cat = CATEGORIES[category];
    const supabase = createClient();
    await supabase.from('session_blocks').insert({
      session_id: sessionId,
      name: name.trim(),
      category,
      color: cat?.color || '#2E6BD6',
      sort_order: 0,
    });
    setSaving(false);
    onSaved();
  }

  const inp: React.CSSProperties = { padding: '6px 9px', borderRadius: 7, border: '1px solid var(--border)', background: 'var(--surface)', fontSize: 12, fontFamily: 'inherit', color: 'var(--text)' };

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

function AddExerciseForm({ blockId, onSaved, onCancel }: { blockId: string; onSaved: () => void; onCancel: () => void }) {
  const [name, setName] = useState('');
  const [level, setLevel] = useState<LevelId>('basico');
  const [note, setNote] = useState('');
  const [setCount, setSetCount] = useState(3);
  const [reps, setReps] = useState('5');
  const [load, setLoad] = useState('');
  const [rpeTarget, setRpeTarget] = useState('7');
  const [restTime, setRestTime] = useState('2:00');
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!name.trim()) return;
    setSaving(true);
    const supabase = createClient();

    const { data: existing } = await supabase
      .from('session_exercises')
      .select('sort_order')
      .eq('block_id', blockId)
      .order('sort_order', { ascending: false })
      .limit(1);
    const nextSort = ((existing?.[0]?.sort_order ?? -1) as number) + 1;

    const { data: exData, error: exErr } = await supabase
      .from('session_exercises')
      .insert({ block_id: blockId, name: name.trim(), level, note: note.trim() || null, sort_order: nextSort })
      .select('id')
      .single();

    if (!exErr && exData && setCount > 0) {
      const sets = Array.from({ length: setCount }, (_, i) => ({
        session_exercise_id: exData.id,
        reps: reps || null,
        load: load ? Number(load) : null,
        rpe_target: rpeTarget ? Number(rpeTarget) : null,
        rest: restTime || null,
        sort_order: i,
      }));
      await supabase.from('sets').insert(sets);
    }

    setSaving(false);
    onSaved();
  }

  const inp: React.CSSProperties = { padding: '6px 9px', borderRadius: 7, border: '1px solid var(--border)', background: 'var(--surface)', fontSize: 12, fontFamily: 'inherit', color: 'var(--text)' };
  const lbl: React.CSSProperties = { fontSize: 9, color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 3 };

  return (
    <div style={{ marginTop: 8, padding: 12, background: 'rgba(46,107,214,0.05)', borderRadius: 10, border: '1px solid var(--border)', display: 'grid', gap: 8 }}>
      <div style={{ display: 'flex', gap: 8 }}>
        <input placeholder="Nombre del ejercicio" value={name} onChange={e => setName(e.target.value)} style={{ ...inp, flex: 1 }}/>
        <select value={level} onChange={e => setLevel(e.target.value as LevelId)} style={inp}>
          <option value="basico">Básico</option>
          <option value="intermedio">Intermedio</option>
          <option value="avanzado">Avanzado</option>
        </select>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 6 }}>
        {[
          { label: 'Series', el: <input type="number" min={1} max={20} value={setCount} onChange={e => setSetCount(Number(e.target.value))} style={{ ...inp, width: '100%' }}/> },
          { label: 'Reps',   el: <input placeholder="5" value={reps} onChange={e => setReps(e.target.value)} style={{ ...inp, width: '100%' }}/> },
          { label: 'Kg',     el: <input type="number" min={0} step={0.5} placeholder="—" value={load} onChange={e => setLoad(e.target.value)} style={{ ...inp, width: '100%' }}/> },
          { label: 'RPE',    el: <input type="number" min={1} max={10} step={0.5} placeholder="7" value={rpeTarget} onChange={e => setRpeTarget(e.target.value)} style={{ ...inp, width: '100%' }}/> },
          { label: 'Descanso', el: <input placeholder="2:00" value={restTime} onChange={e => setRestTime(e.target.value)} style={{ ...inp, width: '100%' }}/> },
        ].map(({ label, el }) => (
          <div key={label}>
            <div style={lbl}>{label}</div>
            {el}
          </div>
        ))}
      </div>
      <input placeholder="Nota / descripción (opcional)" value={note} onChange={e => setNote(e.target.value)} style={{ ...inp, width: '100%' }}/>
      <div style={{ display: 'flex', gap: 6 }}>
        <button onClick={save} disabled={saving || !name.trim()} className="btn btn-primary btn-sm">{saving ? '...' : 'Añadir ejercicio'}</button>
        <button onClick={onCancel} className="btn btn-ghost btn-sm">Cancelar</button>
      </div>
    </div>
  );
}

// ─── Main page ───────────────────────────────────────────────

export default function PlannerPage() {
  const pathname = usePathname();
  // Extract id directly from pathname — more reliable than useParams() in Next.js 16
  const id = pathname.split('/athletes/')[1]?.split('/')[0] ?? '';

  const now = new Date();
  const [currentYear, setCurrentYear] = useState(now.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(now.getMonth() + 1);

  const [athlete, setAthlete] = useState<Athlete | null>(null);
  const [athleteLoading, setAthleteLoading] = useState(true);
  const [monthPlan, setMonthPlan] = useState<DayType[][]>(defaultPlan());
  const [monthSessionDates, setMonthSessionDates] = useState<Set<string>>(new Set());
  const [selectedDay, setSelectedDay] = useState<{ w: number; d: number } | null>(null);
  const [daySessions, setDaySessions] = useState<DbSession[]>([]);
  const [showNewSession, setShowNewSession] = useState(false);
  const [addBlockFor, setAddBlockFor] = useState<string | null>(null);
  const [addExerciseFor, setAddExerciseFor] = useState<string | null>(null);

  // ── Fetch athlete ──────────────────────────────────────────
  useEffect(() => {
    if (!id) return;
    setAthleteLoading(true);
    const supabase = createClient();
    supabase.from('athletes').select('*').eq('id', id).maybeSingle()
      .then(({ data, error }) => {
        if (error) console.error('Athlete fetch error:', error);
        if (data) setAthlete(mapAthlete(data));
        setAthleteLoading(false);
      });
  }, [id]);

  // ── Fetch month plan ───────────────────────────────────────
  useEffect(() => {
    if (!id) return;
    const supabase = createClient();
    supabase.from('month_plans')
      .select('plan')
      .eq('athlete_id', id)
      .eq('year', currentYear)
      .eq('month', currentMonth)
      .maybeSingle()
      .then(({ data }) => {
        setMonthPlan(data?.plan ?? defaultPlan());
      });
  }, [id, currentYear, currentMonth]);

  // ── Fetch sessions dates for current month view ────────────
  useEffect(() => {
    if (!id) return;
    const start = calendarStart(currentYear, currentMonth);
    const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 4 * 7 - 1);
    const supabase = createClient();
    supabase
      .from('sessions')
      .select('date')
      .eq('athlete_id', id)
      .gte('date', toISO(start))
      .lte('date', toISO(end))
      .then(({ data }) => {
        setMonthSessionDates(new Set((data || []).map((s: any) => s.date)));
      });
  }, [id, currentYear, currentMonth]);

  // ── Fetch sessions for selected day ──────────────────────
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
          session_exercises ( id, name, level, note, sort_order )
        )
      `)
      .eq('athlete_id', id)
      .eq('date', date)
      .order('created_at');
    const sessions = (data || []).map((s: any) => ({
      ...s,
      session_blocks: (s.session_blocks || [])
        .sort((a: DbBlock, b: DbBlock) => a.sort_order - b.sort_order)
        .map((bl: any) => ({
          ...bl,
          session_exercises: (bl.session_exercises || []).sort((a: DbExercise, b: DbExercise) => a.sort_order - b.sort_order),
        })),
    }));
    setDaySessions(sessions);
  }, [id, selectedDay, currentYear, currentMonth]);

  useEffect(() => { fetchDaySessions(); }, [fetchDaySessions]);

  // ── Delete session (cascade blocks → exercises → sets) ─────
  async function deleteSession(sessionId: string) {
    if (!confirm('¿Eliminar esta sesión? Se borrarán todos sus bloques y ejercicios.')) return;
    const supabase = createClient();
    const { data: blocks } = await supabase.from('session_blocks').select('id').eq('session_id', sessionId);
    if (blocks?.length) {
      const blockIds = blocks.map((b: any) => b.id);
      const { data: exercises } = await supabase.from('session_exercises').select('id').in('block_id', blockIds);
      if (exercises?.length) {
        const exIds = exercises.map((e: any) => e.id);
        await supabase.from('sets').delete().in('session_exercise_id', exIds);
        await supabase.from('session_exercises').delete().in('id', exIds);
      }
      await supabase.from('session_blocks').delete().in('id', blockIds);
    }
    await supabase.from('sessions').delete().eq('id', sessionId);
    const dateStr = daySessions.find(s => s.id === sessionId)?.date;
    setDaySessions(prev => prev.filter(s => s.id !== sessionId));
    if (dateStr) {
      setMonthSessionDates(prev => {
        const remaining = daySessions.filter(s => s.id !== sessionId && s.date === dateStr);
        if (remaining.length === 0) { const next = new Set(prev); next.delete(dateStr); return next; }
        return prev;
      });
    }
  }

  // ── Delete exercise ────────────────────────────────────────
  async function deleteExercise(exerciseId: string, blockId: string) {
    if (!confirm('¿Eliminar este ejercicio?')) return;
    const supabase = createClient();
    await supabase.from('sets').delete().eq('session_exercise_id', exerciseId);
    await supabase.from('session_exercises').delete().eq('id', exerciseId);
    setDaySessions(prev => prev.map(s => ({
      ...s,
      session_blocks: s.session_blocks.map(b =>
        b.id === blockId
          ? { ...b, session_exercises: b.session_exercises.filter(e => e.id !== exerciseId) }
          : b
      ),
    })));
  }

  // ── Save month plan ────────────────────────────────────────
  async function savePlan(plan: DayType[][]) {
    const supabase = createClient();
    await supabase.from('month_plans').upsert(
      { athlete_id: id, year: currentYear, month: currentMonth, plan },
      { onConflict: 'athlete_id,year,month' }
    );
  }

  // ── Navigate months ────────────────────────────────────────
  function prevMonth() {
    if (currentMonth === 1) { setCurrentYear(y => y - 1); setCurrentMonth(12); }
    else setCurrentMonth(m => m - 1);
    setSelectedDay(null);
  }

  function nextMonth() {
    if (currentMonth === 12) { setCurrentYear(y => y + 1); setCurrentMonth(1); }
    else setCurrentMonth(m => m + 1);
    setSelectedDay(null);
  }

  function goToday() {
    const n = new Date();
    setCurrentYear(n.getFullYear());
    setCurrentMonth(n.getMonth() + 1);
    setSelectedDay(null);
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

  if (athleteLoading) {
    return (
      <div style={{ display: 'grid', placeItems: 'center', height: '100%', color: 'var(--text-muted)', fontSize: 14 }}>
        Cargando...
      </div>
    );
  }

  if (!athlete) {
    return (
      <div style={{ display: 'grid', placeItems: 'center', height: '100%', color: 'var(--text-muted)', fontSize: 14 }}>
        Atleta no encontrado.
      </div>
    );
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', height: '100vh' }}>
      {showNewSession && selectedDate && (
        <NewSessionModal
          date={selectedDate}
          athleteId={id}
          onClose={() => setShowNewSession(false)}
          onCreated={session => {
            setDaySessions(prev => [...prev, session]);
            setMonthSessionDates(prev => new Set([...prev, selectedDate]));
            setShowNewSession(false);
          }}
        />
      )}

      {/* Main area */}
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
            <button className="btn btn-ghost"><CopyIcon size={13}/>Duplicar mes anterior</button>
            <button className="btn btn-ghost"><LayersIcon size={13}/>Aplicar plantilla</button>
            <button
              className="btn btn-primary"
              onClick={() => { if (!selectedDay) { alert('Selecciona un día en el calendario primero.'); return; } setShowNewSession(true); }}
            >
              <PlusIcon size={13}/>Añadir sesión
            </button>
          </div>
        </div>

        {/* Calendar */}
        <div className="card" style={{ padding: 16, marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div>
              <div style={{ fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700 }}>Mesociclo</div>
              <div style={{ fontSize: 16, fontWeight: 600, marginTop: 2 }}>
                {MONTH_NAMES[currentMonth - 1]} {currentYear} · Plan mensual
              </div>
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
                {week.map((dayType, di) => {
                  const t = DAY_TYPES[dayType] || DAY_TYPES.REST;
                  const isSelected = selectedDay?.w === wi && selectedDay?.d === di;
                  const date = cellDate(currentYear, currentMonth, wi, di);
                  const dateISO = toISO(date);
                  const isToday = dateISO === todayISO;
                  const dayNum = date.getDate();
                  const inMonth = date.getMonth() + 1 === currentMonth;
                  const hasSession = monthSessionDates.has(dateISO);

                  const displayColor = hasSession ? '#2E6BD6' : (dayType === 'REST' ? 'var(--text-muted)' : t.color);
                  const displayLabel = hasSession ? 'Programado' : t.label;
                  const displayBg    = hasSession ? 'rgba(46,107,214,0.10)' : (dayType === 'REST' ? 'var(--surface-2)' : t.bg);

                  return (
                    <button key={`${wi}-${di}`} onClick={() => setSelectedDay({ w: wi, d: di })} style={{
                      padding: '10px 8px', borderRadius: 8, minHeight: 78,
                      background: displayBg,
                      border: isSelected ? `2px solid ${displayColor}` : `1px solid ${isToday ? displayColor : 'var(--border)'}`,
                      cursor: 'pointer', textAlign: 'left',
                      display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
                      gap: 4, fontFamily: 'inherit', opacity: inMonth ? 1 : 0.45,
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span className="mono" style={{ fontSize: 10, fontWeight: 700, color: isToday ? displayColor : 'var(--text-muted)' }}>{dayNum}</span>
                        {isToday && <span style={{ fontSize: 8, fontWeight: 700, color: displayColor, letterSpacing: '0.08em' }}>HOY</span>}
                      </div>
                      <div>
                        <div style={{ fontSize: 11, fontWeight: 600, color: displayColor, lineHeight: 1.15 }}>{displayLabel}</div>
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
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => window.open(`/athletes/${id}/today`, '_blank')}
              >
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
            <div style={{ display: 'grid', gap: 16 }}>
              {daySessions.map(session => (
                <div key={session.id}>
                  {/* Session stats + delete */}
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
                    <button
                      onClick={() => deleteSession(session.id)}
                      title="Eliminar sesión"
                      style={{ flexShrink: 0, background: 'transparent', border: '1px solid var(--border)', borderRadius: 8, color: '#D7474B', cursor: 'pointer', padding: '8px 10px', display: 'grid', placeItems: 'center' }}
                    >
                      <TrashIcon size={14}/>
                    </button>
                  </div>

                  <div style={{ display: 'grid', gap: 10 }}>
                    {session.session_blocks.map((block, bi) => {
                      const Ic = getCategoryIcon(block.category);
                      const blockColor = block.color || CATEGORIES[block.category]?.color || '#2E6BD6';
                      return (
                        <div key={block.id} style={{ background: 'var(--surface-2)', borderRadius: 10, padding: 12, border: '1px solid var(--border)' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <div style={{ width: 26, height: 26, borderRadius: 6, background: `${blockColor}22`, color: blockColor, display: 'grid', placeItems: 'center' }}>
                                <Ic size={13} stroke="currentColor"/>
                              </div>
                              <div>
                                <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.08em' }}>BLOQUE {String.fromCharCode(65 + bi)}</span>
                                <span style={{ fontSize: 13, fontWeight: 600, marginLeft: 6 }}>{block.name}</span>
                              </div>
                            </div>
                            <button className="btn btn-ghost btn-sm" onClick={() => setAddExerciseFor(addExerciseFor === block.id ? null : block.id)}>
                              <PlusIcon size={11}/>Añadir ejercicio
                            </button>
                          </div>

                          <div style={{ display: 'grid', gap: 6 }}>
                            {block.session_exercises.map((item, idx) => (
                              <div key={item.id} style={{
                                display: 'grid', gridTemplateColumns: '20px 1fr auto',
                                gap: 8, alignItems: 'center', padding: '8px 10px',
                                background: 'white', borderRadius: 6, border: '1px solid var(--border)', fontSize: 12,
                              }}>
                                <span className="mono" style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                                  {String.fromCharCode(65 + bi)}{idx + 1}
                                </span>
                                <div>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <span style={{ fontWeight: 600 }}>{item.name}</span>
                                    {item.level && <LevelBadge level={item.level} size="sm"/>}
                                  </div>
                                  {item.note && <div className="muted" style={{ fontSize: 10, marginTop: 2 }}>{item.note}</div>}
                                </div>
                                <button
                                  onClick={() => deleteExercise(item.id, block.id)}
                                  title="Eliminar ejercicio"
                                  style={{ background: 'transparent', border: 'none', color: '#D7474B', cursor: 'pointer', padding: '2px 4px', opacity: 0.7 }}
                                >
                                  <TrashIcon size={13}/>
                                </button>
                              </div>
                            ))}
                          </div>

                          {addExerciseFor === block.id && (
                            <AddExerciseForm
                              blockId={block.id}
                              onSaved={() => { setAddExerciseFor(null); fetchDaySessions(); }}
                              onCancel={() => setAddExerciseFor(null)}
                            />
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

      {/* Suggestion panel */}
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
            { label: 'Adherencia',  value: `${athlete.adherence}%` },
            { label: 'RPE medio',   value: String(athlete.rpe7) },
            { label: 'Estado',      value: athlete.status },
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
