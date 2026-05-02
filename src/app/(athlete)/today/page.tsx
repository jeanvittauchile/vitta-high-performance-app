'use client';
import { useState } from 'react';
import { TODAY_SESSION, CATEGORIES } from '@/lib/constants';
import { getCategoryIcon, PlayIcon, InfoIcon, CheckIcon, ChevronDown } from '@/components/icons';
import LevelBadge from '@/components/badges/LevelBadge';
import ExerciseSheet from '@/components/athlete/ExerciseSheet';
import type { SessionExercise } from '@/lib/types';

export default function TodayPage() {
  const session = TODAY_SESSION;
  const [activeExercise, setActiveExercise] = useState<SessionExercise | null>(null);
  const totalSets = session.blocks.reduce((s, b) => s + b.items.reduce((s2, i) => s2 + i.sets.length, 0), 0);
  const mainBlock = session.blocks.find(b => b.id === 'main') || session.blocks[0];
  const mainCat = CATEGORIES[mainBlock.category] || CATEGORIES.empuje;

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
          {session.blocks
            .filter(b => !['warm','prev'].includes(b.id))
            .map(b => {
              const c = CATEGORIES[b.category];
              const Ic = getCategoryIcon(b.category);
              return (
                <span key={b.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 8px', borderRadius: 5, background: c.color, color: '#fff', fontSize: 10, fontWeight: 700, letterSpacing: '0.06em' }}>
                  <Ic size={11} stroke="currentColor"/>{c.label.toUpperCase()}
                </span>
              );
            })}
          <span style={{ fontSize: 11, color: 'var(--d-text-muted)', letterSpacing: '0.04em' }}>{session.block}</span>
        </div>
        <h1 className="display" style={{ fontSize: 24, margin: '8px 0 14px', color: 'var(--vitta-cream)', maxWidth: '92%' }}>{session.title}</h1>
        <div style={{ display: 'flex', gap: 18 }}>
          <Stat label="Duración" value={`${session.duration}'`}/>
          <Stat label="RPE"      value={session.rpe_target}/>
          <Stat label="Series"   value={totalSets}/>
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
        {session.blocks.map((block, bi) => (
          <BlockCard key={block.id} block={block} index={bi} onOpenExercise={setActiveExercise}/>
        ))}
      </div>

      <div style={{ marginTop: 20, background: 'var(--d-surface)', border: '1px solid var(--d-border)', borderRadius: 16, padding: 16 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--d-text-faint)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 10 }}>Después de la sesión</div>
        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>¿Cómo te sentiste hoy?</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
          {[{l:'Sueño',v:'7h'},{l:'Energía',v:'8/10'},{l:'Dolor',v:'Ninguno'}].map((f,i) => (
            <div key={i} style={{ padding: '10px 12px', borderRadius: 10, background: 'rgba(255,255,255,0.04)', border: '1px solid var(--d-border)' }}>
              <div style={{ fontSize: 10, color: 'var(--d-text-faint)' }}>{f.l}</div>
              <div style={{ fontSize: 13, fontWeight: 600, marginTop: 2 }}>{f.v}</div>
            </div>
          ))}
        </div>
      </div>

      {activeExercise && <ExerciseSheet exercise={activeExercise} onClose={() => setActiveExercise(null)}/>}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <div className="display tnum" style={{ fontSize: 22, color: 'var(--vitta-cream)' }}>{value}</div>
      <div style={{ fontSize: 10, color: 'var(--d-text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 600 }}>{label}</div>
    </div>
  );
}

function BlockCard({ block, index, onOpenExercise }: { block: typeof TODAY_SESSION.blocks[0]; index: number; onOpenExercise: (ex: SessionExercise) => void }) {
  const [expanded, setExpanded] = useState(true);
  const [completedSets, setCompletedSets] = useState<Record<string, boolean>>({});
  const CatIcon = getCategoryIcon(block.category);
  const toggleSet = (key: string) => setCompletedSets(p => ({ ...p, [key]: !p[key] }));
  const totalSets = block.items.reduce((s, i) => s + i.sets.length, 0);
  const doneSets  = Object.entries(completedSets).filter(([k, v]) => v && k.startsWith(block.id)).length;

  return (
    <div style={{ background: 'var(--d-surface)', border: '1px solid var(--d-border)', borderRadius: 16, overflow: 'hidden' }}>
      <button onClick={() => setExpanded(e => !e)} style={{ width: '100%', border: 'none', background: 'transparent', padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', color: 'inherit', textAlign: 'left' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: `${block.color}22`, color: block.color, display: 'grid', placeItems: 'center' }}>
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
          {block.items.map(item => (
            <ExerciseRow key={item.id} item={item} blockId={block.id} completedSets={completedSets} toggleSet={toggleSet} onOpen={() => onOpenExercise(item as SessionExercise)}/>
          ))}
        </div>
      )}
    </div>
  );
}

function ExerciseRow({ item, blockId, completedSets, toggleSet, onOpen }: {
  item: typeof TODAY_SESSION.blocks[0]['items'][0];
  blockId: string;
  completedSets: Record<string, boolean>;
  toggleSet: (k: string) => void;
  onOpen: () => void;
}) {
  const allDone = item.sets.every((_, i) => completedSets[`${blockId}-${item.id}-${i}`]);
  return (
    <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--d-border)', borderRadius: 12, overflow: 'hidden', opacity: allDone ? 0.6 : 1 }}>
      <div style={{ padding: '12px 12px 10px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--d-text)' }}>{item.name}</div>
            {item.level && <LevelBadge level={item.level}/>}
          </div>
          {item.note && <div style={{ fontSize: 11, color: 'var(--d-text-muted)', marginTop: 4 }}>{item.note}</div>}
        </div>
        <button onClick={onOpen} style={{ padding: '6px 10px', borderRadius: 8, background: 'var(--vitta-blue)', color: '#fff', border: 'none', fontSize: 11, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
          <PlayIcon size={10}/> Ver
        </button>
      </div>

      <div style={{ padding: '0 8px 8px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '28px 60px 1fr 60px 24px', gap: 8, padding: '5px 8px', fontSize: 9, color: 'var(--d-text-faint)', letterSpacing: '0.06em', textTransform: 'uppercase', fontWeight: 700 }}>
          <div>SET</div><div>REPS</div><div>CARGA</div><div>RPE</div><div></div>
        </div>
        {item.sets.map((s, i) => {
          const key = `${blockId}-${item.id}-${i}`;
          const done = completedSets[key];
          return (
            <div key={i} onClick={() => toggleSet(key)} style={{ display: 'grid', gridTemplateColumns: '28px 60px 1fr 60px 24px', gap: 8, padding: '8px 8px', alignItems: 'center', borderRadius: 8, cursor: 'pointer', background: done ? 'rgba(43,182,115,0.10)' : 'transparent' }}>
              <div className="mono" style={{ fontSize: 13, fontWeight: 700, color: done ? 'var(--green)' : 'var(--d-text)' }}>{i+1}</div>
              <div className="mono tnum" style={{ fontSize: 13, color: 'var(--d-text)' }}>{s.r}</div>
              <div className="mono tnum" style={{ fontSize: 13, color: 'var(--d-text)' }}>{typeof s.l === 'number' ? `${s.l} kg` : s.l}</div>
              <div className="mono tnum" style={{ fontSize: 12, color: s.rpe ? 'var(--amber)' : 'var(--d-text-faint)' }}>{s.rpe || '—'}</div>
              <div style={{ width: 22, height: 22, borderRadius: 11, border: `1.5px solid ${done ? 'var(--green)' : 'var(--d-border-strong)'}`, background: done ? 'var(--green)' : 'transparent', display: 'grid', placeItems: 'center' }}>
                {done && <CheckIcon size={12} stroke="white" strokeWidth={3}/>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
