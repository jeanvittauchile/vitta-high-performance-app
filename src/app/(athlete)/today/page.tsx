'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase';
import { useAthlete } from '@/lib/athlete-context';
import { CATEGORIES } from '@/lib/constants';
import { getCategoryIcon, PlayIcon, InfoIcon, CheckIcon, ChevronDown, XIcon, PauseIcon } from '@/components/icons';
import LevelBadge from '@/components/badges/LevelBadge';
import ExerciseSheet from '@/components/athlete/ExerciseSheet';
import type { SessionExercise, LevelId, CategoryId } from '@/lib/types';

// ─── DB row types ────────────────────────────────────────────

interface SetRow {
  id: string;
  reps: string | null;
  load: string | null;
  rpe_target: number | null;
  rest: string | null;
  done: boolean;
  sort_order: number;
  actual_reps: number | null;
  actual_load: number | null;
  actual_rpe: number | null;
}

interface ExRow {
  id: string;
  name: string;
  level: string | null;
  note: string | null;
  sort_order: number;
  exercise_slug: string | null;
  muscle: string | null;
  equipment: string | null;
  sets: SetRow[];
}

interface BlRow {
  id: string;
  name: string;
  category: CategoryId;
  color: string | null;
  sort_order: number;
  session_exercises: ExRow[];
}

interface SessRow {
  id: string;
  title: string;
  duration: number;
  rpe_target: number;
  block: string | null;
  session_blocks: BlRow[];
}

// ─── Helpers ─────────────────────────────────────────────────

function toSessionExercise(ex: ExRow, catId: CategoryId): SessionExercise {
  return {
    id: ex.id,
    exId: ex.exercise_slug || '',
    name: ex.name,
    level: (ex.level as LevelId) || 'basico',
    note: ex.note || undefined,
    category: catId,
    sets: ex.sets.map(s => ({
      r: s.reps || '—',
      l: s.load || '—',
      rpe: s.rpe_target ?? undefined,
      rest: s.rest || '—',
      done: s.done,
    })),
  };
}

function formatTime(totalSeconds: number) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <div className="display tnum" style={{ fontSize: 22, color: 'var(--vitta-cream)' }}>{value}</div>
      <div style={{ fontSize: 10, color: 'var(--d-text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 600 }}>{label}</div>
    </div>
  );
}

// ─── ActualInput ─────────────────────────────────────────────

function ActualInput({ label, value, setId, field }: {
  label: string;
  value: number | null;
  setId: string;
  field: 'actual_reps' | 'actual_load' | 'actual_rpe';
}) {
  const [v, setV] = useState(value != null ? String(value) : '');

  async function save() {
    const num = parseFloat(v);
    const supabase = createClient();
    await supabase.from('sets').update({ [field]: isNaN(num) ? null : num }).eq('id', setId);
  }

  return (
    <div>
      <div style={{ fontSize: 9, color: 'var(--d-text-faint)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.06em', marginBottom: 3 }}>{label}</div>
      <input
        type="number"
        inputMode="decimal"
        value={v}
        onChange={e => setV(e.target.value)}
        onBlur={save}
        placeholder="—"
        style={{
          width: '100%', background: 'rgba(255,255,255,0.08)', border: '1px solid var(--d-border-strong)',
          borderRadius: 6, padding: '5px 7px', color: 'var(--vitta-cream)', fontSize: 13,
          fontFamily: 'var(--font-mono)', outline: 'none', textAlign: 'center',
        }}
      />
    </div>
  );
}

// ─── ExerciseRow ─────────────────────────────────────────────

