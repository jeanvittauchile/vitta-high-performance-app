'use client';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase';
import { computeExerciseBests, type BestEntry } from '@/lib/exercise-bests';
import { ChevronLeft, TrendIcon } from '@/components/icons';

const RANK_COLORS = ['#F5A623', '#9098AE', '#CD7F32'];

function fmtLoad(v: number): string {
  return v % 1 === 0 ? String(v) : v.toFixed(1);
}

export default function AthleteProgress() {
  const pathname = usePathname();
  const athleteId = pathname.split('/athletes/')[1]?.split('/')[0] ?? '';

  const [athleteName, setAthleteName] = useState('');
  const [bests, setBests] = useState<BestEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!athleteId) { setLoading(false); return; }
    const supabase = createClient();

    Promise.all([
      supabase.from('athletes').select('name').eq('id', athleteId).maybeSingle(),
      supabase
        .from('sessions')
        .select(`
          session_blocks (
            session_exercises (
              name,
              sets ( done, actual_reps, actual_load )
            )
          )
        `)
        .eq('athlete_id', athleteId),
    ]).then(([{ data: ath }, { data: sessions }]) => {
      if (ath) setAthleteName(ath.name);
      setBests(computeExerciseBests(sessions ?? []));
      setLoading(false);
    });
  }, [athleteId]);

  return (
    <div style={{ minHeight: '100vh', background: '#0E1936' }}>
      {/* Admin bar */}
      <div style={{ background: 'rgba(46,107,214,0.15)', borderBottom: '1px solid rgba(46,107,214,0.3)', padding: '8px 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <Link href={`/athletes/${athleteId}/planner`} style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'rgba(255,255,255,0.6)', fontSize: 12, textDecoration: 'none' }}>
          <ChevronLeft size={14}/>Volver al planificador
        </Link>
        <span style={{ color: 'rgba(255,255,255,0.2)' }}>·</span>
        <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>Progreso del atleta</span>
        <span style={{ fontSize: 11, color: 'rgba(46,107,214,0.9)', background: 'rgba(46,107,214,0.15)', padding: '2px 8px', borderRadius: 4, fontWeight: 700, letterSpacing: '0.06em', marginLeft: 4 }}>MODO COACH</span>
        {athleteName && (
          <span style={{ marginLeft: 'auto', fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.7)' }}>{athleteName}</span>
        )}
      </div>

      <div style={{ maxWidth: 540, margin: '0 auto', padding: '20px 16px 48px' }}>
        {/* Section header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
          <TrendIcon size={22} stroke="var(--vitta-blue-bright)"/>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#F4EFE0' }}>Mejores series · Ranking</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>
              1RM estimado · Fórmula de Brzycki · Mejor serie histórica por ejercicio
            </div>
          </div>
        </div>

        {loading ? (
          <div style={{ padding: 48, textAlign: 'center', color: 'rgba(255,255,255,0.4)', fontSize: 13 }}>Calculando...</div>
        ) : bests.length === 0 ? (
          <div style={{ padding: '60px 20px', textAlign: 'center' }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>📊</div>
            <div style={{ fontSize: 16, fontWeight: 600, color: '#F4EFE0', marginBottom: 6 }}>Sin registros aún</div>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', lineHeight: 1.5 }}>
              {athleteName || 'El atleta'} no tiene series completadas con carga y repeticiones registradas (1–10 reps).
            </div>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: 10 }}>
            {bests.map((entry, i) => {
              const rankColor = RANK_COLORS[i] ?? 'rgba(255,255,255,0.35)';
              return (
                <div key={entry.name} style={{
                  background: i < 3 ? `${rankColor}14` : 'rgba(255,255,255,0.03)',
                  border: `1px solid ${i < 3 ? `${rankColor}35` : 'rgba(255,255,255,0.08)'}`,
                  borderRadius: 14, padding: '14px 16px',
                }}>
                  {/* Row: rank + name + best set */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                    <div style={{
                      width: 28, height: 28, borderRadius: 14, flexShrink: 0,
                      background: i < 3 ? rankColor : 'rgba(255,255,255,0.12)',
                      color: i < 3 ? '#0E1936' : 'rgba(255,255,255,0.5)',
                      display: 'grid', placeItems: 'center',
                      fontSize: 12, fontWeight: 800,
                    }}>
                      {i + 1}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: '#F4EFE0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {entry.name}
                      </div>
                      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', marginTop: 2 }}>
                        Mejor serie registrada
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div className="mono" style={{ fontSize: 16, fontWeight: 800, color: rankColor }}>
                        {entry.reps} × {fmtLoad(entry.load)} kg
                      </div>
                      <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', marginTop: 1 }}>reps × carga</div>
                    </div>
                  </div>

                  {/* RM chips */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>
                    {[
                      { label: '1 RM', value: entry.rm1, accent: true },
                      { label: '3 RM', value: entry.rm3, accent: false },
                      { label: '6 RM', value: entry.rm6, accent: false },
                    ].map(rm => (
                      <div key={rm.label} style={{
                        background: rm.accent ? 'rgba(46,107,214,0.18)' : 'rgba(255,255,255,0.05)',
                        border: `1px solid ${rm.accent ? 'rgba(46,107,214,0.35)' : 'rgba(255,255,255,0.08)'}`,
                        borderRadius: 10, padding: '8px 10px', textAlign: 'center',
                      }}>
                        <div style={{ fontSize: 9, color: rm.accent ? 'rgba(74,138,240,0.9)' : 'rgba(255,255,255,0.4)', letterSpacing: '0.1em', fontWeight: 700, textTransform: 'uppercase' }}>
                          {rm.label}
                        </div>
                        <div className="mono tnum" style={{ fontSize: 18, fontWeight: 800, color: rm.accent ? '#4A8AF0' : '#F4EFE0', marginTop: 3, lineHeight: 1 }}>
                          {fmtLoad(rm.value)}
                        </div>
                        <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>kg</div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {bests.length > 0 && (
          <div style={{ marginTop: 16, padding: '10px 14px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 10 }}>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', lineHeight: 1.5 }}>
              Los valores RM son estimaciones basadas en la Fórmula de Brzycki (1RM = carga × 36 / (37 − reps)) y son válidos para series de 1–10 repeticiones. Se toma la serie con mayor 1RM estimado de todo el historial del atleta.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
