'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import { useAthlete } from '@/lib/athlete-context';
import { DAY_TYPES, CATEGORIES } from '@/lib/constants';
import { ChevronDown, ChevronRight, ChevronLeft, CheckIcon } from '@/components/icons';
import type { DayType } from '@/lib/types';

interface DaySession {
  title: string;
  duration: number;
  blocks: { name: string; category: string }[];
}

type CompletionStatus = 'done' | 'partial' | 'none';

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
  const router = useRouter();
  const now = new Date();
  const [year, setYear]   = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [plan, setPlan]   = useState<DayType[][] | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedWeek, setExpandedWeek] = useState<number | null>(null);
  const [selectedDayISO, setSelectedDayISO] = useState<string | null>(null);
  const [daySessions, setDaySessions] = useState<Record<string, DaySession | null | 'loading'>>({});
  const [sessionStatus, setSessionStatus] = useState<Record<string, CompletionStatus>>({});

  const fetchDaySession = useCallback(async (dateISO: string) => {
    if (!athleteId || daySessions[dateISO] !== undefined) return;
    setDaySessions(prev => ({ ...prev, [dateISO]: 'loading' }));
    const supabase = createClient();
    const { data } = await supabase
      .from('sessions')
      .select('title, duration, session_blocks(name, category)')
      .eq('athlete_id', athleteId)
      .eq('date', dateISO)
      .maybeSingle();
    setDaySessions(prev => ({
      ...prev,
      [dateISO]: data ? { title: data.title, duration: data.duration, blocks: (data.session_blocks || []).map((b: any) => ({ name: b.name, category: b.category })) } : null,
    }));
  }, [athleteId, daySessions]);

  // Fetch plan
  useEffect(() => {
    if (authLoading || !athleteId) return;
    setLoading(true);
    setSessionStatus({});
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

  // Fetch session completion status for the month
  useEffect(() => {
    if (!athleteId || authLoading) return;
    const lastDay = new Date(year, month, 0).getDate();
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const endDate   = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
    const supabase = createClient();
    supabase
      .from('sessions')
      .select('date, session_blocks ( session_exercises ( sets ( done ) ) )')
      .eq('athlete_id', athleteId)
      .gte('date', startDate)
      .lte('date', endDate)
      .then(({ data }) => {
        if (!data) return;
        const status: Record<string, CompletionStatus> = {};
        for (const s of data) {
          const allSets: { done: boolean }[] = (s.session_blocks || [])
            .flatMap((b: any) => (b.session_exercises || []).flatMap((e: any) => e.sets || []));
          const doneSets = allSets.filter(set => set.done).length;
          if (allSets.length === 0) {
            status[s.date] = 'none';
          } else if (doneSets === allSets.length) {
            status[s.date] = 'done';
          } else if (doneSets > 0) {
            status[s.date] = 'partial';
          } else {
            status[s.date] = 'none';
          }
        }
        setSessionStatus(status);
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

  // Computed stats
  const totalTrainDays = plan
    ? displayPlan.reduce((s, w) => s + w.filter(d => d !== 'REST').length, 0)
    : Object.keys(sessionStatus).length;
  const completedDays  = Object.values(sessionStatus).filter(s => s === 'done').length;
  const partialDays    = Object.values(sessionStatus).filter(s => s === 'partial').length;
  const adherencePct   = totalTrainDays > 0 ? Math.round((completedDays / totalTrainDays) * 100) : 0;

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

        {/* Week progress bars */}
        <div style={{ display: 'flex', gap: 4 }}>
          {displayPlan.map((w, i) => (
            <div key={i} style={{ flex: 1, height: 6, borderRadius: 3, background: 'var(--vitta-blue)', opacity: 0.3 + i * 0.2 }}/>
          ))}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: 9, color: 'var(--d-text-faint)', letterSpacing: '0.04em' }}>
          <span>S1</span><span>S2</span><span>S3</span><span>S4</span>
        </div>

        {/* Monthly stats strip */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginTop: 12 }}>
          <div style={{ padding: '8px 10px', background: 'rgba(255,255,255,0.04)', borderRadius: 10, border: '1px solid var(--d-border)' }}>
            <div className="display tnum" style={{ fontSize: 18, color: 'var(--vitta-cream)' }}>{totalTrainDays}</div>
            <div style={{ fontSize: 9, color: 'var(--d-text-faint)', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', marginTop: 2 }}>Sesiones</div>
          </div>
          <div style={{ padding: '8px 10px', background: completedDays > 0 ? 'rgba(43,182,115,0.10)' : 'rgba(255,255,255,0.04)', borderRadius: 10, border: `1px solid ${completedDays > 0 ? 'rgba(43,182,115,0.25)' : 'var(--d-border)'}` }}>
            <div className="display tnum" style={{ fontSize: 18, color: completedDays > 0 ? 'var(--green)' : 'var(--vitta-cream)' }}>{completedDays}</div>
            <div style={{ fontSize: 9, color: 'var(--d-text-faint)', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', marginTop: 2 }}>Completadas</div>
          </div>
          <div style={{ padding: '8px 10px', background: adherencePct > 0 ? 'rgba(46,107,214,0.12)' : 'rgba(255,255,255,0.04)', borderRadius: 10, border: `1px solid ${adherencePct > 0 ? 'rgba(46,107,214,0.25)' : 'var(--d-border)'}` }}>
            <div className="display tnum" style={{ fontSize: 18, color: adherencePct > 0 ? 'var(--vitta-blue-bright)' : 'var(--vitta-cream)' }}>{adherencePct}%</div>
            <div style={{ fontSize: 9, color: 'var(--d-text-faint)', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', marginTop: 2 }}>Adherencia</div>
          </div>
        </div>

        {partialDays > 0 && (
          <div style={{ marginTop: 8, padding: '6px 10px', borderRadius: 8, background: 'rgba(232,163,58,0.10)', border: '1px solid rgba(232,163,58,0.25)', fontSize: 11, color: 'var(--amber)', fontWeight: 600 }}>
            {partialDays} sesión{partialDays > 1 ? 'es' : ''} en progreso
          </div>
        )}
      </div>

      {loading ? (
        <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--d-text-muted)', fontSize: 13 }}>Cargando...</div>
      ) : (
        <div style={{ display: 'grid', gap: 8 }}>
          {displayPlan.map((week, wi) => {
            const expanded = expandedWeek === wi;
            const weekDates = Array.from({ length: 7 }, (_, di) => cellDate(year, month, wi, di).toISOString().slice(0, 10));
            const weekTrainCount = week.filter((d, di) => d !== 'REST' || !!sessionStatus[weekDates[di]]).length;
            const weekDone    = weekDates.filter(d => sessionStatus[d] === 'done').length;
            const weekPartial = weekDates.filter(d => sessionStatus[d] === 'partial').length;

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
                      <div style={{ fontSize: 10, color: 'var(--d-text-muted)', marginTop: 2 }}>
                        {weekTrainCount} sesiones
                        {weekDone > 0 && <span style={{ color: 'var(--green)', marginLeft: 6 }}>· {weekDone} hecha{weekDone > 1 ? 's' : ''}</span>}
                        {weekPartial > 0 && <span style={{ color: 'var(--amber)', marginLeft: 4 }}>· {weekPartial} parcial{weekPartial > 1 ? 'es' : ''}</span>}
                      </div>
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
                      const hasSession = d !== 'REST' || !!sessionStatus[dateISO];
                      const isSelected = selectedDayISO === dateISO;
                      const sessionData = daySessions[dateISO];
                      const completion = sessionStatus[dateISO];

                      function handleDayClick() {
                        if (!hasSession) return;
                        if (isSelected) { setSelectedDayISO(null); return; }
                        setSelectedDayISO(dateISO);
                        fetchDaySession(dateISO);
                      }

                      return (
                        <div key={di} style={{ borderRadius: 10, overflow: 'hidden', border: isToday ? '1px solid var(--vitta-blue)' : isSelected ? '1px solid var(--d-border-strong)' : '1px solid transparent' }}>
                          <div
                            onClick={handleDayClick}
                            style={{
                              display: 'grid', gridTemplateColumns: '28px 36px 1fr auto', gap: 10, alignItems: 'center',
                              padding: '10px 10px',
                              background: isToday ? 'rgba(46,107,214,0.12)' : isSelected ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.02)',
                              cursor: hasSession ? 'pointer' : 'default',
                            }}
                          >
                            <div className="mono" style={{ fontSize: 11, color: 'var(--d-text-faint)', fontWeight: 700 }}>{DAY_LABELS[di]}</div>
                            <div className="display tnum" style={{ fontSize: 16, color: isToday ? 'var(--vitta-blue-bright)' : 'var(--d-text)' }}>{dayNum}</div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                              {hasSession && <div style={{ width: 8, height: 8, borderRadius: 4, background: t.color, flexShrink: 0 }}/>}
                              <span style={{ fontSize: 13, color: hasSession ? 'var(--d-text)' : 'var(--d-text-faint)', fontWeight: hasSession ? 500 : 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.label}</span>
                              {isToday && <span style={{ padding: '2px 6px', borderRadius: 4, background: 'var(--vitta-blue)', color: '#fff', fontSize: 9, fontWeight: 700, letterSpacing: '0.06em', flexShrink: 0 }}>HOY</span>}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                              {/* Completion indicator */}
                              {hasSession && completion === 'done' && (
                                <div style={{ width: 20, height: 20, borderRadius: 10, background: 'var(--green)', display: 'grid', placeItems: 'center' }}>
                                  <CheckIcon size={12} stroke="#fff" strokeWidth={2.5}/>
                                </div>
                              )}
                              {hasSession && completion === 'partial' && (
                                <div style={{ width: 20, height: 20, borderRadius: 10, background: 'rgba(232,163,58,0.25)', border: '1.5px solid var(--amber)', display: 'grid', placeItems: 'center' }}>
                                  <div style={{ width: 6, height: 6, borderRadius: 3, background: 'var(--amber)' }}/>
                                </div>
                              )}
                              {hasSession && <ChevronRight size={14} style={{ color: 'var(--d-text-faint)', transform: isSelected ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s' }}/>}
                            </div>
                          </div>

                          {isSelected && (
                            <div style={{ borderTop: '1px solid var(--d-border)', padding: '10px 12px', background: 'rgba(255,255,255,0.02)' }}>
                              {sessionData === 'loading' ? (
                                <div style={{ fontSize: 12, color: 'var(--d-text-muted)', textAlign: 'center', padding: '4px 0' }}>Cargando...</div>
                              ) : sessionData === null || sessionData === undefined ? (
                                <div style={{ fontSize: 12, color: 'var(--d-text-faint)', textAlign: 'center', padding: '4px 0' }}>Sin sesión asignada para este día.</div>
                              ) : (
                                <div>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                                    <div>
                                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--d-text)' }}>{sessionData.title}</div>
                                      <div style={{ fontSize: 11, color: 'var(--d-text-muted)', marginTop: 2 }}>{sessionData.duration} min</div>
                                    </div>
                                    {isToday && (
                                      <button
                                        onClick={() => router.push('/today')}
                                        style={{ padding: '5px 12px', borderRadius: 8, border: 'none', background: 'var(--vitta-blue)', color: '#fff', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}
                                      >
                                        Ver sesión →
                                      </button>
                                    )}
                                  </div>
                                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                                    {sessionData.blocks.map((b, bi) => {
                                      const cat = CATEGORIES[b.category];
                                      return (
                                        <span key={bi} style={{ padding: '2px 8px', borderRadius: 4, background: cat ? `${cat.color}22` : 'var(--d-border)', color: cat?.color || 'var(--d-text-muted)', fontSize: 11, fontWeight: 600 }}>
                                          {b.name}
                                        </span>
                                      );
                                    })}
                                  </div>
                                  {completion === 'done' && (
                                    <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--green)', fontWeight: 600 }}>
                                      <CheckIcon size={12} stroke="var(--green)" strokeWidth={2.5}/> Sesión completada
                                    </div>
                                  )}
                                  {completion === 'partial' && (
                                    <div style={{ marginTop: 8, fontSize: 11, color: 'var(--amber)', fontWeight: 600 }}>En progreso</div>
                                  )}
                                </div>
                              )}
                            </div>
                          )}
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
