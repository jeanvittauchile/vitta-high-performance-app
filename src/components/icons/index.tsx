'use client';
import React from 'react';

interface IconProps {
  size?: number;
  stroke?: string;
  strokeWidth?: number;
  style?: React.CSSProperties;
  className?: string;
}

const Icon = ({ d, size = 20, stroke = 'currentColor', strokeWidth = 1.75, fill = 'none', children, style, className }: IconProps & { d?: string; fill?: string; children?: React.ReactNode }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke={stroke}
       strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" style={style} className={className}>
    {d ? <path d={d} /> : children}
  </svg>
);

// ─── Category Icons ───────────────────────────────────────
export const PullIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M5 5l7 7M5 5h5M5 5v5"/>
    <path d="M14 14l5 5M14 14v5M14 14h5"/>
    <circle cx="12" cy="12" r="2"/>
  </Icon>
);

export const PushIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M3 12h14M13 7l5 5-5 5"/>
    <path d="M19 5v14"/>
  </Icon>
);

export const CoreIcon = (p: IconProps) => (
  <Icon {...p}>
    <ellipse cx="12" cy="12" rx="6" ry="9"/>
    <path d="M6 12h12M12 4v16"/>
  </Icon>
);

export const SnatchIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M3 5h2M19 5h2M5 3v4M19 3v4"/>
    <path d="M5 5h14"/>
    <path d="M12 9v6"/>
    <path d="M9 21h6"/>
    <circle cx="12" cy="18" r="1.2" fill="currentColor" stroke="none"/>
  </Icon>
);

export const CleanIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M3 9h2M19 9h2M5 7v4M19 7v4"/>
    <path d="M5 9h14"/>
    <circle cx="12" cy="14" r="2"/>
    <path d="M9 21l3-5 3 5"/>
  </Icon>
);

export const JerkIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M4 4h2M18 4h2M6 2v4M18 2v4"/>
    <path d="M6 4h12"/>
    <circle cx="12" cy="9" r="1.5"/>
    <path d="M9 21l3-9 3 5 3 4M12 12l-3 4"/>
  </Icon>
);

export const PlyoArmIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M4 17l4-4 4 2 4-5 4 3"/>
    <path d="M14 5l3-2 2 3"/>
    <circle cx="4" cy="17" r="1.5" fill="currentColor" stroke="none"/>
  </Icon>
);

export const PlyoLegIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M3 18c4-10 14-10 18 0"/>
    <path d="M3 18l-1 3M21 18l1 3"/>
    <circle cx="12" cy="9" r="1.5" fill="currentColor" stroke="none"/>
  </Icon>
);

export const ThrowIcon = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="8" cy="16" r="3"/>
    <path d="M11 16l6-8"/>
    <path d="M15 8l4-2-1 4"/>
  </Icon>
);

export const RunIcon = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="12" cy="5" r="1.5"/>
    <path d="M8 21l3-6 4 3 3-9"/>
    <path d="M6 14l3-4 4 2"/>
  </Icon>
);

export const ShieldIcon = (p: IconProps) => (
  <Icon {...p} d="M12 3l8 4v5c0 5-4 8-8 9-4-1-8-4-8-9V7l8-4z"/>
);

export const MobilityIcon = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="4"/>
    <path d="M12 3v3M12 18v3M3 12h3M18 12h3"/>
    <path d="M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1"/>
  </Icon>
);

export const CoordIcon = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="5" cy="12" r="2"/>
    <circle cx="12" cy="5" r="2"/>
    <circle cx="19" cy="12" r="2"/>
    <circle cx="12" cy="19" r="2"/>
    <path d="M7 12h5M12 7v5M17 12h-5M12 17v-5"/>
  </Icon>
);

