'use client';
import { useState } from 'react';
import { EXERCISES, CATEGORIES, LEVELS } from '@/lib/constants';
import { getCategoryIcon, PlusIcon, SearchIcon, CopyIcon } from '@/components/icons';
import LevelBadge from '@/components/badges/LevelBadge';
import type { CategoryId, LevelId } from '@/lib/types';

export default function LibraryPage() {
  const [search, setSearch]       = useState('');
  const [activeCat, setActiveCat] = useState<'all' | CategoryId>('all');
  const [activeLevel, setActiveLevel] = useState<'all' | LevelId>('all');

  const filtered = EXERCISES
    .filter(ex => activeCat   === 'all' || ex.category === activeCat)
    .filter(ex => activeLevel === 'all' || ex.level    === activeLevel)
    .filter(ex => ex.name.toLowerCase().includes(search.toLowerCase()));

  const grouped: Record<string, typeof EXERCISES> = {};
  filtered.forEach(ex => {
    if (!grouped[ex.category]) grouped[ex.category] = [];
    grouped[ex.category].push(ex);
  });

  return (
    <div style={{ padding: '20px 24px 28px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700 }}>Workspace · Biblioteca</div>
          <div className="display" style={{ fontSize: 28, fontStyle: 'italic' }}>{EXERCISES.length} ejercicios</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-ghost"><CopyIcon size={13}/>Importar</button>
          <button className="btn btn-primary"><PlusIcon size={13}/>Nuevo ejercicio</button>
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
                    <button style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 2 }}>
                      <PlusIcon size={14}/>
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
