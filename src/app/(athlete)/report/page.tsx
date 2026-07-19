'use client';
import { useEffect, useMemo, useState } from 'react';
import { useAthlete } from '@/lib/athlete-context';
import { createClient } from '@/lib/supabase';
import { ChevronLeft, ChevronRight } from '@/components/icons';

const MONTH_NAMES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const DAY_HEADERS = ['L','M','X','J','V','S','D'];

const PAIN_LABEL: Record<string, string> = { ninguno: 'Ninguno', leve: 'Leve', moderado: 'Moderado', fuerte: 'Fuerte' };

function pad2(n: number) { return String(n).padStart(2, '0'); }
function toISO(y: number, m: number, d: number) { return `${y}-${pad2(m)}-${pad2(d)}`; }
function daysInMonth(y: number, m: number) { return new Date(y, m, 0).getDate(); }
function fmtDate(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('es-CL', { weekday: 'short', day: 'numeric', month: 'short' });
}
function round1(n: number) { return Math.round(n * 10) / 10; }
function shiftMonth(y: number, m: number, delta: number): [number, number] {
  const d = new Date(y, m - 1 + delta, 1);
  return [d.getFullYear(), d.getMonth() + 1];
}

// ─── Data shapes (mirrors the coach-facing report at (admin)/athletes/[id]/report) ──

interface DbSetLite { done: boolean | null; actual_reps: number | null; actual_load: number | null; actual_rpe: number | null; }
interface DbExLite { sets: DbSetLite[] | null; }
interface DbBlockLite { session_exercises: DbExLite[] | null; }
interface DbFeedback { duration_seconds: number | null; sleep_hours: number | null; energy_level: number | null; pain_level: string | null; }
interface DbSessionRaw {
  id: string; date: string; title: string; duration: number; rpe_target: number;
  session_feedback: DbFeedback[] | DbFeedback | null;
  session_blocks: DbBlockLite[] | null;
}

type DayStatus = 'completo' | 'parcial' | 'no_completado';

interface SessionReport {
  id: string; date: string; title: string; status: DayStatus;
  sleepHours: number | null; painLevel: string | null;
  avgRpe: number | null; volumeLoad: number; trainingLoad: number | null;
}

function buildReports(raw: DbSessionRaw[]): SessionReport[] {
  return raw.map(s => {
    const fb = Array.isArray(s.session_feedback) ? s.session_feedback[0] : s.session_feedback;
    let totalSets = 0, doneSets = 0, volumeLoad = 0;
    const rpeVals: number[] = [];
    for (const block of s.session_blocks || []) {
      for (const ex of block.session_exercises || []) {
        for (const set of ex.sets || []) {
          totalSets++;
          if (set.done) {
            doneSets++;
            if (set.actual_rpe != null) rpeVals.push(set.actual_rpe);
            if (set.actual_load != null && set.actual_reps != null) volumeLoad += set.actual_load * set.actual_reps;
          }
        }
      }
    }
    const hasFeedback = !!fb;
    const allSetsDone = totalSets > 0 && doneSets === totalSets;
    const status: DayStatus = !hasFeedback ? 'no_completado' : (totalSets === 0 || allSetsDone) ? 'completo' : 'parcial';
    const avgRpe = rpeVals.length > 0 ? rpeVals.reduce((a, b) => a + b, 0) / rpeVals.length : null;
    const durationMinutes = hasFeedback ? (fb!.duration_seconds != null ? fb!.duration_seconds / 60 : s.duration) : null;
    const sessionRpe = avgRpe ?? (hasFeedback ? s.rpe_target : null);
    const trainingLoad = (sessionRpe != null && durationMinutes != null) ? sessionRpe * durationMinutes : null;
    return {
      id: s.id, date: s.date, title: s.title, status,
      sleepHours: fb?.sleep_hours ?? null,
      painLevel: fb?.pain_level ?? null,
      avgRpe, volumeLoad, trainingLoad,
    };
  });
}

function dayStatusFor(sessions: SessionReport[]): DayStatus {
  if (sessions.every(s => s.status === 'completo')) return 'completo';
  if (sessions.some(s => s.status !== 'no_completado')) return 'parcial';
  return 'no_completado';
}

