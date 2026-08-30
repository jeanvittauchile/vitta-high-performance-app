interface DbSetLite { done: boolean | null; actual_reps: number | null; actual_load: number | null; actual_rpe: number | null; }
interface DbExLite { sets: DbSetLite[] | null; }
interface DbBlockLite { session_exercises: DbExLite[] | null; }
interface DbFeedbackLite { duration_seconds: number | null; sleep_hours: number | null; }
interface DbSessionLite {
  date: string;
  duration: number;
  rpe_target: number;
  session_feedback: DbFeedbackLite[] | DbFeedbackLite | null;
  session_blocks: DbBlockLite[] | null;
}

export interface MonthLoadSummary {
  entrenados: number;
  parciales: number;
  noEntrenados: number;
  avgRpe: number | null;
  avgSleep: number | null;
  loadTotal: number;
}

// Mirrors the per-session status/load logic used by the athlete monthly report
// (RPE × duration, in "UA"), so this widget's numbers stay consistent with it.
export function computeMonthLoadSummary(raw: DbSessionLite[]): MonthLoadSummary {
  const byDate = new Map<string, { status: 'completo' | 'parcial' | 'no_completado'; rpe: number | null; sleep: number | null; load: number | null }[]>();

  for (const s of raw) {
    const fb = Array.isArray(s.session_feedback) ? s.session_feedback[0] : s.session_feedback;
    let totalSets = 0, doneSets = 0;
    const rpeVals: number[] = [];
    for (const block of s.session_blocks || []) {
      for (const ex of block.session_exercises || []) {
        for (const set of ex.sets || []) {
          totalSets++;
          if (set.done) {
            doneSets++;
            if (set.actual_rpe != null) rpeVals.push(set.actual_rpe);
          }
        }
      }
    }
    const hasFeedback = !!fb;
    const allSetsDone = totalSets > 0 && doneSets === totalSets;
    const status: 'completo' | 'parcial' | 'no_completado' =
      !hasFeedback ? 'no_completado' : (totalSets === 0 || allSetsDone) ? 'completo' : 'parcial';
    const avgRpe = rpeVals.length > 0 ? rpeVals.reduce((a, b) => a + b, 0) / rpeVals.length : null;
    const durationMinutes = hasFeedback
      ? (fb!.duration_seconds != null ? fb!.duration_seconds / 60 : s.duration)
      : null;
    const sessionRpe = avgRpe ?? (hasFeedback ? s.rpe_target : null);
    const trainingLoad = (sessionRpe != null && durationMinutes != null) ? sessionRpe * durationMinutes : null;

    if (!byDate.has(s.date)) byDate.set(s.date, []);
    byDate.get(s.date)!.push({ status, rpe: avgRpe, sleep: fb?.sleep_hours ?? null, load: trainingLoad });
  }

  let entrenados = 0, parciales = 0, noEntrenados = 0;
  const rpeVals: number[] = [];
  const sleepVals: number[] = [];
  let loadTotal = 0;

  for (const sessions of byDate.values()) {
    const dayStatus = sessions.every(x => x.status === 'completo')
      ? 'completo'
      : sessions.some(x => x.status !== 'no_completado') ? 'parcial' : 'no_completado';
    if (dayStatus === 'completo') entrenados++;
    else if (dayStatus === 'parcial') parciales++;
    else noEntrenados++;

    for (const x of sessions) {
      if (x.rpe != null) rpeVals.push(x.rpe);
      if (x.sleep != null) sleepVals.push(x.sleep);
      loadTotal += x.load ?? 0;
    }
  }

  return {
    entrenados, parciales, noEntrenados,
    avgRpe: rpeVals.length ? rpeVals.reduce((a, b) => a + b, 0) / rpeVals.length : null,
    avgSleep: sleepVals.length ? sleepVals.reduce((a, b) => a + b, 0) / sleepVals.length : null,
    loadTotal,
  };
}