// ─── UI Icons ────────────────────────────────────────────
export const HomeIcon = (p: IconProps) => <Icon {...p} d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>;
export const CalendarIcon = (p: IconProps) => (
  <Icon {...p}>
    <rect x="3" y="4" width="18" height="18" rx="2"/>
    <path d="M16 2v4M8 2v4M3 10h18"/>
  </Icon>
);
export const UsersIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
    <circle cx="9" cy="7" r="4"/>
    <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>
  </Icon>
);
export const LayersIcon = (p: IconProps) => (
  <Icon {...p}>
    <polygon points="12 2 2 7 12 12 22 7 12 2"/>
    <polyline points="2 17 12 22 22 17"/>
    <polyline points="2 12 12 17 22 12"/>
  </Icon>
);
export const MessageIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
  </Icon>
);
export const TrendIcon = (p: IconProps) => <Icon {...p} d="M23 6l-9.5 9.5-5-5L1 18M17 6h6v6"/>;
export const FlameIcon = (p: IconProps) => <Icon {...p} d="M8.5 14.5A2.5 2.5 0 0011 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 11-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 002.5 3z"/>;
export const SparkleIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5z"/>
    <path d="M5 19l.5 1.5L7 21l-1.5.5L5 23l-.5-1.5L3 21l1.5-.5z"/>
    <path d="M19 3l.5 1.5L21 5l-1.5.5L19 7l-.5-1.5L17 5l1.5-.5z"/>
  </Icon>
);
export const PlusIcon = (p: IconProps) => <Icon {...p} d="M12 5v14M5 12h14"/>;
export const SearchIcon = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="11" cy="11" r="8"/>
    <path d="M21 21l-4.35-4.35"/>
  </Icon>
);
export const ChevronRight = ({ size = 20, style, stroke, className }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke || 'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style} className={className}>
    <polyline points="9 18 15 12 9 6"/>
  </svg>
);
export const ChevronLeft = (p: IconProps) => <Icon {...p} d="M15 18l-6-6 6-6"/>;
export const ChevronDown = ({ size = 20, style, stroke, className }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke || 'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style} className={className}>
    <polyline points="6 9 12 15 18 9"/>
  </svg>
);
export const CheckIcon = ({ size = 20, stroke, strokeWidth = 2, style }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke || 'currentColor'} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" style={style}>
    <polyline points="20 6 9 17 4 12"/>
  </svg>
);
export const XIcon = (p: IconProps) => <Icon {...p} d="M18 6L6 18M6 6l12 12"/>;
export const PlayIcon = (p: IconProps) => <Icon {...p} fill="currentColor" stroke="none" d="M5 3l14 9-14 9V3z"/>;
export const PauseIcon = (p: IconProps) => (
  <Icon {...p}>
    <rect x="6" y="4" width="4" height="16"/>
    <rect x="14" y="4" width="4" height="16"/>
  </Icon>
);
export const BellIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0"/>
  </Icon>
);
export const InfoIcon = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="10"/>
    <path d="M12 16v-4M12 8h.01"/>
  </Icon>
);
export const SendIcon = (p: IconProps) => <Icon {...p} d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/>;
export const PaperclipIcon = (p: IconProps) => <Icon {...p} d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48"/>;
export const CopyIcon = (p: IconProps) => (
  <Icon {...p}>
    <rect x="9" y="9" width="13" height="13" rx="2"/>
    <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
  </Icon>
);
export const MoreIcon = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="12" cy="5" r="1.5" fill="currentColor" stroke="none"/>
    <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none"/>
    <circle cx="12" cy="19" r="1.5" fill="currentColor" stroke="none"/>
  </Icon>
);
export const VideoIcon = (p: IconProps) => (
  <Icon {...p}>
    <polygon points="23 7 16 12 23 17 23 7"/>
    <rect x="1" y="5" width="15" height="14" rx="2"/>
  </Icon>
);
export const LockIcon = (p: IconProps) => (
  <Icon {...p}>
    <rect x="3" y="11" width="18" height="11" rx="2"/>
    <path d="M7 11V7a5 5 0 0110 0v4"/>
  </Icon>
);
export const LogOutIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/>
    <polyline points="16 17 21 12 16 7"/>
    <line x1="21" y1="12" x2="9" y2="12"/>
  </Icon>
);
export const TrashIcon = (p: IconProps) => (
  <Icon {...p}>
    <polyline points="3 6 5 6 21 6"/>
    <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
    <path d="M10 11v6M14 11v6"/>
    <path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/>
  </Icon>
);
export const PencilIcon = (p: IconProps) => <Icon {...p} d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>;
export const ExternalLinkIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/>
    <polyline points="15 3 21 3 21 9"/>
    <line x1="10" y1="14" x2="21" y2="3"/>
  </Icon>
);

// ─── Category icon router ────────────────────────────────
export function getCategoryIcon(catId: string) {
  const map: Record<string, React.ComponentType<IconProps>> = {
    traccion:           PullIcon,
    empuje:             PushIcon,
    zona_media:         CoreIcon,
    arranque:           SnatchIcon,
    envion:             CleanIcon,
    jerk:               JerkIcon,
    pliometria_brazos:  PlyoArmIcon,
    pliometria_piernas: PlyoLegIcon,
    lanzamientos:       ThrowIcon,
    aerobicos:          RunIcon,
    preventivos:        ShieldIcon,
    movilidad:          MobilityIcon,
    coordinacion:       CoordIcon,
  };
  return map[catId] || CoreIcon;
}

// ─── VittaMark ───────────────────────────────────────────
export const VittaMark = ({ size = 32, bg = '#0E1936', fg = '#F4EFE0' }: { size?: number; bg?: string; fg?: string }) => (
  <div style={{
    width: size, height: size, borderRadius: size * 0.28,
    background: bg, display: 'grid', placeItems: 'center', flexShrink: 0,
  }}>
    <span style={{
      fontFamily: 'var(--font-display)', fontWeight: 900, fontStyle: 'italic',
      fontSize: size * 0.55, color: fg, lineHeight: 1, letterSpacing: '-0.05em',
    }}>V</span>
  </div>
);
