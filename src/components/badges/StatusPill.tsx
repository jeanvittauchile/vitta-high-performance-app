'use client';
import type { AthleteStatus } from '@/lib/types';

const STATUS_MAP: Record<AthleteStatus, { label: string; bg: string; fg: string }> = {
  'on-track': { label: 'En plan',  bg: 'rgba(43,182,115,0.12)',  fg: '#2BB673' },
  'peak':     { label: 'Pico',     bg: 'rgba(46,107,214,0.12)',  fg: '#2E6BD6' },
  'deload':   { label: 'Descarga', bg: 'rgba(232,163,58,0.14)',  fg: '#E8A33A' },
  'missed':   { label: 'Ausente',  bg: 'rgba(215,71,75,0.10)',   fg: '#D7474B' },
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
