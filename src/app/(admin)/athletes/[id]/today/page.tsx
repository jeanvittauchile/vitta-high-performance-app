'use client';
import { useState, useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase';
import { CATEGORIES } from '@/lib/constants';
import { getCategoryIcon, ChevronLeft, ChevronDown, CheckIcon } from '@/components/icons';
import LevelBadge from '@/components/badges/LevelBadge';
import type { CategoryId, LevelId } from '@/lib/types';

interface SetRow { id: string; reps: string | null; load: number | null; rpe_target: number | null; rest: string | null; done: boolean; sort_order: number; }
interface ExRow  { id: string; name: string; level: string | null; note: string | null; sort_order: number; sets: SetRow[]; }
interface BlRow  { id: string; name: string; category: CategoryId; color: string | null; sort_order: number; session_exercises: ExRow[]; }
interface SessRow { id: string; title: string; duration: number; rpe_target: number; session_blocks: BlRow[]; }

function toISO(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function BlockCard({ block, index }: { block: BlRow; index: number }) {
  const [expanded, setExpanded] = useState(true);
  const CatIcon = getCategoryIcon(block.category);
  const blockColor = block.color || CATEGORIES[block.category]?.color || '#2E6BD6';
  const totalSets = block.session_exercises.reduce((s, e) => s + e.sets.length, 0);
  const doneSets  = block.session_exercises.reduce((s, e) => s + e.sets.filter(st => st.done).length, 0);

  return (
    <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, overflow: 'hidden' }}>
      <button onClick={() => setExpanded(e => !e)} style={{ width: '100%', border: 'none', background: 'transparent', padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', color: 'inherit', textAlign: 'left' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: `${blockColor}28`, color: blockColor, display: 'grid', placeItems: 'center' }}>
            <CatIcon size={16} stroke="currentColor"/>
          </div>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Bloque {String.fromCharCode(65 + index)}</div>
            <div style={{ fontSize: 15, fontWeight: 600, color: '#F4EFE0' }}>{block.name}</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', fontFamily: 'var(--font-mono)' }}>{doneSets}/{totalSets}</span>
          <ChevronDown size={16} style={{ transform: expanded ? 'rotate(0)' : 'rotate(-90deg)', transition: 'transform 0.2s', color: 'rgba(255,255,255,0.4)' }}/>
        </div>
      </button>

      {expanded && (
        <div style={{ padding: '0 14px 14px', display: 'grid', gap: 8 }}>
          {block.session_exercises.map((ex, idx) => {
            const allDone = ex.sets.length > 0 && ex.sets.every(s => s.done);
            return (
              <div key={ex.id} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, overflow: 'hidden', opacity: allDone ? 0.6 : 1 }}>
                <div style={{ padding: '12px 12px 8px', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
                    {String.fromCharCode(65 + index)}{idx + 1}
                  </span>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 14, fontWeight: 600, color: '#F4EFE0' }}>{ex.name}</span>
                      {ex.level && <LevelBadge level={ex.level as LevelId}/>}
                    </div>
                    {ex.note && <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 4 }}>{ex.note}</div>}
                  </div>
                </div>
                {ex.sets.length > 0 && (
                  <div style={{ padding: '0 8px 8px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '28px 60px 1fr 60px 24px', gap: 8, padding: '5px 8px', fontSize: 9, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.06em', textTransform: 'uppercase', fontWeight: 700 }}>
                      <div>SET</div><div>REPS</div><div>CARGA</div><div>RPE</div><div/>
                    </div>
                    {ex.sets.map((s, si) => (
                      <div key={s.id} style={{ display: 'grid', gridTemplateColumns: '28px 60px 1fr 60px 24px', gap: 8, padding: '8px 8px', alignItems: 'center', borderRadius: 8, background: s.done ? 'rgba(43,182,115,0.10)' : 'transparent' }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: s.done ? '#2BB673' : '#F4EFE0', fontFamily: 'var(--font-mono)' }}>{si + 1}</div>
                        <div style={{ fontSize: 13, color: '#F4EFE0', fontFamily: 'var(--font-mono)' }}>{s.reps || '—'}</div>
                        <div style={{ fontSize: 13, color: '#F4EFE0', fontFamily: 'var(--font-mono)' }}>{s.load != null ? `${s.load} kg` : '—'}</div>
                        <div style={{ fontSize: 12, color: s.rpe_target ? '#F5A623' : 'rgba(255,255,255,0.3)', fontFamily: 'var(--font-mono)' }}>{s.rpe_target ?? '—'}</div>
                        <div style={{ width: 22, height: 22, borderRadius: 11, border: `1.5px solid ${s.done ? '#2BB673' : 'rgba(255,255,255,0.25)'}`, background: s.done ? '#2BB673' : 'transparent', display: 'grid', placeItems: 'center' }}>
                          {s.done && <CheckIcon size={12} stroke="white" strokeWidth={3}/>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {ex.sets.length === 0 && (
                  <div style={{ padding: '6px 16px 12px', fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>Sin series configuradas.</div>
                )}
              </div>
            );
          })}
          {block.session_exercises.length === 0 && (
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', padding: '4px 0' }}>Sin ejercicios en este bloque.</div>
          )}
        </div>
      )}
    </div>
  );
}

export default function AthleteToday() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const athleteId = pathname.split('/athletes/')[1]?.split('/')[0] ?? '';

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
              sets ( id, reps, load, rpe_target, rest, done, sort_order )
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

  const totalSets = session?.session_blocks.reduce((s, b) => s + b.session_exercises.reduce((s2, e) => s2 + e.sets.length, 0), 0) ?? 0;
  const doneSets  = session?.session_blocks.reduce((s, b) => s + b.session_exercises.reduce((s2, e) => s2 + e.sets.filter(st => st.done).length, 0), 0) ?? 0;

  return (
    <div style={{ minHeight: '100vh', background: '#0E1936' }}>
      {/* Admin bar */}
      <div style={{ background: 'rgba(46,107,214,0.15)', borderBottom: '1px solid rgba(46,107,214,0.3)', padding: '8px 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <Link href={`/athletes/${athleteId}/planner`} style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'rgba(255,255,255,0.6)', fontSize: 12, textDecoration: 'none' }}>
          <ChevronLeft size={14}/>Volver al planificador
        </Link>
        <span style={{ color: 'rgba(255,255,255,0.2)' }}>·</span>
        <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>Vista previa del atleta</span>
        <span style={{ fontSize: 11, color: 'rgba(46,107,214,0.9)', background: 'rgba(46,107,214,0.15)', padding: '2px 8px', borderRadius: 4, fontWeight: 700, letterSpacing: '0.06em', marginLeft: 4 }}>MODO COACH</span>
        <span style={{ marginLeft: 'auto', fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.7)' }}>{athleteName || '…'} · {dateLabel}</span>
      </div>

      <div style={{ maxWidth: 430, margin: '0 auto', padding: '16px 16px 40px' }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'rgba(255,255,255,0.4)', fontSize: 13 }}>Cargando...</div>
        ) : !session ? (
          <div style={{ padding: '60px 20px', textAlign: 'center' }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>🌿</div>
            <div style={{ fontSize: 16, fontWeight: 600, color: '#F4EFE0', marginBottom: 6 }}>Sin sesión hoy</div>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', lineHeight: 1.5 }}>
              {athleteName} no tiene sesión para {dateLabel}.
            </div>
          </div>
        ) : (
          <>
            {/* Hero */}
            <div style={{
              position: 'relative', overflow: 'hidden', borderRadius: 20, padding: 18, marginBottom: 14,
              background: `linear-gradient(135deg, ${mainCat.color}28 0%, rgba(255,255,255,0.04) 60%)`,
              border: `1px solid ${mainCat.color}30`,
            }}>
              <div style={{ position: 'absolute', right: -30, top: -30, width: 180, height: 180, borderRadius: '50%', background: `radial-gradient(circle, ${mainCat.color}28 0%, transparent 70%)`, pointerEvents: 'none' }}/>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
                {session.session_blocks
                  .filter(b => !['movilidad','preventivos'].includes(b.category))
                  .map(b => {
                    const c = CATEGORIES[b.category];
                    const Ic = getCategoryIcon(b.category);
                    return (
                      <span key={b.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 8px', borderRadius: 5, background: c?.color || '#2E6BD6', color: '#fff', fontSize: 10, fontWeight: 700, letterSpacing: '0.06em' }}>
                        <Ic size={11} stroke="currentColor"/>{(c?.label || b.category).toUpperCase()}
                      </span>
                    );
                  })}
              </div>
              <div style={{ fontSize: 24, fontWeight: 700, margin: '8px 0 14px', color: '#F4EFE0' }}>{session.title}</div>
              <div style={{ display: 'flex', gap: 18 }}>
                {[
                  { label: 'Duración', value: `${session.duration}'` },
                  { label: 'RPE',      value: session.rpe_target },
                  { label: 'Series',   value: `${doneSets}/${totalSets}` },
                ].map(s => (
                  <div key={s.label}>
                    <div style={{ fontSize: 22, fontWeight: 700, color: '#F4EFE0' }}>{s.value}</div>
                    <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 600 }}>{s.label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Blocks */}
            <div style={{ display: 'grid', gap: 14 }}>
              {session.session_blocks.map((block, bi) => (
                <BlockCard key={block.id} block={block} index={bi}/>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
