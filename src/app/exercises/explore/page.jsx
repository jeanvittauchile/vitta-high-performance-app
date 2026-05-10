'use client';
import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import {
  getAllExercises,
  getBodyParts, getTargets, getEquipments, getExId,
} from '@/services/exerciseDBService';
import ExerciseDBCard from '@/components/exercises/ExerciseDBCard';
import { SearchIcon, ChevronLeft, ChevronRight } from '@/components/icons';

const PAGE_SIZE = 20;

export default function ExplorePage() {
  const router = useRouter();

  const [all,        setAll]        = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState('');
  const [search,     setSearch]     = useState('');
  const [page,       setPage]       = useState(0);
  const [filterType, setFilterType] = useState('all');
  const [filterValue,setFilterValue]= useState('');
  const [savedSlugs, setSavedSlugs] = useState(new Set());

  // Derived filter lists from the actual data
  const bodyParts     = useMemo(() => [...new Set(all.flatMap(getBodyParts))].sort(),     [all]);
  const targets       = useMemo(() => [...new Set(all.flatMap(getTargets))].sort(),       [all]);
  const equipmentList = useMemo(() => [...new Set(all.flatMap(getEquipments))].sort(),    [all]);

  // Load all exercises + saved slugs once
  useEffect(() => {
    setLoading(true);

    // Load saved slugs from Supabase (don't block the UI)
    createClient()
      .from('exercises').select('slug').like('slug', 'exdb_%')
      .then(({ data }) => { if (data) setSavedSlugs(new Set(data.map(r => r.slug))); });

    getAllExercises()
      .then(data => { setAll(data); setLoading(false); })
      .catch(err  => { setError(err.message); setLoading(false); });
  }, []);

  function applyFilter(type, value) {
    setFilterType(type);
    setFilterValue(value);
    setPage(0);
  }

  function markSaved(slug) {
    setSavedSlugs(prev => new Set([...prev, slug]));
  }

  // All filtering & search is client-side
  const filtered = useMemo(() => {
    let result = all;
    if (filterType === 'bodyPart' && filterValue) {
      const v = filterValue.toLowerCase();
      result = result.filter(ex => getBodyParts(ex).some(b => b.toLowerCase() === v));
    } else if (filterType === 'target' && filterValue) {
      const v = filterValue.toLowerCase();
      result = result.filter(ex => getTargets(ex).some(t => t.toLowerCase() === v));
    } else if (filterType === 'equipment' && filterValue) {
      const v = filterValue.toLowerCase();
      result = result.filter(ex => getEquipments(ex).some(e => e.toLowerCase() === v));
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter(ex => ex.name?.toLowerCase().includes(q));
    }
    return result;
  }, [all, filterType, filterValue, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const displayed  = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

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
        <button onClick={() => router.back()} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4, borderRadius: 6, display: 'flex' }}>
          <ChevronLeft size={20}/>
        </button>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700 }}>ExerciseDB</div>
          <div className="display" style={{ fontSize: 22, fontStyle: 'italic', lineHeight: 1.1 }}>Explorar ejercicios</div>
        </div>
        {!loading && !error && (
          <span style={{ fontSize: 11, color: 'var(--text-muted)', flexShrink: 0 }}>
            {filtered.length} de {all.length}
          </span>
        )}
      </div>

      <div style={{ padding: '16px 20px 40px', maxWidth: 1280, margin: '0 auto' }}>

        {/* ─── Filters ────────────────────────────────────────── */}
        {!error && (
          <div className="card" style={{ padding: 14, marginBottom: 16 }}>
            {/* Search */}
            <div className="input-wrap" style={{ marginBottom: 12, maxWidth: 360 }}>
              <SearchIcon size={14} stroke="var(--text-muted)"/>
              <input
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(0); }}
                placeholder={loading ? 'Cargando ejercicios…' : 'Buscar por nombre…'}
                disabled={loading}
              />
            </div>

            {/* Filter type tabs */}
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: filterType !== 'all' ? 8 : 0 }}>
              {[
                { type: 'all',       label: 'Todos' },
                { type: 'bodyPart',  label: 'Parte del cuerpo' },
                { type: 'target',    label: 'Músculo objetivo' },
                { type: 'equipment', label: 'Equipamiento' },
              ].map(({ type, label }) => (
                <button key={type} onClick={() => applyFilter(type, '')} disabled={loading} style={{
                  padding: '6px 12px', borderRadius: 999, fontFamily: 'inherit', cursor: loading ? 'default' : 'pointer',
                  border: filterType === type ? '1.5px solid var(--vitta-navy)' : '1px solid var(--border)',
                  background: filterType === type ? 'rgba(14,25,54,0.08)' : 'white',
                  color: filterType === type ? 'var(--vitta-navy)' : 'var(--text)',
                  fontSize: 11, fontWeight: filterType === type ? 700 : 500,
                }}>{label}</button>
              ))}
            </div>

            {filterType === 'bodyPart'  && <ValueChips values={bodyParts}     active={filterValue} onSelect={v => { applyFilter('bodyPart',  v); }}/>}
            {filterType === 'target'    && <ValueChips values={targets}       active={filterValue} onSelect={v => { applyFilter('target',    v); }}/>}
            {filterType === 'equipment' && <ValueChips values={equipmentList} active={filterValue} onSelect={v => { applyFilter('equipment', v); }}/>}

            {filterValue && (
              <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Filtrando por:</span>
                <span style={{ padding: '3px 10px', borderRadius: 999, background: 'var(--vitta-blue)', color: '#fff', fontSize: 11, fontWeight: 700, textTransform: 'capitalize' }}>{filterValue}</span>
                <button onClick={() => applyFilter(filterType, '')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 18, padding: 0, lineHeight: 1 }}>×</button>
              </div>
            )}
          </div>
        )}

        {/* ─── Content ─────────────────────────────────────────── */}
        {loading ? (
          <div style={{ padding: '80px 0', textAlign: 'center' }}>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 8 }}>Cargando ejercicios…</div>
            <div style={{ fontSize: 11, color: 'var(--text-faint)' }}>La primera carga puede tardar unos segundos</div>
          </div>
        ) : error ? (
          <div style={{ padding: '60px 0', textAlign: 'center' }}>
            <div style={{ fontSize: 13, color: 'var(--red)', marginBottom: 12 }}>{error}</div>
            <button onClick={() => { setError(''); setLoading(true); getAllExercises().then(d => { setAll(d); setLoading(false); }).catch(e => { setError(e.message); setLoading(false); }); }} className="btn btn-ghost">Reintentar</button>
          </div>
        ) : displayed.length === 0 ? (
          <div style={{ padding: '80px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
            <SearchIcon size={28} stroke="var(--text-muted)" style={{ display: 'block', margin: '0 auto 12px' }}/>
            Sin resultados.
          </div>
        ) : (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 14 }}>
              {displayed.map(ex => (
                <ExerciseDBCard
                  key={getExId(ex)}
                  exercise={ex}
                  alreadySaved={savedSlugs.has(`exdb_${getExId(ex)}`)}
                  onSaved={markSaved}
                />
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12, marginTop: 28 }}>
                <button onClick={() => setPage(p => p - 1)} disabled={page === 0} className="btn btn-ghost" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <ChevronLeft size={14}/>Anterior
                </button>
                <span style={{ fontSize: 12, color: 'var(--text-muted)', minWidth: 90, textAlign: 'center' }}>
                  {page + 1} / {totalPages}
                </span>
                <button onClick={() => setPage(p => p + 1)} disabled={page >= totalPages - 1} className="btn btn-ghost" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  Siguiente<ChevronRight size={14}/>
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function ValueChips({ values, active, onSelect }) {
  return (
    <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginTop: 4 }}>
      {values.map(v => (
        <button key={v} onClick={() => onSelect(active === v ? '' : v)} style={{
          padding: '4px 10px', borderRadius: 999, fontFamily: 'inherit', cursor: 'pointer',
          border: active === v ? '1.5px solid var(--vitta-blue)' : '1px solid var(--border)',
          background: active === v ? 'rgba(46,107,214,0.10)' : 'white',
          color: active === v ? 'var(--vitta-blue)' : 'var(--text-muted)',
          fontSize: 10, fontWeight: active === v ? 700 : 500, textTransform: 'capitalize',
        }}>{v}</button>
      ))}
    </div>
  );
}
