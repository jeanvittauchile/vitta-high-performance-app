'use client';
import { useRouter } from 'next/navigation';
import { ATHLETES, CATEGORIES } from '@/lib/constants';
import { getCategoryIcon, PlusIcon, CalendarIcon, FlameIcon, TrendIcon, SparkleIcon, ChevronRight } from '@/components/icons';
import StatusPill from '@/components/badges/StatusPill';

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
  const peak    = ATHLETES.filter(a => a.status === 'peak').length;

  const todaySessions = [
    { t: '06:30', n: 'Camila R.',    c: 'aerobicos'          },
    { t: '08:00', n: 'Mateo H.',     c: 'envion'             },
    { t: '10:30', n: 'Lucía M.',     c: 'aerobicos'          },
    { t: '14:00', n: 'Diego S.',     c: 'preventivos'        },
    { t: '16:30', n: 'Ana V.',       c: 'movilidad'          },
    { t: '18:00', n: 'Valentina P.', c: 'coordinacion'       },
    { t: '19:30', n: 'Nicolás V.',   c: 'arranque'           },
  ];

  return (
    <div style={{ padding: '24px 28px 36px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 700, color: 'var(--text-muted)' }}>
            Lunes 18 mayo · 2026
          </div>
          <div className="display" style={{ fontSize: 32, fontStyle: 'italic', color: 'var(--text)', marginTop: 4 }}>Buenos días, coach.</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-ghost"><PlusIcon size={14}/>Nuevo atleta</button>
          <button className="btn btn-primary"><CalendarIcon size={14}/>Crear sesión</button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
        <KPI label="Atletas activos"    value={ATHLETES.length} sub={`${ATHLETES.filter(a=>a.status==='on-track').length} en plan, ${ATHLETES.filter(a=>a.status==='missed').length} ausentes`} accent="var(--vitta-navy)"/>
        <KPI label="En pico"            value={peak}  sub="Esta semana"  accent="var(--vitta-blue)"/>
        <KPI label="Adherencia 7d"      value="87%"   sub="+3% vs prev"  accent="var(--green)"/>
        <KPI label="Sesiones planificadas" value="42" sub="hoy · 8"      accent="var(--amber)"/>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 14 }}>
        <div className="card" style={{ padding: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.04em' }}>Atletas — vista de hoy</div>
            <button className="btn btn-ghost btn-sm" style={{ fontSize: 10 }}>Ver todos</button>
          </div>
          <table className="vtable">
            <thead>
              <tr>
                <th>Atleta</th><th>Foco principal</th><th>Adherencia</th><th>RPE 7d</th><th>Estado</th><th></th>
              </tr>
            </thead>
            <tbody>
              {ATHLETES.map(a => {
                const cat = CATEGORIES[a.focus];
                const CatIcon = getCategoryIcon(a.focus);
                return (
                  <tr key={a.id} onClick={() => router.push(`/athletes/${a.id}/planner`)} style={{ cursor: 'pointer' }}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 30, height: 30, borderRadius: 15, background: cat?.color || 'var(--vitta-navy)', color: '#fff', display: 'grid', placeItems: 'center', fontSize: 11, fontWeight: 700 }}>{a.initials}</div>
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
        </div>

        <div style={{ display: 'grid', gap: 12 }}>
          <div className="card" style={{ padding: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div style={{ fontSize: 12, fontWeight: 700 }}>Alertas</div>
              <button className="btn btn-ghost btn-sm" style={{ fontSize: 10 }}>Ver todas</button>
            </div>
            <div style={{ display: 'grid', gap: 8 }}>
              <Alert icon={<FlameIcon size={14}/>} color="var(--red)"   title="Tomás Ríos · 3 sesiones consecutivas perdidas" sub="Última actividad hace 6 días"/>
              <Alert icon={<TrendIcon size={14}/>} color="var(--amber)" title="Diego Salinas · RPE en descenso"               sub="-1.2 vs media · sugerir descarga"/>
              <Alert icon={<SparkleIcon size={14}/>} color="var(--green)" title="Mateo Herrera · Test de power clean cumplido" sub="Nuevo PR sugerido · 100kg"/>
            </div>
          </div>

          <div className="card" style={{ padding: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div style={{ fontSize: 12, fontWeight: 700 }}>Sesiones de hoy</div>
              <button className="btn btn-ghost btn-sm" style={{ fontSize: 10 }}>Calendario</button>
            </div>
            <div style={{ display: 'grid', gap: 6 }}>
              {todaySessions.map((s, i) => {
                const cat = CATEGORIES[s.c];
                const Ic = getCategoryIcon(s.c);
                return (
                  <div key={i} style={{ display: 'grid', gridTemplateColumns: '44px 1fr 18px', gap: 8, alignItems: 'center', padding: '6px 8px', borderRadius: 6, background: 'var(--surface-2)' }}>
                    <span className="mono" style={{ fontSize: 11, fontWeight: 700 }}>{s.t}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ width: 6, height: 6, borderRadius: 3, background: cat?.color }}/>
                      <span style={{ fontSize: 12, fontWeight: 500 }}>{s.n}</span>
                      <Ic size={12} stroke={cat?.color}/>
                    </div>
                    <ChevronRight size={12} stroke="var(--text-muted)"/>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
