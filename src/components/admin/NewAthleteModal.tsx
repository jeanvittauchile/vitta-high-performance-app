'use client';

import { useState } from 'react';
import { XIcon, PlusIcon, CopyIcon, CheckIcon } from '@/components/icons';
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

const APP_URL = 'https://vitta-high-performance-app.vercel.app';

interface Props {
  onClose: () => void;
  onCreated: () => void;
}

export default function NewAthleteModal({ onClose, onCreated }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState('');
  const [created, setCreated] = useState(false);
  const [copied, setCopied]   = useState(false);

  const [form, setForm] = useState({
    name:        '',
    email:       '',
    password:    '',
    age:         '',
    weeklyHours: '5',
    focus:       '',
  });

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  const initials = form.name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(w => w[0].toUpperCase())
    .join('');

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
      name:        form.name,
      email:       form.email,
      password:    form.password,
      age:         Number(form.age),
      weeklyHours: Number(form.weeklyHours),
      focus:       form.focus,
      initials,
      color,
    });

    setLoading(false);

    if (result.error) {
      setError(result.error);
    } else {
      onCreated();
      setCreated(true);
    }
  }

  function handleCopy() {
    const msg =
      `Acceso a Vitta Performance\n\n` +
      `App: ${APP_URL}\n` +
      `Email: ${form.email}\n` +
      `Contraseña: ${form.password}`;
    navigator.clipboard.writeText(msg).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  }

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={created ? undefined : onClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 100,
          background: 'rgba(6,11,31,0.55)',
          backdropFilter: 'blur(4px)',
        }}
      />

      {/* Modal */}
      <div className="admin-modal" style={{
        position: 'fixed', top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 101,
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 16,
        boxShadow: '0 24px 64px rgba(6,11,31,0.18)',
        padding: '24px 28px',
      }}>

        {created ? (
          /* ── Credentials panel ── */
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div>
                <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--text)' }}>Atleta creado</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                  Comparte los accesos con {form.name.split(' ')[0]}.
                </div>
              </div>
              <button onClick={onClose} style={{
                width: 30, height: 30, borderRadius: 8,
                border: '1px solid var(--border)', background: 'var(--surface-2)',
                display: 'grid', placeItems: 'center', cursor: 'pointer',
              }}>
                <XIcon size={14} stroke="var(--text-muted)"/>
              </button>
            </div>

            {/* Credentials box */}
            <div style={{
              background: 'var(--surface-2)',
              border: '1px solid var(--border)',
              borderRadius: 10,
              padding: '14px 16px',
              display: 'grid',
              gap: 10,
              marginBottom: 16,
            }}>
              <CredentialRow label="App" value={APP_URL} />
              <CredentialRow label="Email" value={form.email} />
              <CredentialRow label="Contraseña" value={form.password} secret />
            </div>

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={onClose} className="btn btn-ghost">Cerrar</button>
              <button onClick={handleCopy} className="btn btn-primary" style={{ minWidth: 160 }}>
                {copied
                  ? <><CheckIcon size={13}/>Copiado</>
                  : <><CopyIcon size={13}/>Copiar accesos</>
                }
              </button>
            </div>
          </>
        ) : (
          /* ── Creation form ── */
          <>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div>
                <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--text)' }}>Nuevo atleta</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                  Se creará una cuenta y un perfil en Vitta.
                </div>
              </div>
              <button onClick={onClose} style={{
                width: 30, height: 30, borderRadius: 8,
                border: '1px solid var(--border)', background: 'var(--surface-2)',
                display: 'grid', placeItems: 'center', cursor: 'pointer',
              }}>
                <XIcon size={14} stroke="var(--text-muted)"/>
              </button>
            </div>

            {/* Avatar preview */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, padding: '12px 14px', background: 'var(--surface-2)', borderRadius: 10, border: '1px solid var(--border)' }}>
              <div style={{
                width: 44, height: 44, borderRadius: 22,
                background: color, color: '#fff',
                display: 'grid', placeItems: 'center',
                fontSize: 15, fontWeight: 700,
              }}>
                {initials || '??'}
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>{form.name || 'Nombre del atleta'}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                  {form.focus || '—'} · {form.age ? `${form.age} años` : '—'}
                </div>
              </div>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 12 }}>
              <Field label="Nombre completo *">
                <input value={form.name} onChange={set('name')} placeholder="Ej: Camila Rojas" required/>
              </Field>

              <Field label="Email *">
                <input type="email" value={form.email} onChange={set('email')} placeholder="atleta@email.com" required/>
              </Field>

              <Field label="Contraseña inicial *">
                <input type="password" value={form.password} onChange={set('password')} placeholder="Mínimo 8 caracteres" required minLength={8}/>
              </Field>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <Field label="Edad *">
                  <input type="number" value={form.age} onChange={set('age')} placeholder="25" min={10} max={80} required/>
                </Field>

                <Field label="Horas / semana">
                  <input type="number" value={form.weeklyHours} onChange={set('weeklyHours')} placeholder="5" min={1} max={40}/>
                </Field>
              </div>

              <Field label="Foco principal">
                <input
                  type="text"
                  value={form.focus}
                  onChange={set('focus')}
                  placeholder="ej. Triatleta élite enfocado en potencia aeróbica"
                />
              </Field>

              {error && (
                <div style={{
                  padding: '8px 12px', borderRadius: 7,
                  background: 'rgba(215,71,75,0.10)',
                  border: '1px solid rgba(215,71,75,0.25)',
                  color: 'var(--red)', fontSize: 12,
                }}>
                  {error}
                </div>
              )}

              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
                <button type="button" onClick={onClose} className="btn btn-ghost">
                  Cancelar
                </button>
                <button type="submit" disabled={loading} className="btn btn-primary">
                  <PlusIcon size={13}/>
                  {loading ? 'Creando...' : 'Crear atleta'}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </>
  );
}

function CredentialRow({ label, value, secret }: { label: string; value: string; secret?: boolean }) {
  const [show, setShow] = useState(!secret);
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
      <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', flexShrink: 0 }}>
        {label}
      </span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
        <span style={{
          fontSize: 12, fontWeight: 600, color: 'var(--text)',
          fontFamily: secret && !show ? undefined : 'monospace',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {secret && !show ? '••••••••' : value}
        </span>
        {secret && (
          <button
            onClick={() => setShow(s => !s)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 11, padding: '0 2px', flexShrink: 0 }}
          >
            {show ? 'Ocultar' : 'Mostrar'}
          </button>
        )}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{
        display: 'block', fontSize: 11, fontWeight: 700,
        color: 'var(--text-muted)', letterSpacing: '0.06em',
        textTransform: 'uppercase', marginBottom: 5,
      }}>{label}</label>
      <div style={{
        background: 'white', border: '1px solid var(--border)',
        borderRadius: 7, overflow: 'hidden',
      }}
        onFocus={e => (e.currentTarget.style.borderColor = 'var(--vitta-blue)')}
        onBlur={e => (e.currentTarget.style.borderColor = 'var(--border)')}
      >
        {children}
      </div>
    </div>
  );
}