const STATUS_COLOR: Record<DayStatus, string> = {
  completo: 'var(--green)',
  parcial: 'var(--amber)',
  no_completado: 'var(--red)',
};
const STATUS_LABEL: Record<DayStatus, string> = {
  completo: 'Entrenado',
  parcial: 'Parcial',
  no_completado: 'No entrenado',
};

interface MonthSummary {
  entrenados: number; parciales: number; noEntrenados: number; descanso: number;
  avgSleep: number | null; avgRpe: number | null; loadTotal: number;
}

function summarizeMonth(reports: SessionReport[], year: number, month: number): MonthSummary {
  const byDate = new Map<string, SessionReport[]>();
  for (const r of reports) {
    if (!byDate.has(r.date)) byDate.set(r.date, []);
    byDate.get(r.date)!.push(r);
  }
  let entrenados = 0, parciales = 0, noEntrenados = 0;
  for (const sessions of byDate.values()) {
    const st = dayStatusFor(sessions);
    if (st === 'completo') entrenados++;
    else if (st === 'parcial') parciales++;
    else noEntrenados++;
  }
  const descanso = daysInMonth(year, month) - byDate.size;
  const sleepVals = reports.map(r => r.sleepHours).filter((v): v is number => v != null);
  const rpeVals = reports.map(r => r.avgRpe).filter((v): v is number => v != null);
  const loadTotal = reports.reduce((a, r) => a + (r.trainingLoad ?? 0), 0);
  return {
    entrenados, parciales, noEntrenados, descanso,
    avgSleep: sleepVals.length ? sleepVals.reduce((a, b) => a + b, 0) / sleepVals.length : null,
    avgRpe: rpeVals.length ? rpeVals.reduce((a, b) => a + b, 0) / rpeVals.length : null,
    loadTotal,
  };
}

type DeltaDirection = 'up-good' | 'down-good' | 'neutral';

function computeDelta(curr: number | null, prev: number | null, direction: DeltaDirection = 'up-good'): { text: string; color: string } | null {
  if (curr == null || prev == null) return null;
  const diff = curr - prev;
  if (Math.abs(diff) < 0.05) return { text: 'Igual que el mes pasado', color: 'var(--d-text-faint)' };
  const sign = diff > 0 ? '+' : '';
  let color = 'var(--d-text-muted)';
  if (direction === 'up-good') color = diff > 0 ? 'var(--green)' : 'var(--red)';
  else if (direction === 'down-good') color = diff < 0 ? 'var(--green)' : 'var(--red)';
  return { text: `${sign}${round1(diff)} vs. mes pasado`, color };
}

// ─── Monthly PRs ──────────────────────────────────────────────

interface PrSetLite { done: boolean | null; actual_reps: number | null; actual_load: number | null; }
interface PrExLite { name: string; sets: PrSetLite[] | null; }
interface PrBlockLite { session_exercises: PrExLite[] | null; }
interface PrSessionRaw { date: string; session_blocks: PrBlockLite[] | null; }
interface PrEntry { name: string; reps: number; load: number; rm1: number; date: string; }

function computeMonthlyPRs(rows: PrSessionRaw[], monthStart: string, monthEnd: string): PrEntry[] {
  const priorBest = new Map<string, number>();
  const monthBest = new Map<string, PrEntry>();
  for (const s of rows) {
    for (const block of s.session_blocks || []) {
      for (const ex of block.session_exercises || []) {
        const name = ex.name;
        if (!name) continue;
        for (const set of ex.sets || []) {
          if (!set.done) continue;
          const reps = Number(set.actual_reps);
          const load = Number(set.actual_load);
          if (!reps || !load || reps < 1 || reps > 10 || load <= 0) continue;
          const rm1 = load * 36 / (37 - reps);
          if (s.date < monthStart) {
            const prev = priorBest.get(name);
            if (prev == null || rm1 > prev) priorBest.set(name, rm1);
          } else if (s.date <= monthEnd) {
            const prevMonth = monthBest.get(name);
            if (!prevMonth || rm1 > prevMonth.rm1) monthBest.set(name, { name, reps, load, rm1, date: s.date });
          }
        }
      }
    }
  }
  const prs: PrEntry[] = [];
  for (const [name, best] of monthBest) {
    const prior = priorBest.get(name) ?? 0;
    if (best.rm1 > prior) prs.push(best);
  }
  return prs.sort((a, b) => b.rm1 - a.rm1);
}

