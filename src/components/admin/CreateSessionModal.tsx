'use client';
import { useState } from 'react';
import { createClient } from '@/lib/supabase';
import type { Athlete } from '@/lib/types';

interface Props {
  athletes: Athlete[];
  onClose: () => void;
  onCreated: () => void;
}

const labelStyle: React.CSSProperties = {
  fontSize: 11, fontWeight: 700, letterSpacing: '0.06em',
  textTransform: 'uppercase', color: 'var(--text-muted)',
  display: 'block', marginBottom: 6,
};

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '8px 10px', borderRadius: 8,
  border: '1px solid var(--border)', background: 'var(--surface)',
  fontSize: 13, fontFamily: 'inherit', color: 'var(--text)',
  boxSizing: 'border-box', outline: 'none',
};

export default function CreateSessionModal({ athletes, onClose, onCreated }: Props) {
  const today = new Date().toISOString().slice(0, 10);
  const [form, setForm] = useState({
    athlete_id: athletes[0]?.id || '',
    date: today,
    title: '',
    duration: 60,
    rpe_target: 7,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) { setError('El título es obligatorio.'); return; }
    if (!form.athlete_id) { setError('Selecciona un atleta.'); return; }
    setSaving(true);
    setError('');
    const supabase = createClient();
    const { error: err } = await supabase.from('sessions').insert({
      athlete_id: form.athlete_id,
      date: form.date,
      title: form.title.trim(),
      duration: Number(form.duration),
      rpe_target: Number(form.rpe_target),
    });
    setSaving(false);
    if (err) { setError(err.message); return; }
    onCreated();
    onClose();
  }

  return (
    <div
      onClick={e => e.target === e.currentTarget && onClose()}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(14,25,54,0.55)',
        display: 'grid', placeItems: 'center',
      }}
    >
      <div className="card" style={{ width: 480, padding: 28 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 }}>
          <div style={{ fontSize: 16, fontWeight: 700 }}>Nueva sesión</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 22, lineHeight: 1, padding: '0 4px' }}>×</button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 16 }}>
          <div>
            <label style={labelStyle}>Atleta</label>
            <select
              value={form.athlete_id}
              onChange={e => setForm(f => ({ ...f, athlete_id: e.target.value }))}
              style={{ ...inputStyle }}
            >
              {athletes.length === 0 && <option value="">Sin atletas</option>}
              {athletes.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={labelStyle}>Fecha</label>
              <input
                type="date" value={form.date}
                onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Duración (min)</label>
              <input
                type="number" min={15} max={300} value={form.duration}
                onChange={e => setForm(f => ({ ...f, duration: Number(e.target.value) }))}
                style={inputStyle}
              />
            </div>
          </div>

          <div>
            <label style={labelStyle}>Título</label>
            <input
              type="text" value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              placeholder="ej. Fuerza — Empuje + Zona Media"
              style={inputStyle}
            />
          </div>

          <div>
            <label style={labelStyle}>
              RPE Objetivo &nbsp;
              <span style={{ fontWeight: 400, color: 'var(--text)' }}>{form.rpe_target}</span>
            </label>
            <input
              type="range" min={1} max={10} step={0.5} value={form.rpe_target}
              onChange={e => setForm(f => ({ ...f, rpe_target: Number(e.target.value) }))}
              style={{ width: '100%' }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--text-muted)', marginTop: 3 }}>
              <span>1 — Muy fácil</span><span>10 — Máximo</span>
            </div>
          </div>

          {error && (
            <div style={{ fontSize: 12, color: 'var(--red)', padding: '8px 10px', background: 'rgba(215,71,75,0.08)', borderRadius: 6 }}>
              {error}
            </div>
          )}

          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
            <button type="button" onClick={onClose} className="btn btn-ghost">Cancelar</button>
            <button type="submit" disabled={saving || athletes.length === 0} className="btn btn-primary">
              {saving ? 'Guardando...' : 'Crear sesión'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
