'use client';
import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase';
import { useAthlete } from '@/lib/athlete-context';
import { CATEGORIES } from '@/lib/constants';
import { getCategoryIcon, PlayIcon, InfoIcon, CheckIcon, ChevronDown } from '@/components/icons';
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

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <div className="display tnum" style={{ fontSize: 22, color: 'var(--vitta-cream)' }}>{value}</div>
      <div style={{ fontSize: 10, color: 'var(--d-text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 600 }}>{label}</div>
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
            <div
              key={s.id}
              onClick={() => onToggleSet(s.id, s.done)}
              style={{ display: 'grid', gridTemplateColumns: '28px 60px 1fr 60px 24px', gap: 8, padding: '8px 8px', alignItems: 'center', borderRadius: 8, cursor: 'pointer', background: s.done ? 'rgba(43,182,115,0.10)' : 'transparent' }}
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

// ─── Page ────────────────────────────────────────────────────

export default function TodayPage() {
  const { athleteId, loading: authLoading } = useAthlete();
  const [session, setSession] = useState<SessRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeExercise, setActiveExercise] = useState<{ ex: ExRow; catId: CategoryId } | null>(null);

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
            sets ( id, reps, load, rpe_target, rest, done, sort_order )
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
    } else {
      setSession(null);
    }
    setLoading(false);
  }, [athleteId]);

  useEffect(() => {
    if (!authLoading) fetchSession();
  }, [authLoading, fetchSession]);

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
        <div style={{ display: 'flex', gap: 18 }}>
          <Stat label="Duración" value={`${session.duration}'`}/>
          <Stat label="RPE"      value={session.rpe_target}/>
          <Stat label="Series"   value={`${doneSets}/${totalSets}`}/>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 14 }}>
        <button style={{ padding: '12px 14px', borderRadius: 14, border: 'none', background: 'var(--vitta-cream)', color: 'var(--vitta-navy-ink)', fontSize: 14, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          <PlayIcon size={14}/> Iniciar sesión
        </button>
        <button style={{ padding: '12px 14px', borderRadius: 14, background: 'transparent', color: 'var(--d-text)', border: '1px solid var(--d-border-strong)', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
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

      <div style={{ marginTop: 20, background: 'var(--d-surface)', border: '1px solid var(--d-border)', borderRadius: 16, padding: 16 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--d-text-faint)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 10 }}>Después de la sesión</div>
        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>¿Cómo te sentiste hoy?</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
          {[{ l: 'Sueño', v: '7h' }, { l: 'Energía', v: '8/10' }, { l: 'Dolor', v: 'Ninguno' }].map((f, i) => (
            <div key={i} style={{ padding: '10px 12px', borderRadius: 10, background: 'rgba(255,255,255,0.04)', border: '1px solid var(--d-border)' }}>
              <div style={{ fontSize: 10, color: 'var(--d-text-faint)' }}>{f.l}</div>
              <div style={{ fontSize: 13, fontWeight: 600, marginTop: 2 }}>{f.v}</div>
            </div>
          ))}
        </div>
      </div>

      {activeExercise && (
        <ExerciseSheet
          exercise={toSessionExercise(activeExercise.ex, activeExercise.catId)}
          onClose={() => setActiveExercise(null)}
        />
      )}
    </div>
  );
}