// ─── Mini charts ────────────────────────────────────────────

function SleepRpeChart({ points }: { points: { date: string; sleepHours: number | null; rpe: number | null }[] }) {
  if (points.length < 2) return (
    <div style={{ padding: '14px 0', textAlign: 'center', fontSize: 12, color: 'var(--d-text-faint)' }}>
      Completa más sesiones para ver tu tendencia.
    </div>
  );
  const n = points.length;
  const W = 300, H = 90;
  const PAD_T = 8, PAD_B = 20;
  const plotH = H - PAD_T - PAD_B;
  const xp = (i: number) => n > 1 ? (i / (n - 1)) * W : W / 2;
  const yp = (v: number) => PAD_T + (1 - Math.max(0, Math.min(10, v)) / 10) * plotH;
  function polyPts(vals: (number | null)[]) {
    return vals.map((v, i) => v != null ? `${xp(i).toFixed(1)},${yp(v).toFixed(1)}` : null).filter(Boolean).join(' ');
  }
  const sleepPts = polyPts(points.map(p => p.sleepHours != null ? (p.sleepHours / 12) * 10 : null));
  const rpePts = polyPts(points.map(p => p.rpe));
  const labelIdxs = n <= 5 ? Array.from({ length: n }, (_, i) => i) : [0, Math.floor(n / 2), n - 1];

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', display: 'block', overflow: 'visible' }}>
        {[0.25, 0.5, 0.75].map(t => (
          <line key={t} x1={0} y1={PAD_T + t * plotH} x2={W} y2={PAD_T + t * plotH} stroke="rgba(255,255,255,0.07)" strokeWidth="0.6"/>
        ))}
        {sleepPts && <polyline points={sleepPts} fill="none" stroke="#4A8AF0" strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round"/>}
        {rpePts && <polyline points={rpePts} fill="none" stroke="#F5A623" strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round"/>}
        {points.map((p, i) => (
          <g key={i}>
            {p.sleepHours != null && <circle cx={xp(i)} cy={yp((p.sleepHours / 12) * 10)} r="3" fill="#4A8AF0"/>}
            {p.rpe != null && <circle cx={xp(i)} cy={yp(p.rpe)} r="3" fill="#F5A623"/>}
          </g>
        ))}
        {labelIdxs.map(i => (
          <text key={i} x={xp(i)} y={H - 4} textAnchor={i === 0 ? 'start' : i === n - 1 ? 'end' : 'middle'} fontSize="7.5" fill="rgba(255,255,255,0.35)" fontFamily="monospace">
            {points[i].date.slice(8)}
          </text>
        ))}
      </svg>
      <div style={{ display: 'flex', gap: 14, marginTop: 6 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <div style={{ width: 18, height: 2.5, borderRadius: 1.5, background: '#4A8AF0' }}/>
          <span style={{ fontSize: 10, color: 'var(--d-text-faint)' }}>Sueño (/12)</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <div style={{ width: 18, height: 2.5, borderRadius: 1.5, background: '#F5A623' }}/>
          <span style={{ fontSize: 10, color: 'var(--d-text-faint)' }}>RPE (/10)</span>
        </div>
      </div>
    </div>
  );
}

function LoadChart({ points }: { points: { date: string; load: number }[] }) {
  if (points.length === 0) return (
    <div style={{ padding: '14px 0', textAlign: 'center', fontSize: 12, color: 'var(--d-text-faint)' }}>
      Sin datos de carga este mes.
    </div>
  );
  const W = 300, H = 90;
  const PAD_T = 8, PAD_B = 20;
  const plotH = H - PAD_T - PAD_B;
  const maxLoad = Math.max(...points.map(p => p.load), 1);
  const n = points.length;
  const gap = W / n;
  const barW = Math.max(4, gap * 0.55);

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', display: 'block', overflow: 'visible' }}>
        {[0.25, 0.5, 0.75, 1].map(t => (
          <line key={t} x1={0} y1={PAD_T + t * plotH} x2={W} y2={PAD_T + t * plotH} stroke="rgba(255,255,255,0.07)" strokeWidth="0.6"/>
        ))}
        {points.map((p, i) => {
          const barH = Math.max(2, (p.load / maxLoad) * plotH);
          const x = i * gap + (gap - barW) / 2;
          const y = PAD_T + plotH - barH;
          return <rect key={i} x={x} y={y} width={barW} height={barH} rx={2} fill="var(--vitta-blue)" opacity={0.75}/>;
        })}
        {labelIdxs(n).map(i => (
          <text key={i} x={i * gap + gap / 2} y={H - 4} textAnchor="middle" fontSize="7.5" fill="rgba(255,255,255,0.35)" fontFamily="monospace">
            {points[i].date.slice(8)}
          </text>
        ))}
      </svg>
    </div>
  );
}
function labelIdxs(n: number) {
  return n <= 5 ? Array.from({ length: n }, (_, i) => i) : [0, Math.floor(n / 2), n - 1];
}

export default function AthleteMonthlyReport() {
  const { athleteId, loading: authLoading } = useAthlete();

  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [reports, setReports] = useState<SessionReport[]>([]);
  const [prevReports, setPrevReports] = useState<SessionReport[]>([]);
  const [monthlyPRs, setMonthlyPRs] = useState<PrEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const [prevYear, prevMonthNum] = useMemo(() => shiftMonth(year, month, -1), [year, month]);

  useEffect(() => {
    if (authLoading || !athleteId) return;
    setLoading(true);
    const supabase = createClient();
    const start = toISO(year, month, 1);
    const end = toISO(year, month, daysInMonth(year, month));
    const prevStart = toISO(prevYear, prevMonthNum, 1);
    const prevEnd = toISO(prevYear, prevMonthNum, daysInMonth(prevYear, prevMonthNum));
    const prHistoryStart = toISO(year - 1, 1, 1);
    const sessionCols = `id, date, title, duration, rpe_target,
      session_feedback(duration_seconds, sleep_hours, energy_level, pain_level),
      session_blocks(session_exercises(sets(done, actual_reps, actual_load, actual_rpe)))`;

    Promise.all([
      supabase.from('sessions').select(sessionCols).eq('athlete_id', athleteId).gte('date', start).lte('date', end).order('date'),
      supabase.from('sessions').select(sessionCols).eq('athlete_id', athleteId).gte('date', prevStart).lte('date', prevEnd).order('date'),
      supabase.from('sessions')
        .select(`date, session_blocks(session_exercises(name, sets(done, actual_reps, actual_load)))`)
        .eq('athlete_id', athleteId).gte('date', prHistoryStart).lte('date', end).order('date'),
    ]).then(([{ data: sess }, { data: prevSess }, { data: prHistory }]) => {
      setReports(buildReports((sess ?? []) as unknown as DbSessionRaw[]));
      setPrevReports(buildReports((prevSess ?? []) as unknown as DbSessionRaw[]));
      setMonthlyPRs(computeMonthlyPRs((prHistory ?? []) as unknown as PrSessionRaw[], start, end));
      setLoading(false);
    });
  }, [athleteId, authLoading, year, month, prevYear, prevMonthNum]);

  const byDate = useMemo(() => {
    const map = new Map<string, SessionReport[]>();
    for (const r of reports) {
      if (!map.has(r.date)) map.set(r.date, []);
      map.get(r.date)!.push(r);
    }
    return map;
  }, [reports]);

  const summary = useMemo(() => summarizeMonth(reports, year, month), [reports, year, month]);
  const prevSummary = useMemo(() => summarizeMonth(prevReports, prevYear, prevMonthNum), [prevReports, prevYear, prevMonthNum]);

  const calendarCells = useMemo(() => {
    const first = new Date(year, month - 1, 1);
    const startOffset = (first.getDay() + 6) % 7;
    const total = daysInMonth(year, month);
    const cells: ({ day: number; status: DayStatus | 'descanso' } | null)[] = [];
    for (let i = 0; i < startOffset; i++) cells.push(null);
    for (let d = 1; d <= total; d++) {
      const sessions = byDate.get(toISO(year, month, d));
      cells.push({ day: d, status: sessions ? dayStatusFor(sessions) : 'descanso' });
    }
    return cells;
  }, [byDate, year, month]);

  const sleepRpePoints = useMemo(() =>
    reports.filter(r => r.sleepHours != null || r.avgRpe != null)
      .sort((a, b) => a.date.localeCompare(b.date))
      .map(r => ({ date: r.date, sleepHours: r.sleepHours, rpe: r.avgRpe }))
  , [reports]);

  const loadPoints = useMemo(() =>
    reports.filter(r => r.trainingLoad != null)
      .sort((a, b) => a.date.localeCompare(b.date))
      .map(r => ({ date: r.date, load: round1(r.trainingLoad!) }))
  , [reports]);

  function prevMonthNav() {
    if (month === 1) { setMonth(12); setYear(y => y - 1); } else setMonth(m => m - 1);
  }
  function nextMonthNav() {
    if (month === 12) { setMonth(1); setYear(y => y + 1); } else setMonth(m => m + 1);
  }
  function goToday() { setYear(today.getFullYear()); setMonth(today.getMonth() + 1); }

  const sortedReports = useMemo(() => [...reports].sort((a, b) => b.date.localeCompare(a.date)), [reports]);

  if (authLoading || loading) {
    return (
      <div style={{ padding: '40px 16px', textAlign: 'center', color: 'var(--d-text-muted)', fontSize: 14 }}>
        Cargando tu informe...
      </div>
    );
  }

  return (
    <div style={{ padding: '16px 16px 28px' }}>
      {/* Month nav */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--d-text)' }}>{MONTH_NAMES[month - 1]} {year}</div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button className="btn btn-ghost btn-sm" onClick={prevMonthNav}><ChevronLeft size={12}/></button>
          <button className="btn btn-ghost btn-sm" onClick={goToday}>Hoy</button>
          <button className="btn btn-ghost btn-sm" onClick={nextMonthNav}><ChevronRight size={12}/></button>
        </div>
      </div>

      {reports.length === 0 && monthlyPRs.length === 0 ? (
        <div style={{ padding: '48px 16px', textAlign: 'center' }}>
          <div style={{ fontSize: 30, marginBottom: 10 }}>📊</div>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--d-text)', marginBottom: 6 }}>Sin sesiones este mes</div>
          <div style={{ fontSize: 12, color: 'var(--d-text-faint)', lineHeight: 1.5 }}>
            Todavía no tienes sesiones registradas en {MONTH_NAMES[month - 1]}.
          </div>
        </div>
      ) : (
        <>
          {/* Récords del mes — lead with the win */}
          {monthlyPRs.length > 0 && (
            <div style={{ background: 'linear-gradient(135deg, rgba(245,166,35,0.18) 0%, var(--d-surface) 100%)', border: '1px solid rgba(245,166,35,0.35)', borderRadius: 18, padding: 16, marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <span style={{ fontSize: 18 }}>🏆</span>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--d-text)' }}>
                  {monthlyPRs.length === 1 ? '¡Nuevo récord este mes!' : `¡${monthlyPRs.length} récords este mes!`}
                </div>
              </div>
              <div style={{ display: 'grid', gap: 8 }}>
                {monthlyPRs.slice(0, 5).map(pr => (
                  <div key={pr.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--d-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{pr.name}</div>
                      <div style={{ fontSize: 10, color: 'var(--d-text-faint)', marginTop: 1 }}>{pr.reps} × {pr.load} kg · {fmtDate(pr.date)}</div>
                    </div>
                    <div className="mono" style={{ fontSize: 15, fontWeight: 800, color: '#F5A623', flexShrink: 0 }}>{round1(pr.rm1)} kg</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Días entrenados / parciales / no entrenados */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 10 }}>
            <SummaryCard label="Entrenados" value={String(summary.entrenados)} color="var(--green)"/>
            <SummaryCard label="Parciales" value={String(summary.parciales)} color="var(--amber)"/>
            <SummaryCard label="No entrenados" value={String(summary.noEntrenados)} color="var(--red)"/>
          </div>

          <div style={{ fontSize: 10, color: 'var(--d-text-faint)', textAlign: 'center', marginBottom: 14 }}>
            {computeDelta(summary.entrenados, prevSummary.entrenados, 'up-good')?.text ?? `vs. ${MONTH_NAMES[prevMonthNum - 1]}`}
          </div>

          {/* Sueño / RPE / Carga */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 16 }}>
            <SummaryCard label="Sueño prom." value={summary.avgSleep != null ? `${round1(summary.avgSleep)}h` : '—'} color="#4A8AF0"/>
            <SummaryCard label="RPE prom." value={summary.avgRpe != null ? String(round1(summary.avgRpe)) : '—'} color="#F5A623"/>
            <SummaryCard label="Carga (UA)" value={String(Math.round(summary.loadTotal))} color="var(--vitta-blue)"/>
          </div>

          {/* Mini calendar */}
          <div style={{ background: 'var(--d-surface)', border: '1px solid var(--d-border)', borderRadius: 16, padding: 16, marginBottom: 14 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--d-text)', marginBottom: 10 }}>Calendario del mes</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginBottom: 6 }}>
              {DAY_HEADERS.map((d, i) => (
                <div key={i} style={{ textAlign: 'center', fontSize: 9, fontWeight: 700, color: 'var(--d-text-faint)' }}>{d}</div>
              ))}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
              {calendarCells.map((cell, i) => {
                if (!cell) return <div key={i}/>;
                const color = cell.status === 'descanso' ? 'var(--d-text-faint)' : STATUS_COLOR[cell.status];
                return (
                  <div key={i} style={{
                    aspectRatio: '1', borderRadius: 6, display: 'grid', placeItems: 'center',
                    background: cell.status === 'descanso' ? 'var(--d-border)' : `${STATUS_COLOR[cell.status]}22`,
                    border: `1px solid ${cell.status === 'descanso' ? 'var(--d-border)' : `${STATUS_COLOR[cell.status]}55`}`,
                  }}>
                    <span className="mono" style={{ fontSize: 10, fontWeight: 700, color }}>{cell.day}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Charts */}
          <div style={{ background: 'var(--d-surface)', border: '1px solid var(--d-border)', borderRadius: 16, padding: 16, marginBottom: 14 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--d-text)', marginBottom: 10 }}>Sueño y RPE</div>
            <SleepRpeChart points={sleepRpePoints}/>
          </div>
          <div style={{ background: 'var(--d-surface)', border: '1px solid var(--d-border)', borderRadius: 16, padding: 16, marginBottom: 14 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--d-text)', marginBottom: 10 }}>Carga de entrenamiento</div>
            <LoadChart points={loadPoints}/>
          </div>

          {/* Session list */}
          {sortedReports.length > 0 && (
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--d-text)', marginBottom: 10 }}>Tus sesiones</div>
              <div style={{ display: 'grid', gap: 8 }}>
                {sortedReports.map(r => (
                  <div key={r.id} style={{
                    background: `${STATUS_COLOR[r.status]}10`,
                    border: `1px solid ${STATUS_COLOR[r.status]}30`,
                    borderRadius: 12, padding: '10px 12px',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: r.status !== 'no_completado' ? 6 : 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--d-text)' }}>{r.title}</div>
                      <span style={{
                        fontSize: 9, fontWeight: 700, padding: '1px 6px', borderRadius: 4,
                        background: `${STATUS_COLOR[r.status]}25`, color: STATUS_COLOR[r.status],
                        textTransform: 'uppercase', letterSpacing: '0.05em',
                      }}>
                        {STATUS_LABEL[r.status]}
                      </span>
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--d-text-faint)' }}>{fmtDate(r.date)}</div>
                    {r.status !== 'no_completado' && (
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
                        {r.sleepHours != null && <span style={{ fontSize: 10, color: '#4A8AF0' }}>💤 {r.sleepHours}h</span>}
                        {r.avgRpe != null && <span style={{ fontSize: 10, color: '#F5A623' }}>RPE {round1(r.avgRpe)}</span>}
                        {r.painLevel && r.painLevel !== 'ninguno' && <span style={{ fontSize: 10, color: 'var(--red)' }}>⚠ {PAIN_LABEL[r.painLevel]}</span>}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function SummaryCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{ background: 'var(--d-surface)', border: '1px solid var(--d-border)', borderRadius: 12, padding: '10px 6px', textAlign: 'center' }}>
      <div className="mono" style={{ fontSize: 18, fontWeight: 800, color }}>{value}</div>
      <div style={{ fontSize: 8.5, color: 'var(--d-text-faint)', textTransform: 'uppercase', letterSpacing: '0.04em', marginTop: 2 }}>{label}</div>
    </div>
  );
}
