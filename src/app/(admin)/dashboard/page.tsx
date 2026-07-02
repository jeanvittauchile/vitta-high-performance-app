'use client';
import { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import { CATEGORIES } from '@/lib/constants';
import { PlusIcon, CalendarIcon, ChevronRight, UserIcon } from '@/components/icons';
import StatusPill from '@/components/badges/StatusPill';
import CreateSessionModal from '@/components/admin/CreateSessionModal';
import AthleteProfileDrawer from '@/components/admin/AthleteProfileDrawer';
import type { Athlete } from '@/lib/types';

const MONTH_SHORT = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
const WEEKDAY_SHORT = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];

type SessionStatus = 'none' | 'partial' | 'full';

interface SessionDay { date: string; title: string; status: SessionStatus; }

interface MonthlyBucket { key: string; label: string; none: number; partial: number; full: number; sessions: SessionDay[]; }

const STATUS_META: Record<SessionStatus, { label: string; color: string }> = {
  full:    { label: 'Completada',      color: 'var(--green)' },
  partial: { label: 'Parcial',         color: 'var(--amber)' },
  none:    { label: 'No completada',   color: 'var(--red)' },
};

function fmtDayLabel(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  return `${WEEKDAY_SHORT[dt.getDay()]} ${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}`;
}

function MonthlySessionsChart({ data, loading }: { data: MonthlyBucket[]; loading: boolean }) {
  const [selected, setSelected] = useState<{ key: string; status: SessionStatus } | null>(null);

  if (loading) {
    return <div style={{ padding: '30px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>Cargando...</div>;
  }
  const total = data.reduce((s, d) => s + d.none + d.partial + d.full, 0);
  if (total === 0) {
    return (
      <div style={{ padding: '30px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
        Aún no hay sesiones registradas en este período.
      </div>
    );
  }
  const max = Math.max(...data.flatMap(d => [d.none, d.partial, d.full]), 1);
  const CHART_H = 96;
  const statuses: SessionStatus[] = ['none', 'partial', 'full'];

  const selectedBucket = selected ? data.find(d => d.key === selected.key) : null;
  const selectedDays = selectedBucket && selected
    ? selectedBucket.sessions.filter(s => s.status === selected.status).sort((a, b) => a.date.localeCompare(b.date))
    : [];

  return (
    <div>
      <div style={{ display: 'flex', gap: 12, marginBottom: 10 }}>
        {statuses.map(st => (
          <div key={st} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <div style={{ width: 8, height: 8, borderRadius: 2, background: STATUS_META[st].color, flexShrink: 0 }}/>
            <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-muted)' }}>{STATUS_META[st].label}</span>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: CHART_H + 34, padding: '4px 2px 0' }}>
        {data.map(d => (
          <div key={d.key} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
            <div style={{ height: CHART_H, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: 2, width: '100%' }}>
              {statuses.map(st => {
                const count = d[st];
                const barH = count === 0 ? 0 : Math.max(3, (count / max) * CHART_H);
                const isSelected = selected?.key === d.key && selected?.status === st;
                return (
                  <button
                    key={st}
                    onClick={() => count > 0 && setSelected(isSelected ? null : { key: d.key, status: st })}
                    title={`${d.label} · ${STATUS_META[st].label}: ${count} sesión${count === 1 ? '' : 'es'}`}
                    disabled={count === 0}
                    style={{
                      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                      background: 'none', border: 'none', padding: 0, cursor: count > 0 ? 'pointer' : 'default',
                      fontFamily: 'inherit',
                    }}
                  >
                    <span className="mono tnum" style={{ fontSize: 9, fontWeight: 700, color: count > 0 ? 'var(--text)' : 'var(--text-faint)' }}>{count > 0 ? count : ''}</span>
                    <div className="chart-bar" style={{
                      width: 12, height: barH,
                      background: STATUS_META[st].color, borderRadius: '3px 3px 0 0',
                      outline: isSelected ? `2px solid ${STATUS_META[st].color}` : 'none',
                      outlineOffset: 2,
                      transition: 'filter 0.1s',
                    }}/>
                  </button>
                );
              })}
            </div>
            <span style={{ fontSize: 9, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{d.label}</span>
          </div>
        ))}
      </div>

      {selected && selectedBucket && (
        <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: STATUS_META[selected.status].color }}>
              {selectedBucket.label} · {STATUS_META[selected.status].label} ({selectedDays.length})
            </span>
            <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 11 }}>Cerrar ×</button>
          </div>
          <div style={{ display: 'grid', gap: 4, maxHeight: 140, overflowY: 'auto' }}>
            {selectedDays.map((s, i) => (
              <div key={i} style={{ display: 'flex', gap: 8, fontSize: 11, alignItems: 'baseline' }}>
                <span className="mono" style={{ color: 'var(--text-muted)', fontWeight: 700, flexShrink: 0 }}>{fmtDayLabel(s.date)}</span>
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.title}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function fmtMonthLabel(key: string): string {
  const [y, m] = key.split('-').map(Number);
  return `${MONTH_SHORT[m - 1]} ${y}`;
}

function PlannedSessionsCell({ total, byMonth }: { total: number; byMonth: { key: string; count: number }[] }) {
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  if (total === 0) return <span className="muted" style={{ fontSize: 11 }}>—</span>;
  const months = [...byMonth].sort((a, b) => b.key.localeCompare(a.key));
  return (
    <>
      <span
        className="mono tnum"
        style={{ fontSize: 12, fontWeight: 700, cursor: 'default', borderBottom: '1px dashed var(--text-faint)' }}
        onMouseEnter={e => {
          const r = e.currentTarget.getBoundingClientRect();
          setPos({ top: r.bottom + 6, left: r.left + r.width / 2 });
        }}
        onMouseLeave={() => setPos(null)}
      >
        {total}
      </span>
      {pos && (
        <div style={{
          position: 'fixed', zIndex: 100, top: pos.top, left: pos.left, transform: 'translateX(-50%)',
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: 8, boxShadow: 'var(--shadow-md)', padding: '8px 10px', minWidth: 130,
          pointerEvents: 'none',
        }}>
          <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6, whiteSpace: 'nowrap' }}>
            Sesiones por mes
          </div>
          <div style={{ display: 'grid', gap: 3, maxHeight: 160, overflowY: 'auto' }}>
            {months.map(m => (
              <div key={m.key} style={{ display: 'flex', justifyContent: 'space-between', gap: 14, fontSize: 11 }}>
                <span style={{ color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{fmtMonthLabel(m.key)}</span>
                <span className="mono tnum" style={{ fontWeight: 700 }}>{m.count}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [todaySessions, setTodaySessions] = useState<{ id: string; athlete_id: string; completed: boolean }[]>([]);
  const [selectedAthlete, setSelectedAthlete] = useState<Athlete | null>(null);
  const [completedCountMap, setCompletedCountMap] = useState<Record<string, number>>({});
  const [totalSessionCountMap, setTotalSessionCountMap] = useState<Record<string, number>>({});
  const [totalSessionsByMonthMap, setTotalSessionsByMonthMap] = useState<Record<string, { key: string; count: number }[]>>({});
  const [monthlyRaw, setMonthlyRaw] = useState<{ date: string; athlete_id: string; title: string; status: SessionStatus }[]>([]);
  const [monthlyMonths, setMonthlyMonths] = useState<{ key: string; label: string }[]>([]);
  const [monthlyLoading, setMonthlyLoading] = useState(true);
  const [monthlyAthleteFilter, setMonthlyAthleteFilter] = useState<string>('all');

  const fetchAthletes = useCallback(async () => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('athletes')
      .select('*')
      .order('name');
    if (!error && data) {
      setAthletes(data.map((a: any) => ({
        id:          a.id,
        name:        a.name,
        initials:    a.initials,
        age:         a.age,
        weeklyHours: a.weekly_hours,
        focus:       a.focus,
        adherence:   a.adherence,
        rpe7:        a.rpe7,
        status:      a.status,
        color:       a.color,
      })));
    }
    setLoading(false);
  }, []);

  const fetchCompletedSessionCounts = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from('sessions')
      .select('athlete_id, session_feedback!inner(id)');
    if (data) {
      const counts: Record<string, number> = {};
      data.forEach((s: any) => { counts[s.athlete_id] = (counts[s.athlete_id] || 0) + 1; });
      setCompletedCountMap(counts);
    }
  }, []);

  const fetchTotalSessionCounts = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase.from('sessions').select('athlete_id, date');
    if (data) {
      const counts: Record<string, number> = {};
      const byMonth: Record<string, Record<string, number>> = {};
      data.forEach((s: any) => {
        counts[s.athlete_id] = (counts[s.athlete_id] || 0) + 1;
        const monthKey = s.date.slice(0, 7);
        const athleteMonths = byMonth[s.athlete_id] || (byMonth[s.athlete_id] = {});
        athleteMonths[monthKey] = (athleteMonths[monthKey] || 0) + 1;
      });
      setTotalSessionCountMap(counts);
      setTotalSessionsByMonthMap(
        Object.fromEntries(
          Object.entries(byMonth).map(([athleteId, months]) => [
            athleteId,
            Object.entries(months).map(([key, count]) => ({ key, count })),
          ])
        )
      );
    }
  }, []);

  const fetchTodaySessions = useCallback(async () => {
    const supabase = createClient();
    const today = new Date().toISOString().slice(0, 10);
    const { data } = await supabase
      .from('sessions')
      .select('id, athlete_id, session_feedback(id)')
      .eq('date', today)
      .order('created_at');
    if (data) {
      setTodaySessions(data.map((s: any) => {
        const fb = Array.isArray(s.session_feedback) ? s.session_feedback[0] : s.session_feedback;
        return { id: s.id, athlete_id: s.athlete_id, completed: !!fb };
      }));
    }
  }, []);

  const fetchMonthlySessions = useCallback(async () => {
    setMonthlyLoading(true);
    const supabase = createClient();
    const now = new Date();
    const months: { key: string; label: string }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({ key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`, label: MONTH_SHORT[d.getMonth()] });
    }
    const { data } = await supabase
      .from('sessions')
      .select('date, athlete_id, title, session_blocks(session_exercises(sets(done)))')
      .gte('date', `${months[0].key}-01`);
    setMonthlyMonths(months);
    setMonthlyRaw((data || []).map((s: any) => {
      const allSets: { done: boolean }[] = (s.session_blocks || [])
        .flatMap((b: any) => (b.session_exercises || []).flatMap((e: any) => e.sets || []));
      const doneCount = allSets.filter(set => set.done).length;
      const status: SessionStatus = doneCount === 0 ? 'none' : doneCount === allSets.length ? 'full' : 'partial';
      return { date: s.date, athlete_id: s.athlete_id, title: s.title, status };
    }));
    setMonthlyLoading(false);
  }, []);

  useEffect(() => {
    fetchAthletes();
    fetchTodaySessions();
    fetchCompletedSessionCounts();
    fetchTotalSessionCounts();
    fetchMonthlySessions();
  }, [fetchAthletes, fetchTodaySessions, fetchCompletedSessionCounts, fetchTotalSessionCounts, fetchMonthlySessions]);

  useEffect(() => {
    const supabase = createClient();
    const ch = supabase
      .channel('dashboard-session-feedback')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'session_feedback' }, () => {
        fetchTodaySessions();
        fetchCompletedSessionCounts();
        fetchMonthlySessions();
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'sessions' }, () => {
        fetchTotalSessionCounts();
        fetchMonthlySessions();
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [fetchTodaySessions, fetchCompletedSessionCounts, fetchTotalSessionCounts, fetchMonthlySessions]);

  const onTrack = athletes.filter(a => a.status === 'on-track').length;
  const missed  = athletes.filter(a => a.status === 'missed').length;

  const monthlySessions = useMemo<MonthlyBucket[]>(() => {
    const filtered = monthlyAthleteFilter === 'all'
      ? monthlyRaw
      : monthlyRaw.filter(s => s.athlete_id === monthlyAthleteFilter);
    return monthlyMonths.map(m => {
      const sessions = filtered.filter(s => s.date.slice(0, 7) === m.key);
      return {
        ...m,
        none: sessions.filter(s => s.status === 'none').length,
        partial: sessions.filter(s => s.status === 'partial').length,
        full: sessions.filter(s => s.status === 'full').length,
        sessions: sessions.map(s => ({ date: s.date, title: s.title, status: s.status })),
      };
    });
  }, [monthlyRaw, monthlyMonths, monthlyAthleteFilter]);

  const athleteSessionMap = Object.fromEntries(todaySessions.map(s => [s.athlete_id, s.completed ? 'completed' : 'pending'])) as Record<string, 'completed' | 'pending'>;
  const sessionsDoneCount = todaySessions.filter(s => s.completed).length;
  const sessionsPendingCount = todaySessions.filter(s => !s.completed).length;

  const today = new Date().toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div className="admin-page-pad">
      {showModal && (
        <CreateSessionModal
          athletes={athletes}
          onClose={() => setShowModal(false)}
          onCreated={() => { fetchTodaySessions(); }}
        />
      )}
      {selectedAthlete && (
        <AthleteProfileDrawer
          athlete={selectedAthlete}
          onClose={() => setSelectedAthlete(null)}
        />
      )}

      <div className="admin-page-header" style={{ marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 700, color: 'var(--text-muted)' }}>
            {today}
          </div>
          <div className="display" style={{ fontSize: 32, fontStyle: 'italic', color: 'var(--text)', marginTop: 4 }}>Buenos días, coach.</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-ghost" onClick={() => router.push('/athletes')}><PlusIcon size={14}/>Nuevo atleta</button>
          <button className="btn btn-primary" onClick={() => setShowModal(true)}><CalendarIcon size={14}/>Crear sesión</button>
        </div>
      </div>

      <div style={{ display: 'grid', gap: 14 }}>
        <div className="card" style={{ padding: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.04em' }}>Atletas — vista de hoy</div>
              <div className="muted" style={{ fontSize: 11, marginTop: 3 }}>
                {loading ? 'Cargando...' : `${athletes.length} activos · ${onTrack} en plan · ${missed} ausentes`}
                {!loading && todaySessions.length > 0 && ` · ${sessionsDoneCount} realizadas hoy · ${sessionsPendingCount} pendientes`}
              </div>
            </div>
            <button className="btn btn-ghost btn-sm" onClick={() => router.push('/athletes')} style={{ fontSize: 10 }}>Ver todos</button>
          </div>

          {loading ? (
            <div style={{ padding: '20px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>Cargando...</div>
          ) : athletes.length === 0 ? (
            <div style={{ padding: '20px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
              Aún no hay atletas. <button onClick={() => router.push('/athletes')} style={{ color: 'var(--vitta-blue)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, fontFamily: 'inherit' }}>Crea el primero →</button>
            </div>
          ) : (
            <div className="admin-table-scroll"><table className="vtable vtable-athletes-list">
              <thead>
                <tr>
                  <th>Atleta</th><th>Sesiones planificadas</th><th>Sesiones ✓</th><th>Hoy</th><th>RPE 7d</th><th>Estado</th><th></th>
                </tr>
              </thead>
              <tbody>
                {athletes.map(a => {
                  const cat = CATEGORIES[a.focus];
                  const sessionStatus = athleteSessionMap[a.id] ?? 'none';
                  const completedCount = completedCountMap[a.id] ?? 0;
                  const totalCount = totalSessionCountMap[a.id] ?? 0;
                  return (
                    <tr key={a.id} onClick={() => router.push(`/athletes/${a.id}/planner`)} style={{ cursor: 'pointer' }}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{ width: 30, height: 30, borderRadius: 15, background: a.color || cat?.color || 'var(--vitta-navy)', color: '#fff', display: 'grid', placeItems: 'center', fontSize: 11, fontWeight: 700 }}>{a.initials}</div>
                          <div>
                            <div style={{ fontWeight: 600 }}>{a.name}</div>
                            <div className="muted" style={{ fontSize: 10 }}>{a.age}a · {a.weeklyHours}h/sem</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <PlannedSessionsCell total={totalCount} byMonth={totalSessionsByMonthMap[a.id] ?? []}/>
                      </td>
                      <td>
                        {completedCount > 0 ? (
                          <span style={{
                            display: 'inline-flex', alignItems: 'center', gap: 5,
                            padding: '3px 8px', borderRadius: 4,
                            background: '#22c55e18', color: 'var(--green)',
                            fontWeight: 700, fontSize: 11,
                          }}>
                            <svg width="9" height="9" viewBox="0 0 10 10" fill="none">
                              <path d="M1.5 5L4 7.5L8.5 2.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                            {completedCount}
                          </span>
                        ) : (
                          <span className="muted" style={{ fontSize: 11 }}>—</span>
                        )}
                      </td>
                      <td>
                        {sessionStatus === 'completed' ? (
                          <div style={{
                            display: 'inline-flex', alignItems: 'center', gap: 6,
                            padding: '5px 10px', borderRadius: 5,
                            background: 'var(--green)', color: '#fff',
                            fontWeight: 700, fontSize: 11, letterSpacing: '0.04em',
                            boxShadow: '0 0 0 2px #22c55e44',
                          }}>
                            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                              <path d="M1.5 5L4 7.5L8.5 2.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                            Realizada
                          </div>
                        ) : sessionStatus === 'pending' ? (
                          <div style={{
                            display: 'inline-flex', alignItems: 'center', gap: 6,
                            padding: '5px 10px', borderRadius: 5,
                            background: 'var(--amber)', color: '#fff',
                            fontWeight: 700, fontSize: 11, letterSpacing: '0.04em',
                          }}>
                            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                              <circle cx="5" cy="5" r="3.5" stroke="currentColor" strokeWidth="1.6"/>
                            </svg>
                            Pendiente
                          </div>
                        ) : (
                          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Sin sesión</span>
                        )}
                      </td>
                      <td><span className="mono tnum">{a.rpe7}</span></td>
                      <td><StatusPill status={a.status}/></td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <button
                            onClick={e => { e.stopPropagation(); setSelectedAthlete(a); }}
                            title="Ver perfil"
                            style={{
                              background: 'var(--surface-2)', border: '1px solid var(--border)',
                              borderRadius: 6, cursor: 'pointer', padding: '3px 6px',
                              color: 'var(--text-muted)', display: 'grid', placeItems: 'center',
                              lineHeight: 0,
                            }}
                          >
                            <UserIcon size={13}/>
                          </button>
                          <ChevronRight size={14} stroke="var(--text-muted)"/>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table></div>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 12 }}>
          <div className="card" style={{ padding: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4, gap: 8 }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.04em' }}>Estado de sesiones por mes</div>
                <div className="muted" style={{ fontSize: 11, marginTop: 2 }}>Últimos 6 meses · click en una barra para ver los días</div>
              </div>
              <select
                value={monthlyAthleteFilter}
                onChange={e => setMonthlyAthleteFilter(e.target.value)}
                style={{
                  fontSize: 11, fontWeight: 600, padding: '5px 8px', borderRadius: 6,
                  border: '1px solid var(--border)', background: 'var(--surface-2)',
                  color: 'var(--text)', fontFamily: 'inherit', cursor: 'pointer', flexShrink: 0,
                }}
              >
                <option value="all">Todos los atletas</option>
                {athletes.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>
            <MonthlySessionsChart data={monthlySessions} loading={monthlyLoading}/>
          </div>

          <div className="card" style={{ padding: 14 }}>
            <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.04em', marginBottom: 10 }}>Sesiones ✓ por atleta</div>
            {loading ? (
              <div style={{ padding: '20px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>Cargando...</div>
            ) : athletes.length === 0 ? (
              <div style={{ padding: '20px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>Sin datos aún.</div>
            ) : (
              <div style={{ display: 'grid', gap: 6 }}>
                {[...athletes]
                  .sort((a, b) => (completedCountMap[b.id] ?? 0) - (completedCountMap[a.id] ?? 0))
                  .slice(0, 6)
                  .map(a => {
                    const count = completedCountMap[a.id] ?? 0;
                    const max = Math.max(...athletes.map(x => completedCountMap[x.id] ?? 0), 1);
                    return (
                      <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 11, fontWeight: 600, width: 84, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flexShrink: 0 }}>{a.name}</span>
                        <div style={{ flex: 1, height: 8, borderRadius: 4, background: 'var(--surface-2)', overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${(count / max) * 100}%`, background: 'var(--vitta-blue)', borderRadius: 4 }}/>
                        </div>
                        <span className="mono tnum" style={{ fontSize: 11, fontWeight: 700, width: 20, textAlign: 'right', flexShrink: 0 }}>{count}</span>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
