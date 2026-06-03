'use client';
import { useEffect, useState } from 'react';
import { useAthlete } from '@/lib/athlete-context';
import { createClient } from '@/lib/supabase';
import { CheckIcon, UserIcon } from '@/components/icons';

const NIVELES = [
  { value: 1, label: 'Principiante', sub: 'Menos de 1 año de entrenamiento' },
  { value: 2, label: 'Intermedio',   sub: '1 – 3 años de entrenamiento'     },
  { value: 3, label: 'Avanzado',     sub: '3 – 8 años de entrenamiento'     },
  { value: 4, label: 'Elite',        sub: 'Más de 8 años de entrenamiento'  },
];

interface ProfileRow {
  id: string;
  peso: number | null;
  estatura: number | null;
  dias_entrenamiento: number | null;
  promedio_kcal: number | null;
  nivel_entrenamiento: number | null;
  historial_lesiones: string | null;
  created_at: string;
}

function field(label: string, children: React.ReactNode) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--d-text-muted)' }}>
        {label}
      </label>
      {children}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  padding: '10px 12px',
  borderRadius: 10,
  border: '1px solid var(--d-border-strong)',
  background: 'rgba(255,255,255,0.05)',
  color: 'var(--d-text)',
  fontSize: 14,
  fontFamily: 'inherit',
  outline: 'none',
  width: '100%',
  boxSizing: 'border-box',
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-CL', { day: 'numeric', month: 'long', year: 'numeric' });
}

