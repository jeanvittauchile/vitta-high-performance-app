'use client';
import { useState } from 'react';
import { createClient } from '@/lib/supabase';
import { saveToSupabase } from '@/services/exerciseDBService';
import { ChevronDown, CheckIcon, PlusIcon } from '@/components/icons';

export default function ExerciseDBCard({ exercise }) {
  const [expanded,  setExpanded]  = useState(false);
  const [saving,    setSaving]    = useState(false);
  const [saved,     setSaved]     = useState(false);
  const [error,     setError]     = useState('');
  const [imgLoaded, setImgLoaded] = useState(false);
  const [imgError,  setImgError]  = useState(false);

  async function handleSave() {
    setSaving(true);
    setError('');
    try {
      await saveToSupabase(exercise, createClient());
      setSaved(true);
    } catch (err) {
      setError(err.message || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  }

  const hasInstructions = exercise.instructions?.length > 0;

  return (
    <div style={{
      background: 'white', border: '1px solid var(--border)',
      borderRadius: 'var(--r-lg)', overflow: 'hidden',
      display: 'flex', flexDirection: 'column',
      boxShadow: 'var(--shadow-sm)',
    }}>
      {/* GIF */}
      <div style={{ position: 'relative', background: '#f1f3f6', aspectRatio: '4/3', overflow: 'hidden' }}>
        {!imgError ? (
          <>
            {!imgLoaded && (
              <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', color: 'var(--text-faint)', fontSize: 11 }}>
                Cargando…
              </div>
            )}
            <img
              src={exercise.gifUrl}
              alt={exercise.name}
              loading="lazy"
              onLoad={() => setImgLoaded(true)}
              onError={() => setImgError(true)}
              style={{
                width: '100%', height: '100%', objectFit: 'cover',
                opacity: imgLoaded ? 1 : 0, transition: 'opacity 0.3s',
              }}
            />
          </>
        ) : (
          <div style={{ width: '100%', height: '100%', display: 'grid', placeItems: 'center', color: 'var(--text-muted)', fontSize: 11 }}>
            Sin imagen
          </div>
        )}
      </div>

      {/* Content */}
      <div style={{ padding: '12px 12px 10px', flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', lineHeight: 1.3, textTransform: 'capitalize' }}>
          {exercise.name}
        </div>

        {/* Chips — OSS API uses arrays; old API used strings */}
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {(exercise.targetMuscles ?? (exercise.target ? [exercise.target] : [])).map(m => (
            <Chip key={m} color="var(--vitta-blue)">{m}</Chip>
          ))}
          {(exercise.equipments ?? (exercise.equipment ? [exercise.equipment] : [])).map(e => (
            <Chip key={e}>{e}</Chip>
          ))}
          {(exercise.bodyParts ?? (exercise.bodyPart ? [exercise.bodyPart] : [])).map(b => (
            <Chip key={b}>{b}</Chip>
          ))}
        </div>

        {/* Instructions */}
        {hasInstructions && (
          <div>
            <button
              onClick={() => setExpanded(e => !e)}
              style={{
                background: 'none', border: 'none', padding: 0, cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 4,
                color: 'var(--text-muted)', fontSize: 11, fontWeight: 600, fontFamily: 'inherit',
              }}
            >
              Instrucciones
              <ChevronDown
                size={12}
                style={{ transform: expanded ? 'rotate(0)' : 'rotate(-90deg)', transition: 'transform 0.2s' }}
              />
            </button>
            {expanded && (
              <ol style={{ margin: '6px 0 0 16px', padding: 0, display: 'grid', gap: 4 }}>
                {exercise.instructions.map((step, i) => (
                  <li key={i} style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.5 }}>{step}</li>
                ))}
              </ol>
            )}
          </div>
        )}

        {error && (
          <div style={{ fontSize: 11, color: 'var(--red)', padding: '4px 8px', background: 'rgba(215,71,75,0.08)', borderRadius: 6 }}>
            {error}
          </div>
        )}

        {/* Save button */}
        <button
          onClick={handleSave}
          disabled={saving || saved}
          style={{
            marginTop: 'auto', padding: '8px 10px', borderRadius: 8,
            border: 'none', cursor: saved ? 'default' : 'pointer',
            background: saved ? 'rgba(43,182,115,0.12)' : 'var(--vitta-blue)',
            color: saved ? 'var(--green)' : '#fff',
            fontSize: 11, fontWeight: 700, fontFamily: 'inherit',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
            opacity: saving ? 0.7 : 1,
            transition: 'background 0.2s',
          }}
        >
          {saved ? (
            <><CheckIcon size={12} stroke="currentColor" strokeWidth={2.5}/>Guardado en biblioteca</>
          ) : saving ? 'Guardando…' : (
            <><PlusIcon size={12}/>Guardar en biblioteca</>
          )}
        </button>
      </div>
    </div>
  );
}

function Chip({ children, color }) {
  return (
    <span style={{
      padding: '2px 7px', borderRadius: 999,
      background: color ? `${color}12` : 'var(--surface-2)',
      color: color || 'var(--text-muted)',
      fontSize: 10, fontWeight: 600,
      textTransform: 'capitalize',
    }}>
      {children}
    </span>
  );
}
