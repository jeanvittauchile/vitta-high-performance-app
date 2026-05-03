'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import { CATEGORIES } from '@/lib/constants';
import { getCategoryIcon, PlusIcon, SearchIcon, ChevronRight, ChevronDown } from '@/components/icons';
import StatusPill from '@/components/badges/StatusPill';
import NewAthleteModal from '@/components/admin/NewAthleteModal';
import type { Athlete } from '@/lib/types';

export default function AthletesPage() {
  const router = useRouter();
  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterCat, setFilterCat] = useState('all');
  const [showModal, setShowModal] = useState(false);

  const fetchAthletes = useCallback(async () => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('athletes')
      .select('*')
      .order('name');

    if (!error && data) {
      setAthletes(data.map((a: any) => ({
        id:          a.id,
        name:        a.name,
        initials:    a.initials,
        age:         a.age,
        weeklyHours: a.weekly_hours,
        focus:       a.focus,
        adherence:   a.adherence,
        rpe7:        a.rpe7,
        status:      a.status,
        color:       a.color,
      })));
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchAthletes(); }, [fetchAthletes]);

  const filtered = athletes
    .filter(a => filterStatus === 'all' || a.status === filterStatus)
    .filter(a => filterCat   === 'all' || a.focus  === filterCat)
    .filter(a => a.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div style={{ padding: '20px 24px 28px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700 }}>
            Workspace · Atletas
          </div>
          <div className="display" style={{ fontSize: 28, fontStyle: 'italic' }}>
            {loading ? '...' : `${athletes.length} atletas activos`}
          </div>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <PlusIcon size={13}/>Nuevo atleta
        </button>
      </div>

      <div className="card" style={{ padding: 14 }}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 14, alignItems: 'center', flexWrap: 'wrap' }}>
          <div className="input-wrap" style={{ flex: 1, maxWidth: 320 }}>
            <SearchIcon size={14} stroke="var(--text-muted)"/>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar atleta..."/>
          </div>
          <FilterSelect value={filterCat} onChange={setFilterCat} options={[
            { value: 'all', label: 'Todas las categorías' },
            ...Object.values(CATEGORIES).map(c => ({ value: c.id, label: c.label })),
          ]}/>
          <FilterSelect value={filterStatus} onChange={setFilterStatus} options={[
            { value: 'all',      label: 'Todos los estados' },
            { value: 'on-track', label: 'En plan'  },
            { value: 'peak',     label: 'Pico'     },
            { value: 'deload',   label: 'Descarga' },
            { value: 'missed',   label: 'Ausente'  },
          ]}/>
          <div style={{ flex: 1 }}/>
          <span className="muted" style={{ fontSize: 11 }}>{filtered.length} resultados</span>
        </div>

        {loading ? (
          <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
            Cargando atletas...
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
            {athletes.length === 0 ? 'Aún no hay atletas. Crea el primero.' : 'Sin resultados.'}
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
            {filtered.map(a => {
              const cat = CATEGORIES[a.focus];
              const Ic = getCategoryIcon(a.focus);
              return (
                <div key={a.id} onClick={() => router.push(`/athletes/${a.id}/planner`)} className="lift" style={{
                  cursor: 'pointer', padding: 14, borderRadius: 10,
                  background: 'var(--surface-2)', border: '1px solid var(--border)',
                  display: 'grid', gridTemplateColumns: '44px 1fr auto', gap: 12, alignItems: 'center',
                }}>
                  <div style={{ width: 44, height: 44, borderRadius: 22, background: a.color || cat?.color, color: '#fff', display: 'grid', placeItems: 'center', fontSize: 13, fontWeight: 700 }}>
                    {a.initials}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      <div style={{ fontSize: 14, fontWeight: 600 }}>{a.name}</div>
                      <StatusPill status={a.status}/>
                    </div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 5, fontSize: 11, flexWrap: 'wrap' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: cat?.color, fontWeight: 600 }}>
                        <Ic size={11} stroke="currentColor"/>{cat?.label}
                      </span>
                      <span className="muted">{a.age}a · {a.weeklyHours}h/sem · adh {a.adherence}%</span>
                    </div>
                  </div>
                  <ChevronRight size={14} stroke="var(--text-muted)"/>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showModal && (
        <NewAthleteModal
          onClose={() => setShowModal(false)}
          onCreated={fetchAthletes}
        />
      )}
    </div>
  );
}

function FilterSelect({ value, onChange, options }: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div style={{ position: 'relative' }}>
      <select value={value} onChange={e => onChange(e.target.value)} style={{
        appearance: 'none', padding: '7px 28px 7px 10px',
        borderRadius: 6, border: '1px solid var(--border)',
        background: 'white', color: 'var(--text)',
        fontSize: 12, fontFamily: 'inherit', cursor: 'pointer',
      }}>
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      <ChevronDown size={11} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }}/>
    </div>
  );
}
