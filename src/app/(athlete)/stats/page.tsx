'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase';
import { useAthlete } from '@/lib/athlete-context';
import { CATEGORIES } from '@/lib/constants';
import { getCategoryIcon, FlameIcon } from '@/components/icons';

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

export default function StatsPage() {
  const { athleteId, loading: authLoading } = useAthlete();
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading || !athleteId) return;

    const supabase = createClient();
    const fourWeeksAgo = daysAgoISO(28);
    const todayISO = new Date().toISOString().slice(0, 10);

    supabase
      .from('sessions')
      .select(`
        id, date,
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

        // ── Adherence ──────────────────────────────────────
        const totalSessions = sessions.length;
        const doneSessions = sessions.filter((s: any) =>
          s.session_blocks?.some((b: any) =>
            b.session_exercises?.some((e: any) =>
              e.sets?.some((set: any) => set.done)
            )
          )
        ).length;
        const adherence = totalSessions > 0 ? Math.round(doneSessions / totalSessions * 100) : null;

        // ── RPE average (last 7 days) ──────────────────────
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

        // ── Volume by category ─────────────────────────────
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

        // ── Streak (consecutive days with done sessions) ───
        let streak = 0;
        const sessionDates = new Set(
          sessions
            .filter((s: any) =>
              s.session_blocks?.some((b: any) =>
                b.session_exercises?.some((e: any) =>
                  e.sets?.some((set: any) => set.done)
                )
              )
            )
            .map((s: any) => s.date)
        );
        let checkDate = new Date();
        while (streak < 28) {
          const iso = checkDate.toISOString().slice(0, 10);
          if (!sessionDates.has(iso)) break;
          streak++;
          checkDate.setDate(checkDate.getDate() - 1);
        }

        // ── Last 21 days activity bar ──────────────────────
        const last21: boolean[] = [];
        for (let i = 20; i >= 0; i--) {
          const iso = daysAgoISO(i);
          last21.push(sessionDates.has(iso));
        }

        setStats({ adherence, avgRpe, totalSessions, doneSessions, streak, catVolume, last21 });
        setLoading(false);
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
    </div>
  );
}
