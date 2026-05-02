'use client';
import { LEVELS } from '@/lib/constants';
import type { LevelId } from '@/lib/types';

interface Props { level: LevelId; size?: 'sm' | 'md'; }

export default function LevelBadge({ level, size = 'md' }: Props) {
  const L = LEVELS[level];
  if (!L) return null;
  const sm = size === 'sm';
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: sm ? 3 : 4,
      padding: sm ? '1px 5px' : '2px 7px',
      borderRadius: 4,
      background: `${L.color}18`,
      color: L.color,
      fontSize: sm ? 9 : 10,
      fontWeight: 700,
      letterSpacing: '0.04em',
      textTransform: 'uppercase',
    }}>
      <span style={{ width: sm ? 5 : 6, height: sm ? 5 : 6, borderRadius: '50%', background: L.color, flexShrink: 0 }}/>
      {L.label}
    </span>
  );
}
