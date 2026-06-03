'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase';
import { useAthlete } from '@/lib/athlete-context';
import { CATEGORIES } from '@/lib/constants';
import { getCategoryIcon, FlameIcon, TrendIcon } from '@/components/icons';
import { computeExerciseBests, type BestEntry } from '@/lib/exercise-bests';

// ─── Feedback chart ───────────────────────────────────────────

interface FeedbackPoint {
  date: string;
  sleepHours: number | null;
  energyLevel: number | null;
  painLevel: string | null;
}

const PAIN_TO_NUM: Record<string, number> = { ninguno: 0, leve: 3.3, moderado: 6.7, fuerte: 10 };

function FeedbackChart({ points }: { points: FeedbackPoint[] }) {
  if (points.length < 2) return (
    <div style={{ padding: '16px 0', textAlign: 'center', fontSize: 12, color: 'var(--d-text-faint)' }}>
      Completa más sesiones para ver el gráfico.
    </div>
  );

  const n = points.length;
  const W = 300, H = 90;
  const PAD_T = 8, PAD_B = 22;
  const plotH = H - PAD_T - PAD_B;

  const xp = (i: number) => n > 1 ? (i / (n - 1)) * W : W / 2;
  const yp = (v: number) => PAD_T + (1 - Math.max(0, Math.min(10, v)) / 10) * plotH;

  function polyPts(vals: (number | null)[]) {
    return vals
      .map((v, i) => v != null ? `${xp(i).toFixed(1)},${yp(v).toFixed(1)}` : null)
      .filter(Boolean)
      .join(' ');
  }

  const sleepPts  = polyPts(points.map(p => p.sleepHours  != null ? (p.sleepHours / 12) * 10 : null));
  const energyPts = polyPts(points.map(p => p.energyLevel));
  const painPts   = polyPts(points.map(p => p.painLevel   ? PAIN_TO_NUM[p.painLevel] ?? null : null));

  const labelIdxs = n <= 5
    ? Array.from({ length: n }, (_, i) => i)
    : [0, Math.floor(n / 2), n - 1];

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', display: 'block', overflow: 'visible' }}>
        {[0.25, 0.5, 0.75].map(t => (
          <line key={t} x1={0} y1={PAD_T + t * plotH} x2={W} y2={PAD_T + t * plotH}
            stroke="rgba(255,255,255,0.07)" strokeWidth="0.6"/>
        ))}

        {sleepPts  && <polyline points={sleepPts}  fill="none" stroke="#4A8AF0" strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round"/>}
        {energyPts && <polyline points={energyPts} fill="none" stroke="#22c55e" strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round"/>}
        {painPts   && <polyline points={painPts}   fill="none" stroke="#f59e0b" strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round"/>}

        {points.map((p, i) => (
          <g key={i}>
            {p.sleepHours  != null && <circle cx={xp(i)} cy={yp((p.sleepHours / 12) * 10)} r="3" fill="#4A8AF0"/>}
            {p.energyLevel != null && <circle cx={xp(i)} cy={yp(p.energyLevel)} r="3" fill="#22c55e"/>}
            {p.painLevel   &&         <circle cx={xp(i)} cy={yp(PAIN_TO_NUM[p.painLevel] ?? 0)} r="3" fill="#f59e0b"/>}
          </g>
        ))}

        {labelIdxs.map(i => (
          <text key={i} x={xp(i)} y={H - 4}
            textAnchor={i === 0 ? 'start' : i === n - 1 ? 'end' : 'middle'}
            fontSize="7.5" fill="rgba(255,255,255,0.35)" fontFamily="monospace"
          >
            {points[i].date.slice(5)}
          </text>
        ))}
      </svg>

      <div style={{ display: 'flex', gap: 14, marginTop: 6, flexWrap: 'wrap' }}>
        {[
          { color: '#4A8AF0', label: 'Sueño (h/12)' },
          { color: '#22c55e', label: 'Energía /10' },
          { color: '#f59e0b', label: 'Dolor' },
        ].map(l => (
          <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <div style={{ width: 18, height: 2.5, borderRadius: 1.5, background: l.color }}/>
            <span style={{ fontSize: 10, color: 'var(--d-text-faint)' }}>{l.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

interface DurationPoint {
  date: string;
  minutes: number;
}

function DurationChart({ points }: { points: DurationPoint[] }) {
  if (points.length < 1) return (
    <div style={{ padding: '16px 0', textAlign: 'center', fontSize: 12, color: 'var(--d-text-faint)' }}>
      Completa sesiones con timer para ver el gráfico.
    </div>
  );

  const W = 300, H = 90;
  const PAD_T = 8, PAD_B = 22;
  const plotH = H - PAD_T - PAD_B;
  const maxMin = Math.max(...points.map(p => p.minutes), 30);
  const n = points.length;
  const gap = W / n;
  const barW = Math.max(4, gap * 0.55);

  const labelIdxs = n <= 5
    ? Array.from({ length: n }, (_, i) => i)
    : [0, Math.floor(n / 2), n - 1];

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', display: 'block', overflow: 'visible' }}>
        {[0.25, 0.5, 0.75, 1].map(t => (
          <line key={t} x1={0} y1={PAD_T + t * plotH} x2={W} y2={PAD_T + t * plotH}
            stroke="rgba(255,255,255,0.07)" strokeWidth="0.6"/>
        ))}
        {points.map((p, i) => {
          const barH = Math.max(2, (p.minutes / maxMin) * plotH);
          const x = i * gap + (gap - barW) / 2;
          const y = PAD_T + plotH - barH;
          return (
            <g key={i}>
              <rect x={x} y={y} width={barW} height={barH} rx={2} fill="var(--vitta-blue)" opacity={0.75}/>
              {n <= 8 && <text x={x + barW / 2} y={y - 3} textAnchor="middle" fontSize="7" fill="rgba(255,255,255,0.5)" fontFamily="monospace">{p.minutes}m</text>}
            </g>
          );
        })}
        {labelIdxs.map(i => (
          <text key={i} x={i * gap + gap / 2} y={H - 4}
            textAnchor={i === 0 ? 'start' : i === n - 1 ? 'end' : 'middle'}
            fontSize="7.5" fill="rgba(255,255,255,0.35)" fontFamily="monospace"
          >
            {points[i].date.slice(5)}
          </text>
        ))}
      </svg>
      <div style={{ marginTop: 6, fontSize: 10, color: 'var(--d-text-faint)', textAlign: 'right' }}>
        Prom: {Math.round(points.reduce((a, p) => a + p.minutes, 0) / points.length)} min / sesión
      </div>
    </div>
  );
}

interface StatsData {
  adherence: number | null;
  avgRpe: number | null;
  totalSessions: number;
  doneSessions: number;
  streak: number;
  catVolume: { id: string; count: number; pct: number }[];
  last21: boolean[];
}

function daysAgoISO(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

const RANK_COLORS = ['#F5A623', '#9098AE', '#CD7F32'];

function fmtLoad(v: number): string {
  return v % 1 === 0 ? String(v) : v.toFixed(1);
}

export default function StatsPage() {
  const { athleteId, loading: authLoading } = useAthlete();
  const [stats, setStats] = useState<StatsData | null>(null);
  const [bests, setBests] = useState<BestEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [bestsLoading, setBestsLoading] = useState(true);
  const [feedbackPoints, setFeedbackPoints] = useState<FeedbackPoint[]>([]);
  const [feedbackLoading, setFeedbackLoading] = useState(true);
  const [durationPoints, setDurationPoints] = useState<DurationPoint[]>([]);
  const [durationLoading, setDurationLoading] = useState(true);

  // ── Stats (28d) ────────────────────────────────────────────
  useEffect(() => {
    if (authLoading || !athleteId) return;

    const supabase = createClient();
    const fourWeeksAgo = daysAgoISO(28);
    const todayISO = new Date().toISOString().slice(0, 10);

    supabase
      .from('sessions')
      .select(`
        id, date,
        session_feedback(duration_seconds),
        session_blocks (
          id, category,
          session_exercises (
            id,
            sets ( id, done, rpe_target, actual_rpe )
          )
        )
      `)
      .eq('athlete_id', athleteId)
      .gte('date', fourWeeksAgo)
      .lte('date', todayISO)
      .order('date')
      .then(({ data: sessions }) => {
        if (!sessions || sessions.length === 0) {
          setStats({ adherence: null, avgRpe: null, totalSessions: 0, doneSessions: 0, streak: 0, catVolume: [], last21: Array(21).fill(false) });
          setLoading(false);
          return;
        }

        function sessionIsCompleted(s: any): boolean {
          const fb = Array.isArray(s.session_feedback) ? s.session_feedback[0] : s.session_feedback;
          if (fb?.duration_seconds != null && fb.duration_seconds > 0) return true;
          return s.session_blocks?.some((b: any) =>
            b.session_exercises?.some((e: any) =>
              e.sets?.some((set: any) => set.done)
            )
          ) ?? false;
        }

        const totalSessions = sessions.length;
        const doneSessions = sessions.filter(sessionIsCompleted).length;
        const adherence = totalSessions > 0 ? Math.round(doneSessions / totalSessions * 100) : null;

        const sevenDaysAgo = daysAgoISO(7);
        const rpeValues: number[] = [];
        sessions.forEach((s: any) => {
          if (s.date < sevenDaysAgo) return;
          s.session_blocks?.forEach((b: any) => {
            b.session_exercises?.forEach((e: any) => {
              e.sets?.forEach((set: any) => {
                const v = set.actual_rpe ?? set.rpe_target;
                if (v != null) rpeValues.push(Number(v));
              });
            });
          });
        });
        const avgRpe = rpeValues.length > 0
          ? Math.round((rpeValues.reduce((a, b) => a + b, 0) / rpeValues.length) * 10) / 10
          : null;

        const catCounts: Record<string, number> = {};
        sessions.forEach((s: any) => {
          s.session_blocks?.forEach((b: any) => {
            catCounts[b.category] = (catCounts[b.category] || 0) + 1;
          });
        });
        const totalBlocks = Object.values(catCounts).reduce((a, b) => a + b, 0);
        const catVolume = Object.entries(catCounts)
          .sort(([, a], [, b]) => b - a)
          .map(([id, count]) => ({ id, count, pct: totalBlocks > 0 ? Math.round(count / totalBlocks * 100) : 0 }));

        let streak = 0;
        const sessionDates = new Set(
          sessions
            .filter(sessionIsCompleted)
            .map((s: any) => s.date)
        );
        let checkDate = new Date();
        while (streak < 28) {
          const iso = checkDate.toISOString().slice(0, 10);
          if (!sessionDates.has(iso)) break;
          streak++;
          checkDate.setDate(checkDate.getDate() - 1);
        }

        const last21: boolean[] = [];
        for (let i = 20; i >= 0; i--) {
          const iso = daysAgoISO(i);
          last21.push(sessionDates.has(iso));
        }

        setStats({ adherence, avgRpe, totalSessions, doneSessions, streak, catVolume, last21 });
        setLoading(false);
      });
  }, [athleteId, authLoading]);

  // ── Feedback chart data ────────────────────────────────────
  useEffect(() => {
    if (authLoading || !athleteId) return;
    const supabase = createClient();
    supabase
      .from('sessions')
      .select('date, session_feedback(sleep_hours, energy_level, pain_level)')
      .eq('athlete_id', athleteId)
      .order('date', { ascending: true })
      .limit(30)
      .then(({ data }) => {
        if (data) {
          const pts = data
            .map((s: any) => {
              const fb = Array.isArray(s.session_feedback) ? s.session_feedback[0] : s.session_feedback;
              if (!fb || (fb.sleep_hours == null && fb.energy_level == null && fb.pain_level == null)) return null;
              return {
                date: s.date as string,
                sleepHours: fb.sleep_hours as number | null,
                energyLevel: fb.energy_level as number | null,
                painLevel: fb.pain_level as string | null,
              };
            })
            .filter(Boolean) as FeedbackPoint[];
          setFeedbackPoints(pts);
        }
        setFeedbackLoading(false);
      });
  }, [athleteId, authLoading]);

  // ── Duration per session ───────────────────────────────────
  useEffect(() => {
    if (authLoading || !athleteId) return;
    const supabase = createClient();
    supabase
      .from('sessions')
      .select('date, session_feedback(duration_seconds)')
      .eq('athlete_id', athleteId)
      .order('date', { ascending: false })
      .limit(30)
      .then(({ data }) => {
        if (data) {
          const pts = (data as any[])
            .map((s: any) => {
              const fb = Array.isArray(s.session_feedback) ? s.session_feedback[0] : s.session_feedback;
              if (!fb || fb.duration_seconds == null || fb.duration_seconds <= 0) return null;
              return { date: s.date as string, minutes: Math.round(fb.duration_seconds / 60) };
            })
            .filter(Boolean)
            .reverse() as DurationPoint[];
          setDurationPoints(pts);
        }
        setDurationLoading(false);
      });
  }, [athleteId, authLoading]);

  // ── Bests (all-time) ───────────────────────────────────────
  useEffect(() => {
    if (authLoading || !athleteId) return;
    const supabase = createClient();
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
      .eq('athlete_id', athleteId)
      .then(({ data }) => {
        setBests(computeExerciseBests(data ?? []));
        setBestsLoading(false);
      });
  }, [athleteId, authLoading]);

  if (authLoading || loading) {
    return (
      <div style={{ padding: '40px 16px', textAlign: 'center', color: 'var(--d-text-muted)', fontSize: 14 }}>
        Calculando estadísticas...
      </div>
    );
  }

  const s = stats;

  const kpis = [
    { l: 'Adherencia',       v: s?.adherence != null ? `${s.adherence}%` : '—',  u: '', d: s?.doneSessions != null ? `${s?.doneSessions}/${s?.totalSessions} ses.` : '', c: 'var(--green)' },
    { l: 'RPE prom. 7d',     v: s?.avgRpe    != null ? String(s.avgRpe)  : '—',  u: '', d: s?.avgRpe != null ? (s.avgRpe >= 8 ? 'Alto' : s.avgRpe >= 6 ? 'Moderado' : 'Bajo') : '', c: 'var(--amber)' },
    { l: 'Racha',            v: s?.streak    != null ? String(s.streak)  : '—',  u: ' días', d: s?.streak ? 'consecutivos' : '', c: 'var(--vitta-blue)' },
    { l: 'Sesiones / 4 sem', v: s?.totalSessions != null ? String(s.totalSessions) : '—', u: '', d: '', c: 'var(--d-text-muted)' },
  ];

  return (
    <div style={{ padding: '16px 16px 28px' }}>
      {/* Streak hero */}
      <div style={{ background: 'linear-gradient(135deg, rgba(46,107,214,0.20) 0%, var(--d-surface) 100%)', border: '1px solid rgba(46,107,214,0.30)', borderRadius: 18, padding: 18, position: 'relative', overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <FlameIcon size={20} stroke="var(--vitta-blue-bright)"/>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--d-text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Racha actual</div>
        </div>
        <div className="display tnum" style={{ fontSize: 56, color: 'var(--vitta-cream)', marginTop: 4 }}>
          {s?.streak ?? 0} <span style={{ fontSize: 16, color: 'var(--d-text-muted)' }}>días</span>
        </div>
        <div style={{ display: 'flex', gap: 3, marginTop: 14 }}>
          {(s?.last21 ?? Array(21).fill(false)).map((active, i) => (
            <div key={i} style={{ flex: 1, height: 26, borderRadius: 3, background: active ? 'var(--vitta-blue)' : 'var(--d-border)', opacity: active ? 0.5 + i / 40 : 0.4 }}/>
          ))}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: 9, color: 'var(--d-text-faint)' }}>
          <span>21d atrás</span><span>HOY</span>
        </div>
      </div>

      {/* KPI grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 14 }}>
        {kpis.map((kpi, i) => (
          <div key={i} style={{ background: 'var(--d-surface)', border: '1px solid var(--d-border)', borderRadius: 14, padding: 14 }}>
            <div style={{ fontSize: 10, color: 'var(--d-text-faint)', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>{kpi.l}</div>
            <div style={{ marginTop: 6 }}>
              <span className="display tnum" style={{ fontSize: 26, color: 'var(--vitta-cream)' }}>{kpi.v}</span>
              {kpi.u && <span style={{ fontSize: 11, color: 'var(--d-text-muted)', marginLeft: 3 }}>{kpi.u}</span>}
            </div>
            {kpi.d && <div style={{ fontSize: 11, color: kpi.c, marginTop: 4, fontWeight: 600 }}>{kpi.d}</div>}
          </div>
        ))}
      </div>

      {/* Feedback / Bienestar chart */}
      <div style={{ marginTop: 14, background: 'var(--d-surface)', border: '1px solid var(--d-border)', borderRadius: 16, padding: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Bienestar post-sesión</div>
        <div style={{ fontSize: 10, color: 'var(--d-text-faint)', marginBottom: 12 }}>Sueño · Energía · Dolor — últimas sesiones completadas</div>
        {feedbackLoading ? (
          <div style={{ padding: '14px 0', textAlign: 'center', fontSize: 12, color: 'var(--d-text-faint)' }}>Cargando...</div>
        ) : (
          <FeedbackChart points={feedbackPoints}/>
        )}
      </div>

      {/* Duration per session */}
      <div style={{ marginTop: 14, background: 'var(--d-surface)', border: '1px solid var(--d-border)', borderRadius: 16, padding: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Duración por sesión</div>
        <div style={{ fontSize: 10, color: 'var(--d-text-faint)', marginBottom: 12 }}>Tiempo real registrado al finalizar</div>
        {durationLoading ? (
          <div style={{ padding: '14px 0', textAlign: 'center', fontSize: 12, color: 'var(--d-text-faint)' }}>Cargando...</div>
        ) : (
          <DurationChart points={durationPoints}/>
        )}
      </div>

      {/* Volume by category */}
      <div style={{ marginTop: 14, background: 'var(--d-surface)', border: '1px solid var(--d-border)', borderRadius: 16, padding: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 14 }}>Volumen por categoría · 4 sem</div>
        {!s?.catVolume || s.catVolume.length === 0 ? (
          <div style={{ fontSize: 12, color: 'var(--d-text-faint)', textAlign: 'center', padding: '12px 0' }}>
            Sin datos de sesiones aún.
          </div>
        ) : (
          <div style={{ display: 'grid', gap: 8 }}>
            {s.catVolume.map(cv => {
              const c = CATEGORIES[cv.id];
              if (!c) return null;
              const Ic = getCategoryIcon(cv.id);
              return (
                <div key={cv.id} style={{ display: 'grid', gridTemplateColumns: '20px 110px 1fr 36px', gap: 8, alignItems: 'center' }}>
                  <Ic size={14} stroke={c.color}/>
                  <div style={{ fontSize: 11, color: 'var(--d-text)', fontWeight: 500 }}>{c.label}</div>
                  <div style={{ height: 8, borderRadius: 4, background: 'var(--d-border)', overflow: 'hidden' }}>
                    <div style={{ width: `${Math.min(cv.pct * 2, 100)}%`, height: '100%', background: c.color }}/>
                  </div>
                  <div className="mono tnum" style={{ fontSize: 11, color: 'var(--d-text-muted)', textAlign: 'right' }}>{cv.pct}%</div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Exercise bests ranking */}
      <div style={{ marginTop: 14, background: 'var(--d-surface)', border: '1px solid var(--d-border)', borderRadius: 16, padding: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
          <TrendIcon size={16} stroke="var(--vitta-blue-bright)"/>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--d-text)' }}>Mejores series · Ranking</div>
            <div style={{ fontSize: 10, color: 'var(--d-text-faint)', marginTop: 1 }}>1RM estimado · Fórmula de Brzycki</div>
          </div>
        </div>

        {bestsLoading ? (
          <div style={{ fontSize: 12, color: 'var(--d-text-faint)', textAlign: 'center', padding: '12px 0' }}>Calculando...</div>
        ) : bests.length === 0 ? (
          <div style={{ fontSize: 12, color: 'var(--d-text-faint)', textAlign: 'center', padding: '12px 0' }}>
            Sin series registradas aún. Completa tus cargas reales en los entrenamientos.
          </div>
        ) : (
          <div style={{ display: 'grid', gap: 8 }}>
            {bests.map((entry, i) => {
              const rankColor = RANK_COLORS[i] ?? 'var(--d-text-faint)';
              return (
                <div key={entry.name} style={{
                  background: i < 3 ? `${rankColor}12` : 'rgba(255,255,255,0.02)',
                  border: `1px solid ${i < 3 ? `${rankColor}30` : 'var(--d-border)'}`,
                  borderRadius: 12, padding: '10px 12px',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <div style={{
                      width: 22, height: 22, borderRadius: 11,
                      background: i < 3 ? rankColor : 'var(--d-border)',
                      color: i < 3 ? '#fff' : 'var(--d-text-muted)',
                      display: 'grid', placeItems: 'center',
                      fontSize: 10, fontWeight: 800, flexShrink: 0,
                    }}>
                      {i + 1}
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--d-text)', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {entry.name}
                    </div>
                    <div className="mono" style={{ fontSize: 13, fontWeight: 700, color: rankColor, flexShrink: 0 }}>
                      {entry.reps} × {fmtLoad(entry.load)} kg
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 4 }}>
                    {[
                      { label: '1 RM', value: entry.rm1 },
                      { label: '3 RM', value: entry.rm3 },
                      { label: '6 RM', value: entry.rm6 },
                    ].map(rm => (
                      <div key={rm.label} style={{
                        background: 'rgba(255,255,255,0.04)', borderRadius: 8,
                        padding: '5px 8px', textAlign: 'center',
                      }}>
                        <div style={{ fontSize: 9, color: 'var(--d-text-faint)', letterSpacing: '0.08em', fontWeight: 700 }}>{rm.label}</div>
                        <div className="mono tnum" style={{ fontSize: 14, fontWeight: 700, color: 'var(--d-text)', marginTop: 2 }}>
                          {fmtLoad(rm.value)} <span style={{ fontSize: 9, color: 'var(--d-text-muted)', fontWeight: 500 }}>kg</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
