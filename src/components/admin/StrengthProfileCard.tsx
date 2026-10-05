'use client';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import { CATEGORIES } from '@/lib/constants';
import { computeExerciseBests, type BestEntry } from '@/lib/exercise-bests';
import { computeStrengthStandards, LIFTS, STRENGTH_LEVELS, type Gender, type LiftStandard } from '@/lib/strength-standards';
import type { Athlete } from '@/lib/types';

interface ProfileInfo { peso: number | null; genero: Gender | null; }
interface ProfileRow { athlete_id: string; peso: number | string | null; genero: Gender | null; }
interface SessionRow { athlete_id: string; session_blocks: unknown[]; }

// Average tier across the lifts the athlete has logged (below "principiante" counts as -1).
function overallLevelIdx(standards: LiftStandard[]): number | null {
  const idxs = standards
    .filter(s => s.ratio != null)
    .map(s => (s.level ? STRENGTH_LEVELS.findIndex(l => l.id === s.level) : -1));
  if (idxs.length === 0) return null;
  return Math.round(idxs.reduce((a, b) => a + b, 0) / idxs.length);
}

function LevelChip({ idx }: { idx: number }) {
  const meta = idx >= 0 ? STRENGTH_LEVELS[idx] : null;
  return (
    <span style={{
      display: 'inline-block', padding: '2px 7px', borderRadius: 4,
      background: meta ? `${meta.color}22` : 'var(--surface-2)',
      color: meta ? meta.color : 'var(--text-faint)',
      fontSize: 9, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', whiteSpace: 'nowrap',
    }}>
      {meta ? meta.label : 'Bajo princ.'}
    </span>
  );
}