export default function ProfilePage() {
  const { athleteId, name, loading: ctxLoading } = useAthlete();

  const [current, setCurrent]   = useState<ProfileRow | null>(null);
  const [history, setHistory]   = useState<ProfileRow[]>([]);
  const [loading, setLoading]   = useState(true);

  // Form state
  const [peso, setPeso]                           = useState('');
  const [estatura, setEstatura]                   = useState('');
  const [dias, setDias]                           = useState('');
  const [kcal, setKcal]                           = useState('');
  const [nivel, setNivel]                         = useState<number | null>(null);
  const [lesiones, setLesiones]                   = useState('');

  const [saving, setSaving]     = useState(false);
  const [saved, setSaved]       = useState(false);
  const [error, setError]       = useState('');

  useEffect(() => {
    if (ctxLoading || !athleteId) return;
    const supabase = createClient();
    supabase
      .from('athlete_profiles')
      .select('*')
      .eq('athlete_id', athleteId)
      .order('created_at', { ascending: false })
      .limit(20)
      .then(({ data }) => {
        const rows = (data || []) as ProfileRow[];
        if (rows.length > 0) {
          const latest = rows[0];
          setCurrent(latest);
          setHistory(rows.slice(1));
          setPeso(latest.peso != null ? String(latest.peso) : '');
          setEstatura(latest.estatura != null ? String(latest.estatura) : '');
          setDias(latest.dias_entrenamiento != null ? String(latest.dias_entrenamiento) : '');
          setKcal(latest.promedio_kcal != null ? String(latest.promedio_kcal) : '');
          setNivel(latest.nivel_entrenamiento);
          setLesiones(latest.historial_lesiones || '');
        }
        setLoading(false);
      });
  }, [athleteId, ctxLoading]);

  async function handleSave() {
    if (!athleteId) return;
    setSaving(true); setError('');
    const supabase = createClient();
    const payload = {
      athlete_id:          athleteId,
      peso:                peso !== '' ? parseFloat(peso) : null,
      estatura:            estatura !== '' ? parseInt(estatura) : null,
      dias_entrenamiento:  dias !== '' ? parseInt(dias) : null,
      promedio_kcal:       kcal !== '' ? parseInt(kcal) : null,
      nivel_entrenamiento: nivel,
      historial_lesiones:  lesiones.trim() || null,
    };

    // Upsert: if current row exists update it, otherwise insert
    let err;
    if (current) {
      ({ error: err } = await supabase
        .from('athlete_profiles')
        .update(payload)
        .eq('id', current.id));
      if (!err) {
        setCurrent({ ...current, ...payload, created_at: current.created_at });
      }
    } else {
      const { data, error: insertErr } = await supabase
        .from('athlete_profiles')
        .insert(payload)
        .select()
        .single();
      err = insertErr;
      if (!err && data) setCurrent(data as ProfileRow);
    }

    setSaving(false);
    if (err) { setError(err.message); return; }
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  if (loading || ctxLoading) {
    return (
      <div style={{ padding: '48px 20px', textAlign: 'center', color: 'var(--d-text-muted)', fontSize: 13 }}>
        Cargando perfil…
      </div>
    );
  }

  const nivelActual = NIVELES.find(n => n.value === nivel);

  return (
    <div style={{ padding: '20px 18px 48px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 22 }}>
        <div style={{ width: 44, height: 44, borderRadius: 22, background: 'linear-gradient(135deg, var(--vitta-blue) 0%, var(--vitta-blue-bright) 100%)', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
          <UserIcon size={22} stroke="#fff"/>
        </div>
        <div>
          <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--d-text)' }}>{name || 'Atleta'}</div>
          <div style={{ fontSize: 11, color: 'var(--d-text-muted)', marginTop: 2 }}>
            {nivelActual ? `${nivelActual.label} · ${nivelActual.sub}` : 'Completa tu perfil deportivo'}
          </div>
        </div>
      </div>

      {/* Summary chips (current values) */}
      {current && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 22 }}>
          {current.peso != null && (
            <span style={chip}>{current.peso} kg</span>
          )}
          {current.estatura != null && (
            <span style={chip}>{current.estatura} cm</span>
          )}
          {current.dias_entrenamiento != null && (
            <span style={chip}>{current.dias_entrenamiento} días entrenados</span>
          )}
          {current.promedio_kcal != null && (
            <span style={chip}>{current.promedio_kcal} kcal/día</span>
          )}
          {nivelActual && (
            <span style={{ ...chip, background: 'rgba(74,138,240,0.18)', border: '1px solid rgba(74,138,240,0.35)', color: '#4A8AF0' }}>
              {nivelActual.label}
            </span>
          )}
        </div>
      )}

      {/* Form */}
      <div style={{ display: 'grid', gap: 14 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {field('Peso (kg)',
            <input type="number" min="30" max="250" step="0.1" value={peso}
              onChange={e => setPeso(e.target.value)} placeholder="ej. 75.5" style={inputStyle}/>
          )}
          {field('Estatura (cm)',
            <input type="number" min="100" max="250" step="1" value={estatura}
              onChange={e => setEstatura(e.target.value)} placeholder="ej. 175" style={inputStyle}/>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {field('Días de entrenamiento total',
            <input type="number" min="0" step="1" value={dias}
              onChange={e => setDias(e.target.value)} placeholder="ej. 240" style={inputStyle}/>
          )}
          {field('Promedio kcal diarias',
            <input type="number" min="0" step="50" value={kcal}
              onChange={e => setKcal(e.target.value)} placeholder="ej. 2200" style={inputStyle}/>
          )}
        </div>

        {field('Nivel de entrenamiento',
          <div style={{ display: 'grid', gap: 8 }}>
            {NIVELES.map(n => (
              <button
                key={n.value}
                onClick={() => setNivel(nivel === n.value ? null : n.value)}
                style={{
                  padding: '10px 14px',
                  borderRadius: 10,
                  border: `1px solid ${nivel === n.value ? 'var(--vitta-blue)' : 'var(--d-border-strong)'}`,
                  background: nivel === n.value ? 'rgba(74,138,240,0.15)' : 'rgba(255,255,255,0.04)',
                  color: nivel === n.value ? '#4A8AF0' : 'var(--d-text)',
                  cursor: 'pointer',
                  textAlign: 'left',
                  fontFamily: 'inherit',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  transition: 'all 0.15s',
                }}
              >
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{n.label}</div>
                  <div style={{ fontSize: 11, color: nivel === n.value ? 'rgba(74,138,240,0.8)' : 'var(--d-text-muted)', marginTop: 2 }}>{n.sub}</div>
                </div>
                <div style={{
                  width: 18, height: 18, borderRadius: 9, flexShrink: 0,
                  border: `2px solid ${nivel === n.value ? '#4A8AF0' : 'var(--d-border-strong)'}`,
                  background: nivel === n.value ? '#4A8AF0' : 'transparent',
                  display: 'grid', placeItems: 'center',
                }}>
                  {nivel === n.value && <CheckIcon size={10} stroke="#fff" strokeWidth={3}/>}
                </div>
              </button>
            ))}
          </div>
        )}

        {field('Historial de lesiones',
          <textarea
            value={lesiones}
            onChange={e => setLesiones(e.target.value)}
            placeholder="Describe lesiones pasadas o actuales: zona afectada, fecha aproximada, gravedad…"
            rows={4}
            style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.5 }}
          />
        )}

        {error && (
          <div style={{ padding: '10px 14px', borderRadius: 8, background: 'rgba(248,113,113,0.12)', border: '1px solid rgba(248,113,113,0.3)', fontSize: 13, color: '#f87171' }}>
            {error}
          </div>
        )}

        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            padding: '13px 0',
            borderRadius: 12,
            border: 'none',
            background: saved ? '#22c55e' : 'var(--vitta-blue)',
            color: '#fff',
            fontSize: 14,
            fontWeight: 700,
            fontFamily: 'inherit',
            cursor: saving ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            transition: 'background 0.2s',
          }}
        >
          {saved ? (
            <><CheckIcon size={16} stroke="#fff" strokeWidth={2.5}/> Guardado</>
          ) : saving ? 'Guardando…' : 'Guardar perfil'}
        </button>
      </div>

      {/* History */}
      {history.length > 0 && (
        <div style={{ marginTop: 32 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--d-text-muted)', marginBottom: 12 }}>
            Historial de registros
          </div>
          <div style={{ display: 'grid', gap: 8 }}>
            {history.map(row => {
              const niv = NIVELES.find(n => n.value === row.nivel_entrenamiento);
              return (
                <div key={row.id} style={{ padding: '12px 14px', borderRadius: 12, background: 'var(--d-surface)', border: '1px solid var(--d-border)' }}>
                  <div style={{ fontSize: 11, color: 'var(--d-text-muted)', marginBottom: 8 }}>{formatDate(row.created_at)}</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {row.peso != null && <span style={chipSm}>{row.peso} kg</span>}
                    {row.estatura != null && <span style={chipSm}>{row.estatura} cm</span>}
                    {row.dias_entrenamiento != null && <span style={chipSm}>{row.dias_entrenamiento} días</span>}
                    {row.promedio_kcal != null && <span style={chipSm}>{row.promedio_kcal} kcal/día</span>}
                    {niv && <span style={chipSm}>{niv.label}</span>}
                  </div>
                  {row.historial_lesiones && (
                    <div style={{ fontSize: 12, color: 'var(--d-text-muted)', marginTop: 8, lineHeight: 1.5 }}>
                      {row.historial_lesiones}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

const chip: React.CSSProperties = {
  padding: '4px 10px',
  borderRadius: 20,
  background: 'rgba(255,255,255,0.07)',
  border: '1px solid var(--d-border-strong)',
  fontSize: 12,
  fontWeight: 600,
  color: 'var(--d-text)',
};

const chipSm: React.CSSProperties = {
  padding: '3px 8px',
  borderRadius: 16,
  background: 'rgba(255,255,255,0.06)',
  border: '1px solid var(--d-border)',
  fontSize: 11,
  color: 'var(--d-text-muted)',
};
