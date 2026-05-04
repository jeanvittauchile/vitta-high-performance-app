'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import { CATEGORIES } from '@/lib/constants';
import { getCategoryIcon, PlusIcon, CalendarIcon, FlameIcon, TrendIcon, SparkleIcon, ChevronRight } from '@/components/icons';
import StatusPill from '@/components/badges/StatusPill';
import CreateSessionModal from '@/components/admin/CreateSessionModal';
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
  const [todaySessions, setTodaySessions] = useState<{ id: string; title: string; duration: number; athlete_name: string }[]>([]);

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
      .select('id, title, duration, athletes(name)')
      .eq('date', today)
      .order('created_at');
    if (data) {
      setTodaySessions(data.map((s: any) => ({
        id: s.id,
        title: s.title,
        duration: s.duration,
        athlete_name: s.athletes?.name || '—',
      })));
    }
  }, []);

  useEffect(() => {
    fetchAthletes();
    fetchTodaySessions();
  }, [fetchAthletes, fetchTodaySessions]);

  const peak    = athletes.filter(a => a.status === 'peak').length;
  const onTrack = athletes.filter(a => a.status === 'on-track').length;
  const missed  = athletes.filter(a => a.status === 'missed').length;

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
                  <th>Atleta</th><th>Foco principal</th><th>Adherencia</th><th>RPE 7d</th><th>Estado</th><th></th>
                </tr>
              </thead>
              <tbody>
                {athletes.map(a => {
                  const cat = CATEGORIES[a.focus];
                  const CatIcon = getCategoryIcon(a.focus);
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
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ width: 70, height: 6, borderRadius: 3, background: 'var(--border)', overflow: 'hidden' }}>
                            <div style={{ width: `${a.adherence}%`, height: '100%', background: a.adherence >= 85 ? 'var(--green)' : a.adherence >= 70 ? 'var(--amber)' : 'var(--red)' }}/>
                          </div>
                          <span className="mono tnum" style={{ fontSize: 11 }}>{a.adherence}%</span>
                        </div>
                      </td>
                      <td><span className="mono tnum">{a.rpe7}</span></td>
                      <td><StatusPill status={a.status}/></td>
                      <td><ChevronRight size={14} stroke="var(--text-muted)"/></td>
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div style={{ fontSize: 12, fontWeight: 700 }}>Sesiones de hoy</div>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowModal(true)} style={{ fontSize: 10 }}>+ Crear</button>
            </div>
            {todaySessions.length === 0 ? (
              <div style={{ padding: '20px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                No hay sesiones planificadas para hoy.
              </div>
            ) : (
              <div style={{ display: 'grid', gap: 6 }}>
                {todaySessions.map(s => (
                  <div key={s.id} style={{ padding: '8px 10px', borderRadius: 8, background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                    <div style={{ fontSize: 12, fontWeight: 600 }}>{s.title}</div>
                    <div className="muted" style={{ fontSize: 11, marginTop: 2 }}>{s.athlete_name} · {s.duration} min</div>
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
