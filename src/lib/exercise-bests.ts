export interface BestEntry {
  name: string;
  reps: number;
  load: number;
  rm1: number;
  rm3: number;
  rm6: number;
}

function round05(v: number): number {
  return Math.round(v * 2) / 2;
}

// Brzycki: 1RM = load × 36 / (37 - reps). Valid for reps 1–10.
// Derived nRM: nRM = 1RM × (37 - n) / 36
export function computeExerciseBests(sessions: any[]): BestEntry[] {
  const bestByName = new Map<string, { reps: number; load: number; rm1: number }>();

  for (const session of sessions) {
    for (const block of (session.session_blocks ?? [])) {
      for (const ex of (block.session_exercises ?? [])) {
        const name: string = ex.name;
        if (!name) continue;
        for (const set of (ex.sets ?? [])) {
          if (!set.done) continue;
          const reps = Number(set.actual_reps);
          const load = Number(set.actual_load);
          if (!reps || !load || reps < 1 || reps > 10 || load <= 0) continue;
          const rm1 = load * 36 / (37 - reps);
          const prev = bestByName.get(name);
          if (!prev || rm1 > prev.rm1) {
            bestByName.set(name, { reps, load, rm1 });
          }
        }
      }
    }
  }

  return [...bestByName.entries()]
    .map(([name, { reps, load, rm1 }]) => ({
      name,
      reps,
      load,
      rm1: round05(rm1),
      rm3: round05(rm1 * 34 / 36),
      rm6: round05(rm1 * 31 / 36),
    }))
    .sort((a, b) => b.rm1 - a.rm1);
}
