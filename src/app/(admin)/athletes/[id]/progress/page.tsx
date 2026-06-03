'use client';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase';
import { computeExerciseBests, type BestEntry } from '@/lib/exercise-bests';
import { ChevronLeft, TrendIcon, UserIcon } from '@/components/icons';

const NIVELES: Record<number, { label: string; sub: string }> = {
  1: { label: 'Principiante', sub: 'Menos de 1 año' },
  2: { label: 'Intermedio',   sub: '1 – 3 años'     },
  3: { label: 'Avanzado',     sub: '3 – 8 años'     },
  4: { label: 'Elite',        sub: 'Más de 8 años'  },
};

interface AthleteProfile {
  id: string;
  peso: number | null;
  estatura: number | null;
  dias_entrenamiento: number | null;
  promedio_kcal: number | null;
  nivel_entrenamiento: number | null;
  historial_lesiones: string | null;
  created_at: string;
}

interface SessionRecord {
  date: string;
  title: string;
  durationSeconds: number | null;
  sleepHours: number | null;
  energyLevel: number | null;
  painLevel: string | null;
}

function formatDuration(s: number): string {
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  const rem = m % 60;
  return rem > 0 ? `${h}h ${rem}m` : `${h}h`;
}

const PAIN_LABEL: Record<string, string> = { ninguno: 'Ninguno', leve: 'Leve', moderado: 'Moderado', fuerte: 'Fuerte' };
const PAIN_COLOR: Record<string, string> = { ninguno: '#22c55e', leve: '#4A8AF0', moderado: '#f59e0b', fuerte: '#f87171' };

const RANK_COLORS = ['#F5A623', '#9098AE', '#CD7F32'];

function fmtLoad(v: number): string {
  return v % 1 === 0 ? String(v) : v.toFixed(1);
}

