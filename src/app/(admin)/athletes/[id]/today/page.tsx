'use client';
import { useState, useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase';
import { CATEGORIES } from '@/lib/constants';
import { getCategoryIcon, ChevronLeft } from '@/components/icons';
import LevelBadge from '@/components/badges/LevelBadge';
import type { CategoryId, LevelId } from '@/lib/types';

interface SetRow { id: string; reps: string | null; load: number | null; rpe_target: number | null; rest: string | null; sort_order: number; }
interface ExRow  { id: string; name: string; level: string | null; note: string | null; sort_order: number; sets: SetRow[]; }
interface BlRow  { id: string; name: string; category: CategoryId; color: string | null; sort_order: number; session_exercises: ExRow[]; }
interface SessRow { id: string; title: string; duration: number; rpe_target: number; session_blocks: BlRow[]; }

function toISO(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export default function AthleteToday() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const athleteId = pathname.split('/athletes/')[1]?.split('/')[0] ?? '';

  // Use ?date= param if provided (when opened from admin planner for a specific day)
  const dateParam = searchParams.get('date');
  const targetDate = dateParam || toISO(new Date());

  const [session, setSession] = useState<SessRow | null>(null);
  const [athleteName, setAthleteName] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!athleteId) { setLoading(false); return; }
    const supabase = createClient();

    Promise.all([
      supabase.from('athletes').select('name').eq('id', athleteId).maybeSingle(),
      supabase
        .from('sessions')
        .select(`
          id, title, duration, rpe_target,
          session_blocks (
            id, name, category, color, sort_order,
            session_exercises (
              id, name, level, note, sort_order,
              sets ( id, reps, load, rpe_target, rest, sort_order )
            )
          )
        `)
        .eq('athlete_id', athleteId)
        .eq('date', targetDate)
        .order('created_at')
        .limit(1)
        .maybeSingle(),
    ]).then(([{ data: ath }, { data: sess }]) => {
      if (ath) setAthleteName(ath.name);
      if (sess) {
        setSession({
          ...sess,
          session_blocks: (sess.session_blocks || [])
            .sort((a: any, b: any) => a.sort_order - b.sort_order)
            .map((bl: any) => ({
              ...bl,
              session_exercises: (bl.session_exercises || [])
                .sort((a: any, b: any) => a.sort_order - b.sort_order)
                .map((ex: any) => ({
                  ...ex,
                  sets: (ex.sets || []).sort((a: any, b: any) => a.sort_order - b.sort_order),
                })),
            })),
        });
      }
      setLoading(false);
    });
  }, [athleteId, targetDate]);

  const mainBlock = session?.session_blocks.find(b => !['movilidad','preventivos'].includes(b.category)) || session?.session_blocks[0];
  const mainCat   = mainBlock ? (CATEGORIES[mainBlock.category] || CATEGORIES.empuje) : CATEGORIES.empuje;

  const dateLabel = new Date(targetDate + 'T12:00:00').toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <div style={{ padding: '20px 24px 28px', maxWidth: 860, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <Link href={`/athletes/${athleteId}/planner`} style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-muted)', fontSize: 12, textDecoration: 'none' }}>
          <ChevronLeft size={14}/>Volver al planificador
        </Link>
        <span style={{ color: 'var(--border)' }}>·</span>
        <span style={{ fontSize: 13, fontWeight: 600 }}>{athleteName || '…'} · {dateLabel}</span>
      </div>

      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>Cargando...</div>
      ) : !session ? (
        <div className="card" style={{ padding: 40, textAlign: 'center' }}>
          <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 6 }}>Sin sesión planificada</div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{athleteName} no tiene sesión para {dateLabel}.</div>
        </div>
      ) : (
        <>
          {/* Hero card */}
          <div className="card" style={{
            padding: 20, marginBottom: 16,
            background: `linear-gradient(135deg, ${mainCat.color}14 0%, var(--surface) 60%)`,
            borderLeft: `4px solid ${mainCat.color}`,
          }}>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
              {session.session_blocks
                .filter(b => !['movilidad','preventivos'].includes(b.category))
                .map(b => {
                  const c = CATEGORIES[b.category];
                  const Ic = getCategoryIcon(b.category);
                  return (
                    <span key={b.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 8px', borderRadius: 5, background: c?.color || '#2E6BD6', color: '#fff', fontSize: 10, fontWeight: 700 }}>
                      <Ic size={10} stroke="currentColor"/>{(c?.label || b.category).toUpperCase()}
                    </span>
                  );
                })}
            </div>
            <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 14 }}>{session.title}</div>
            <div style={{ display: 'flex', gap: 20 }}>
              {[
                { label: 'Duración',     value: `${session.duration} min` },
                { label: 'RPE objetivo', value: session.rpe_target },
                { label: 'Bloques',      value: session.session_blocks.length },
              ].map(s => (
                <div key={s.label}>
                  <div style={{ fontSize: 18, fontWeight: 700 }}>{s.value}</div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700 }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Blocks */}
          <div style={{ display: 'grid', gap: 12 }}>
            {session.session_blocks.map((block, bi) => {
              const Ic = getCategoryIcon(block.category);
              const blockColor = block.color || CATEGORIES[block.category]?.color || '#2E6BD6';
              return (
                <div key={block.id} className="card" style={{ padding: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                    <div style={{ width: 32, height: 32, borderRadius: 8, background: `${blockColor}22`, color: blockColor, display: 'grid', placeItems: 'center' }}>
                      <Ic size={16} stroke="currentColor"/>
                    </div>
                    <div>
                      <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Bloque {String.fromCharCode(65 + bi)}</div>
                      <div style={{ fontSize: 15, fontWeight: 600 }}>{block.name}</div>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gap: 8 }}>
                    {block.session_exercises.map((ex, idx) => (
                      <div key={ex.id} style={{ background: 'var(--surface-2)', borderRadius: 8, overflow: 'hidden', border: '1px solid var(--border)' }}>
                        <div style={{ padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span className="mono" style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700 }}>{String.fromCharCode(65 + bi)}{idx + 1}</span>
                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <span style={{ fontSize: 13, fontWeight: 600 }}>{ex.name}</span>
                              {ex.level && <LevelBadge level={ex.level as LevelId} size="sm"/>}
                            </div>
                            {ex.note && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{ex.note}</div>}
                          </div>
                        </div>

                        {ex.sets.length > 0 && (
                          <div style={{ borderTop: '1px solid var(--border)' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '32px 80px 80px 60px 1fr', gap: 8, padding: '5px 12px', fontSize: 9, color: 'var(--text-muted)', letterSpacing: '0.06em', textTransform: 'uppercase', fontWeight: 700 }}>
                              <div>SET</div><div>REPS</div><div>CARGA</div><div>RPE</div><div>DESCANSO</div>
                            </div>
                            {ex.sets.map((s, si) => (
                              <div key={s.id} style={{ display: 'grid', gridTemplateColumns: '32px 80px 80px 60px 1fr', gap: 8, padding: '6px 12px', alignItems: 'center', borderTop: '1px solid var(--border)', fontSize: 12 }}>
                                <span className="mono" style={{ fontWeight: 700, color: 'var(--text-muted)' }}>{si + 1}</span>
                                <span className="mono">{s.reps || '—'}</span>
                                <span className="mono">{s.load != null ? `${s.load} kg` : '—'}</span>
                                <span className="mono" style={{ color: s.rpe_target ? 'var(--vitta-blue)' : 'var(--text-muted)' }}>{s.rpe_target ?? '—'}</span>
                                <span className="mono" style={{ color: 'var(--text-muted)' }}>{s.rest || '—'}</span>
                              </div>
                            ))}
                          </div>
                        )}

                        {ex.sets.length === 0 && (
                          <div style={{ padding: '6px 12px 10px', fontSize: 11, color: 'var(--text-muted)', borderTop: '1px solid var(--border)' }}>Sin series configuradas.</div>
                        )}
                      </div>
                    ))}
                    {block.session_exercises.length === 0 && (
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Sin ejercicios en este bloque.</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
