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
  completed: boolean;
  durationSeconds: number | null;
  sleepHours: number | null;
  energyLevel: number | null;
  painLevel: string | null;
}

interface ExSetEntry {
  reps: number | null;
  load: number | null;
  rpe: number | null;
}

interface ExSessionEntry {
  date: string;
  sets: ExSetEntry[];
}

interface ExerciseLog {
  name: string;
  sessions: ExSessionEntry[];
}

function formatDuration(s: number): string {
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  const rem = m % 60;
  return rem > 0 ? `${h}h ${rem}m` : `${h}h`;
}

function fmtDate(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('es-CL', { weekday: 'short', day: 'numeric', month: 'short' });
}

const PAIN_LABEL: Record<string, string> = { ninguno: 'Ninguno', leve: 'Leve', moderado: 'Moderado', fuerte: 'Fuerte' };
const PAIN_COLOR: Record<string, string> = { ninguno: '#22c55e', leve: '#4A8AF0', moderado: '#f59e0b', fuerte: '#f87171' };

const RANK_COLORS = ['#F5A623', '#9098AE', '#CD7F32'];

function fmtLoad(v: number): string {
  return v % 1 === 0 ? String(v) : v.toFixed(1);
}

function buildExerciseLog(sessions: any[]): ExerciseLog[] {
  const map = new Map<string, ExSessionEntry[]>();
  for (const sess of sessions) {
    for (const block of sess.session_blocks || []) {
      for (const ex of block.session_exercises || []) {
        const doneSets = (ex.sets || []).filter(
          (s: any) => s.done && (s.actual_reps != null || s.actual_load != null)
        );
        if (doneSets.length === 0) continue;
        const entry: ExSessionEntry = {
          date: sess.date,
          sets: doneSets.map((s: any) => ({
            reps: s.actual_reps ?? null,
            load: s.actual_load ?? null,
            rpe: s.actual_rpe ?? null,
          })),
        };
        if (!map.has(ex.name)) map.set(ex.name, []);
        map.get(ex.name)!.push(entry);
      }
    }
  }
  return Array.from(map.entries())
    .map(([name, sessions]) => ({ name, sessions: sessions.slice(0, 6) }))
    .sort((a, b) => {
      const aDate = a.sessions[0]?.date ?? '';
      const bDate = b.sessions[0]?.date ?? '';
      return bDate.localeCompare(aDate);
    });
}

