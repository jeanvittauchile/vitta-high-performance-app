'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import { CATEGORIES } from '@/lib/constants';
import { getCategoryIcon, PlusIcon, CalendarIcon, FlameIcon, TrendIcon, SparkleIcon, ChevronRight, UserIcon } from '@/components/icons';
import StatusPill from '@/components/badges/StatusPill';
import CreateSessionModal from '@/components/admin/CreateSessionModal';
import AthleteProfileDrawer from '@/components/admin/AthleteProfileDrawer';
import type { Athlete } from '@/lib/types';

const KPI = ({ label, value, sub, accent }: { label: string; value: string | number; sub: string; accent: string }) => (
  <div className="card" style={{ padding: '14px 16px', borderTop: `2px solid ${accent}` }}>
    <div className="muted" style={{ fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 700 }}>{label}</div>
    <div className="display tnum" style={{ fontSize: 30, color: 'var(--text)', marginTop: 2 }}>{value}</div>
    <div className="muted" style={{ fontSize: 11, marginTop: 2 }}>{sub}</div>
  </div>
);

const Alert = ({ icon, color, title, sub }: { icon: React.ReactNode; color: string; title: string; sub: string }) => (
  <div style={{
    display: 'grid', gridTemplateColumns: '24px 1fr', gap: 10, padding: '8px 10px',
    borderRadius: 8, background: 'var(--surface-2)', borderLeft: `2px solid ${color}`,
  }}>
    <div style={{ color, marginTop: 2 }}>{icon}</div>
    <div>
      <div style={{ fontSize: 12, fontWeight: 600 }}>{title}</div>
      <div className="muted" style={{ fontSize: 11, marginTop: 1 }}>{sub}</div>
    </div>
  </div>
);

