'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import { CATEGORIES } from '@/lib/constants';
import { getCategoryIcon, XIcon, ChevronRight, UserIcon, TrendIcon } from '@/components/icons';
import StatusPill from '@/components/badges/StatusPill';
import type { Athlete } from '@/lib/types';

interface AthleteProfile {
  peso: number | null;
  estatura: number | null;
  dias_entrenamiento: number | null;
  promedio_kcal: number | null;
  nivel_entrenamiento: number | null;
  historial_lesiones: string | null;
}

const NIVELES: Record<number, string> = {
  1: 'Principiante',
  2: 'Intermedio',
  3: 'Avanzado',
  4: 'Elite',
};

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '5px 0', borderBottom: '1px solid var(--border)' }}>
      <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</span>
      <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>{value}</span>
    </div>
  );
}

interface Props {
  athlete: Athlete;
  onClose: () => void;
}

export default function AthleteProfileDrawer({ athlete, onClose }: Props) {
  const router = useRouter();
  const [profile, setProfile] = useState<AthleteProfile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [completedSessions, setCompletedSessions] = useState<{ date: string; title: string }[]>([]);
  const [loadingDates, setLoadingDates] = useState(true);
  const cat = CATEGORIES[athlete.focus];
  const CatIcon = getCategoryIcon(athlete.focus);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from('athlete_profiles')
      .select('peso, estatura, dias_entrenamiento, promedio_kcal, nivel_entrenamiento, historial_lesiones')
      .eq('athlete_id', athlete.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        setProfile(data ?? null);
        setLoadingProfile(false);
      });
  }, [athlete.id]);

  useEffect(() => {
    const supabase = createClient();
    const cutoff = new Date();
    cutoff.setMonth(cutoff.getMonth() - 3);
    const cutoffDate = cutoff.toISOString().slice(0, 10);
    supabase
      .from('sessions')
      .select('date, title, session_feedback(id)')
      .eq('athlete_id', athlete.id)
      .gte('date', cutoffDate)
      .order('date', { ascending: false })
      .limit(40)
      .then(({ data }) => {
        if (data) {
          setCompletedSessions(
            data
              .filter((s: any) => Array.isArray(s.session_feedback) && s.session_feedback.length > 0)
              .map((s: any) => ({ date: s.date, title: s.title }))
          );
        }
        setLoadingDates(false);
      });
  }, [athlete.id]);

  return (
    <>
      {/* backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 200,
          background: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(2px)',
        }}
      />

      {/* drawer */}
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0, zIndex: 201,
        width: 'min(340px, 100vw)', background: 'var(--surface)', boxShadow: '-4px 0 32px rgba(0,0,0,0.18)',
        display: 'flex', flexDirection: 'column', overflowY: 'auto',
      }}>

        {/* header */}
        <div style={{ padding: '16px 18px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
            Perfil del atleta
          </span>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: 'var(--text-muted)', display: 'grid', placeItems: 'center' }}
          >
            <XIcon size={16}/>
          </button>
        </div>

        {/* hero */}
        <div style={{ padding: '18px 18px 16px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
            <div style={{
              width: 56, height: 56, borderRadius: 28,
              background: athlete.color || cat?.color || 'var(--vitta-navy)',
              color: '#fff', display: 'grid', placeItems: 'center',
              fontSize: 16, fontWeight: 700, flexShrink: 0,
            }}>
              {athlete.initials}
            </div>
            <div>
              <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--text)', lineHeight: 1.2 }}>{athlete.name}</div>
              <div style={{ marginTop: 5, display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                <StatusPill status={athlete.status}/>
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: 5,
                  padding: '2px 7px', borderRadius: 4,
                  background: `${cat?.color}18`, color: cat?.color,
                  fontSize: 11, fontWeight: 600,
                }}>
                  <CatIcon size={10} stroke="currentColor"/>
                  {cat?.label}
                </span>
              </div>
              <div style={{ marginTop: 6, fontSize: 11, color: 'var(--text-muted)' }}>
                {athlete.age}a · {athlete.weeklyHours}h/sem
              </div>
            </div>
          </div>
        </div>

        {/* sesiones completadas */}
        <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 10 }}>
            Sesiones completadas
          </div>
          {loadingDates ? (
            <div style={{ color: 'var(--text-muted)', fontSize: 12, marginBottom: 10 }}>Cargando...</div>
          ) : completedSessions.length === 0 ? (
            <div style={{ color: 'var(--text-muted)', fontSize: 12, marginBottom: 10 }}>Sin sesiones completadas aún.</div>
          ) : (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 10 }}>
              {completedSessions.map((s, i) => (
                <div key={i} title={s.title} style={{
                  display: 'inline-flex', alignItems: 'center', gap: 4,
                  padding: '3px 8px', borderRadius: 4,
                  background: '#22c55e12', border: '1px solid #22c55e33',
                  color: 'var(--green)',
                }}>
                  <svg width="8" height="8" viewBox="0 0 10 10" fill="none">
                    <path d="M1.5 5L4 7.5L8.5 2.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  <span style={{ fontSize: 11, fontWeight: 600 }}>
                    {new Date(s.date + 'T12:00:00').toLocaleDateString('es-CL', { weekday: 'short', day: 'numeric', month: 'short' })}
                  </span>
                </div>
              ))}
            </div>
          )}
          <Row label="RPE 7d" value={<span className="mono">{athlete.rpe7}</span>}/>
        </div>

        {/* perfil deportivo */}
        <div style={{ padding: '14px 18px', flex: 1 }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 10 }}>
            Perfil deportivo
          </div>
          {loadingProfile ? (
            <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>Cargando...</div>
          ) : !profile ? (
            <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>Sin datos de perfil aún.</div>
          ) : (
            <div style={{ display: 'grid', gap: 0 }}>
              {profile.nivel_entrenamiento != null && (
                <Row label="Nivel" value={NIVELES[profile.nivel_entrenamiento] ?? '—'}/>
              )}
              {profile.peso != null && (
                <Row label="Peso" value={`${profile.peso} kg`}/>
              )}
              {profile.estatura != null && (
                <Row label="Estatura" value={`${profile.estatura} cm`}/>
              )}
              {profile.dias_entrenamiento != null && (
                <Row label="Días/sem" value={profile.dias_entrenamiento}/>
              )}
              {profile.promedio_kcal != null && (
                <Row label="Kcal/día" value={profile.promedio_kcal.toLocaleString('es-CL')}/>
              )}
              {profile.historial_lesiones && (
                <div style={{ marginTop: 10 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 4 }}>
                    Historial lesiones
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text)', lineHeight: 1.5, padding: '8px 10px', borderRadius: 6, background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                    {profile.historial_lesiones}
                  </div>
                </div>
              )}
              {profile.nivel_entrenamiento == null && profile.peso == null &&
               profile.estatura == null && profile.dias_entrenamiento == null &&
               profile.promedio_kcal == null && !profile.historial_lesiones && (
                <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>Sin datos de perfil aún.</div>
              )}
            </div>
          )}
        </div>

        {/* acciones */}
        <div style={{ padding: '14px 18px 20px', borderTop: '1px solid var(--border)', display: 'grid', gap: 8 }}>
          <button
            className="btn btn-primary"
            style={{ width: '100%', justifyContent: 'center' }}
            onClick={() => router.push(`/athletes/${athlete.id}/planner`)}
          >
            Ir al planner <ChevronRight size={14}/>
          </button>
          <button
            className="btn btn-ghost"
            style={{ width: '100%', justifyContent: 'center' }}
            onClick={() => router.push(`/athletes/${athlete.id}/progress`)}
          >
            <UserIcon size={13}/>Ver progreso
          </button>
          <button
            className="btn btn-ghost"
            style={{ width: '100%', justifyContent: 'center' }}
            onClick={() => router.push(`/athletes/${athlete.id}/report`)}
          >
            <TrendIcon size={13}/>Informe mensual
          </button>
        </div>
      </div>
    </>
  );
}
