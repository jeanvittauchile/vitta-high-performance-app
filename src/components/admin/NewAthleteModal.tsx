'use client';

import { useState } from 'react';
import { CATEGORIES } from '@/lib/constants';
import { XIcon, PlusIcon, ChevronDown } from '@/components/icons';
import { createAthlete } from '@/lib/actions/create-athlete';

const FOCUS_COLORS: Record<string, string> = {
  traccion:           '#2E6BD6',
  empuje:             '#D7474B',
  zona_media:         '#E8A33A',
  arranque:           '#6E59E0',
  envion:             '#1B2A57',
  jerk:               '#0E1936',
  pliometria_brazos:  '#4A8AF0',
  pliometria_piernas: '#2BB673',
  lanzamientos:       '#D7474B',
  aerobicos:          '#2BB673',
  preventivos:        '#5C6480',
  movilidad:          '#9098AE',
  coordinacion:       '#6E59E0',
};

interface Props {
  onClose: () => void;
  onCreated: () => void;
}

export default function NewAthleteModal({ onClose, onCreated }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    name: '', email: '', password: '',
    age: '', weeklyHours: '5', focus: 'aerobicos',
  });

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  const initials = form.name.split(' ').filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('');
  const color = FOCUS_COLORS[form.focus] || '#2E6BD6';

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name || !form.email || !form.password || !form.age) {
      setError('Completa todos los campos obligatorios.');
      return;
    }
    setLoading(true);
    setError('');

    const result = await createAthlete({
      name: form.name, email: form.email, password: form.password,
      age: Number(form.age), weeklyHours: Number(form.weeklyHours),
      focus: form.focus, initials, color,
    });

    setLoading(false);
    if (result.error) {
      setError(result.error);
    } else {
      onCreated();
      onClose();
    }
  }

  const inputStyle = {
    width: '100%', padding: '9px 11px',
    border: 'none', outline: 'none',
    background: 'transparent', color: 'var(--text)',
    fontSize: 13, fontFamily: 'inherit',
  };

  const fieldWrap = {
    background: 'white', border: '1px solid var(--border)',
    borderRadius: 7, overflow: 'hidden',
  };

  return (
    <>
      <div onClick={onClose} style={{
        position: 'fixed', inset: 0, zIndex: 100,
        background: 'rgba(6,11,31,0.55)', backdropFilter: 'blur(4px)',
      }}/>

      <div style={{
        position: 'fixed', top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 101, width: '100%', maxWidth: 480,
        background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: 16, boxShadow: '0 24px 64px rgba(6,11,31,0.18)',
        padding: '24px 28px',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 17, fontWeight: 700 }}>Nuevo atleta</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>Se creará una cuenta y perfil en Vitta.</div>
          </div>
          <button onClick={onClose} style={{
            width: 30, height: 30, borderRadius: 8,
            border: '1px solid var(--border)', background: 'var(--surface-2)',
            display: 'grid', placeItems: 'center', cursor: 'pointer',
          }}>
            <XIcon size={14} stroke="var(--text-muted)"/>
          </button>
        </div>

        {/* Preview */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, padding: '12px 14px', background: 'var(--surface-2)', borderRadius: 10, border: '1px solid var(--border)' }}>
          <div style={{ width: 44, height: 44, borderRadius: 22, background: color, color: '#fff', display: 'grid', placeItems: 'center', fontSize: 15, fontWeight: 700 }}>
            {initials || '??'}
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600 }}>{form.name || 'Nombre del atleta'}</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
              {CATEGORIES[form.focus]?.label} · {form.age || '—'} años
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 12 }}>
          <div>
            <Label>Nombre completo *</Label>
            <div style={fieldWrap}><input style={inputStyle} value={form.name} onChange={set('name')} placeholder="Ej: Camila Rojas" required/></div>
          </div>
          <div>
            <Label>Email *</Label>
            <div style={fieldWrap}><input style={inputStyle} type="email" value={form.email} onChange={set('email')} placeholder="atleta@email.com" required/></div>
          </div>
          <div>
            <Label>Contraseña inicial *</Label>
            <div style={fieldWrap}><input style={inputStyle} type="password" value={form.password} onChange={set('password')} placeholder="Mínimo 8 caracteres" required minLength={8}/></div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <Label>Edad *</Label>
              <div style={fieldWrap}><input style={inputStyle} type="number" value={form.age} onChange={set('age')} placeholder="25" min={10} max={80} required/></div>
            </div>
            <div>
              <Label>Horas / semana</Label>
              <div style={fieldWrap}><input style={inputStyle} type="number" value={form.weeklyHours} onChange={set('weeklyHours')} placeholder="5" min={1} max={40}/></div>
            </div>
          </div>

          <div>
            <Label>Foco principal</Label>
            <div style={{ ...fieldWra
