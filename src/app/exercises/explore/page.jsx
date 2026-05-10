'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  fetchExercises, fetchByBodyPart, fetchByTarget, fetchByEquipment,
  fetchBodyParts, fetchTargets, fetchEquipmentList,
} from '@/services/exerciseDBService';
import ExerciseDBCard from '@/components/exercises/ExerciseDBCard';
import { SearchIcon, ChevronLeft, ChevronRight } from '@/components/icons';

const PAGE_SIZE = 20;

export default function ExplorePage() {
  const router = useRouter();

  const [exercises,      setExercises]      = useState([]);
  const [loading,        setLoading]        = useState(false);
  const [error,          setError]          = useState('');
  const [search,         setSearch]         = useState('');
  const [offset,         setOffset]         = useState(0);

  // Filter state
  const [filterType,  setFilterType]  = useState('all'); // 'all' | 'bodyPart' | 'target' | 'equipment'
  const [filterValue, setFilterValue] = useState('');

  // Filter value lists
  const [bodyParts,      setBodyParts]      = useState([]);
  const [targets,        setTargets]        = useState([]);
  const [equipmentList,  setEquipmentList]  = useState([]);

  // Load filter lists once
  useEffect(() => {
    fetchBodyParts().then(setBodyParts).catch(() => {});
    fetchTargets().then(setTargets).catch(() => {});
    fetchEquipmentList().then(setEquipmentList).catch(() => {});
  }, []);

  // Load exercises when filter or offset changes
  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      let data;
      if (filterType === 'bodyPart' && filterValue) {
        data = await fetchByBodyPart(filterValue, PAGE_SIZE, offset);
      } else if (filterType === 'target' && filterValue) {
        data = await fetchByTarget(filterValue, PAGE_SIZE, offset);
      } else if (filterType === 'equipment' && filterValue) {
        data = await fetchByEquipment(filterValue, PAGE_SIZE, offset);
      } else {
        data = await fetchExercises(PAGE_SIZE, offset);
      }
      setExercises(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(`Error al cargar ejercicios: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, [filterType, filterValue, offset]);

  useEffect(() => { load(); }, [load]);

  function applyFilter(type, value) {
    setFilterType(type);
    setFilterValue(value);
    setOffset(0);
  }

  const displayed = search
    ? exercises.filter(ex => ex.name?.toLowerCase().includes(search.toLowerCase()))
    : exercises;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--text)' }}>
      {/* ─── Header ──────────────────────────────────────────── */}
      <div style={{
        padding: '12px 20px',
        background: 'white', borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', gap: 12,
        position: 'sticky', top: 0, zIndex: 10,
        boxShadow: 'var(--shadow-sm)',
      }}>
        <button
          onClick={() => router.back()}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--text-muted)', padding: 4, borderRadius: 6,
            display: 'flex', alignItems: 'center',
          }}
        >
          <ChevronLeft size={20}/>
        </button>
        <div>
          <div style={{ fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700 }}>
            ExerciseDB
          </div>
          <div className="display" style={{ fontSize: 22, fontStyle: 'italic', lineHeight: 1.1 }}>
            Explorar ejercicios
          </div>
        </div>
      </div>

      <div style={{ padding: '16px 20px 40px', maxWidth: 1280, margin: '0 auto' }}>
        {/* ─── Search + Filters ──────────────────────────────── */}
        <div className="card" style={{ padding: 14, marginBottom: 16 }}>
          {/* Search */}
          <div className="input-wrap" style={{ marginBottom: 12, maxWidth: 360 }}>
            <SearchIcon size={14} stroke="var(--text-muted)"/>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar por nombre…"
            />
          </div>

          {/* Filter type tabs */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
            {[
              { type: 'all',       label: 'Todos' },
              { type: 'bodyPart',  label: 'Parte del cuerpo' },
              { type: 'target',    label: 'Músculo objetivo' },
              { type: 'equipment', label: 'Equipamiento' },
            ].map(({ type, label }) => (
              <button
                key={type}
                onClick={() => applyFilter(type, '')}
                style={{
                  padding: '6px 12px', borderRadius: 999, fontFamily: 'inherit', cursor: 'pointer',
                  border: filterType === type ? '1.5px solid var(--vitta-navy)' : '1px solid var(--border)',
                  background: filterType === type ? 'rgba(14,25,54,0.08)' : 'white',
                  color: filterType === type ? 'var(--vitta-navy)' : 'var(--text)',
                  fontSize: 11, fontWeight: filterType === type ? 700 : 500,
                }}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Value chips */}
          {filterType === 'bodyPart' && bodyParts.length > 0 && (
            <ValueChips values={bodyParts} active={filterValue} onSelect={v => applyFilter('bodyPart', v)}/>
          )}
          {filterType === 'target' && targets.length > 0 && (
            <ValueChips values={targets} active={filterValue} onSelect={v => applyFilter('target', v)}/>
          )}
          {filterType === 'equipment' && equipmentList.length > 0 && (
            <ValueChips values={equipmentList} active={filterValue} onSelect={v => applyFilter('equipment', v)}/>
          )}

          {/* Active filter badge */}
          {filterValue && (
            <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Filtrando por:</span>
              <span style={{
                padding: '3px 10px', borderRadius: 999,
                background: 'var(--vitta-blue)', color: '#fff',
                fontSize: 11, fontWeight: 700, textTransform: 'capitalize',
              }}>{filterValue}</span>
              <button
                onClick={() => applyFilter(filterType, '')}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 13, padding: 0, lineHeight: 1 }}
              >×</button>
            </div>
          )}
        </div>

        {/* ─── Results ───────────────────────────────────────── */}
        {loading ? (
          <div style={{ padding: '80px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
            Cargando ejercicios…
          </div>
        ) : error ? (
          <div style={{ padding: '60px 0', textAlign: 'center' }}>
            <div style={{ fontSize: 13, color: 'var(--red)', marginBottom: 12, maxWidth: 320, margin: '0 auto 12px' }}>{error}</div>
            <button onClick={load} className="btn btn-ghost">Reintentar</button>
          </div>
        ) : displayed.length === 0 ? (
          <div style={{ padding: '80px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
            <SearchIcon size={28} stroke="var(--text-muted)" style={{ marginBottom: 12 }}/>
            <div>Sin resultados para esta búsqueda.</div>
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
            gap: 14,
          }}>
            {displayed.map(ex => (
              <ExerciseDBCard key={ex.id} exercise={ex}/>
            ))}
          </div>
        )}

        {/* ─── Pagination ────────────────────────────────────── */}
        {!loading && !error && !search && exercises.length > 0 && (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12, marginTop: 28 }}>
            <button
              onClick={() => setOffset(o => Math.max(0, o - PAGE_SIZE))}
              disabled={offset === 0}
              className="btn btn-ghost"
              style={{ display: 'flex', alignItems: 'center', gap: 4 }}
            >
              <ChevronLeft size={14}/>Anterior
            </button>
            <span style={{ fontSize: 12, color: 'var(--text-muted)', minWidth: 80, textAlign: 'center' }}>
              Página {Math.floor(offset / PAGE_SIZE) + 1}
            </span>
            <button
              onClick={() => setOffset(o => o + PAGE_SIZE)}
              disabled={exercises.length < PAGE_SIZE}
              className="btn btn-ghost"
              style={{ display: 'flex', alignItems: 'center', gap: 4 }}
            >
              Siguiente<ChevronRight size={14}/>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function ValueChips({ values, active, onSelect }) {
  return (
    <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
      {values.map(v => (
        <button
          key={v}
          onClick={() => onSelect(active === v ? '' : v)}
          style={{
            padding: '4px 10px', borderRadius: 999, fontFamily: 'inherit', cursor: 'pointer',
            border: active === v ? '1.5px solid var(--vitta-blue)' : '1px solid var(--border)',
            background: active === v ? 'rgba(46,107,214,0.10)' : 'white',
            color: active === v ? 'var(--vitta-blue)' : 'var(--text-muted)',
            fontSize: 10, fontWeight: active === v ? 700 : 500,
            textTransform: 'capitalize',
          }}
        >{v}</button>
      ))}
    </div>
  );
}
