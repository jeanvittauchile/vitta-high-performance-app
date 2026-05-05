'use client';
import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase';
import { CATEGORIES, LEVELS } from '@/lib/constants';
import { getCategoryIcon, PlusIcon, SearchIcon, CopyIcon, XIcon } from '@/components/icons';
import LevelBadge from '@/components/badges/LevelBadge';
import type { CategoryId, LevelId } from '@/lib/types';

interface LibExercise {
  dbId: string;
  id: string;
  name: string;
  category: CategoryId;
  level: LevelId;
  muscle: string;
  equipment: string;
}

// ─── New Exercise Modal ──────────────────────────────────────

function NewExerciseModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [category, setCategory] = useState<CategoryId>('empuje');
  const [level, setLevel] = useState<LevelId>('basico');
  const [muscle, setMuscle] = useState('');
  const [equipment, setEquipment] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  function slugify(n: string) {
    return 'ex_' + n.toLowerCase()
      .normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');
  }

  function handleNameChange(v: string) {
    setName(v);
    setSlug(slugify(v));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !slug.trim()) { setError('Nombre y slug son obligatorios.'); return; }
    setSaving(true);
    setError('');
    const supabase = createClient();
    const { error: err } = await supabase.from('exercises').insert({
      slug: slug.trim(),
      name: name.trim(),
      category,
      level,
      muscle: muscle.trim() || null,
      equipment: equipment.trim() || null,
    });
    setSaving(false);
    if (err) { setError(err.message); return; }
    onCreated();
    onClose();
  }

  const inp: React.CSSProperties = {
    width: '100%', padding: '8px 10px', borderRadius: 8,
    border: '1px solid var(--border)', background: 'var(--surface-2)',
    fontSize: 13, fontFamily: 'inherit', color: 'var(--text)', boxSizing: 'border-box',
  };

  return (
    <div onClick={e => e.target === e.currentTarget && onClose()}
      style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(14,25,54,0.55)', display: 'grid', placeItems: 'center' }}>
      <div className="card" style={{ width: 480, padding: 24, maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div style={{ fontSize: 16, fontWeight: 700 }}>Nuevo ejercicio</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
            <XIcon size={18}/>
          </button>
        </div>
        <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 14 }}>
          <div>
            <label style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-muted)', display: 'block', marginBottom: 5 }}>Nombre *</label>
            <input value={name} onChange={e => handleNameChange(e.target.value)} placeholder="ej. Press banca agarre cerrado" style={inp} required/>
          </div>
          <div>
            <label style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-muted)', display: 'block', marginBottom: 5 }}>Slug (ID único)</label>
            <input value={slug} onChange={e => setSlug(e.target.value)} placeholder="ex_press_banca_cerrado" style={{ ...inp, fontFamily: 'monospace', fontSize: 12 }}/>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-muted)', display: 'block', marginBottom: 5 }}>Categoría</label>
              <select value={category} onChange={e => setCategory(e.target.value as CategoryId)} style={inp}>
                {Object.values(CATEGORIES).map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-muted)', display: 'block', marginBottom: 5 }}>Nivel</label>
              <select value={level} onChange={e => setLevel(e.target.value as LevelId)} style={inp}>
                {Object.values(LEVELS).map(L => <option key={L.id} value={L.id}>{L.label}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-muted)', display: 'block', marginBottom: 5 }}>Músculo principal</label>
            <input value={muscle} onChange={e => setMuscle(e.target.value)} placeholder="ej. Pectoral · Tríceps" style={inp}/>
          </div>
          <div>
            <label style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-muted)', display: 'block', marginBottom: 5 }}>Equipamiento</label>
            <input value={equipment} onChange={e => setEquipment(e.target.value)} placeholder="ej. Barra + banco" style={inp}/>
          </div>
          {error && (
            <div style={{ fontSize: 12, color: 'var(--red)', padding: '7px 10px', background: 'rgba(215,71,75,0.08)', borderRadius: 6 }}>{error}</div>
          )}
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button type="button" onClick={onClose} className="btn btn-ghost">Cancelar</button>
            <button type="submit" disabled={saving} className="btn btn-primary">
              <PlusIcon size={13}/>{saving ? 'Guardando...' : 'Crear ejercicio'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Add to Session Modal ────────────────────────────────────

function AddToSessionModal({ exercise, onClose }: { exercise: LibExercise; onClose: () => void }) {
  const [athletes, setAthletes] = useState<{ id: string; name: string }[]>([]);
  const [athleteId, setAthleteId] = useState('');
  const [sessions, setSessions] = useState<{ id: string; title: string; date: string }[]>([]);
  const [sessionId, setSessionId] = useState('');
  const [blocks, setBlocks] = useState<{ id: string; name: string }[]>([]);
  const [blockId, setBlockId] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const supabase = createClient();
    supabase.from('athletes').select('id, name').order('name')
      .then(({ data }) => setAthletes(data || []));
  }, []);

  useEffect(() => {
    if (!athleteId) { setSessions([]); setSessionId(''); setBlocks([]); setBlockId(''); return; }
    const supabase = createClient();
    const since = new Date();
    since.setDate(since.getDate() - 60);
    const sinceISO = since.toISOString().slice(0, 10);
    supabase.from('sessions')
      .select('id, title, date')
      .eq('athlete_id', athleteId)
      .gte('date', sinceISO)
      .order('date', { ascending: false })
      .then(({ data }) => { setSessions(data || []); setSessionId(''); setBlocks([]); setBlockId(''); });
  }, [athleteId]);

  useEffect(() => {
    if (!sessionId) { setBlocks([]); setBlockId(''); return; }
    const supabase = createClient();
    supabase.from('session_blocks')
      .select('id, name')
      .eq('session_id', sessionId)
      .order('sort_order')
      .then(({ data }) => { setBlocks(data || []); setBlockId(''); });
  }, [sessionId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!blockId) { setError('Selecciona un bloque.'); return; }
    setSaving(true);
    setError('');
    const supabase = createClient();
    const { data: existing } = await supabase
      .from('session_exercises')
      .select('sort_order')
      .eq('block_id', blockId)
      .order('sort_order', { ascending: false })
      .limit(1);
    const nextSort = ((existing?.[0]?.sort_order ?? -1) as number) + 1;
    const { error: err } = await supabase.from('session_exercises').insert({
      block_id: blockId,
      exercise_id: exercise.dbId,
      name: exercise.name,
      level: exercise.level,
      sort_order: nextSort,
    });
    setSaving(false);
    if (err) { setError(err.message); return; }
    onClose();
  }

  const sel: React.CSSProperties = {
    width: '100%', padding: '8px 10px', borderRadius: 8,
    border: '1px solid var(--border)', background: 'var(--surface-2)',
    fontSize: 13, fontFamily: 'inherit', color: 'var(--text)', boxSizing: 'border-box',
  };

  return (
    <div onClick={e => e.target === e.currentTarget && onClose()}
      style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(14,25,54,0.55)', display: 'grid', placeItems: 'center' }}>
      <div className="card" style={{ width: 420, padding: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700 }}>Agregar a sesión</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{exercise.name}</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
            <XIcon size={18}/>
          </button>
        </div>
        <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 14 }}>
          <div>
            <label style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-muted)', display: 'block', marginBottom: 5 }}>Atleta</label>
            <select value={athleteId} onChange={e => setAthleteId(e.target.value)} style={sel} required>
              <option value="">Selecciona un atleta…</option>
              {athletes.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-muted)', display: 'block', marginBottom: 5 }}>Sesión (últimos 60 días)</label>
            <select value={sessionId} onChange={e => setSessionId(e.target.value)} style={sel} disabled={!athleteId} required>
              <option value="">Selecciona una sesión…</option>
              {sessions.map(s => (
                <option key={s.id} value={s.id}>{s.date} · {s.title}</option>
              ))}
            </select>
            {athleteId && sessions.length === 0 && (
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>Sin sesiones recientes para este atleta.</div>
            )}
          </div>
          <div>
            <label style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-muted)', display: 'block', marginBottom: 5 }}>Bloque</label>
            <select value={blockId} onChange={e => setBlockId(e.target.value)} style={sel} disabled={!sessionId} required>
              <option value="">Selecciona un bloque…</option>
              {blocks.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
            {sessionId && blocks.length === 0 && (
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>Esta sesión no tiene bloques.</div>
            )}
          </div>
          {error && (
            <div style={{ fontSize: 12, color: 'var(--red)', padding: '7px 10px', background: 'rgba(215,71,75,0.08)', borderRadius: 6 }}>{error}</div>
          )}
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button type="button" onClick={onClose} className="btn btn-ghost">Cancelar</button>
            <button type="submit" disabled={saving || !blockId} className="btn btn-primary">
              <PlusIcon size={13}/>{saving ? 'Agregando...' : 'Agregar ejercicio'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Main page ───────────────────────────────────────────────

export default function LibraryPage() {
  const [exercises, setExercises] = useState<LibExercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeCat, setActiveCat] = useState<'all' | CategoryId>('all');
  const [activeLevel, setActiveLevel] = useState<'all' | LevelId>('all');
  const [showNewExModal, setShowNewExModal] = useState(false);
  const [addToSessionEx, setAddToSessionEx] = useState<LibExercise | null>(null);

  const fetchExercises = useCallback(() => {
    const supabase = createClient();
    supabase
      .from('exercises')
      .select('id, slug, name, category, level, muscle, equipment')
      .order('category')
      .then(({ data, error }) => {
        if (!error && data) {
          setExercises(data.map(e => ({
            dbId:      e.id,
            id:        e.slug,
            name:      e.name,
            category:  e.category as CategoryId,
            level:     e.level as LevelId,
            muscle:    e.muscle || '—',
            equipment: e.equipment || '—',
          })));
        }
        setLoading(false);
      });
  }, []);

  useEffect(() => { fetchExercises(); }, [fetchExercises]);

  const filtered = exercises
    .filter(ex => activeCat   === 'all' || ex.category === activeCat)
    .filter(ex => activeLevel === 'all' || ex.level    === activeLevel)
    .filter(ex =>
      ex.name.toLowerCase().includes(search.toLowerCase()) ||
      ex.muscle.toLowerCase().includes(search.toLowerCase()) ||
      ex.equipment.toLowerCase().includes(search.toLowerCase())
    );

  const grouped: Record<string, LibExercise[]> = {};
  filtered.forEach(ex => {
    if (!grouped[ex.category]) grouped[ex.category] = [];
    grouped[ex.category].push(ex);
  });

  return (
    <div style={{ padding: '20px 24px 28px' }}>
      {showNewExModal && (
        <NewExerciseModal
          onClose={() => setShowNewExModal(false)}
          onCreated={() => { fetchExercises(); }}
        />
      )}
      {addToSessionEx && (
        <AddToSessionModal
          exercise={addToSessionEx}
          onClose={() => setAddToSessionEx(null)}
        />
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700 }}>Workspace · Biblioteca</div>
          <div className="display" style={{ fontSize: 28, fontStyle: 'italic' }}>
            {loading ? 'Cargando...' : `${exercises.length} ejercicios`}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-ghost"><CopyIcon size={13}/>Importar</button>
          <button className="btn btn-primary" onClick={() => setShowNewExModal(true)}>
            <PlusIcon size={13}/>Nuevo ejercicio
          </button>
        </div>
      </div>

      <div className="card" style={{ padding: 14, marginBottom: 14 }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 14 }}>
          <div className="input-wrap" style={{ flex: 1, maxWidth: 320 }}>
            <SearchIcon size={14} stroke="var(--text-muted)"/>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar ejercicio, músculo o equipo..."/>
          </div>
          <div style={{ flex: 1 }}/>
          <span className="muted" style={{ fontSize: 11 }}>{filtered.length} resultados</span>
        </div>

        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
          <FilterChip active={activeCat === 'all'} onClick={() => setActiveCat('all')} label="Todas las categorías"/>
          {Object.values(CATEGORIES).map(c => {
            const Ic = getCategoryIcon(c.id);
            return (
              <FilterChip key={c.id} active={activeCat === c.id} onClick={() => setActiveCat(c.id as CategoryId)} color={c.color}
                label={<span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><Ic size={11} stroke="currentColor"/>{c.label}</span>}
              />
            );
          })}
        </div>

        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <FilterChip active={activeLevel === 'all'} onClick={() => setActiveLevel('all')} label="Todos los niveles"/>
          {Object.values(LEVELS).map(L => (
            <FilterChip key={L.id} active={activeLevel === L.id} onClick={() => setActiveLevel(L.id as LevelId)} color={L.color}
              label={<span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><span style={{ width: 7, height: 7, borderRadius: 4, background: L.color }}/>{L.label}</span>}
            />
          ))}
        </div>
      </div>

      {loading ? (
        <div className="card" style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
          Cargando ejercicios...
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 14 }}>
          {Object.entries(grouped).map(([catId, exs]) => {
            const c = CATEGORIES[catId];
            const Ic = getCategoryIcon(catId);
            return (
              <div key={catId} className="card" style={{ padding: 14, borderLeft: `3px solid ${c.color}` }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 28, height: 28, borderRadius: 6, background: `${c.color}1f`, color: c.color, display: 'grid', placeItems: 'center' }}>
                      <Ic size={14} stroke="currentColor"/>
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 700 }}>{c.label}</div>
                    <span className="mono muted" style={{ fontSize: 11 }}>· {exs.length} {exs.length === 1 ? 'ejercicio' : 'ejercicios'}</span>
                  </div>
                  <button className="btn btn-ghost btn-sm">Ver categoría</button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                  {exs.map(ex => (
                    <div key={ex.id} style={{ padding: '10px 12px', borderRadius: 8, background: 'var(--surface-2)', border: '1px solid var(--border)', display: 'grid', gridTemplateColumns: '1fr auto', gap: 8, alignItems: 'start' }}>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 600 }}>{ex.name}</div>
                        <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 5, flexWrap: 'wrap' }}>
                          <LevelBadge level={ex.level} size="sm"/>
                        </div>
                        <div className="muted" style={{ fontSize: 10, marginTop: 5 }}>{ex.muscle} · {ex.equipment}</div>
                      </div>
                      <button
                        onClick={() => setAddToSessionEx(ex)}
                        title="Agregar a sesión"
                        style={{ background: 'var(--vitta-blue)', border: 'none', color: '#fff', borderRadius: 6, width: 26, height: 26, display: 'grid', placeItems: 'center', cursor: 'pointer', flexShrink: 0 }}
                      >
                        <PlusIcon size={13}/>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
          {filtered.length === 0 && (
            <div className="card" style={{ padding: 40, textAlign: 'center' }}>
              <SearchIcon size={28} stroke="var(--text-muted)"/>
              <div style={{ fontSize: 14, fontWeight: 600, marginTop: 10 }}>Sin resultados</div>
              <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>Prueba a quitar filtros o ajustar la búsqueda.</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function FilterChip({ active, onClick, label, color }: { active: boolean; onClick: () => void; label: React.ReactNode; color?: string }) {
  return (
    <button onClick={onClick} style={{
      padding: '6px 11px', borderRadius: 999,
      border: active ? `1.5px solid ${color || 'var(--vitta-navy)'}` : '1px solid var(--border)',
      background: active ? `${color || 'var(--vitta-navy)'}14` : 'white',
      color: active ? (color || 'var(--vitta-navy)') : 'var(--text)',
      fontSize: 11, fontWeight: active ? 700 : 500,
      fontFamily: 'inherit', cursor: 'pointer',
      display: 'inline-flex', alignItems: 'center',
    }}>{label}</button>
  );
}
