'use client';
import type { AthleteStatus } from '@/lib/types';

export const STATUS_MAP: Record<AthleteStatus, { label: string; bg: string; fg: string }> = {
  'on-track': { label: 'En plan',    bg: 'rgba(43,182,115,0.12)', fg: '#2BB673' },
  'paused':   { label: 'En pausa',   bg: 'rgba(232,163,58,0.14)', fg: '#E8A33A' },
  'canceled': { label: 'Cancelado',  bg: 'rgba(215,71,75,0.10)',  fg: '#D7474B' },
};

export default function StatusPill({ status }: { status: AthleteStatus }) {
  const m = STATUS_MAP[status] || STATUS_MAP['on-track'];
  return (
    <span style={{
      padding: '2px 8px', borderRadius: 4,
      background: m.bg, color: m.fg,
      fontSize: 10, fontWeight: 700,
      letterSpacing: '0.06em', textTransform: 'uppercase',
    }}>{m.label}</span>
  );
}

// Editable version of the pill — lets the coach change an athlete's status
// inline (e.g. in the dashboard table) without opening a separate form.
export function StatusSelect({ status, onChange, disabled }: {
  status: AthleteStatus;
  onChange: (next: AthleteStatus) => void;
  disabled?: boolean;
}) {
  const m = STATUS_MAP[status] || STATUS_MAP['on-track'];
  return (
    <select
      value={status}
      disabled={disabled}
      onClick={e => e.stopPropagation()}
      onChange={e => onChange(e.target.value as AthleteStatus)}
      style={{
        padding: '2px 6px 2px 8px', borderRadius: 4,
        background: m.bg, color: m.fg,
        fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase',
        border: 'none', cursor: disabled ? 'default' : 'pointer', fontFamily: 'inherit',
        opacity: disabled ? 0.6 : 1,
      }}
    >
      {(Object.keys(STATUS_MAP) as AthleteStatus[]).map(s => (
        <option key={s} value={s} style={{ color: '#0E1936' }}>{STATUS_MAP[s].label}</option>
      ))}
    </select>
  );
}
