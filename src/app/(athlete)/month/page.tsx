'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase';
import { useAthlete } from '@/lib/athlete-context';
import { DAY_TYPES } from '@/lib/constants';
import { ChevronDown, ChevronRight, ChevronLeft } from '@/components/icons';
import type { DayType } from '@/lib/types';

const DAY_LABELS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
const MONTH_NAMES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

function calendarStart(year: number, month: number): Date {
  const first = new Date(year, month - 1, 1);
  const dow = first.getDay();
  const offset = dow === 0 ? -6 : 1 - dow;
  return new Date(year, month - 1, 1 + offset);
}

function cellDate(year: number, month: number, w: number, d: number): Date {
  const start = calendarStart(year, month);
  return new Date(start.getFullYear(), start.getMonth(), start.getDate() + w * 7 + d);
}

function weekRangeLabel(year: number, month: number, w: number): string {
  const start = cellDate(year, month, w, 0);
  const end   = cellDate(year, month, w, 6);
  const fmt = (d: Date) => d.toLocaleDateString('es-CL', { day: 'numeric', month: 'short' });
  return `${fmt(start)} – ${fmt(end)}`;
}

function defaultPlan(): DayType[][] {
  return Array.from({ length: 4 }, () => Array(7).fill('REST') as DayType[]);
}

export default function MonthPage() {
  const { athleteId, loading: authLoading } = useAthlete();
  const now = new Date();
  const [year, setYear]   = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [plan, setPlan]   = useState<DayType[][] | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedWeek, setExpandedWeek] = useState<number | null>(null);

  useEffect(() => {
    if (authLoading || !athleteId) return;
    setLoading(true);
    const supabase = createClient();
    supabase
      .from('month_plans')
      .select('plan')
      .eq('athlete_id', athleteId)
      .eq('year', year)
      .eq('month', month)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error) console.error('month_plans error:', error);
        setPlan(data?.plan ?? null);
        setLoading(false);
      });
  }, [athleteId, authLoading, year, month]);

  // Auto-expand the week containing today
  useEffect(() => {
    if (year !== now.getFullYear() || month !== now.getMonth() + 1) { setExpandedWeek(null); return; }
    const todayISO = now.toISOString().slice(0, 10);
    for (let w = 0; w < 4; w++) {
      for (let d = 0; d < 7; d++) {
        if (cellDate(year, month, w, d).toISOString().slice(0, 10) === todayISO) {
          setExpandedWeek(w);
          return;
        }
      }
    }
  }, [year, month]);

  function prevMonth() {
    if (month === 1) { setYear(y => y - 1); setMonth(12); }
    else setMonth(m => m - 1);
  }
  function nextMonth() {
    if (month === 12) { setYear(y => y + 1); setMonth(1); }
    else setMonth(m => m + 1);
  }

  const todayISO = now.toISOString().slice(0, 10);
  const displayPlan = plan ?? defaultPlan();
  const trainWeeks = plan ? displayPlan.map(w => w.filter(d => d !== 'REST').length) : null;

  return (
    <div style={{ padding: '16px 16px 28px' }}>
      {/* Month header */}
      <div style={{ background: 'var(--d-surface)', borderRadius: 14, padding: '12px 14px', border: '1px solid var(--d-border)', marginBottom: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <div>
            <div style={{ fontSize: 10, color: 'var(--d-text-faint)', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Plan mensual</div>
            <div style={{ fontSize: 14, fontWeight: 600, marginTop: 2 }}>
              {MONTH_NAMES[month - 1]} {year}
              {!plan && !loading && <span style={{ fontSize: 11, color: 'var(--d-text-faint)', marginLeft: 8 }}>(sin plan)</span>}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <button onClick={prevMonth} style={{ background: 'none', border: '1px solid var(--d-border)', borderRadius: 8, color: 'var(--d-text)', cursor: 'pointer', padding: '4px 8px' }}>
              <ChevronLeft size={14}/>
            </button>
            <button
              onClick={() => { setYear(now.getFullYear()); setMonth(now.getMonth() + 1); }}
              style={{ background: 'none', border: '1px solid var(--d-border)', borderRadius: 8, color: 'var(--d-text-muted)', cursor: 'pointer', padding: '4px 10px', fontSize: 11, fontWeight: 600 }}
            >
              Hoy
            </button>
            <button onClick={nextMonth} style={{ background: 'none', border: '1px solid var(--d-border)', borderRadius: 8, color: 'var(--d-text)', cursor: 'pointer', padding: '4px 8px' }}>
              <ChevronRight size={14}/>
            </button>
          </div>
        </div>
        {plan && (
          <>
            <div style={{ display: 'flex', gap: 4 }}>
              {displayPlan.map((w, i) => (
                <div key={i} style={{ flex: 1, height: 6, borderRadius: 3, background: 'var(--vitta-blue)', opacity: 0.3 + i * 0.2 }}/>
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: 9, color: 'var(--d-text-faint)', letterSpacing: '0.04em' }}>
              <span>S1</span><span>S2</span><span>S3</span><span>S4</span>
            </div>
          </>
        )}
      </div>

      {loading ? (
        <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--d-text-muted)', fontSize: 13 }}>Cargando...</div>
      ) : !plan ? (
        <div style={{ padding: '40px 16px', textAlign: 'center', background: 'var(--d-surface)', borderRadius: 14, border: '1px solid var(--d-border)' }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--d-text)', marginBottom: 6 }}>Sin plan para este mes</div>
          <div style={{ fontSize: 12, color: 'var(--d-text-muted)' }}>Tu coach aún no ha publicado el plan mensual.</div>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 8 }}>
          {displayPlan.map((week, wi) => {
            const expanded = expandedWeek === wi;
            const weekTrainCount = week.filter(d => d !== 'REST').length;
            return (
              <div key={wi} style={{ background: 'var(--d-surface)', border: `1px solid ${expanded ? 'var(--d-border-strong)' : 'var(--d-border)'}`, borderRadius: 14, overflow: 'hidden' }}>
                <button
                  onClick={() => setExpandedWeek(expanded ? null : wi)}
                  style={{ width: '100%', border: 'none', background: 'transparent', padding: '12px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: 'inherit', cursor: 'pointer', textAlign: 'left' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div className="display" style={{ fontSize: 18, color: 'var(--vitta-cream)' }}>S{wi + 1}</div>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 600 }}>{weekRangeLabel(year, month, wi)}</div>
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
                      const date = cellDate(year, month, wi, di);
                      const dateISO = date.toISOString().slice(0, 10);
                      const isToday = dateISO === todayISO;
                      const dayNum = date.getDate();
                      return (
                        <div key={di} style={{
                          display: 'grid', gridTemplateColumns: '28px 36px 1fr auto', gap: 10, alignItems: 'center',
                          padding: '10px 10px', borderRadius: 10,
                          background: isToday ? 'rgba(46,107,214,0.12)' : 'rgba(255,255,255,0.02)',
                          border: isToday ? '1px solid var(--vitta-blue)' : '1px solid transparent',
                        }}>
                          <div className="mono" style={{ fontSize: 11, color: 'var(--d-text-faint)', fontWeight: 700 }}>{DAY_LABELS[di]}</div>
                          <div className="display tnum" style={{ fontSize: 16, color: isToday ? 'var(--vitta-blue-bright)' : 'var(--d-text)' }}>{dayNum}</div>
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
      )}
    </div>
  );
}