export default function AthleteProgress() {
  const pathname = usePathname();
  const athleteId = pathname.split('/athletes/')[1]?.split('/')[0] ?? '';

  const [athleteName, setAthleteName] = useState('');
  const [bests, setBests] = useState<BestEntry[]>([]);
  const [sessionRecords, setSessionRecords] = useState<SessionRecord[]>([]);
  const [profile, setProfile] = useState<AthleteProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!athleteId) { setLoading(false); return; }
    const supabase = createClient();

    Promise.all([
      supabase.from('athletes').select('name').eq('id', athleteId).maybeSingle(),
      supabase.from('athlete_profiles').select('*').eq('athlete_id', athleteId).order('created_at', { ascending: false }).limit(1).maybeSingle(),
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
      supabase
        .from('sessions')
        .select('date, title, session_feedback(duration_seconds, sleep_hours, energy_level, pain_level)')
        .eq('athlete_id', athleteId)
        .order('date', { ascending: false })
        .limit(20),
    ]).then(([{ data: ath }, { data: prof }, { data: sessions }, { data: sessFb }]) => {
      if (ath) setAthleteName(ath.name);
      if (prof) setProfile(prof as AthleteProfile);
      setBests(computeExerciseBests(sessions ?? []));
      const records: SessionRecord[] = (sessFb ?? [])
        .map((s: any) => {
          const fb = Array.isArray(s.session_feedback) ? s.session_feedback[0] : s.session_feedback;
          if (!fb) return null;
          return {
            date: s.date as string,
            title: s.title as string,
            durationSeconds: fb.duration_seconds ?? null,
            sleepHours: fb.sleep_hours ?? null,
            energyLevel: fb.energy_level ?? null,
            painLevel: fb.pain_level ?? null,
          } as SessionRecord;
        })
        .filter(Boolean) as SessionRecord[];
      setSessionRecords(records);
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
        {/* Perfil Deportivo */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <UserIcon size={20} stroke="rgba(74,138,240,0.9)"/>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#F4EFE0' }}>Perfil deportivo</div>
          </div>
          {profile ? (
            <div style={{ display: 'grid', gap: 10 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
                {profile.peso != null && (
                  <StatCard label="Peso" value={`${profile.peso} kg`}/>
                )}
                {profile.estatura != null && (
                  <StatCard label="Estatura" value={`${profile.estatura} cm`}/>
                )}
                {profile.dias_entrenamiento != null && (
                  <StatCard label="Días entrenados" value={String(profile.dias_entrenamiento)}/>
                )}
                {profile.promedio_kcal != null && (
                  <StatCard label="Kcal diarias" value={`${profile.promedio_kcal} kcal`}/>
                )}
              </div>
              {profile.nivel_entrenamiento != null && NIVELES[profile.nivel_entrenamiento] && (
                <div style={{ padding: '12px 14px', borderRadius: 12, background: 'rgba(74,138,240,0.12)', border: '1px solid rgba(74,138,240,0.3)' }}>
                  <div style={{ fontSize: 10, color: 'rgba(74,138,240,0.8)', letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 700, marginBottom: 4 }}>Nivel</div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: '#4A8AF0' }}>{NIVELES[profile.nivel_entrenamiento].label}</div>
                  <div style={{ fontSize: 11, color: 'rgba(74,138,240,0.7)', marginTop: 2 }}>{NIVELES[profile.nivel_entrenamiento].sub}</div>
                </div>
              )}
              {profile.historial_lesiones && (
                <div style={{ padding: '12px 14px', borderRadius: 12, background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.25)' }}>
                  <div style={{ fontSize: 10, color: 'rgba(248,113,113,0.8)', letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 700, marginBottom: 6 }}>Historial de lesiones</div>
                  <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.75)', lineHeight: 1.6 }}>{profile.historial_lesiones}</div>
                </div>
              )}
            </div>
          ) : (
            <div style={{ padding: '20px 0', textAlign: 'center', color: 'rgba(255,255,255,0.35)', fontSize: 13 }}>
              El atleta aún no ha completado su perfil deportivo.
            </div>
          )}
        </div>

        {/* Session feedback & duration */}
        {sessionRecords.length > 0 && (
          <div style={{ marginBottom: 28 }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#F4EFE0', marginBottom: 4 }}>Historial de sesiones</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 14 }}>Duración real · Bienestar post-sesión</div>
            <div style={{ display: 'grid', gap: 8 }}>
              {sessionRecords.map((r, i) => (
                <div key={i} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: '12px 14px' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, marginBottom: 8 }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#F4EFE0' }}>{r.title}</div>
                      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>
                        {new Date(r.date + 'T00:00:00').toLocaleDateString('es-CL', { weekday: 'short', day: 'numeric', month: 'short' })}
                      </div>
                    </div>
                    {r.durationSeconds != null && (
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <div style={{ fontSize: 18, fontWeight: 800, color: '#4A8AF0', fontFamily: 'var(--font-mono)' }}>{formatDuration(r.durationSeconds)}</div>
                        <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>duración</div>
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {r.sleepHours != null && (
                      <span style={{ padding: '3px 8px', borderRadius: 5, background: 'rgba(74,138,240,0.15)', border: '1px solid rgba(74,138,240,0.3)', fontSize: 11, color: '#4A8AF0', fontWeight: 600 }}>
                        💤 {r.sleepHours}h sueño
                      </span>
                    )}
                    {r.energyLevel != null && (
                      <span style={{ padding: '3px 8px', borderRadius: 5, background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.25)', fontSize: 11, color: '#22c55e', fontWeight: 600 }}>
                        ⚡ Energía {r.energyLevel}/10
                      </span>
                    )}
                    {r.painLevel && (
                      <span style={{ padding: '3px 8px', borderRadius: 5, background: `${PAIN_COLOR[r.painLevel]}18`, border: `1px solid ${PAIN_COLOR[r.painLevel]}35`, fontSize: 11, color: PAIN_COLOR[r.painLevel], fontWeight: 600 }}>
                        {r.painLevel === 'ninguno' ? '✓' : '⚠'} {PAIN_LABEL[r.painLevel] || r.painLevel}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

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

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ padding: '12px 14px', borderRadius: 12, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)' }}>
      <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 700, marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 800, color: '#F4EFE0', fontFamily: 'var(--font-mono)' }}>{value}</div>
    </div>
  );
}
