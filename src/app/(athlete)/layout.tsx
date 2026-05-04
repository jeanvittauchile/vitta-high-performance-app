'use client';
import { usePathname, useRouter } from 'next/navigation';
import { AthleteProvider, useAthlete } from '@/lib/athlete-context';
import { VittaMark, HomeIcon, CalendarIcon, TrendIcon, MessageIcon, BellIcon } from '@/components/icons';
import type { ReactNode } from 'react';

const TABS = [
  { href: '/today',  label: 'Hoy',     Icon: HomeIcon     },
  { href: '/month',  label: 'Mes',     Icon: CalendarIcon },
  { href: '/stats',  label: 'Progreso',Icon: TrendIcon    },
  { href: '/coach',  label: 'Coach',   Icon: MessageIcon  },
];

function AthleteLayoutInner({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router   = useRouter();
  const { name, initials, loading } = useAthlete();

  const titleMap: Record<string, string> = {
    '/today': 'Tu sesión de hoy',
    '/month': 'Plan mensual',
    '/stats': 'Tu progreso',
    '/coach': 'Coach',
  };
  const title      = titleMap[pathname] || 'Vitta';
  const firstName  = loading ? '…' : (name.split(' ')[0] || 'Atleta');
  const avatarText = loading ? '…' : (initials || '?');

  return (
    <div className="athlete-root thin-scroll-dark" style={{
      width: '100%', minHeight: '100vh', maxWidth: 430, margin: '0 auto',
      display: 'flex', flexDirection: 'column', overflow: 'hidden',
    }}>
      {/* Header */}
      <div className="frost-dark" style={{
        padding: '14px 18px 10px',
        borderBottom: '1px solid var(--d-border)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        position: 'sticky', top: 0, zIndex: 10,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <VittaMark size={30} bg="var(--vitta-cream)" fg="var(--vitta-navy-deep)"/>
          <div>
            <div style={{ fontSize: 11, color: 'var(--d-text-faint)', letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 700 }}>
              Hola, {firstName}
            </div>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--d-text)', marginTop: 1 }}>{title}</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button style={{ position: 'relative', width: 32, height: 32, borderRadius: 16, border: '1px solid var(--d-border)', background: 'rgba(255,255,255,0.04)', color: 'var(--d-text)', display: 'grid', placeItems: 'center', cursor: 'pointer' }}>
            <BellIcon size={16}/>
            <span style={{ position: 'absolute', top: 6, right: 6, width: 7, height: 7, borderRadius: '50%', background: 'var(--vitta-blue)' }}/>
          </button>
          <div style={{ width: 32, height: 32, borderRadius: 16, background: 'linear-gradient(135deg, var(--vitta-blue) 0%, var(--vitta-blue-bright) 100%)', color: '#fff', display: 'grid', placeItems: 'center', fontSize: 12, fontWeight: 700 }}>
            {avatarText}
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="thin-scroll-dark" style={{ flex: 1, overflowY: 'auto' }}>
        {children}
      </div>

      {/* Bottom nav */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
        background: 'var(--d-surface)',
        borderTop: '1px solid var(--d-border)',
        padding: '8px 8px 14px', gap: 4,
        position: 'sticky', bottom: 0, zIndex: 10,
      }}>
        {TABS.map(t => {
          const active = pathname === t.href;
          return (
            <button key={t.href} onClick={() => router.push(t.href)} style={{
              border: 'none', background: 'transparent',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
              padding: '8px 4px',
              color: active ? 'var(--vitta-cream)' : 'var(--d-text-faint)',
              cursor: 'pointer', borderRadius: 10,
              transition: 'all 0.15s ease',
            }}>
              <t.Icon size={20} strokeWidth={active ? 2 : 1.6}/>
              <div style={{ fontSize: 10, fontWeight: active ? 700 : 500, letterSpacing: '0.02em' }}>{t.label}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function AthleteLayout({ children }: { children: ReactNode }) {
  return (
    <AthleteProvider>
      <AthleteLayoutInner>{children}</AthleteLayoutInner>
    </AthleteProvider>
  );
}
