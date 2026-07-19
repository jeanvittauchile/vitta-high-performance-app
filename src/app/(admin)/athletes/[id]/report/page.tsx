'use client';
import { useEffect, useMemo, useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase';
import { ChevronLeft, ChevronRight, DownloadIcon, TrendIcon } from '@/components/icons';

const MONTH_NAMES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const DAY_HEADERS = ['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'];

const PAIN_LABEL: Record<string, string> = { ninguno: 'Ninguno', leve: 'Leve', moderado: 'Moderado', fuerte: 'Fuerte' };

function pad2(n: number) { return String(n).padStart(2, '0'); }
function toISO(y: number, m: number, d: number) { return `${y}-${pad2(m)}-${pad2(d)}`; }
function daysInMonth(y: number, m: number) { return new Date(y, m, 0).getDate(); }
function fmtDate(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('es-CL', { weekday: 'short', day: 'numeric', month: 'short' });
}
function formatDuration(min: number): string {
  const m = Math.round(min);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  const rem = m % 60;
  return rem > 0 ? `${h}h ${rem}m` : `${h}h`;
}
function round1(n: number) { return Math.round(n * 10) / 10; }
function shiftMonth(y: number, m: number, delta: number): [number, number] {
  const d = new Date(y, m - 1 + delta, 1);
  return [d.getFullYear(), d.getMonth() + 1];
}

// ─── Data shapes ────────────────────────────────────────────

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
  id: string;
  date: string;
  title: string;
  status: DayStatus;
  durationMinutes: number | null;
  sleepHours: number | null;
  energyLevel: number | null;
  painLevel: string | null;
  avgRpe: number | null;
  volumeLoad: number;
  trainingLoad: number | null;
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
    const durationMinutes = hasFeedback
      ? (fb!.duration_seconds != null ? fb!.duration_seconds / 60 : s.duration)
      : null;
    const sessionRpe = avgRpe ?? (hasFeedback ? s.rpe_target : null);
    const trainingLoad = (sessionRpe != null && durationMinutes != null) ? sessionRpe * durationMinutes : null;
    return {
      id: s.id, date: s.date, title: s.title, status,
      durationMinutes,
      sleepHours: fb?.sleep_hours ?? null,
      energyLevel: fb?.energy_level ?? null,
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

interface MonthSummary {
  entrenados: number; parciales: number; noEntrenados: number; descanso: number; totalDays: number;
  avgSleep: number | null; avgRpe: number | null; volumeTotal: number; loadTotal: number;
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
  const totalDays = daysInMonth(year, month);
  const descanso = totalDays - byDate.size;
  const sleepVals = reports.map(r => r.sleepHours).filter((v): v is number => v != null);
  const rpeVals = reports.map(r => r.avgRpe).filter((v): v is number => v != null);
  const volumeTotal = reports.reduce((a, r) => a + r.volumeLoad, 0);
  const loadTotal = reports.reduce((a, r) => a + (r.trainingLoad ?? 0), 0);
  return {
    entrenados, parciales, noEntrenados, descanso, totalDays,
    avgSleep: sleepVals.length ? sleepVals.reduce((a, b) => a + b, 0) / sleepVals.length : null,
    avgRpe: rpeVals.length ? rpeVals.reduce((a, b) => a + b, 0) / rpeVals.length : null,
    volumeTotal, loadTotal,
  };
}

type DeltaDirection = 'up-good' | 'down-good' | 'neutral';

function computeDelta(curr: number | null, prev: number | null, direction: DeltaDirection = 'up-good'): { text: string; color: string } | null {
  if (curr == null || prev == null) return null;
  const diff = curr - prev;
  if (Math.abs(diff) < 0.05) return { text: '=', color: 'rgba(255,255,255,0.35)' };
  const sign = diff > 0 ? '+' : '';
  let color = 'rgba(255,255,255,0.45)';
  if (direction === 'up-good') color = diff > 0 ? '#2BB673' : '#f87171';
  else if (direction === 'down-good') color = diff < 0 ? '#2BB673' : '#f87171';
  return { text: `${sign}${round1(diff)}`, color };
}

// ─── Monthly PRs (new all-time bests set within the selected month) ──────

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

const STATUS_COLOR: Record<DayStatus, string> = {
  completo: '#2BB673',
  parcial: '#F5A623',
  no_completado: '#f87171',
};
const STATUS_LABEL: Record<DayStatus, string> = {
  completo: 'Entrenado',
  parcial: 'Parcial',
  no_completado: 'No entrenado',
};

// ─── Mini charts (hand-rolled SVG, no charting library in this project) ──

function SleepRpeChart({ points }: { points: { date: string; sleepHours: number | null; rpe: number | null }[] }) {
  if (points.length < 2) return (
    <div style={{ padding: '16px 0', textAlign: 'center', fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>
      Datos insuficientes este mes para graficar la tendencia.
    </div>
  );
  const n = points.length;
  const W = 600, H = 130;
  const PAD_T = 10, PAD_B = 22;
  const plotH = H - PAD_T - PAD_B;
  const xp = (i: number) => n > 1 ? (i / (n - 1)) * W : W / 2;
  const yp = (v: number) => PAD_T + (1 - Math.max(0, Math.min(10, v)) / 10) * plotH;

  function polyPts(vals: (number | null)[]) {
    return vals.map((v, i) => v != null ? `${xp(i).toFixed(1)},${yp(v).toFixed(1)}` : null).filter(Boolean).join(' ');
  }
  const sleepPts = polyPts(points.map(p => p.sleepHours != null ? (p.sleepHours / 12) * 10 : null));
  const rpePts = polyPts(points.map(p => p.rpe));
  const labelIdxs = n <= 6 ? Array.from({ length: n }, (_, i) => i) : [0, Math.floor(n / 2), n - 1];

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', display: 'block', overflow: 'visible' }}>
        {[0.25, 0.5, 0.75].map(t => (
          <line key={t} x1={0} y1={PAD_T + t * plotH} x2={W} y2={PAD_T + t * plotH} stroke="rgba(255,255,255,0.07)" strokeWidth="0.6"/>
        ))}
        {sleepPts && <polyline points={sleepPts} fill="none" stroke="#4A8AF0" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round"/>}
        {rpePts && <polyline points={rpePts} fill="none" stroke="#F5A623" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round"/>}
        {points.map((p, i) => (
          <g key={i}>
            {p.sleepHours != null && <circle cx={xp(i)} cy={yp((p.sleepHours / 12) * 10)} r="3" fill="#4A8AF0"/>}
            {p.rpe != null && <circle cx={xp(i)} cy={yp(p.rpe)} r="3" fill="#F5A623"/>}
          </g>
        ))}
        {labelIdxs.map(i => (
          <text key={i} x={xp(i)} y={H - 4} textAnchor={i === 0 ? 'start' : i === n - 1 ? 'end' : 'middle'} fontSize="9" fill="rgba(255,255,255,0.35)" fontFamily="monospace">
            {points[i].date.slice(8)}
          </text>
        ))}
      </svg>
      <div style={{ display: 'flex', gap: 14, marginTop: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <div style={{ width: 18, height: 2.5, borderRadius: 1.5, background: '#4A8AF0' }}/>
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>Horas de sueño (/12)</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <div style={{ width: 18, height: 2.5, borderRadius: 1.5, background: '#F5A623' }}/>
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>RPE (/10)</span>
        </div>
      </div>
    </div>
  );
}

function LoadChart({ points }: { points: { date: string; load: number }[] }) {
  if (points.length === 0) return (
    <div style={{ padding: '16px 0', textAlign: 'center', fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>
      Sin datos de carga registrados este mes.
    </div>
  );
  const W = 600, H = 130;
  const PAD_T = 10, PAD_B = 22;
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
          return <rect key={i} x={x} y={y} width={barW} height={barH} rx={2} fill="#2BB673" opacity={0.8}/>;
        })}
        {points.map((p, i) => (
          n <= 12 && <text key={i} x={i * gap + gap / 2} y={H - 4} textAnchor="middle" fontSize="9" fill="rgba(255,255,255,0.35)" fontFamily="monospace">{p.date.slice(8)}</text>
        ))}
      </svg>
      <div style={{ marginTop: 8, fontSize: 11, color: 'rgba(255,255,255,0.4)', textAlign: 'right' }}>
        Carga de entrenamiento diaria (RPE × duración) · UA
      </div>
    </div>
  );
}

export default function AthleteMonthlyReport() {
  const pathname = usePathname();
  const athleteId = pathname.split('/athletes/')[1]?.split('/')[0] ?? '';

  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [athleteName, setAthleteName] = useState('');
  const [reports, setReports] = useState<SessionReport[]>([]);
  const [prevReports, setPrevReports] = useState<SessionReport[]>([]);
  const [monthlyPRs, setMonthlyPRs] = useState<PrEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const [prevYear, prevMonthNum] = useMemo(() => shiftMonth(year, month, -1), [year, month]);

  useEffect(() => {
    if (!athleteId) { setLoading(false); return; }
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
      supabase.from('athletes').select('name').eq('id', athleteId).maybeSingle(),
      supabase.from('sessions').select(sessionCols)
        .eq('athlete_id', athleteId)
        .gte('date', start).lte('date', end)
        .order('date'),
      supabase.from('sessions').select(sessionCols)
        .eq('athlete_id', athleteId)
        .gte('date', prevStart).lte('date', prevEnd)
        .order('date'),
      supabase.from('sessions')
        .select(`date, session_blocks(session_exercises(name, sets(done, actual_reps, actual_load)))`)
        .eq('athlete_id', athleteId)
        .gte('date', prHistoryStart).lte('date', end)
        .order('date'),
    ]).then(([{ data: ath }, { data: sess }, { data: prevSess }, { data: prHistory }]) => {
      if (ath) setAthleteName(ath.name);
      setReports(buildReports((sess ?? []) as unknown as DbSessionRaw[]));
      setPrevReports(buildReports((prevSess ?? []) as unknown as DbSessionRaw[]));
      setMonthlyPRs(computeMonthlyPRs((prHistory ?? []) as unknown as PrSessionRaw[], start, end));
      setLoading(false);
    });
  }, [athleteId, year, month, prevYear, prevMonthNum]);

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
    const cells: ({ date: string; day: number; status: DayStatus | 'descanso' } | null)[] = [];
    for (let i = 0; i < startOffset; i++) cells.push(null);
    for (let d = 1; d <= total; d++) {
      const dateISO = toISO(year, month, d);
      const sessions = byDate.get(dateISO);
      cells.push({ date: dateISO, day: d, status: sessions ? dayStatusFor(sessions) : 'descanso' });
    }
    return cells;
  }, [byDate, year, month]);

  const sleepRpePoints = useMemo(() =>
    reports
      .filter(r => r.sleepHours != null || r.avgRpe != null)
      .sort((a, b) => a.date.localeCompare(b.date))
      .map(r => ({ date: r.date, sleepHours: r.sleepHours, rpe: r.avgRpe }))
  , [reports]);

  const loadPoints = useMemo(() =>
    reports
      .filter(r => r.trainingLoad != null)
      .sort((a, b) => a.date.localeCompare(b.date))
      .map(r => ({ date: r.date, load: round1(r.trainingLoad!) }))
  , [reports]);

  function prevMonth() {
    if (month === 1) { setMonth(12); setYear(y => y - 1); } else setMonth(m => m - 1);
  }
  function nextMonth() {
    if (month === 12) { setMonth(1); setYear(y => y + 1); } else setMonth(m => m + 1);
  }
  function goToday() { setYear(today.getFullYear()); setMonth(today.getMonth() + 1); }

  function downloadReportPDF() {
    const monthLabel = `${MONTH_NAMES[month - 1]} ${year}`;
    const sortedReports = [...reports].sort((a, b) => a.date.localeCompare(b.date));

    let html = `<!DOCTYPE html><html><head><meta charset="utf-8">
    <title>Informe ${athleteName} · ${monthLabel}</title>
    <style>
      *{margin:0;padding:0;box-sizing:border-box}
      body{font-family:'Helvetica Neue',Arial,sans-serif;font-size:11px;color:#111;background:#fff;padding:24px 28px}
      .header{display:flex;justify-content:space-between;align-items:flex-end;padding-bottom:12px;border-bottom:2.5px solid #0E1936;margin-bottom:18px}
      .athlete-name{font-size:20px;font-weight:800;color:#0E1936;letter-spacing:-.02em}
      .month-sub{font-size:10px;color:#777;margin-top:3px;letter-spacing:.06em;text-transform:uppercase;font-weight:600}
      .kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:18px}
      .kpi{border:1px solid #e2e2e2;border-radius:8px;padding:10px 12px}
      .kpi-label{font-size:8.5px;color:#999;text-transform:uppercase;letter-spacing:.06em;font-weight:700}
      .kpi-value{font-size:18px;font-weight:800;color:#0E1936;margin-top:3px}
      table{width:100%;border-collapse:collapse;font-size:9.5px;margin-top:6px}
      th{text-align:left;color:#999;font-weight:700;padding:5px 8px;letter-spacing:.04em;text-transform:uppercase;font-size:8px;border-bottom:1.5px solid #ddd}
      td{padding:5px 8px;color:#222;border-bottom:1px solid #f0f0f0}
      .badge{display:inline-block;padding:1px 7px;border-radius:4px;font-weight:700;font-size:8.5px}
      .pr-row{display:flex;justify-content:space-between;border:1px solid #e2e2e2;border-radius:8px;padding:8px 12px;margin-bottom:6px}
      .footer{font-size:8px;color:#bbb;text-align:center;padding-top:14px;margin-top:16px;border-top:1px solid #eee;letter-spacing:.04em}
    </style></head><body>
      <div class="header">
        <div>
          <div class="athlete-name">${athleteName}</div>
          <div class="month-sub">${monthLabel} · Informe mensual de entrenamiento</div>
        </div>
      </div>
      <div class="kpis">
        <div class="kpi"><div class="kpi-label">Días entrenados</div><div class="kpi-value" style="color:#2BB673">${summary.entrenados}</div></div>
        <div class="kpi"><div class="kpi-label">Días parciales</div><div class="kpi-value" style="color:#c98416">${summary.parciales}</div></div>
        <div class="kpi"><div class="kpi-label">Días no entrenados</div><div class="kpi-value" style="color:#d7474b">${summary.noEntrenados}</div></div>
        <div class="kpi"><div class="kpi-label">Descanso</div><div class="kpi-value">${summary.descanso}</div></div>
        <div class="kpi"><div class="kpi-label">Sueño promedio</div><div class="kpi-value">${summary.avgSleep != null ? round1(summary.avgSleep) + ' h' : '—'}</div></div>
        <div class="kpi"><div class="kpi-label">RPE promedio</div><div class="kpi-value">${summary.avgRpe != null ? round1(summary.avgRpe) : '—'}</div></div>
        <div class="kpi"><div class="kpi-label">Volumen total</div><div class="kpi-value">${Math.round(summary.volumeTotal)} kg</div></div>
        <div class="kpi"><div class="kpi-label">Carga entren. total</div><div class="kpi-value">${Math.round(summary.loadTotal)} UA</div></div>
      </div>
      ${monthlyPRs.length > 0 ? `
      <div style="font-size:11px;font-weight:800;color:#0E1936;margin-bottom:8px;text-transform:uppercase;letter-spacing:.05em">🏆 Récords del mes</div>
      <div style="margin-bottom:16px">
        ${monthlyPRs.map(pr => `<div class="pr-row">
          <div><strong>${pr.name}</strong><div style="color:#888;font-size:8.5px;margin-top:2px">${fmtDate(pr.date)} · ${pr.reps} × ${pr.load} kg</div></div>
          <div style="font-weight:800;color:#c98416">${round1(pr.rm1)} kg <span style="font-weight:500;color:#999;font-size:8px">1RM est.</span></div>
        </div>`).join('')}
      </div>` : ''}
      <table>
        <thead><tr><th>Fecha</th><th>Sesión</th><th>Estado</th><th>Duración</th><th>Sueño</th><th>RPE</th><th>Dolor</th><th>Volumen (kg)</th></tr></thead>
        <tbody>
          ${sortedReports.map(r => `<tr>
            <td>${fmtDate(r.date)}</td>
            <td>${r.title}</td>
            <td><span class="badge" style="background:${STATUS_COLOR[r.status]}22;color:${STATUS_COLOR[r.status]}">${STATUS_LABEL[r.status]}</span></td>
            <td>${r.durationMinutes != null ? formatDuration(r.durationMinutes) : '—'}</td>
            <td>${r.sleepHours != null ? r.sleepHours + 'h' : '—'}</td>
            <td>${r.avgRpe != null ? round1(r.avgRpe) : '—'}</td>
            <td>${r.painLevel ? PAIN_LABEL[r.painLevel] || r.painLevel : '—'}</td>
            <td>${r.volumeLoad > 0 ? Math.round(r.volumeLoad) : '—'}</td>
          </tr>`).join('')}
        </tbody>
      </table>
      <div class="footer">Vitta High Performance &nbsp;·&nbsp; ${athleteName} &nbsp;·&nbsp; ${monthLabel}</div>
    </body></html>`;

    const win = window.open('', '_blank');
    if (win) {
      win.document.write(html);
      win.document.close();
      win.focus();
      setTimeout(() => win.print(), 400);
    }
  }

  const sortedReports = useMemo(() => [...reports].sort((a, b) => b.date.localeCompare(a.date)), [reports]);

  return (
    <div style={{ minHeight: '100vh', background: '#0E1936' }}>
      {/* Admin bar */}
      <div style={{ background: 'rgba(46,107,214,0.15)', borderBottom: '1px solid rgba(46,107,214,0.3)', padding: '8px 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <Link href={`/athletes/${athleteId}/planner`} style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'rgba(255,255,255,0.6)', fontSize: 12, textDecoration: 'none' }}>
          <ChevronLeft size={14}/>Volver al planificador
        </Link>
        <span style={{ color: 'rgba(255,255,255,0.2)' }}>·</span>
        <Link href={`/athletes/${athleteId}/progress`} style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, textDecoration: 'none' }}>
          Ver progreso
        </Link>
        <span style={{ fontSize: 11, color: 'rgba(46,107,214,0.9)', background: 'rgba(46,107,214,0.15)', padding: '2px 8px', borderRadius: 4, fontWeight: 700, letterSpacing: '0.06em', marginLeft: 4 }}>MODO COACH</span>
        {athleteName && (
          <span style={{ marginLeft: 'auto', fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.7)' }}>{athleteName}</span>
        )}
      </div>

      <div style={{ maxWidth: 760, margin: '0 auto', padding: '20px 16px 48px' }}>

        {/* Title + month nav + PDF */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <TrendIcon size={20} stroke="rgba(74,138,240,0.9)"/>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#F4EFE0' }}>Informe mensual</div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>{MONTH_NAMES[month - 1]} {year}</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <button className="btn btn-ghost btn-sm" onClick={prevMonth}><ChevronLeft size={12}/></button>
            <button className="btn btn-ghost btn-sm" onClick={goToday}>Hoy</button>
            <button className="btn btn-ghost btn-sm" onClick={nextMonth}><ChevronRight size={12}/></button>
            <button className="btn btn-ghost btn-sm" onClick={downloadReportPDF} title="Descargar informe en PDF">
              <DownloadIcon size={13}/>PDF
            </button>
          </div>
        </div>

        {loading ? (
          <div style={{ padding: 60, textAlign: 'center', color: 'rgba(255,255,255,0.4)', fontSize: 13 }}>Cargando informe...</div>
        ) : reports.length === 0 ? (
          <div style={{ padding: '60px 20px', textAlign: 'center' }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>📊</div>
            <div style={{ fontSize: 15, fontWeight: 600, color: '#F4EFE0', marginBottom: 6 }}>Sin sesiones este mes</div>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', lineHeight: 1.5 }}>
              No hay sesiones programadas para {athleteName || 'este atleta'} en {MONTH_NAMES[month - 1]} {year}.
            </div>
          </div>
        ) : (
          <>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginBottom: 8 }}>
              Comparado con {MONTH_NAMES[prevMonthNum - 1]} {prevYear}
            </div>

            {/* Días: entrenados / parciales / no entrenados / descanso */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 16 }}>
              <SummaryCard label="Entrenados" value={String(summary.entrenados)} color="#2BB673" delta={computeDelta(summary.entrenados, prevSummary.entrenados, 'up-good')}/>
              <SummaryCard label="Parciales" value={String(summary.parciales)} color="#F5A623" delta={computeDelta(summary.parciales, prevSummary.parciales, 'down-good')}/>
              <SummaryCard label="No entrenados" value={String(summary.noEntrenados)} color="#f87171" delta={computeDelta(summary.noEntrenados, prevSummary.noEntrenados, 'down-good')}/>
              <SummaryCard label="Descanso" value={String(summary.descanso)} color="rgba(255,255,255,0.6)" delta={computeDelta(summary.descanso, prevSummary.descanso, 'neutral')}/>
            </div>

            {/* Sueño / RPE / Volumen / Carga */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 20 }}>
              <SummaryCard label="Sueño prom." value={summary.avgSleep != null ? `${round1(summary.avgSleep)}h` : '—'} color="#4A8AF0" delta={computeDelta(summary.avgSleep, prevSummary.avgSleep, 'up-good')}/>
              <SummaryCard label="RPE prom." value={summary.avgRpe != null ? String(round1(summary.avgRpe)) : '—'} color="#F5A623" delta={computeDelta(summary.avgRpe, prevSummary.avgRpe, 'neutral')}/>
              <SummaryCard label="Volumen" value={`${Math.round(summary.volumeTotal)} kg`} color="#2BB673" delta={computeDelta(summary.volumeTotal, prevSummary.volumeTotal, 'up-good')}/>
              <SummaryCard label="Carga (UA)" value={String(Math.round(summary.loadTotal))} color="#4A8AF0" delta={computeDelta(summary.loadTotal, prevSummary.loadTotal, 'up-good')}/>
            </div>

            {/* Récords del mes */}
            {monthlyPRs.length > 0 && (
              <div style={{ marginBottom: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  <span style={{ fontSize: 15 }}>🏆</span>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#F4EFE0' }}>Récords del mes</div>
                </div>
                <div style={{ display: 'grid', gap: 8 }}>
                  {monthlyPRs.map(pr => (
                    <div key={pr.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '10px 14px', borderRadius: 10, background: 'rgba(245,166,35,0.08)', border: '1px solid rgba(245,166,35,0.25)' }}>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: '#F4EFE0' }}>{pr.name}</div>
                        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>{fmtDate(pr.date)} · {pr.reps} × {pr.load} kg</div>
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <div className="mono" style={{ fontSize: 16, fontWeight: 800, color: '#F5A623' }}>{round1(pr.rm1)} kg</div>
                        <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.35)' }}>1RM est.</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Mini calendar */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#F4EFE0', marginBottom: 10 }}>Calendario del mes</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginBottom: 8 }}>
                {DAY_HEADERS.map(d => (
                  <div key={d} style={{ textAlign: 'center', fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase' }}>{d}</div>
                ))}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
                {calendarCells.map((cell, i) => {
                  if (!cell) return <div key={i}/>;
                  const color = cell.status === 'descanso' ? 'rgba(255,255,255,0.25)' : STATUS_COLOR[cell.status];
                  const bg = cell.status === 'descanso' ? 'rgba(255,255,255,0.03)' : `${STATUS_COLOR[cell.status]}22`;
                  const border = cell.status === 'descanso' ? '1px solid rgba(255,255,255,0.08)' : `1px solid ${STATUS_COLOR[cell.status]}55`;
                  return (
                    <div key={i} style={{ aspectRatio: '1', borderRadius: 6, background: bg, border, display: 'grid', placeItems: 'center' }}>
                      <span className="mono" style={{ fontSize: 11, fontWeight: 700, color }}>{cell.day}</span>
                    </div>
                  );
                })}
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 14px', marginTop: 10 }}>
                {(['completo', 'parcial', 'no_completado'] as DayStatus[]).map(st => (
                  <div key={st} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <div style={{ width: 9, height: 9, borderRadius: 3, background: STATUS_COLOR[st] }}/>
                    <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.45)' }}>{STATUS_LABEL[st]}</span>
                  </div>
                ))}
                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <div style={{ width: 9, height: 9, borderRadius: 3, background: 'rgba(255,255,255,0.15)' }}/>
                  <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.45)' }}>Descanso</span>
                </div>
              </div>
            </div>

            {/* Charts */}
            <div style={{ display: 'grid', gap: 14, marginBottom: 20 }}>
              <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: '16px 18px' }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#F4EFE0', marginBottom: 10 }}>Sueño y RPE</div>
                <SleepRpeChart points={sleepRpePoints}/>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: '16px 18px' }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#F4EFE0', marginBottom: 10 }}>Carga de entrenamiento</div>
                <LoadChart points={loadPoints}/>
              </div>
            </div>

            {/* Session-by-session table */}
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#F4EFE0', marginBottom: 10 }}>Detalle de sesiones</div>
              <div style={{ display: 'grid', gap: 8 }}>
                {sortedReports.map(r => (
                  <div key={r.id} style={{
                    background: `${STATUS_COLOR[r.status]}0f`,
                    border: `1px solid ${STATUS_COLOR[r.status]}30`,
                    borderRadius: 12, padding: '12px 14px',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, marginBottom: r.status !== 'no_completado' ? 8 : 0 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: '#F4EFE0' }}>{r.title}</div>
                          <span style={{
                            fontSize: 10, fontWeight: 700, padding: '1px 7px', borderRadius: 4,
                            background: `${STATUS_COLOR[r.status]}25`, color: STATUS_COLOR[r.status],
                            letterSpacing: '0.06em', textTransform: 'uppercase',
                          }}>
                            {STATUS_LABEL[r.status]}
                          </span>
                        </div>
                        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 3 }}>{fmtDate(r.date)}</div>
                      </div>
                      {r.durationMinutes != null && (
                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                          <div style={{ fontSize: 17, fontWeight: 800, color: '#4A8AF0', fontFamily: 'var(--font-mono)' }}>{formatDuration(r.durationMinutes)}</div>
                          <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>duración</div>
                        </div>
                      )}
                    </div>
                    {r.status !== 'no_completado' && (
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {r.sleepHours != null && (
                          <span style={{ padding: '3px 8px', borderRadius: 5, background: 'rgba(74,138,240,0.12)', border: '1px solid rgba(74,138,240,0.25)', fontSize: 11, color: '#4A8AF0', fontWeight: 600 }}>
                            💤 {r.sleepHours}h sueño
                          </span>
                        )}
                        {r.avgRpe != null && (
                          <span style={{ padding: '3px 8px', borderRadius: 5, background: 'rgba(245,166,35,0.10)', border: '1px solid rgba(245,166,35,0.25)', fontSize: 11, color: '#F5A623', fontWeight: 600 }}>
                            RPE {round1(r.avgRpe)}
                          </span>
                        )}
                        {r.volumeLoad > 0 && (
                          <span style={{ padding: '3px 8px', borderRadius: 5, background: 'rgba(43,182,115,0.10)', border: '1px solid rgba(43,182,115,0.22)', fontSize: 11, color: '#2BB673', fontWeight: 600 }}>
                            {Math.round(r.volumeLoad)} kg volumen
                          </span>
                        )}
                        {r.painLevel && (
                          <span style={{ padding: '3px 8px', borderRadius: 5, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', fontSize: 11, color: 'rgba(255,255,255,0.6)', fontWeight: 600 }}>
                            {r.painLevel === 'ninguno' ? '✓' : '⚠'} {PAIN_LABEL[r.painLevel] || r.painLevel}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function SummaryCard({ label, value, color, delta }: { label: string; value: string; color: string; delta?: { text: string; color: string } | null }) {
  return (
    <div style={{ padding: '10px 8px', borderRadius: 10, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', textAlign: 'center' }}>
      <div className="mono" style={{ fontSize: 20, fontWeight: 800, color, fontFamily: 'var(--font-mono)' }}>{value}</div>
      <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: 2 }}>{label}</div>
      {delta && (
        <div className="mono" style={{ fontSize: 10, fontWeight: 700, color: delta.color, marginTop: 4 }}>{delta.text}</div>
      )}
    </div>
  );
}
