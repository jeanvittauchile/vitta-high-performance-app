'use client';
import { useState } from 'react';
import { MONTH_PLAN, DAY_TYPES } from '@/lib/constants';
import { ChevronDown, ChevronRight } from '@/components/icons';

const DAY_LABELS = ['L','M','X','J','V','S','D'];
const WEEK_RANGES = ['4 - 10 mayo','11 - 17 mayo','18 - 24 mayo','25 - 31 mayo · Descarga'];

export default function MonthPage() {
  const [expandedWeek, setExpandedWeek] = useState(2);

  return (
    <div style={{ padding: '16px 16px 28px' }}>
      <div style={{ background: 'var(--d-surface)', borderRadius: 14, padding: '12px 14px', border: '1px solid var(--d-border)', marginBottom: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <div>
            <div style={{ fontSize: 10, color: 'var(--d-text-faint)', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Mesociclo en curso</div>
            <div style={{ fontSize: 14, fontWeight: 600, marginTop: 2 }}>Mayo 2026 · Acumulación</div>
          </div>
          <div className="display tnum" style={{ fontSize: 24, color: 'var(--vitta-cream)' }}>3<span style={{ fontSize: 14, color: 'var(--d-text-muted)' }}>/4</span></div>
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          {['Acumulación','Acumulación','Intensificación','Descarga'].map((p, i) => (
            <div key={i} style={{ flex: 1, height: 6, borderRadius: 3, background: i < 2 ? 'var(--vitta-blue)' : i === 2 ? 'var(--amber)' : 'var(--d-border-strong)', opacity: i === 2 ? 1 : i < 2 ? 0.7 : 0.5 }}/>
          ))}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: 9, color: 'var(--d-text-faint)', letterSpacing: '0.04em' }}>
          <span>S1</span><span>S2</span><span>S3</span><span>S4</span>
        </div>
      </div>

      <div style={{ display: 'grid', gap: 8 }}>
        {MONTH_PLAN.map((week, wi) => {
          const expanded = expandedWeek === wi;
          const weekTrainCount = week.filter(d => d !== 'REST').length;
          return (
            <div key={wi} style={{ background: 'var(--d-surface)', border: `1px solid ${expanded ? 'var(--d-border-strong)' : 'var(--d-border)'}`, borderRadius: 14, overflow: 'hidden' }}>
              <button onClick={() => setExpandedWeek(expanded ? -1 : wi)} style={{ width: '100%', border: 'none', background: 'transparent', padding: '12px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: 'inherit', cursor: 'pointer', textAlign: 'left' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div className="display" style={{ fontSize: 18, color: 'var(--vitta-cream)' }}>S{wi+1}</div>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600 }}>{WEEK_RANGES[wi]}</div>
                    <div style={{ fontSize: 10, color: 'var(--d-text-muted)', marginTop: 2 }}>{weekTrainCount} sesiones</div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 3 }}>
                  {week.map((d, di) => {
                    const t = DAY_TYPES[d] || DAY_TYPES.REST;
                    return <div key={di} style={{ width: 6, height: 18, borderRadius: 1.5, background: d === 'REST' ? 'var(--d-border)' : t.color, opacity: d === 'REST' ? 0.5 : 0.85 }}/>;
                  })}
                </div>
              </button>

              {expanded && (
                <div style={{ padding: '0 8px 12px', display: 'grid', gap: 5 }}>
                  {week.map((d, di) => {
                    const t = DAY_TYPES[d] || DAY_TYPES.REST;
                    const isToday = wi === 2 && di === 2;
                    return (
                      <div key={di} style={{
                        display: 'grid', gridTemplateColumns: '28px 36px 1fr auto', gap: 10, alignItems: 'center',
                        padding: '10px 10px', borderRadius: 10,
                        background: isToday ? 'rgba(46,107,214,0.12)' : 'rgba(255,255,255,0.02)',
                        border: isToday ? '1px solid var(--vitta-blue)' : '1px solid transparent',
                      }}>
                        <div className="mono" style={{ fontSize: 11, color: 'var(--d-text-faint)', fontWeight: 700 }}>{DAY_LABELS[di]}</div>
                        <div className="display tnum" style={{ fontSize: 16, color: isToday ? 'var(--vitta-blue-bright)' : 'var(--d-text)' }}>{wi*7 + di + 4}</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          {d !== 'REST' && <div style={{ width: 8, height: 8, borderRadius: 4, background: t.color }}/>}
                          <span style={{ fontSize: 13, color: d === 'REST' ? 'var(--d-text-faint)' : 'var(--d-text)', fontWeight: d === 'REST' ? 400 : 500 }}>{t.label}</span>
                          {isToday && <span style={{ padding: '2px 6px', borderRadius: 4, background: 'var(--vitta-blue)', color: '#fff', fontSize: 9, fontWeight: 700, letterSpacing: '0.06em' }}>HOY</span>}
                        </div>
                        <ChevronRight size={14} style={{ color: 'var(--d-text-faint)' }}/>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
