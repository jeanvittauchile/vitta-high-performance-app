'use client';
import { useState } from 'react';
import { EXERCISES, CATEGORIES } from '@/lib/constants';
import { XIcon } from '@/components/icons';
import LevelBadge from '@/components/badges/LevelBadge';
import CategoryChip from '@/components/badges/CategoryChip';
import ExerciseDemo from '@/components/exercise/ExerciseDemo';
import type { SessionExercise } from '@/lib/types';

const RPE_CUES = [
  'Posición inicial firme · pies anclados.',
  'Respiración: inhalar antes, presión abdominal.',
  'Rango completo manteniendo técnica.',
  'Tempo 2-1-1 · controla la fase excéntrica.',
];

export default function ExerciseSheet({ exercise, onClose }: { exercise: SessionExercise; onClose: () => void }) {
  const [rpe, setRpe] = useState(7);
  const fullEx = EXERCISES.find(e => e.id === exercise.exId);
  const videoUrl = exercise.videoUrl || exercise.gifUrl || fullEx?.videoUrl;
  const merged = {
    name:      exercise.name      || fullEx?.name      || '',
    level:     exercise.level     || fullEx?.level,
    category:  exercise.category  || fullEx?.category,
    muscle:    exercise.muscle    || fullEx?.muscle    || '',
    equipment: exercise.equipment || fullEx?.equipment || '',
  };

  return (
    <div className="slide-up" style={{
      position: 'fixed', inset: 0, zIndex: 50,
      background: 'var(--d-bg)',
      display: 'flex', flexDirection: 'column',
      maxWidth: 430, margin: '0 auto',
    }}>
      {/* Header */}
      <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--d-border)' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 10, color: 'var(--d-text-faint)', letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 700 }}>Ejercicio</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--vitta-cream)', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{merged.name}</div>
        </div>
        <button onClick={onClose} style={{ width: 34, height: 34, borderRadius: 17, border: '1px solid var(--d-border)', background: 'rgba(255,255,255,0.04)', color: 'var(--d-text)', display: 'grid', placeItems: 'center', cursor: 'pointer' }}>
          <XIcon size={16}/>
        </button>
      </div>

      <div className="thin-scroll-dark" style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
        <ExerciseDemo videoUrl={exercise.videoUrl || fullEx?.videoUrl} gifUrl={exercise.gifUrl} dark/>

        {/* Meta */}
        <div style={{ marginTop: 12, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <div style={{ padding: '10px 12px', borderRadius: 10, background: 'var(--d-surface)', border: '1px solid var(--d-border)' }}>
            <div style={{ fontSize: 9, color: 'var(--d-text-faint)', letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 700, marginBottom: 6 }}>Categoría</div>
            {merged.category && <CategoryChip catId={merged.category} dark/>}
          </div>
          <div style={{ padding: '10px 12px', borderRadius: 10, background: 'var(--d-surface)', border: '1px solid var(--d-border)' }}>
            <div style={{ fontSize: 9, color: 'var(--d-text-faint)', letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 700, marginBottom: 6 }}>Nivel</div>
            {merged.level && <LevelBadge level={merged.level}/>}
          </div>
          {merged.muscle && (
            <div style={{ padding: '10px 12px', borderRadius: 10, background: 'var(--d-surface)', border: '1px solid var(--d-border)', gridColumn: 'span 2' }}>
              <div style={{ fontSize: 9, color: 'var(--d-text-faint)', letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 700, marginBottom: 4 }}>Músculos · Equipo</div>
              <div style={{ fontSize: 12, color: 'var(--d-text)' }}>{merged.muscle} · <span style={{ color: 'var(--d-text-muted)' }}>{merged.equipment}</span></div>
            </div>
          )}
        </div>

        {/* Coach cues */}
        <div style={{ marginTop: 14, background: 'var(--d-surface)', border: '1px solid var(--d-border)', borderRadius: 14, padding: 14 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--d-text-faint)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 10 }}>Cues del coach</div>
          <div style={{ display: 'grid', gap: 8, fontSize: 13, color: 'var(--d-text)' }}>
            {RPE_CUES.map((c, i) => (
              <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <div className="mono" style={{ fontSize: 11, color: 'var(--vitta-blue-bright)', fontWeight: 700, marginTop: 2 }}>{String(i+1).padStart(2,'0')}</div>
                <div>{c}</div>
              </div>
            ))}
          </div>
        </div>

        {/* RPE selector */}
        <div style={{ marginTop: 14, background: 'var(--d-surface)', border: '1px solid var(--d-border)', borderRadius: 14, padding: 14 }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>¿Qué tan duro fue?</div>
          <div style={{ fontSize: 11, color: 'var(--d-text-muted)', marginBottom: 14 }}>RPE — Esfuerzo percibido</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(10, 1fr)', gap: 4 }}>
            {Array.from({length: 10}, (_, i) => i+1).map(n => {
              const active = rpe === n;
              const color = n <= 3 ? 'var(--green)' : n <= 6 ? 'var(--amber)' : n <= 8 ? '#E8A33A' : 'var(--red)';
              return (
                <button key={n} onClick={() => setRpe(n)} style={{
                  aspectRatio: '1/1', borderRadius: 8,
                  border: active ? `2px solid ${color}` : '1px solid var(--d-border)',
                  background: active ? `${color}25` : 'rgba(255,255,255,0.02)',
                  color: active ? color : 'var(--d-text)',
                  fontSize: 14, fontWeight: 700, fontFamily: 'var(--font-mono)',
                  cursor: 'pointer',
                }}>{n}</button>
              );
            })}
          </div>
          <div style={{ fontSize: 11, color: 'var(--d-text-muted)', marginTop: 10, fontStyle: 'italic' }}>
            {rpe <= 3 && 'Muy fácil — sin esfuerzo'}
            {rpe > 3 && rpe <= 6 && 'Moderado — quedan 4+ reps en reserva'}
            {rpe > 6 && rpe <= 8 && 'Duro — 2-3 reps en reserva'}
            {rpe > 8 && 'Máximo — al fallo o cerca'}
          </div>
        </div>
      </div>
    </div>
  );
}
