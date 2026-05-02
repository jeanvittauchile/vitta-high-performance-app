'use client';
import { useState } from 'react';
import { use } from 'react';
import { ATHLETES, CATEGORIES, EXERCISES, MONTH_PLAN, DAY_TYPES, TODAY_SESSION } from '@/lib/constants';
import { getCategoryIcon, PlusIcon, CopyIcon, LayersIcon, ChevronLeft, ChevronRight, SparkleIcon } from '@/components/icons';
import LevelBadge from '@/components/badges/LevelBadge';

export default function PlannerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const athlete = ATHLETES.find(a => a.id === id) || ATHLETES[1];
  const [selectedDay, setSelectedDay] = useState({ w: 2, d: 2 });
  const focusCat = CATEGORIES[athlete.focus] || CATEGORIES.empuje;
  const FocusIcon = getCategoryIcon(athlete.focus);

  const suggestedExercises = EXERCISES.filter(e => e.category === athlete.focus).slice(0, 5);
  const complementary = ['movilidad', 'preventivos', 'zona_media']
    .filter(c => c !== athlete.focus)
    .map(c => CATEGORIES[c]);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', height: '100vh' }}>
      {/* Main area */}
      <div className="thin-scroll" style={{ overflow: 'auto', padding: '20px 24px 28px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 44, height: 44, borderRadius: 22, background: focusCat.color, color: '#fff', display: 'grid', placeItems: 'center', fontSize: 14, fontWeight: 700 }}>{athlete.initials}</div>
            <div>
              <div style={{ fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700 }}>Atleta · Plan mensual</div>
              <div style={{ fontSize: 20, fontWeight: 700 }}>{athlete.name}</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button className="btn btn-ghost"><CopyIcon size={13}/>Duplicar mes anterior</button>
            <button className="btn btn-ghost"><LayersIcon size={13}/>Aplicar plantilla</button>
            <button className="btn btn-primary"><PlusIcon size={13}/>Añadir sesión</button>
          </div>
        </div>

        {/* Mesociclo */}
        <div className="card" style={{ padding: 16, marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div>
              <div style={{ fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700 }}>Mesociclo</div>
              <div style={{ fontSize: 16, fontWeight: 600, marginTop: 2 }}>Mayo 2026 · 4 semanas · Acumulación → Intensificación → Descarga</div>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <button className="btn btn-ghost btn-sm"><ChevronLeft size={12}/></button>
              <button className="btn btn-ghost btn-sm">Hoy</button>
              <button className="btn btn-ghost btn-sm"><ChevronRight size={12}/></button>
            </div>
          </div>

          {/* Phase bar */}
          <div>
            <div style={{ display: 'flex', gap: 4 }}>
              {['Acumulación','Acumulación','Intensificación','Descarga'].map((p, i) => (
                <div key={i} style={{ flex: 1, height: 8, borderRadius: 4, background: i === 3 ? 'var(--text-muted)' : i === 2 ? 'var(--amber)' : 'var(--vitta-blue)', opacity: i === 2 ? 1 : 0.4 }}/>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 4, marginTop: 6 }}>
              {['Acumulación','Acumulación','Intensificación','Descarga'].map((p, i) => (
                <div key={i} style={{ flex: 1, fontSize: 10, fontWeight: 600, color: i === 2 ? 'var(--text)' : 'var(--text-muted)' }}>{p}</div>
              ))}
            </div>
          </div>

          {/* Calendar */}
          <div style={{ display: 'grid', gridTemplateColumns: '60px repeat(7, 1fr)', gap: 4, marginTop: 16 }}>
            <div/>
            {['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'].map(d => (
              <div key={d} style={{ fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 700, color: 'var(--text-muted)', textAlign: 'center', padding: '4px 0' }}>{d}</div>
            ))}
            {MONTH_PLAN.map((week, wi) => (
              <>
                <div key={`s${wi}`} style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: 2 }}>
                  <div className="display" style={{ fontSize: 16 }}>S{wi+1}</div>
                  {wi === 3 && <div style={{ fontSize: 8, color: 'var(--text-muted)', letterSpacing: '0.08em' }}>DELOAD</div>}
                </div>
                {week.map((d, di) => {
                  const t = DAY_TYPES[d] || DAY_TYPES.REST;
                  const isSelected = wi === selectedDay.w && di === selectedDay.d;
                  const isToday = wi === 2 && di === 2;
                  return (
                    <button key={`${wi}-${di}`} onClick={() => setSelectedDay({ w: wi, d: di })} style={{
                      padding: '10px 8px', borderRadius: 8, minHeight: 78,
                      background: d === 'REST' ? 'var(--surface-2)' : t.bg,
                      border: isSelected ? `2px solid ${t.color}` : `1px solid ${isToday ? t.color : 'var(--border)'}`,
                      cursor: 'pointer', textAlign: 'left',
                      display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
                      gap: 4, fontFamily: 'inherit',
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span className="mono" style={{ fontSize: 10, fontWeight: 700, color: isToday ? t.color : 'var(--text-muted)' }}>{wi*7 + di + 4}</span>
                        {isToday && <span style={{ fontSize: 8, fontWeight: 700, color: t.color, letterSpacing: '0.08em' }}>HOY</span>}
                      </div>
                      <div>
                        <div style={{ fontSize: 11, fontWeight: 600, color: d === 'REST' ? 'var(--text-muted)' : t.color, lineHeight: 1.15 }}>{t.label}</div>
                        {d !== 'REST' && d !== 'DELOAD' && (
                          <div className="mono" style={{ fontSize: 9, color: 'var(--text-muted)', marginTop: 3 }}>~75&apos;</div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </>
            ))}
          </div>
        </div>

        {/* Day editor */}
        <div className="card" style={{ padding: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div>
              <div style={{ fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700 }}>Editor de sesión · Miércoles 20 mayo</div>
              <div style={{ fontSize: 16, fontWeight: 600, marginTop: 2 }}>{TODAY_SESSION.title}</div>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <button className="btn btn-ghost btn-sm">Vista atleta</button>
              <button className="btn btn-primary btn-sm">Guardar</button>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 16 }}>
            {[
              { label: 'Duración',    value: '75 min' },
              { label: 'RPE objetivo',value: '7.5'    },
              { label: 'Bloque',      value: 'Mes 2 · S3' },
              { label: 'Categorías',  value: (
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                  <span className="catpill" style={{ background: 'rgba(215,71,75,0.14)', color: '#D7474B' }}>EMPUJE</span>
                  <span className="catpill" style={{ background: 'rgba(232,163,58,0.14)', color: '#E8A33A' }}>ZONA MEDIA</span>
                </div>
              )},
            ].map(f => (
              <div key={f.label} style={{ background: 'var(--surface-2)', borderRadius: 8, padding: '8px 10px', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: 9, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700 }}>{f.label}</div>
                <div style={{ fontSize: 13, fontWeight: 600, marginTop: 3 }}>{f.value}</div>
              </div>
            ))}
          </div>

          <div style={{ display: 'grid', gap: 10 }}>
            {TODAY_SESSION.blocks.map((block, bi) => {
              const Ic = getCategoryIcon(block.category);
              return (
                <div key={block.id} style={{ background: 'var(--surface-2)', borderRadius: 10, padding: 12, border: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 26, height: 26, borderRadius: 6, background: `${block.color}22`, color: block.color, display: 'grid', placeItems: 'center' }}>
                        <Ic size={13} stroke="currentColor"/>
                      </div>
                      <div>
                        <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.08em' }}>BLOQUE {String.fromCharCode(65+bi)}</span>
                        <span style={{ fontSize: 13, fontWeight: 600, marginLeft: 6 }}>{block.name}</span>
                      </div>
                    </div>
                    <button className="btn btn-ghost btn-sm"><PlusIcon size={11}/>Añadir ejercicio</button>
                  </div>

                  <div style={{ display: 'grid', gap: 6 }}>
                    {block.items.map((item, idx) => (
                      <div key={item.id} style={{
                        display: 'grid', gridTemplateColumns: '20px 1.6fr 90px 70px 100px 70px 22px',
                        gap: 8, alignItems: 'center',
                        padding: '8px 10px', background: 'white', borderRadius: 6, border: '1px solid var(--border)',
                        fontSize: 12,
                      }}>
                        <span className="mono" style={{ fontSize: 10, color: 'var(--text-muted)' }}>{String.fromCharCode(65+bi)}{idx+1}</span>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                            <div style={{ fontWeight: 600 }}>{item.name}</div>
                            <LevelBadge level={item.level} size="sm"/>
                          </div>
                          {item.note && <div className="muted" style={{ fontSize: 10, marginTop: 2 }}>{item.note}</div>}
                        </div>
                        <div className="mono tnum">{item.sets.length} × {item.sets[0].r}</div>
                        <div className="mono tnum">@ {typeof item.sets[0].l === 'number' ? `${item.sets[0].l}kg` : item.sets[0].l}</div>
                        <div className="mono tnum" style={{ color: item.sets[0].rpe ? 'var(--amber)' : 'var(--text-muted)' }}>
                          {item.sets[0].rpe ? `RPE ${item.sets[0].rpe}` : '—'}
                        </div>
                        <div className="mono tnum muted">desc {item.sets[0].rest}</div>
                        <button style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 2 }}>···</button>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Suggestion panel */}
      <div style={{ background: 'var(--surface)', borderLeft: '1px solid var(--border)', padding: '20px 18px', overflow: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: `${focusCat.color}1f`, color: focusCat.color, display: 'grid', placeItems: 'center' }}>
            <FocusIcon size={18} stroke="currentColor"/>
          </div>
          <div>
            <div style={{ fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700 }}>Foco principal</div>
            <div style={{ fontSize: 14, fontWeight: 700 }}>{focusCat.label}</div>
          </div>
        </div>

        <div className="card" style={{ padding: 12, marginBottom: 12, background: 'var(--surface-2)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
            <SparkleIcon size={13} stroke="var(--vitta-blue)"/>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--vitta-blue)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Sugerencias del coach IA</div>
          </div>
          <div style={{ fontSize: 12, color: 'var(--text)', lineHeight: 1.45 }}>
            Para <b>{athlete.name.split(' ')[0]}</b> esta semana, prioriza ejercicios de <b>{focusCat.label}</b> en intensidad media-alta (RPE 7-8). Mantén volumen de movilidad y preventivos diariamente.
          </div>
        </div>

        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 8 }}>
          Ejercicios sugeridos · {focusCat.label}
        </div>
        <div style={{ display: 'grid', gap: 6, marginBottom: 16 }}>
          {suggestedExercises.map(ex => (
            <div key={ex.id} style={{ padding: '8px 10px', borderRadius: 8, background: 'white', border: '1px solid var(--border)', display: 'grid', gridTemplateColumns: '1fr auto', gap: 8, alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 600 }}>{ex.name}</div>
                <div style={{ display: 'flex', gap: 5, alignItems: 'center', marginTop: 4 }}>
                  <LevelBadge level={ex.level} size="sm"/>
                  <span className="muted" style={{ fontSize: 10 }}>{ex.muscle}</span>
                </div>
              </div>
              <button className="btn btn-ghost btn-sm"><PlusIcon size={11}/></button>
            </div>
          ))}
        </div>

        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 8 }}>Categorías complementarias</div>
        <div style={{ display: 'grid', gap: 6 }}>
          {complementary.map(c => {
            if (!c) return null;
            const CIc = getCategoryIcon(c.id);
            return (
              <div key={c.id} style={{ padding: '8px 10px', borderRadius: 8, background: 'white', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 24, height: 24, borderRadius: 6, background: `${c.color}1f`, color: c.color, display: 'grid', placeItems: 'center' }}>
                  <CIc size={12} stroke="currentColor"/>
                </div>
                <span style={{ fontSize: 12, fontWeight: 600 }}>{c.label}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