function ExerciseRow({ ex, block, onToggleSet, onOpen }: {
  ex: ExRow;
  block: BlRow;
  onToggleSet: (setId: string, done: boolean) => void;
  onOpen: () => void;
}) {
  const allDone = ex.sets.length > 0 && ex.sets.every(s => s.done);
  return (
    <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--d-border)', borderRadius: 12, overflow: 'hidden', opacity: allDone ? 0.6 : 1 }}>
      <div style={{ padding: '12px 12px 10px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--d-text)' }}>{ex.name}</div>
            {ex.level && <LevelBadge level={ex.level as LevelId}/>}
          </div>
          {ex.note && <div style={{ fontSize: 11, color: 'var(--d-text-muted)', marginTop: 4 }}>{ex.note}</div>}
        </div>
        <button onClick={onOpen} style={{ padding: '6px 10px', borderRadius: 8, background: 'var(--vitta-blue)', color: '#fff', border: 'none', fontSize: 11, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
          <PlayIcon size={10}/> Ver
        </button>
      </div>

      {ex.sets.length > 0 && (
        <div style={{ padding: '0 8px 8px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '28px 60px 1fr 60px 24px', gap: 8, padding: '5px 8px', fontSize: 9, color: 'var(--d-text-faint)', letterSpacing: '0.06em', textTransform: 'uppercase', fontWeight: 700 }}>
            <div>SET</div><div>REPS</div><div>CARGA</div><div>RPE</div><div/>
          </div>
          {ex.sets.map((s, i) => (
            <div key={s.id} style={{ borderRadius: 8, overflow: 'hidden', marginBottom: 2 }}>
              <div
                onClick={() => onToggleSet(s.id, s.done)}
                style={{ display: 'grid', gridTemplateColumns: '28px 60px 1fr 60px 24px', gap: 8, padding: '8px 8px', alignItems: 'center', cursor: 'pointer', background: s.done ? 'rgba(43,182,115,0.10)' : 'transparent', borderRadius: s.done ? '8px 8px 0 0' : 8 }}
              >
                <div className="mono" style={{ fontSize: 13, fontWeight: 700, color: s.done ? 'var(--green)' : 'var(--d-text)' }}>{i + 1}</div>
                <div className="mono tnum" style={{ fontSize: 13, color: 'var(--d-text)' }}>{s.reps || '—'}</div>
                <div className="mono tnum" style={{ fontSize: 13, color: 'var(--d-text)' }}>
                  {s.load ? (isNaN(Number(s.load)) ? s.load : `${s.load} kg`) : '—'}
                </div>
                <div className="mono tnum" style={{ fontSize: 12, color: s.rpe_target ? 'var(--amber)' : 'var(--d-text-faint)' }}>
                  {s.rpe_target ?? '—'}
                </div>
                <div style={{ width: 22, height: 22, borderRadius: 11, border: `1.5px solid ${s.done ? 'var(--green)' : 'var(--d-border-strong)'}`, background: s.done ? 'var(--green)' : 'transparent', display: 'grid', placeItems: 'center' }}>
                  {s.done && <CheckIcon size={12} stroke="white" strokeWidth={3}/>}
                </div>
              </div>
              {s.done && (
                <div
                  onClick={e => e.stopPropagation()}
                  style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6, padding: '6px 8px 8px', background: 'rgba(43,182,115,0.06)', borderTop: '1px solid rgba(43,182,115,0.18)' }}
                >
                  <div style={{ fontSize: 9, color: 'var(--green)', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', gridColumn: '1 / -1', marginBottom: 2 }}>
                    Registrar resultados
                  </div>
                  <ActualInput label="Reps reales" value={s.actual_reps} setId={s.id} field="actual_reps"/>
                  <ActualInput label="Carga (kg)" value={s.actual_load} setId={s.id} field="actual_load"/>
                  <ActualInput label="RPE real" value={s.actual_rpe} setId={s.id} field="actual_rpe"/>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {ex.sets.length === 0 && (
        <div style={{ padding: '8px 16px 12px', fontSize: 12, color: 'var(--d-text-faint)' }}>Sin series configuradas.</div>
      )}
    </div>
  );
}

// ─── BlockCard ───────────────────────────────────────────────

function BlockCard({ block, index, onToggleSet, onOpenExercise }: {
  block: BlRow;
  index: number;
  onToggleSet: (setId: string, done: boolean) => void;
  onOpenExercise: (ex: ExRow) => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const CatIcon = getCategoryIcon(block.category);
  const blockColor = block.color || CATEGORIES[block.category]?.color || '#2E6BD6';
  const totalSets = block.session_exercises.reduce((s, e) => s + e.sets.length, 0);
  const doneSets  = block.session_exercises.reduce((s, e) => s + e.sets.filter(set => set.done).length, 0);

  return (
    <div style={{ background: 'var(--d-surface)', border: '1px solid var(--d-border)', borderRadius: 16, overflow: 'hidden' }}>
      <button onClick={() => setExpanded(e => !e)} style={{ width: '100%', border: 'none', background: 'transparent', padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', color: 'inherit', textAlign: 'left' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: `${blockColor}22`, color: blockColor, display: 'grid', placeItems: 'center' }}>
            <CatIcon size={16} stroke="currentColor"/>
          </div>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--d-text-faint)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Bloque {String.fromCharCode(65 + index)}</div>
            <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--d-text)' }}>{block.name}</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span className="mono" style={{ fontSize: 12, color: 'var(--d-text-muted)' }}>{doneSets}/{totalSets}</span>
          <ChevronDown size={16} style={{ transform: expanded ? 'rotate(0)' : 'rotate(-90deg)', transition: 'transform 0.2s', color: 'var(--d-text-muted)' }}/>
        </div>
      </button>

      {expanded && (
        <div style={{ padding: '0 14px 14px', display: 'grid', gap: 8 }}>
          {block.session_exercises.map(ex => (
            <ExerciseRow
              key={ex.id}
              ex={ex}
              block={block}
              onToggleSet={onToggleSet}
              onOpen={() => onOpenExercise(ex)}
            />
          ))}
          {block.session_exercises.length === 0 && (
            <div style={{ fontSize: 12, color: 'var(--d-text-faint)', padding: '8px 0' }}>Sin ejercicios en este bloque.</div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── SessionDetailsSheet ─────────────────────────────────────

function SessionDetailsSheet({ session, onClose }: { session: SessRow; onClose: () => void }) {
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  const totalSets = session.session_blocks.reduce((s, b) => s + b.session_exercises.reduce((s2, e) => s2 + e.sets.length, 0), 0);
  const totalExercises = session.session_blocks.reduce((s, b) => s + b.session_exercises.length, 0);

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
      <div onClick={onClose} style={{ flex: 1, background: 'rgba(0,0,0,0.55)' }}/>
      <div className="thin-scroll-dark" style={{
        background: 'var(--d-bg)', borderRadius: '20px 20px 0 0',
        maxHeight: '88vh', overflowY: 'auto', padding: '0 16px 40px',
        boxShadow: '0 -8px 40px rgba(0,0,0,0.5)',
      }}>
        {/* Handle + header */}
        <div style={{ position: 'sticky', top: 0, background: 'var(--d-bg)', paddingTop: 14, paddingBottom: 12, zIndex: 1 }}>
          <div style={{ width: 40, height: 4, borderRadius: 2, background: 'var(--d-border-strong)', margin: '0 auto 14px' }}/>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: 10, color: 'var(--d-text-faint)', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4 }}>Detalles de sesión</div>
              <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--d-text)', lineHeight: 1.3, maxWidth: '80%' }}>{session.title}</div>
              {session.block && <div style={{ fontSize: 11, color: 'var(--d-text-muted)', marginTop: 4 }}>{session.block}</div>}
            </div>
            <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: 16, border: '1px solid var(--d-border)', background: 'rgba(255,255,255,0.06)', color: 'var(--d-text-muted)', display: 'grid', placeItems: 'center', cursor: 'pointer', flexShrink: 0, marginTop: 2 }}>
              <XIcon size={15}/>
            </button>
          </div>
        </div>

        {/* Stats strip */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 20 }}>
          {[
            { label: 'Duración', value: `${session.duration}'` },
            { label: 'RPE objetivo', value: String(session.rpe_target) },
            { label: `${totalExercises} ejerc · ${totalSets} series`, value: `${session.session_blocks.length} bloq` },
          ].map(s => (
            <div key={s.label} style={{ background: 'var(--d-surface)', border: '1px solid var(--d-border)', borderRadius: 12, padding: '10px 12px' }}>
              <div className="display tnum" style={{ fontSize: 20, color: 'var(--vitta-cream)', marginBottom: 3 }}>{s.value}</div>
              <div style={{ fontSize: 10, color: 'var(--d-text-faint)', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Blocks */}
        <div style={{ display: 'grid', gap: 14 }}>
          {session.session_blocks.map((block, bi) => {
            const CatIcon = getCategoryIcon(block.category);
            const blockColor = block.color || CATEGORIES[block.category]?.color || '#2E6BD6';
            const doneSets = block.session_exercises.reduce((s, e) => s + e.sets.filter(set => set.done).length, 0);
            const totalBSets = block.session_exercises.reduce((s, e) => s + e.sets.length, 0);
            return (
              <div key={block.id}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <div style={{ width: 28, height: 28, borderRadius: 7, background: `${blockColor}22`, color: blockColor, display: 'grid', placeItems: 'center' }}>
                    <CatIcon size={14} stroke="currentColor"/>
                  </div>
                  <div style={{ flex: 1 }}>
                    <span style={{ fontSize: 10, color: 'var(--d-text-faint)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em' }}>Bloque {String.fromCharCode(65 + bi)} · </span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: blockColor }}>{block.name}</span>
                  </div>
                  <span className="mono" style={{ fontSize: 11, color: 'var(--d-text-faint)' }}>{doneSets}/{totalBSets}</span>
                </div>
                <div style={{ display: 'grid', gap: 6 }}>
                  {block.session_exercises.map(ex => {
                    const exDone = ex.sets.length > 0 && ex.sets.every(s => s.done);
                    const exPartial = !exDone && ex.sets.some(s => s.done);
                    return (
                      <div key={ex.id} style={{ padding: '10px 12px', background: exDone ? 'rgba(43,182,115,0.08)' : 'rgba(255,255,255,0.03)', border: `1px solid ${exDone ? 'rgba(43,182,115,0.25)' : 'var(--d-border)'}`, borderRadius: 10 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <span style={{ fontSize: 13, fontWeight: 600, color: exDone ? 'var(--green)' : 'var(--d-text)' }}>{ex.name}</span>
                              {ex.level && <LevelBadge level={ex.level as LevelId}/>}
                            </div>
                            {ex.note && <div style={{ fontSize: 11, color: 'var(--d-text-muted)', marginTop: 3 }}>{ex.note}</div>}
                          </div>
                          <div style={{ textAlign: 'right', flexShrink: 0 }}>
                            <div className="mono" style={{ fontSize: 12, color: exDone ? 'var(--green)' : exPartial ? 'var(--amber)' : 'var(--d-text-faint)', fontWeight: 700 }}>
                              {ex.sets.filter(s => s.done).length}/{ex.sets.length}
                            </div>
                            <div style={{ fontSize: 9, color: 'var(--d-text-faint)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>series</div>
                          </div>
                        </div>
                        {ex.sets.length > 0 && (
                          <div style={{ marginTop: 8, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                            {ex.sets.map((s, si) => (
                              <div key={s.id} style={{ padding: '3px 8px', borderRadius: 5, background: s.done ? 'rgba(43,182,115,0.20)' : 'rgba(255,255,255,0.06)', border: `1px solid ${s.done ? 'rgba(43,182,115,0.35)' : 'var(--d-border)'}`, fontSize: 11, color: s.done ? 'var(--green)' : 'var(--d-text-faint)', fontFamily: 'var(--font-mono)' }}>
                                {si + 1}. {s.reps || '—'} {s.load && s.load !== '—' ? `· ${isNaN(Number(s.load)) ? s.load : `${s.load}kg`}` : ''}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────

export default function TodayPage() {
  const { athleteId, loading: authLoading } = useAthlete();
  const [session, setSession] = useState<SessRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeExercise, setActiveExercise] = useState<{ ex: ExRow; catId: CategoryId } | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  // ─── Timer ─────────────────────────────────────────────────
  const [timerStart, setTimerStart] = useState<number | null>(null);
  const [elapsed, setElapsed] = useState(0);

  // ─── Feedback ──────────────────────────────────────────────
  const [feedback, setFeedback] = useState({ sleepHours: 7, energyLevel: 0, painLevel: '' });
  const [feedbackSaving, setFeedbackSaving] = useState(false);
  const [feedbackSaved, setFeedbackSaved] = useState(false);
  const hasUserEdited = useRef(false);
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const latestFeedbackRef = useRef(feedback);
  const latestSessionIdRef = useRef<string | undefined>(undefined);

  latestFeedbackRef.current = feedback;

  const fetchSession = useCallback(async () => {
    if (!athleteId) { setLoading(false); return; }
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const supabase = createClient();
    const { data } = await supabase
      .from('sessions')
      .select(`
        id, title, duration, rpe_target, block,
        session_blocks (
          id, name, category, color, sort_order,
          session_exercises (
            id, name, level, note, sort_order,
            exercises ( slug, muscle, equipment ),
            sets ( id, reps, load, rpe_target, rest, done, sort_order, actual_reps, actual_load, actual_rpe )
          )
        )
      `)
      .eq('athlete_id', athleteId)
      .eq('date', today)
      .order('created_at')
      .limit(1)
      .maybeSingle();

    if (data) {
      const sess: SessRow = {
        ...data,
        session_blocks: (data.session_blocks || [])
          .sort((a: any, b: any) => a.sort_order - b.sort_order)
          .map((bl: any) => ({
            ...bl,
            session_exercises: (bl.session_exercises || [])
              .sort((a: any, b: any) => a.sort_order - b.sort_order)
              .map((ex: any) => ({
                ...ex,
                exercise_slug: ex.exercises?.slug ?? null,
                muscle:        ex.exercises?.muscle ?? null,
                equipment:     ex.exercises?.equipment ?? null,
                sets: (ex.sets || []).sort((a: any, b: any) => a.sort_order - b.sort_order),
              })),
          })),
      };
      setSession(sess);
      latestSessionIdRef.current = sess.id;
    } else {
      setSession(null);
      latestSessionIdRef.current = undefined;
    }
    setLoading(false);
  }, [athleteId]);

  useEffect(() => {
    if (!authLoading) fetchSession();
  }, [authLoading, fetchSession]);

  // Restore timer from localStorage when session loads
  useEffect(() => {
    if (!session?.id) return;
    const stored = localStorage.getItem(`vitta_timer_${session.id}`);
    if (stored) {
      const start = parseInt(stored, 10);
      setTimerStart(start);
      setElapsed(Math.floor((Date.now() - start) / 1000));
    }
  }, [session?.id]);

  // Timer tick
  useEffect(() => {
    if (timerStart === null) return;
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - timerStart) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [timerStart]);

  // Load existing feedback from DB
  useEffect(() => {
    if (!session?.id) return;
    const supabase = createClient();
    supabase
      .from('session_feedback')
      .select('sleep_hours, energy_level, pain_level')
      .eq('session_id', session.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          const fb = { sleepHours: data.sleep_hours ?? 7, energyLevel: data.energy_level ?? 0, painLevel: data.pain_level ?? '' };
          setFeedback(fb);
          latestFeedbackRef.current = fb;
        }
        // Reset dirty flag after loading so we don't auto-save the loaded values
        hasUserEdited.current = false;
      });
  }, [session?.id]);

  // Auto-save feedback (debounced 800ms)
  useEffect(() => {
    if (!hasUserEdited.current) return;
    clearTimeout(autoSaveTimerRef.current);
    autoSaveTimerRef.current = setTimeout(async () => {
      const sid = latestSessionIdRef.current;
      const fb = latestFeedbackRef.current;
      if (!sid) return;
      setFeedbackSaving(true);
      const supabase = createClient();
      await supabase.from('session_feedback').upsert(
        { session_id: sid, sleep_hours: fb.sleepHours, energy_level: fb.energyLevel || null, pain_level: fb.painLevel || null },
        { onConflict: 'session_id' }
      );
      setFeedbackSaving(false);
      setFeedbackSaved(true);
      setTimeout(() => setFeedbackSaved(false), 2000);
    }, 800);
    return () => clearTimeout(autoSaveTimerRef.current);
  }, [feedback]);

  function handleFeedbackChange(updates: Partial<typeof feedback>) {
    hasUserEdited.current = true;
    setFeedback(f => ({ ...f, ...updates }));
  }

  function startTimer() {
    const now = Date.now();
    setTimerStart(now);
    setElapsed(0);
    if (session?.id) localStorage.setItem(`vitta_timer_${session.id}`, String(now));
  }

  function stopTimer() {
    setTimerStart(null);
    setElapsed(0);
    if (session?.id) localStorage.removeItem(`vitta_timer_${session.id}`);
  }

  async function toggleSet(setId: string, done: boolean) {
    setSession(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        session_blocks: prev.session_blocks.map(b => ({
          ...b,
          session_exercises: b.session_exercises.map(e => ({
            ...e,
            sets: e.sets.map(s => s.id === setId ? { ...s, done: !done } : s),
          })),
        })),
      };
    });
    const supabase = createClient();
    await supabase.from('sets').update({ done: !done }).eq('id', setId);
  }

  if (authLoading || loading) {
    return (
      <div style={{ padding: '40px 16px', textAlign: 'center', color: 'var(--d-text-muted)', fontSize: 14 }}>
        Cargando sesión...
      </div>
    );
  }

  if (!session) {
    return (
      <div style={{ padding: '40px 16px', textAlign: 'center' }}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>🌿</div>
        <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--d-text)', marginBottom: 6 }}>Sin sesión hoy</div>
        <div style={{ fontSize: 13, color: 'var(--d-text-muted)', lineHeight: 1.5 }}>
          No tienes sesión planificada para hoy.<br/>Descansa o contacta a tu coach.
        </div>
      </div>
    );
  }

  const totalSets = session.session_blocks.reduce((s, b) => s + b.session_exercises.reduce((s2, e) => s2 + e.sets.length, 0), 0);
  const doneSets  = session.session_blocks.reduce((s, b) => s + b.session_exercises.reduce((s2, e) => s2 + e.sets.filter(set => set.done).length, 0), 0);
  const mainBlock = session.session_blocks.find(b => !['movilidad','preventivos'].includes(b.category)) || session.session_blocks[0];
  const mainCat   = mainBlock ? (CATEGORIES[mainBlock.category] || CATEGORIES.empuje) : CATEGORIES.empuje;
  const sessionActive = timerStart !== null;

  return (
    <div style={{ padding: '16px 16px 28px' }}>
      {/* Hero */}
      <div style={{
        position: 'relative', overflow: 'hidden',
        borderRadius: 20, padding: 18,
        background: `linear-gradient(135deg, ${mainCat.color}28 0%, var(--d-surface) 60%)`,
        border: `1px solid ${mainCat.color}30`,
      }}>
        <div style={{ position: 'absolute', right: -30, top: -30, width: 180, height: 180, borderRadius: '50%', background: `radial-gradient(circle, ${mainCat.color}30 0%, transparent 70%)` }}/>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
          {session.session_blocks
            .filter(b => !['movilidad','preventivos'].includes(b.category))
            .map(b => {
              const c = CATEGORIES[b.category];
              const Ic = getCategoryIcon(b.category);
              return (
                <span key={b.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 8px', borderRadius: 5, background: c?.color || '#2E6BD6', color: '#fff', fontSize: 10, fontWeight: 700, letterSpacing: '0.06em' }}>
                  <Ic size={11} stroke="currentColor"/>{(c?.label || b.category).toUpperCase()}
                </span>
              );
            })}
          {session.block && <span style={{ fontSize: 11, color: 'var(--d-text-muted)', letterSpacing: '0.04em' }}>{session.block}</span>}
        </div>
        <h1 className="display" style={{ fontSize: 24, margin: '8px 0 14px', color: 'var(--vitta-cream)', maxWidth: '92%' }}>{session.title}</h1>
        <div style={{ display: 'flex', gap: 18, alignItems: 'flex-end', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', gap: 18 }}>
            <Stat label="Duración" value={`${session.duration}'`}/>
            <Stat label="RPE"      value={session.rpe_target}/>
            <Stat label="Series"   value={`${doneSets}/${totalSets}`}/>
          </div>
          {/* Timer badge */}
          {sessionActive && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 20, background: 'rgba(43,182,115,0.18)', border: '1px solid rgba(43,182,115,0.35)' }}>
              <div className="pulse-dot" style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--green)' }}/>
              <span className="display tnum" style={{ fontSize: 18, color: 'var(--green)' }}>{formatTime(elapsed)}</span>
            </div>
          )}
        </div>
      </div>

      {/* Action buttons */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 14 }}>
        {!sessionActive ? (
          <button
            onClick={startTimer}
            style={{ padding: '12px 14px', borderRadius: 14, border: 'none', background: 'var(--vitta-cream)', color: 'var(--vitta-navy-ink)', fontSize: 14, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
          >
            <PlayIcon size={14}/> Iniciar sesión
          </button>
        ) : (
          <button
            onClick={stopTimer}
            style={{ padding: '12px 14px', borderRadius: 14, border: '1px solid rgba(43,182,115,0.4)', background: 'rgba(43,182,115,0.12)', color: 'var(--green)', fontSize: 14, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
          >
            <PauseIcon size={14}/> Finalizar
          </button>
        )}
        <button
          onClick={() => setShowDetails(true)}
          style={{ padding: '12px 14px', borderRadius: 14, background: 'transparent', color: 'var(--d-text)', border: '1px solid var(--d-border-strong)', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
        >
          <InfoIcon size={14}/> Ver detalles
        </button>
      </div>

      <div style={{ marginTop: 22, display: 'grid', gap: 14 }}>
        {session.session_blocks.map((block, bi) => (
          <BlockCard
            key={block.id}
            block={block}
            index={bi}
            onToggleSet={toggleSet}
            onOpenExercise={ex => setActiveExercise({ ex, catId: block.category })}
          />
        ))}
      </div>

      {/* Wellness / Bienestar */}
      <div style={{ marginTop: 20, background: 'var(--d-surface)', border: '1px solid var(--d-border)', borderRadius: 16, padding: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--d-text-faint)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Después de la sesión</div>
          {feedbackSaving && <span style={{ fontSize: 10, color: 'var(--d-text-faint)' }}>Guardando…</span>}
          {feedbackSaved && !feedbackSaving && <span style={{ fontSize: 10, color: 'var(--green)', fontWeight: 600 }}>✓ Guardado</span>}
        </div>
        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>¿Cómo te sentiste hoy?</div>

        {/* Sleep hours stepper */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 11, color: 'var(--d-text-muted)', marginBottom: 8, fontWeight: 600, letterSpacing: '0.04em' }}>Horas de sueño</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button
              onClick={() => handleFeedbackChange({ sleepHours: Math.max(4, feedback.sleepHours - 0.5) })}
              style={{ width: 34, height: 34, borderRadius: 8, border: '1px solid var(--d-border-strong)', background: 'transparent', color: 'var(--d-text)', fontSize: 20, cursor: 'pointer', display: 'grid', placeItems: 'center', lineHeight: 1 }}
            >−</button>
            <span className="display tnum" style={{ fontSize: 24, color: 'var(--vitta-cream)', minWidth: 52, textAlign: 'center' }}>{feedback.sleepHours}h</span>
            <button
              onClick={() => handleFeedbackChange({ sleepHours: Math.min(12, feedback.sleepHours + 0.5) })}
              style={{ width: 34, height: 34, borderRadius: 8, border: '1px solid var(--d-border-strong)', background: 'transparent', color: 'var(--d-text)', fontSize: 20, cursor: 'pointer', display: 'grid', placeItems: 'center', lineHeight: 1 }}
            >+</button>
          </div>
        </div>

        {/* Energy level 1–10 */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 11, color: 'var(--d-text-muted)', marginBottom: 8, fontWeight: 600, letterSpacing: '0.04em' }}>
            Nivel de energía {feedback.energyLevel > 0 && <span style={{ color: 'var(--vitta-blue-bright)' }}>· {feedback.energyLevel}/10</span>}
          </div>
          <div style={{ display: 'flex', gap: 3 }}>
            {Array.from({ length: 10 }, (_, i) => i + 1).map(n => (
              <button
                key={n}
                onClick={() => handleFeedbackChange({ energyLevel: n })}
                style={{ flex: 1, height: 30, borderRadius: 4, border: 'none', background: feedback.energyLevel >= n ? 'var(--vitta-blue)' : 'var(--d-border)', color: feedback.energyLevel >= n ? '#fff' : 'var(--d-text-faint)', fontSize: 10, fontWeight: 700, cursor: 'pointer', transition: 'background 0.1s' }}
              >{n}</button>
            ))}
          </div>
        </div>

        {/* Pain level */}
        <div>
          <div style={{ fontSize: 11, color: 'var(--d-text-muted)', marginBottom: 8, fontWeight: 600, letterSpacing: '0.04em' }}>Nivel de dolor / molestia</div>
          <div style={{ display: 'flex', gap: 6 }}>
            {([{ v: 'ninguno', l: 'Ninguno' }, { v: 'leve', l: 'Leve' }, { v: 'moderado', l: 'Moderado' }, { v: 'fuerte', l: 'Fuerte' }] as const).map(opt => (
              <button
                key={opt.v}
                onClick={() => handleFeedbackChange({ painLevel: opt.v })}
                style={{ flex: 1, padding: '7px 0', borderRadius: 8, border: `1px solid ${feedback.painLevel === opt.v ? 'var(--vitta-blue)' : 'var(--d-border)'}`, background: feedback.painLevel === opt.v ? 'rgba(46,107,214,0.20)' : 'transparent', color: feedback.painLevel === opt.v ? 'var(--vitta-blue-bright)' : 'var(--d-text-faint)', fontSize: 11, fontWeight: 600, cursor: 'pointer', transition: 'all 0.1s' }}
              >{opt.l}</button>
            ))}
          </div>
        </div>
      </div>

      {activeExercise && (
        <ExerciseSheet
          exercise={toSessionExercise(activeExercise.ex, activeExercise.catId)}
          onClose={() => setActiveExercise(null)}
        />
      )}

      {showDetails && (
        <SessionDetailsSheet session={session} onClose={() => setShowDetails(false)}/>
      )}
    </div>
  );
}
