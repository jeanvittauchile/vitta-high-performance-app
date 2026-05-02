'use client';
import { CATEGORIES } from '@/lib/constants';
import { getCategoryIcon, FlameIcon } from '@/components/icons';

const CAT_VOLUME = [
  { id: 'empuje',             pct: 22 },
  { id: 'traccion',           pct: 18 },
  { id: 'envion',             pct: 14 },
  { id: 'zona_media',         pct: 12 },
  { id: 'aerobicos',          pct: 10 },
  { id: 'movilidad',          pct: 8  },
  { id: 'preventivos',        pct: 6  },
  { id: 'pliometria_piernas', pct: 5  },
  { id: 'arranque',           pct: 5  },
];

const KPIS = [
  { l: 'Adherencia',      v: '88%',   u: '',    d: '+4%',  c: 'var(--green)'         },
  { l: 'RPE promedio',    v: '7.8',   u: '',    d: '+0.3', c: 'var(--amber)'         },
  { l: 'Tonelaje 7d',     v: '8,420', u: 'kg',  d: '+12%', c: 'var(--green)'         },
  { l: 'Sesiones / 4 sem',v: '14',    u: '/16', d: '—',    c: 'var(--d-text-muted)'  },
];

export default function StatsPage() {
  return (
    <div style={{ padding: '16px 16px 28px' }}>
      {/* Streak hero */}
      <div style={{ background: 'linear-gradient(135deg, rgba(46,107,214,0.20) 0%, var(--d-surface) 100%)', border: '1px solid rgba(46,107,214,0.30)', borderRadius: 18, padding: 18, position: 'relative', overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <FlameIcon size={20} stroke="var(--vitta-blue-bright)"/>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--d-text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Racha actual</div>
        </div>
        <div className="display tnum" style={{ fontSize: 56, color: 'var(--vitta-cream)', marginTop: 4 }}>
          18 <span style={{ fontSize: 16, color: 'var(--d-text-muted)' }}>días</span>
        </div>
        <div style={{ display: 'flex', gap: 4, marginTop: 14 }}>
          {Array.from({length: 21}).map((_, i) => (
            <div key={i} style={{ flex: 1, height: 26, borderRadius: 3, background: i >= 3 ? 'var(--vitta-blue)' : 'var(--d-border)', opacity: i >= 3 ? 0.5 + (i-3)/40 : 0.5 }}/>
          ))}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: 9, color: 'var(--d-text-faint)' }}>
          <span>21d atrás</span><span>HOY</span>
        </div>
      </div>

      {/* KPI grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 14 }}>
        {KPIS.map((s, i) => (
          <div key={i} style={{ background: 'var(--d-surface)', border: '1px solid var(--d-border)', borderRadius: 14, padding: 14 }}>
            <div style={{ fontSize: 10, color: 'var(--d-text-faint)', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>{s.l}</div>
            <div style={{ marginTop: 6 }}>
              <span className="display tnum" style={{ fontSize: 26, color: 'var(--vitta-cream)' }}>{s.v}</span>
              {s.u && <span style={{ fontSize: 11, color: 'var(--d-text-muted)', marginLeft: 4 }}>{s.u}</span>}
            </div>
            <div style={{ fontSize: 11, color: s.c, marginTop: 4, fontWeight: 600 }}>{s.d}</div>
          </div>
        ))}
      </div>

      {/* Volume by category */}
      <div style={{ marginTop: 14, background: 'var(--d-surface)', border: '1px solid var(--d-border)', borderRadius: 16, padding: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 14 }}>Volumen por categoría · 4 sem</div>
        <div style={{ display: 'grid', gap: 8 }}>
          {CAT_VOLUME.map(cv => {
            const c = CATEGORIES[cv.id];
            const Ic = getCategoryIcon(cv.id);
            return (
              <div key={cv.id} style={{ display: 'grid', gridTemplateColumns: '20px 110px 1fr 36px', gap: 8, alignItems: 'center' }}>
                <Ic size={14} stroke={c.color}/>
                <div style={{ fontSize: 11, color: 'var(--d-text)', fontWeight: 500 }}>{c.label}</div>
                <div style={{ height: 8, borderRadius: 4, background: 'var(--d-border)', overflow: 'hidden' }}>
                  <div style={{ width: `${cv.pct * 4}%`, height: '100%', background: c.color }}/>
                </div>
                <div className="mono tnum" style={{ fontSize: 11, color: 'var(--d-text-muted)', textAlign: 'right' }}>{cv.pct}%</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