export default function DashboardPage() {
  const router = useRouter();
  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [todaySessions, setTodaySessions] = useState<{ id: string; title: string; duration: number; athlete_id: string; athlete_name: string; completed: boolean }[]>([]);
  const [selectedAthlete, setSelectedAthlete] = useState<Athlete | null>(null);

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

  const fetchTodaySessions = useCallback(async () => {
    const supabase = createClient();
    const today = new Date().toISOString().slice(0, 10);
    const { data } = await supabase
      .from('sessions')
      .select('id, title, duration, athlete_id, athletes(name), session_feedback(id)')
      .eq('date', today)
      .order('created_at');
    if (data) {
      setTodaySessions(data.map((s: any) => ({
        id: s.id,
        title: s.title,
        duration: s.duration,
        athlete_id: s.athlete_id,
        athlete_name: s.athletes?.name || '—',
        completed: Array.isArray(s.session_feedback) && s.session_feedback.length > 0,
      })));
    }
  }, []);

  useEffect(() => {
    fetchAthletes();
    fetchTodaySessions();
  }, [fetchAthletes, fetchTodaySessions]);

  useEffect(() => {
    const supabase = createClient();
    const ch = supabase
      .channel('dashboard-session-feedback')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'session_feedback' }, () => {
        fetchTodaySessions();
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [fetchTodaySessions]);

  const peak    = athletes.filter(a => a.status === 'peak').length;
  const onTrack = athletes.filter(a => a.status === 'on-track').length;
  const missed  = athletes.filter(a => a.status === 'missed').length;

  const athleteSessionMap = Object.fromEntries(todaySessions.map(s => [s.athlete_id, s.completed ? 'completed' : 'pending'])) as Record<string, 'completed' | 'pending'>;
  const sessionsDoneCount = todaySessions.filter(s => s.completed).length;
  const sessionsPendingCount = todaySessions.filter(s => !s.completed).length;

  const today = new Date().toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div style={{ padding: '24px 28px 36px' }}>
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

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 20 }}>
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

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
        <KPI label="Atletas activos"       value={loading ? '...' : athletes.length} sub={`${onTrack} en plan, ${missed} ausentes`} accent="var(--vitta-navy)"/>
        <KPI label="En pico"               value={loading ? '...' : peak}   sub="Esta semana"  accent="var(--vitta-blue)"/>
        <KPI label="Adherencia 7d"         value="—"   sub="Sin datos aún"  accent="var(--green)"/>
        <KPI label="Sesiones hoy"          value={loading ? '...' : todaySessions.length} sub="Planificadas para hoy" accent="var(--amber)"/>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 14 }}>
        <div className="card" style={{ padding: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.04em' }}>Atletas — vista de hoy</div>
            <button className="btn btn-ghost btn-sm" onClick={() => router.push('/athletes')} style={{ fontSize: 10 }}>Ver todos</button>
          </div>

          {loading ? (
            <div style={{ padding: '20px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>Cargando...</div>
          ) : athletes.length === 0 ? (
            <div style={{ padding: '20px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
              Aún no hay atletas. <button onClick={() => router.push('/athletes')} style={{ color: 'var(--vitta-blue)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, fontFamily: 'inherit' }}>Crea el primero →</button>
            </div>
          ) : (
            <table className="vtable">
              <thead>
                <tr>
                  <th>Atleta</th><th>Foco principal</th><th>Adherencia · Hoy</th><th>RPE 7d</th><th>Estado</th><th></th>
                </tr>
              </thead>
              <tbody>
                {athletes.map(a => {
                  const cat = CATEGORIES[a.focus];
                  const CatIcon = getCategoryIcon(a.focus);
                  const sessionStatus = athleteSessionMap[a.id] ?? 'none';
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
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{ width: 70, height: 6, borderRadius: 3, background: 'var(--border)', overflow: 'hidden' }}>
                              <div style={{ width: `${a.adherence}%`, height: '100%', background: a.adherence >= 85 ? 'var(--green)' : a.adherence >= 70 ? 'var(--amber)' : 'var(--red)' }}/>
                            </div>
                            <span className="mono tnum" style={{ fontSize: 11 }}>{a.adherence}%</span>
                          </div>
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
            </table>
          )}
        </div>

        <div style={{ display: 'grid', gap: 12 }}>
          <div className="card" style={{ padding: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div style={{ fontSize: 12, fontWeight: 700 }}>Alertas</div>
              <button className="btn btn-ghost btn-sm" style={{ fontSize: 10 }}>Ver todas</button>
            </div>
            <div style={{ display: 'grid', gap: 8 }}>
              <Alert icon={<FlameIcon size={14}/>}   color="var(--red)"   title="Sin alertas críticas" sub="Todo en orden por ahora"/>
              <Alert icon={<TrendIcon size={14}/>}   color="var(--amber)" title="Adherencia pendiente"  sub="Agrega sesiones para ver datos"/>
              <Alert icon={<SparkleIcon size={14}/>} color="var(--green)" title="Sistema listo"         sub="Crea atletas y planifica sesiones"/>
            </div>
          </div>

          <div className="card" style={{ padding: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <div style={{ fontSize: 12, fontWeight: 700 }}>Sesiones de hoy</div>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowModal(true)} style={{ fontSize: 10 }}>+ Crear</button>
            </div>
            {todaySessions.length > 0 && (
              <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
                <span style={{ fontSize: 11, padding: '3px 8px', borderRadius: 4, background: '#22c55e18', color: 'var(--green)', fontWeight: 700 }}>
                  ✓ {sessionsDoneCount} realizadas
                </span>
                <span style={{ fontSize: 11, padding: '3px 8px', borderRadius: 4, background: '#f59e0b18', color: 'var(--amber)', fontWeight: 700 }}>
                  ○ {sessionsPendingCount} pendientes
                </span>
              </div>
            )}
            {todaySessions.length === 0 ? (
              <div style={{ padding: '20px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                No hay sesiones planificadas para hoy.
              </div>
            ) : (
              <div style={{ display: 'grid', gap: 6 }}>
                {todaySessions.map(s => (
                  <div key={s.id} style={{
                    padding: '8px 10px', borderRadius: 8,
                    background: s.completed ? '#22c55e08' : 'var(--surface-2)',
                    border: `1px solid ${s.completed ? '#22c55e33' : 'var(--border)'}`,
                    display: 'flex', alignItems: 'center', gap: 10,
                  }}>
                    <div style={{
                      width: 20, height: 20, borderRadius: 10, flexShrink: 0,
                      background: s.completed ? 'var(--green)' : 'var(--border)',
                      display: 'grid', placeItems: 'center',
                    }}>
                      {s.completed ? (
                        <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                          <path d="M1.5 5L4 7.5L8.5 2.5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      ) : (
                        <div style={{ width: 6, height: 6, borderRadius: 3, background: 'var(--text-muted)', opacity: 0.4 }}/>
                      )}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 12, fontWeight: 600 }}>{s.title}</div>
                      <div className="muted" style={{ fontSize: 11, marginTop: 1 }}>{s.athlete_name} · {s.duration} min</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
