'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import {
  fetchExercises, fetchByBodyPart, fetchByTarget, fetchByEquipment,
  fetchBodyParts, fetchTargets, fetchEquipmentList,
} from '@/services/exerciseDBService';
import ExerciseDBCard from '@/components/exercises/ExerciseDBCard';
import { SearchIcon, ChevronLeft, ChevronRight } from '@/components/icons';

const PAGE_SIZE = 20;

// Extract a stable ID from either API version
function exId(ex) { return ex.exerciseId ?? ex.id ?? ''; }

export default function ExplorePage() {
  const router = useRouter();

  // All exercises fetched from API (may be large for filtered views)
  const [allExercises, setAllExercises] = useState([]);
  const [loading,      setLoading]      = useState(false);
  const [error,        setError]        = useState('');
  const [search,       setSearch]       = useState('');

  // Pagination (client-side for filtered; server-side for "all")
  const [page, setPage] = useState(0);

  // Filters
  const [filterType,  setFilterType]  = useState('all');
  const [filterValue, setFilterValue] = useState('');

  // Filter value lists
  const [bodyParts,     setBodyParts]     = useState([]);
  const [targets,       setTargets]       = useState([]);
  const [equipmentList, setEquipmentList] = useState([]);

  // Slugs already saved to Supabase (to mark cards as saved)
  const [savedSlugs, setSavedSlugs] = useState(new Set());

  // Load filter lists + saved slugs once
  useEffect(() => {
    fetchBodyParts().then(setBodyParts).catch(() => {});
    fetchTargets().then(setTargets).catch(() => {});
    fetchEquipmentList().then(setEquipmentList).catch(() => {});

    createClient()
      .from('exercises')
      .select('slug')
      .like('slug', 'exdb_%')
      .then(({ data }) => {
        if (data) setSavedSlugs(new Set(data.map(r => r.slug)));
      });
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      let data;
      // Filtered endpoints return all matches; we paginate client-side
      if (filterType === 'bodyPart' && filterValue) {
        data = await fetchByBodyPart(filterValue);
      } else if (filterType === 'target' && filterValue) {
        data = await fetchByTarget(filterValue);
      } else if (filterType === 'equipment' && filterValue) {
        data = await fetchByEquipment(filterValue);
      } else {
        // "All": server-side pagination with PAGE_SIZE
        data = await fetchExercises(PAGE_SIZE, page * PAGE_SIZE);
      }
      setAllExercises(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(`Error al cargar ejercicios: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, [filterType, filterValue, page]);

  useEffect(() => { load(); }, [load]);

  function applyFilter(type, value) {
    setFilterType(type);
    setFilterValue(value);
    setPage(0);
  }

  function markSaved(slug) {
    setSavedSlugs(prev => new Set([...prev, slug]));
  }

  // For filtered views, paginate client-side after optional name search
  const afterSearch = search
    ? allExercises.filter(ex => ex.name?.toLowerCase().includes(search.toLowerCase()))
    : allExercises;

  const isFiltered = filterType !== 'all' && filterValue;
  const displayed  = isFiltered
    ? afterSearch.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE)
    : afterSearch; // "all" already comes paginated from server

  const totalPages = isFiltered ? Math.ceil(afterSearch.length / PAGE_SIZE) : null;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--text)' }}>
      {/* ─── Header ─────────────────────────────────────────── */}
      <div style={{
        padding: '12px 20px', background: 'white',
        borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', gap: 12,
        position: 'sticky', top: 0, zIndex: 10,
        boxShadow: 'var(--shadow-sm)',
      }}>
        <button
          onClick={() => router.back()}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4, borderRadius: 6, display: 'flex', alignItems: 'center' }}
        >
          <ChevronLeft size={20}/>
        </button>
        <div>
          <div style={{ fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700 }}>ExerciseDB</div>
          <div className="display" style={{ fontSize: 22, fontStyle: 'italic', lineHeight: 1.1 }}>Explorar ejercicios</div>
        </div>
        {allExercises.length > 0 && !loading && (
          <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--text-muted)' }}>
            {afterSearch.length} resultado{afterSearch.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      <div style={{ padding: '16px 20px 40px', maxWidth: 1280, margin: '0 auto' }}>
        {/* ─── Search + Filters ──────────────────────────────── */}
        <div className="card" style={{ padding: 14, marginBottom: 16 }}>
          <div className="input-wrap" style={{ marginBottom: 12, maxWidth: 360 }}>
            <SearchIcon size={14} stroke="var(--text-muted)"/>
            <input
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(0); }}
              placeholder="Buscar por nombre…"
            />
          </div>

          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
            {[
              { type: 'all',       label: 'Todos' },
              { type: 'bodyPart',  label: 'Parte del cuerpo' },
              { type: 'target',    label: 'Músculo objetivo' },
              { type: 'equipment', label: 'Equipamiento' },
            ].map(({ type, label }) => (
              <button key={type} onClick={() => applyFilter(type, '')} style={{
                padding: '6px 12px', borderRadius: 999, fontFamily: 'inherit', cursor: 'pointer',
                border: filterType === type ? '1.5px solid var(--vitta-navy)' : '1px solid var(--border)',
                background: filterType === type ? 'rgba(14,25,54,0.08)' : 'white',
                color: filterType === type ? 'var(--vitta-navy)' : 'var(--text)',
                fontSize: 11, fontWeight: filterType === type ? 700 : 500,
              }}>{label}</button>
            ))}
          </div>

          {filterType === 'bodyPart'  && bodyParts.length     > 0 && <ValueChips values={bodyParts}     active={filterValue} onSelect={v => applyFilter('bodyPart',  v)}/>}
          {filterType === 'target'    && targets.length       > 0 && <ValueChips values={targets}       active={filterValue} onSelect={v => applyFilter('target',    v)}/>}
          {filterType === 'equipment' && equipmentList.length > 0 && <ValueChips values={equipmentList} active={filterValue} onSelect={v => applyFilter('equipment', v)}/>}

          {filterValue && (
            <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Filtrando por:</span>
              <span style={{ padding: '3px 10px', borderRadius: 999, background: 'var(--vitta-blue)', color: '#fff', fontSize: 11, fontWeight: 700, textTransform: 'capitalize' }}>{filterValue}</span>
              <button onClick={() => applyFilter(filterType, '')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 16, padding: 0, lineHeight: 1 }}>×</button>
            </div>
          )}
        </div>

        {/* ─── Results ───────────────────────────────────────── */}
        {loading ? (
          <div style={{ padding: '80px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>Cargando ejercicios…</div>
        ) : error ? (
          <div style={{ padding: '60px 0', textAlign: 'center' }}>
            <div style={{ fontSize: 13, color: 'var(--red)', marginBottom: 12 }}>{error}</div>
            <button onClick={load} className="btn btn-ghost">Reintentar</button>
          </div>
        ) : displayed.length === 0 ? (
          <div style={{ padding: '80px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
            <SearchIcon size={28} stroke="var(--text-muted)" style={{ display: 'block', margin: '0 auto 12px' }}/>
            Sin resultados.
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 14 }}>
            {displayed.map(ex => (
              <ExerciseDBCard
                key={exId(ex)}
                exercise={ex}
                alreadySaved={savedSlugs.has(`exdb_${exId(ex)}`)}
                onSaved={markSaved}
              />
            ))}
          </div>
        )}

        {/* ─── Pagination ────────────────────────────────────── */}
        {!loading && !error && (
          (() => {
            const showPrev = page > 0;
            const showNext = isFiltered
              ? page < (totalPages ?? 1) - 1
              : allExercises.length === PAGE_SIZE;
            if (!showPrev && !showNext) return null;
            return (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12, marginTop: 28 }}>
                <button onClick={() => setPage(p => p - 1)} disabled={!showPrev} className="btn btn-ghost" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <ChevronLeft size={14}/>Anterior
                </button>
                <span style={{ fontSize: 12, color: 'var(--text-muted)', minWidth: 80, textAlign: 'center' }}>
                  {totalPages ? `${page + 1} / ${totalPages}` : `Página ${page + 1}`}
                </span>
                <button onClick={() => setPage(p => p + 1)} disabled={!showNext} className="btn btn-ghost" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  Siguiente<ChevronRight size={14}/>
                </button>
              </div>
            );
          })()
        )}
      </div>
    </div>
  );
}

function ValueChips({ values, active, onSelect }) {
  return (
    <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
      {values.map(v => (
        <button key={v} onClick={() => onSelect(active === v ? '' : v)} style={{
          padding: '4px 10px', borderRadius: 999, fontFamily: 'inherit', cursor: 'pointer',
          border: active === v ? '1.5px solid var(--vitta-blue)' : '1px solid var(--border)',
          background: active === v ? 'rgba(46,107,214,0.10)' : 'white',
          color: active === v ? 'var(--vitta-blue)' : 'var(--text-muted)',
          fontSize: 10, fontWeight: active === v ? 700 : 500,
          textTransform: 'capitalize',
        }}>{v}</button>
      ))}
    </div>
  );
}
