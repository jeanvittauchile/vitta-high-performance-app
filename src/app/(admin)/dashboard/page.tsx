'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import { CATEGORIES } from '@/lib/constants';
import { getCategoryIcon, PlusIcon, CalendarIcon, ChevronRight, UserIcon } from '@/components/icons';
import StatusPill from '@/components/badges/StatusPill';
import CreateSessionModal from '@/components/admin/CreateSessionModal';
import AthleteProfileDrawer from '@/components/admin/AthleteProfileDrawer';
import type { Athlete } from '@/lib/types';

const MONTH_SHORT = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

interface MonthlyCount { key: string; label: string; count: number; }

function MonthlySessionsChart({ data, loading }: { data: MonthlyCount[]; loading: boolean }) {
  if (loading) {
    return <div style={{ padding: '30px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>Cargando...</div>;
  }
  const total = data.reduce((s, d) => s + d.count, 0);
  if (total === 0) {
    return (
      <div style={{ padding: '30px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
        Aún no hay sesiones completadas registradas.
      </div>
    );
  }
  const max = Math.max(...data.map(d => d.count), 1);
  const CHART_H = 96;
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: CHART_H + 34, padding: '4px 2px 0' }}>
      {data.map(d => {
        const barH = d.count === 0 ? 0 : Math.max(3, (d.count / max) * CHART_H);
        return (
          <div key={d.key} title={`${d.label}: ${d.count} sesión${d.count === 1 ? '' : 'es'} completada${d.count === 1 ? '' : 's'}`}
            style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
            <div style={{ height: CHART_H, display: 'flex', alignItems: 'flex-end', width: '100%', justifyContent: 'center' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                <span className="mono tnum" style={{ fontSize: 10, fontWeight: 700, color: d.count > 0 ? 'var(--text)' : 'var(--text-faint)' }}>{d.count}</span>
                <div className="chart-bar" style={{
                  width: 22, maxWidth: '100%', height: barH,
                  background: 'var(--vitta-blue)', borderRadius: '4px 4px 0 0',
                  transition: 'filter 0.1s',
                }}/>
              </div>
            </div>
            <span style={{ fontSize: 9, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{d.label}</span>
          </div>
        );
      })}
    </div>
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
  const [monthlySessions, setMonthlySessions] = useState<MonthlyCount[]>([]);
  const [monthlyLoading, setMonthlyLoading] = useState(true);

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
      .select('date, session_feedback!inner(id)')
      .gte('date', `${months[0].key}-01`);
    const counts: Record<string, number> = {};
    (data || []).forEach((s: any) => { counts[s.date.slice(0, 7)] = (counts[s.date.slice(0, 7)] || 0) + 1; });
    setMonthlySessions(months.map(m => ({ ...m, count: counts[m.key] || 0 })));
    setMonthlyLoading(false);
  }, []);

  useEffect(() => {
    fetchAthletes();
    fetchTodaySessions();
    fetchCompletedSessionCounts();
    fetchMonthlySessions();
  }, [fetchAthletes, fetchTodaySessions, fetchCompletedSessionCounts, fetchMonthlySessions]);

  useEffect(() => {
    const supabase = createClient();
    const ch = supabase
      .channel('dashboard-session-feedback')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'session_feedback' }, () => {
        fetchTodaySessions();
        fetchCompletedSessionCounts();
        fetchMonthlySessions();
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [fetchTodaySessions, fetchCompletedSessionCounts, fetchMonthlySessions]);

  const onTrack = athletes.filter(a => a.status === 'on-track').length;
  const missed  = athletes.filter(a => a.status === 'missed').length;

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

      <div className="admin-main-grid">
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
                  <th>Atleta</th><th>Foco principal</th><th>Sesiones ✓</th><th>Hoy</th><th>RPE 7d</th><th>Estado</th><th></th>
                </tr>
              </thead>
              <tbody>
                {athletes.map(a => {
                  const cat = CATEGORIES[a.focus];
                  const CatIcon = getCategoryIcon(a.focus);
                  const sessionStatus = athleteSessionMap[a.id] ?? 'none';
                  const completedCount = completedCountMap[a.id] ?? 0;
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
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '3px 8px', borderRadius: 4, background: `${cat?.color}18`, color: cat?.color }}>
                          <CatIcon size={11} stroke="currentColor"/>
                          <span style={{ fontSize: 11, fontWeight: 600 }}>{cat?.label}</span>
                        </span>
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

        <div style={{ display: 'grid', gap: 12 }}>
          <div className="card" style={{ padding: 14 }}>
            <div style={{ marginBottom: 4 }}>
              <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.04em' }}>Sesiones completadas por mes</div>
              <div className="muted" style={{ fontSize: 11, marginTop: 2 }}>Últimos 6 meses · todos los atletas</div>
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
