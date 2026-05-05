'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase';
import { CATEGORIES } from '@/lib/constants';
import { ChevronLeft, ChevronRight } from '@/components/icons';

// ─── Helpers ─────────────────────────────────────────────────

function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function toISO(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function weekLabel(start: Date): string {
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  const months = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
  if (start.getMonth() === end.getMonth()) {
    return `${start.getDate()}–${end.getDate()} ${months[start.getMonth()]} ${start.getFullYear()}`;
  }
  return `${start.getDate()} ${months[start.getMonth()]} – ${end.getDate()} ${months[end.getMonth()]} ${end.getFullYear()}`;
}

const DAY_LABELS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

// ─── Types ───────────────────────────────────────────────────

interface AthleteRow { id: string; name: string; initials: string; color: string; focus: string | null; }
interface SessionCell { id: string; title: string; duration: number; color: string; }

// ─── Page ────────────────────────────────────────────────────

export default function PlannerPage() {
  const [weekStart, setWeekStart] = useState(() => getWeekStart(new Date()));
  const [athletes, setAthletes] = useState<AthleteRow[]>([]);
  const [sessions, setSessions] = useState<Map<string, SessionCell>>(new Map());
  const [loading, setLoading] = useState(true);

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    return d;
  });

  const todayISO = toISO(new Date());

  useEffect(() => {
    setLoading(true);
    const supabase = createClient();
    const endDate = new Date(weekStart);
    endDate.setDate(endDate.getDate() + 6);

    Promise.all([
      supabase.from('athletes').select('id, name, initials, color, focus').order('name'),
      supabase
        .from('sessions')
        .select('id, title, duration, athlete_id, date, session_blocks(category, color, sort_order)')
        .gte('date', toISO(weekStart))
        .lte('date', toISO(endDate)),
    ]).then(([{ data: aths }, { data: sess }]) => {
      setAthletes(aths || []);

      const map = new Map<string, SessionCell>();
      for (const s of (sess || [])) {
        const blocks = [...(s.session_blocks || [])].sort((a: any, b: any) => a.sort_order - b.sort_order);
        const main = blocks.find((b: any) => !['movilidad', 'preventivos'].includes(b.category)) || blocks[0];
        const color = main?.color || CATEGORIES[main?.category]?.color || '#2E6BD6';
        map.set(`${s.athlete_id}|${s.date}`, { id: s.id, title: s.title, duration: s.duration, color });
      }
      setSessions(map);
      setLoading(false);
    });
  }, [weekStart]);

  const prevWeek = () => setWeekStart(d => { const n = new Date(d); n.setDate(n.getDate() - 7); return n; });
  const nextWeek = () => setWeekStart(d => { const n = new Date(d); n.setDate(n.getDate() + 7); return n; });
  const goToday  = () => setWeekStart(getWeekStart(new Date()));

  const totalSessions = sessions.size;
  const todaySessions = [...sessions.keys()].filter(k => k.endsWith(`|${todayISO}`)).length;

  return (
    <div style={{ padding: '20px 24px 32px', maxWidth: 1120, margin: '0 auto' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 700 }}>Planificador semanal</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>Visión general de todos los atletas</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button onClick={prevWeek} className="btn btn-ghost" style={{ padding: '6px 8px' }}>
            <ChevronLeft size={16}/>
          </button>
          <span style={{ fontSize: 13, fontWeight: 600, minWidth: 170, textAlign: 'center' }}>
            {weekLabel(weekStart)}
          </span>
          <button onClick={nextWeek} className="btn btn-ghost" style={{ padding: '6px 8px' }}>
            <ChevronRight size={16}/>
          </button>
          <button onClick={goToday} className="btn btn-ghost" style={{ fontSize: 12, padding: '6px 12px' }}>
            Hoy
          </button>
        </div>
      </div>

      {/* Grid */}
      <div className="card" style={{ overflow: 'hidden', padding: 0 }}>

        {/* Column headers */}
        <div style={{ display: 'grid', gridTemplateColumns: '170px repeat(7, 1fr)', borderBottom: '1px solid var(--border)' }}>
          <div style={{ padding: '10px 16px', fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase', display: 'flex', alignItems: 'center' }}>
            Atleta
          </div>
          {days.map((day, i) => {
            const iso = toISO(day);
            const isToday = iso === todayISO;
            return (
              <div key={i} style={{
                padding: '10px 0', textAlign: 'center',
                borderLeft: '1px solid var(--border)',
                background: isToday ? 'rgba(46,107,214,0.07)' : 'transparent',
              }}>
                <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: isToday ? 'var(--vitta-blue)' : 'var(--text-muted)' }}>
                  {DAY_LABELS[i]}
                </div>
                <div style={{ fontSize: 15, fontWeight: isToday ? 700 : 500, color: isToday ? 'var(--vitta-blue)' : 'var(--text)', marginTop: 2 }}>
                  {day.getDate()}
                </div>
              </div>
            );
          })}
        </div>

        {/* Rows */}
        {loading ? (
          <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>Cargando...</div>
        ) : athletes.length === 0 ? (
          <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>Sin atletas registrados.</div>
        ) : athletes.map((ath, ai) => (
          <div key={ath.id} style={{
            display: 'grid',
            gridTemplateColumns: '170px repeat(7, 1fr)',
            borderTop: '1px solid var(--border)',
          }}>
            {/* Athlete cell */}
            <Link href={`/athletes/${ath.id}/planner`} style={{
              padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 8,
              textDecoration: 'none', color: 'var(--text)',
              borderRight: '1px solid var(--border)',
              transition: 'background 0.12s',
            }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-2)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              <div style={{
                width: 30, height: 30, borderRadius: 15, flexShrink: 0,
                background: ath.color || '#2E6BD6', color: '#fff',
                display: 'grid', placeItems: 'center', fontSize: 10, fontWeight: 700,
              }}>
                {ath.initials || ath.name.slice(0, 2).toUpperCase()}
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {ath.name}
                </div>
                {ath.focus && (
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {ath.focus}
                  </div>
                )}
              </div>
            </Link>

            {/* Day cells */}
            {days.map((day, di) => {
              const iso = toISO(day);
              const isToday = iso === todayISO;
              const cell = sessions.get(`${ath.id}|${iso}`);
              return (
                <div key={di} style={{
                  borderLeft: '1px solid var(--border)',
                  background: isToday ? 'rgba(46,107,214,0.03)' : 'transparent',
                  minHeight: 58,
                }}>
                  {cell ? (
                    <Link href={`/athletes/${ath.id}/planner`} style={{
                      display: 'block', padding: '8px 10px',
                      textDecoration: 'none', height: '100%',
                      transition: 'background 0.12s',
                    }}
                      onMouseEnter={e => (e.currentTarget.style.background = `${cell.color}12`)}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    >
                      <div style={{
                        fontSize: 10, fontWeight: 600, color: cell.color, lineHeight: 1.35,
                        display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                      }}>
                        {cell.title}
                      </div>
                      <div style={{ fontSize: 9, color: 'var(--text-muted)', marginTop: 4, fontWeight: 600 }}>
                        {cell.duration} min
                      </div>
                    </Link>
                  ) : (
                    <div style={{ padding: '16px 10px', fontSize: 11, color: 'var(--text-muted)', opacity: 0.35, textAlign: 'center' }}>
                      —
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* Footer stats */}
      {!loading && athletes.length > 0 && (
        <div style={{ marginTop: 14, display: 'flex', gap: 14, fontSize: 12, color: 'var(--text-muted)' }}>
          <span><strong style={{ color: 'var(--text)' }}>{totalSessions}</strong> sesiones esta semana</span>
          <span style={{ opacity: 0.4 }}>·</span>
          <span><strong style={{ color: 'var(--vitta-blue)' }}>{todaySessions}</strong> sesiones hoy</span>
          <span style={{ opacity: 0.4 }}>·</span>
          <span><strong style={{ color: 'var(--text)' }}>{athletes.length}</strong> atletas</span>
        </div>
      )}
    </div>
  );
}