export default function AthleteProgress() {
  const pathname = usePathname();
  const athleteId = pathname.split('/athletes/')[1]?.split('/')[0] ?? '';

  const [athleteName, setAthleteName] = useState('');
  const [bests, setBests] = useState<BestEntry[]>([]);
  const [sessionRecords, setSessionRecords] = useState<SessionRecord[]>([]);
  const [exerciseLogs, setExerciseLogs] = useState<ExerciseLog[]>([]);
  const [profile, setProfile] = useState<AthleteProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'historial' | 'ejercicios' | 'maximos'>('historial');

  useEffect(() => {
    if (!athleteId) { setLoading(false); return; }
    const supabase = createClient();

    Promise.all([
      supabase.from('athletes').select('name').eq('id', athleteId).maybeSingle(),
      supabase.from('athlete_profiles').select('*').eq('athlete_id', athleteId).order('created_at', { ascending: false }).limit(1).maybeSingle(),
      // For bests: sessions with actual set data
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
      // For session history: ALL sessions (with or without feedback)
      supabase
        .from('sessions')
        .select('date, title, session_feedback(duration_seconds, sleep_hours, energy_level, pain_level)')
        .eq('athlete_id', athleteId)
        .order('date', { ascending: false })
        .limit(40),
      // For exercise log: sessions with actual set data
      supabase
        .from('sessions')
        .select(`
          date,
          session_blocks(
            session_exercises(
              name,
              sets(done, actual_reps, actual_load, actual_rpe, sort_order)
            )
          )
        `)
        .eq('athlete_id', athleteId)
        .order('date', { ascending: false })
        .limit(60),
    ]).then(([{ data: ath }, { data: prof }, { data: sessBests }, { data: sessFb }, { data: sessLog }]) => {
      if (ath) setAthleteName(ath.name);
      if (prof) setProfile(prof as AthleteProfile);
      setBests(computeExerciseBests(sessBests ?? []));

      // Session history — include ALL sessions, mark completed if feedback exists
      const records: SessionRecord[] = (sessFb ?? []).map((s: any) => {
        const fb = Array.isArray(s.session_feedback) ? s.session_feedback[0] : s.session_feedback;
        return {
          date: s.date as string,
          title: s.title as string,
          completed: !!fb,
          durationSeconds: fb?.duration_seconds ?? null,
          sleepHours: fb?.sleep_hours ?? null,
          energyLevel: fb?.energy_level ?? null,
          painLevel: fb?.pain_level ?? null,
        };
      });
      setSessionRecords(records);
      setExerciseLogs(buildExerciseLog(sessLog ?? []));
      setLoading(false);
    });
  }, [athleteId]);

  const completedCount = sessionRecords.filter(r => r.completed).length;
  const missedCount = sessionRecords.filter(r => !r.completed).length;

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

      <div style={{ maxWidth: 560, margin: '0 auto', padding: '20px 16px 48px' }}>

        {/* Perfil Deportivo */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <UserIcon size={20} stroke="rgba(74,138,240,0.9)"/>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#F4EFE0' }}>Perfil deportivo</div>
          </div>
          {profile ? (
            <div style={{ display: 'grid', gap: 10 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
                {profile.peso != null && <StatCard label="Peso" value={`${profile.peso} kg`}/>}
                {profile.estatura != null && <StatCard label="Estatura" value={`${profile.estatura} cm`}/>}
                {profile.dias_entrenamiento != null && <StatCard label="Días entrenados" value={String(profile.dias_entrenamiento)}/>}
                {profile.promedio_kcal != null && <StatCard label="Kcal diarias" value={`${profile.promedio_kcal} kcal`}/>}
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

        {/* Resumen adherencia */}
        {sessionRecords.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 20 }}>
            <div style={{ padding: '10px 12px', borderRadius: 10, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', textAlign: 'center' }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: '#F4EFE0', fontFamily: 'var(--font-mono)' }}>{sessionRecords.length}</div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 2 }}>Programadas</div>
            </div>
            <div style={{ padding: '10px 12px', borderRadius: 10, background: 'rgba(43,182,115,0.10)', border: '1px solid rgba(43,182,115,0.25)', textAlign: 'center' }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: '#2BB673', fontFamily: 'var(--font-mono)' }}>{completedCount}</div>
              <div style={{ fontSize: 10, color: 'rgba(43,182,115,0.7)', textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 2 }}>Completadas</div>
            </div>
            <div style={{ padding: '10px 12px', borderRadius: 10, background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.20)', textAlign: 'center' }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: '#f87171', fontFamily: 'var(--font-mono)' }}>{missedCount}</div>
              <div style={{ fontSize: 10, color: 'rgba(248,113,113,0.6)', textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 2 }}>No completadas</div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 16, background: 'rgba(255,255,255,0.04)', borderRadius: 12, padding: 4 }}>
          {([
            { key: 'historial', label: 'Sesiones' },
            { key: 'ejercicios', label: 'Por ejercicio' },
            { key: 'maximos', label: 'Máximos' },
          ] as const).map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                flex: 1, padding: '8px 0', borderRadius: 9, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700,
                background: activeTab === tab.key ? 'rgba(74,138,240,0.25)' : 'transparent',
                color: activeTab === tab.key ? '#4A8AF0' : 'rgba(255,255,255,0.4)',
                transition: 'all 0.15s',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* TAB: Historial de sesiones */}
        {activeTab === 'historial' && (
          <div style={{ display: 'grid', gap: 8 }}>
            {sessionRecords.length === 0 ? (
              <div style={{ padding: '40px 20px', textAlign: 'center', color: 'rgba(255,255,255,0.35)', fontSize: 13 }}>Sin sesiones registradas.</div>
            ) : sessionRecords.map((r, i) => (
              <div key={i} style={{
                background: r.completed ? 'rgba(43,182,115,0.06)' : 'rgba(248,113,113,0.04)',
                border: `1px solid ${r.completed ? 'rgba(43,182,115,0.20)' : 'rgba(248,113,113,0.18)'}`,
                borderRadius: 12, padding: '12px 14px',
              }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, marginBottom: r.completed ? 10 : 0 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#F4EFE0' }}>{r.title}</div>
                      <span style={{
                        fontSize: 10, fontWeight: 700, padding: '1px 7px', borderRadius: 4,
                        background: r.completed ? 'rgba(43,182,115,0.20)' : 'rgba(248,113,113,0.15)',
                        color: r.completed ? '#2BB673' : '#f87171',
                        letterSpacing: '0.06em', textTransform: 'uppercase',
                      }}>
                        {r.completed ? 'Completada' : 'No completada'}
                      </span>
                    </div>
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 3 }}>{fmtDate(r.date)}</div>
                  </div>
                  {r.durationSeconds != null && (
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontSize: 17, fontWeight: 800, color: '#4A8AF0', fontFamily: 'var(--font-mono)' }}>{formatDuration(r.durationSeconds)}</div>
                      <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>duración</div>
                    </div>
                  )}
                </div>
                {r.completed && (
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {r.sleepHours != null && (
                      <span style={{ padding: '3px 8px', borderRadius: 5, background: 'rgba(74,138,240,0.12)', border: '1px solid rgba(74,138,240,0.25)', fontSize: 11, color: '#4A8AF0', fontWeight: 600 }}>
                        💤 {r.sleepHours}h sueño
                      </span>
                    )}
                    {r.energyLevel != null && (
                      <span style={{ padding: '3px 8px', borderRadius: 5, background: 'rgba(34,197,94,0.10)', border: '1px solid rgba(34,197,94,0.22)', fontSize: 11, color: '#22c55e', fontWeight: 600 }}>
                        ⚡ Energía {r.energyLevel}/10
                      </span>
                    )}
                    {r.painLevel && (
                      <span style={{ padding: '3px 8px', borderRadius: 5, background: `${PAIN_COLOR[r.painLevel]}15`, border: `1px solid ${PAIN_COLOR[r.painLevel]}30`, fontSize: 11, color: PAIN_COLOR[r.painLevel], fontWeight: 600 }}>
                        {r.painLevel === 'ninguno' ? '✓' : '⚠'} {PAIN_LABEL[r.painLevel] || r.painLevel}
                      </span>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* TAB: Por ejercicio */}
        {activeTab === 'ejercicios' && (
          <div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginBottom: 14, lineHeight: 1.5 }}>
              Historial de cargas y repeticiones reales. Referencia para planificar la próxima sesión.
            </div>
            {loading ? (
              <div style={{ padding: 40, textAlign: 'center', color: 'rgba(255,255,255,0.4)', fontSize: 13 }}>Cargando...</div>
            ) : exerciseLogs.length === 0 ? (
              <div style={{ padding: '60px 20px', textAlign: 'center' }}>
                <div style={{ fontSize: 32, marginBottom: 12 }}>📋</div>
                <div style={{ fontSize: 15, fontWeight: 600, color: '#F4EFE0', marginBottom: 6 }}>Sin registros aún</div>
                <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', lineHeight: 1.5 }}>
                  {athleteName || 'El atleta'} no ha registrado pesos ni repeticiones todavía.
                </div>
              </div>
            ) : (
              <div style={{ display: 'grid', gap: 10 }}>
                {exerciseLogs.map(ex => (
                  <ExerciseLogCard key={ex.name} log={ex} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB: Máximos */}
        {activeTab === 'maximos' && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <TrendIcon size={20} stroke="var(--vitta-blue-bright)"/>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#F4EFE0' }}>Mejores series · Ranking</div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>
                  1RM estimado · Fórmula de Brzycki
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
                  {athleteName || 'El atleta'} no tiene series con carga y repeticiones registradas (1–10 reps).
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
                          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', marginTop: 2 }}>Mejor serie registrada</div>
                        </div>
                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                          <div className="mono" style={{ fontSize: 16, fontWeight: 800, color: rankColor }}>
                            {entry.reps} × {fmtLoad(entry.load)} kg
                          </div>
                          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', marginTop: 1 }}>reps × carga</div>
                        </div>
                      </div>
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
                <div style={{ marginTop: 6, padding: '10px 14px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 10 }}>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', lineHeight: 1.5 }}>
                    Estimaciones basadas en la Fórmula de Brzycki (1RM = carga × 36 / (37 − reps)). Válido para series de 1–10 repeticiones.
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function ExerciseLogCard({ log }: { log: ExerciseLog }) {
  const [expanded, setExpanded] = useState(false);
  const latest = log.sessions[0];

  function fmtSet(s: ExSetEntry) {
    const parts: string[] = [];
    if (s.reps != null) parts.push(`${s.reps} reps`);
    if (s.load != null) parts.push(`${s.load} kg`);
    if (s.rpe != null) parts.push(`RPE ${s.rpe}`);
    return parts.join(' · ') || '—';
  }

  const latestSummary = latest?.sets.map((s, i) =>
    `S${i + 1}: ${s.reps != null ? s.reps : '?'}×${s.load != null ? s.load + 'kg' : '?'}`
  ).join('  ') || '';

  return (
    <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, overflow: 'hidden' }}>
      <button
        onClick={() => setExpanded(e => !e)}
        style={{ width: '100%', border: 'none', background: 'transparent', padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', color: 'inherit', textAlign: 'left' }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#F4EFE0', marginBottom: 3 }}>{log.name}</div>
          {latest && (
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>
              <span style={{ color: 'rgba(255,255,255,0.5)' }}>{fmtDate(latest.date)}</span>
              {latestSummary && <span style={{ marginLeft: 8, fontFamily: 'var(--font-mono)', color: '#4A8AF0' }}>{latestSummary}</span>}
            </div>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', fontWeight: 600 }}>{log.sessions.length} sesión{log.sessions.length !== 1 ? 'es' : ''}</span>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ transform: expanded ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.2s', color: 'rgba(255,255,255,0.3)' }}>
            <path d="M3 5l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
      </button>

      {expanded && (
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)', padding: '10px 14px', display: 'grid', gap: 10 }}>
          {log.sessions.map((sess, si) => (
            <div key={si}>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
                {fmtDate(sess.date)}
              </div>
              <div style={{ display: 'grid', gap: 4 }}>
                {sess.sets.map((s, setIdx) => (
                  <div key={setIdx} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '5px 10px', borderRadius: 7, background: 'rgba(255,255,255,0.04)' }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.3)', fontFamily: 'var(--font-mono)', width: 20 }}>S{setIdx + 1}</span>
                    {s.reps != null && (
                      <span style={{ fontSize: 13, fontWeight: 700, color: '#F4EFE0', fontFamily: 'var(--font-mono)' }}>{s.reps}<span style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', fontWeight: 500 }}> reps</span></span>
                    )}
                    {s.load != null && (
                      <span style={{ fontSize: 13, fontWeight: 700, color: '#4A8AF0', fontFamily: 'var(--font-mono)' }}>{s.load}<span style={{ fontSize: 10, color: 'rgba(74,138,240,0.6)', fontWeight: 500 }}> kg</span></span>
                    )}
                    {s.rpe != null && (
                      <span style={{ fontSize: 11, color: '#F5A623', fontFamily: 'var(--font-mono)', marginLeft: 'auto' }}>RPE {s.rpe}</span>
                    )}
                    {s.reps == null && s.load == null && (
                      <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.25)' }}>—</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
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