export default function StrengthProfileCard({ athletes }: { athletes: Athlete[] }) {
  const router = useRouter();
  const [profiles, setProfiles] = useState<Record<string, ProfileInfo>>({});
  const [bestsByAthlete, setBestsByAthlete] = useState<Record<string, BestEntry[]>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    Promise.all([
      supabase
        .from('athlete_profiles')
        .select('athlete_id, peso, genero, created_at')
        .order('created_at', { ascending: false }),
      supabase
        .from('sessions')
        .select('athlete_id, session_blocks(session_exercises(name, sets(done, actual_reps, actual_load)))'),
    ]).then(([profilesRes, sessionsRes]) => {
      // Rows come newest first, so the first one seen per athlete is the current profile.
      const latest: Record<string, ProfileInfo> = {};
      for (const p of (profilesRes.data ?? []) as ProfileRow[]) {
        if (!latest[p.athlete_id]) latest[p.athlete_id] = { peso: p.peso != null ? Number(p.peso) : null, genero: p.genero };
      }
      setProfiles(latest);

      const sessionsByAthlete: Record<string, SessionRow[]> = {};
      for (const s of (sessionsRes.data ?? []) as SessionRow[]) {
        (sessionsByAthlete[s.athlete_id] ||= []).push(s);
      }
      setBestsByAthlete(Object.fromEntries(
        Object.entries(sessionsByAthlete).map(([id, sessions]) => [id, computeExerciseBests(sessions)])
      ));
      setLoading(false);
    });
  }, []);

  const rows = useMemo(() => athletes.map(a => {
    const profile = profiles[a.id];
    const missing: string[] = [];
    if (!profile?.peso) missing.push('peso');
    if (!profile?.genero) missing.push('sexo');
    const standards = missing.length === 0
      ? computeStrengthStandards(bestsByAthlete[a.id] ?? [], profile!.peso, profile!.genero!)
      : [];
    return { athlete: a, profile, missing, standards, overall: overallLevelIdx(standards) };
  }), [athletes, profiles, bestsByAthlete]);

  // Only show lifts that at least one athlete has logged, so the table stays readable.
  const visibleLifts = useMemo(
    () => LIFTS.filter(l => rows.some(r => r.standards.some(s => s.lift.id === l.id && s.ratio != null))),
    [rows]
  );

  return (
    <div className="card" style={{ padding: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 12 }}>
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.04em' }}>Perfil de fuerza</div>
          <div className="muted" style={{ fontSize: 11, marginTop: 3 }}>
            1RM estimado ÷ peso corporal en los ejercicios principales · pasa el cursor sobre una celda para ver el detalle
          </div>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'flex-end' }}>
          {STRENGTH_LEVELS.map(l => (
            <div key={l.id} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <div style={{ width: 8, height: 8, borderRadius: 2, background: l.color }}/>
              <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-muted)' }}>{l.label}</span>
            </div>
          ))}
        </div>
      </div>

      {loading ? (
        <div style={{ padding: '20px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>Cargando...</div>
      ) : athletes.length === 0 ? (
        <div style={{ padding: '20px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>Sin datos aún.</div>
      ) : (
        <div className="admin-table-scroll"><table className="vtable">
          <thead>
            <tr>
              <th>Atleta</th>
              <th>Nivel global</th>
              {visibleLifts.map(l => <th key={l.id}>{l.label}</th>)}
            </tr>
          </thead>
          <tbody>
            {rows.map(({ athlete: a, profile, missing, standards, overall }) => {
              const cat = CATEGORIES[a.focus];
              return (
                <tr key={a.id} onClick={() => router.push(`/athletes/${a.id}/progress`)} style={{ cursor: 'pointer' }}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 26, height: 26, borderRadius: 13, background: a.color || cat?.color || 'var(--vitta-navy)', color: '#fff', display: 'grid', placeItems: 'center', fontSize: 10, fontWeight: 700, flexShrink: 0 }}>{a.initials}</div>
                      <div>
                        <div style={{ fontWeight: 600, whiteSpace: 'nowrap' }}>{a.name}</div>
                        <div className="muted" style={{ fontSize: 10 }}>
                          {profile?.peso ? `${profile.peso} kg` : 'Sin peso'}
                          {profile?.genero ? ` · ${profile.genero === 'femenino' ? 'F' : 'M'}` : ''}
                        </div>
                      </div>
                    </div>
                  </td>
                  {missing.length > 0 ? (
                    <td colSpan={visibleLifts.length + 1}>
                      <span className="muted" style={{ fontSize: 11 }}>Falta {missing.join(' y ')} en el perfil del atleta</span>
                    </td>
                  ) : (
                    <>
                      <td>{overall != null ? <LevelChip idx={overall}/> : <span className="muted" style={{ fontSize: 11 }}>—</span>}</td>
                      {visibleLifts.map(l => {
                        const s = standards.find(x => x.lift.id === l.id);
                        if (!s?.matched || s.ratio == null) {
                          return <td key={l.id}><span className="muted" style={{ fontSize: 11 }}>—</span></td>;
                        }
                        const idx = s.level ? STRENGTH_LEVELS.findIndex(x => x.id === s.level) : -1;
                        const color = idx >= 0 ? STRENGTH_LEVELS[idx].color : '#9098AE';
                        const next = s.nextLevel ? STRENGTH_LEVELS.find(x => x.id === s.nextLevel) : null;
                        const tooltip = [
                          `${l.label} — ${s.matched.name}`,
                          `1RM est. ${s.matched.rm1} kg · ${s.ratio.toFixed(2)}× peso corporal`,
                          next ? `${Math.round(s.progressToNext ?? 0)}% hacia ${next.label}` : 'Nivel máximo alcanzado',
                        ].join('\n');
                        return (
                          <td key={l.id} title={tooltip}>
                            <div style={{ display: 'grid', gap: 4, minWidth: 74 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <LevelChip idx={idx}/>
                                <span className="mono tnum" style={{ fontSize: 11, fontWeight: 700 }}>{s.ratio.toFixed(2)}×</span>
                              </div>
                              <div style={{ height: 3, borderRadius: 2, background: 'var(--surface-2)', overflow: 'hidden' }}>
                                <div style={{ height: '100%', width: `${s.progressToNext ?? 0}%`, background: color }}/>
                              </div>
                            </div>
                          </td>
                        );
                      })}
                    </>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table></div>
      )}

      {!loading && athletes.length > 0 && visibleLifts.length === 0 && (
        <div className="muted" style={{ fontSize: 11, marginTop: 8 }}>
          Aún no hay registros de reps y carga en ejercicios principales (banca, sentadilla, peso muerto, etc.).
        </div>
      )}
    </div>
  );
}
