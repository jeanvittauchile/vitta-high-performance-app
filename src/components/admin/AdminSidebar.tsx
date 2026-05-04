'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase';
import { VittaMark, HomeIcon, UsersIcon, CalendarIcon, LayersIcon, MessageIcon } from '@/components/icons';

const items = [
  { href: '/dashboard', label: 'Dashboard',    Icon: HomeIcon    },
  { href: '/athletes',  label: 'Atletas',      Icon: UsersIcon   },
  { href: '/planner',   label: 'Planificador', Icon: CalendarIcon},
  { href: '/library',   label: 'Biblioteca',   Icon: LayersIcon  },
  { href: '/messages',  label: 'Mensajes',     Icon: MessageIcon },
];

export default function AdminSidebar() {
  const pathname = usePathname();
  const [name, setName] = useState<string>('');
  const [initials, setInitials] = useState<string>('');

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      const meta = user.user_metadata || {};
      const fullName: string =
        meta.full_name || meta.name ||
        (user.email ? user.email.split('@')[0] : 'Coach');
      const parts = fullName.trim().split(/\s+/);
      const ini = parts.length >= 2
        ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
        : fullName.slice(0, 2).toUpperCase();
      setName(fullName);
      setInitials(ini);
    });
  }, []);

  return (
    <div style={{
      background: 'var(--vitta-navy-deep)', color: 'var(--vitta-cream)',
      padding: '20px 14px', display: 'flex', flexDirection: 'column', gap: 4,
      borderRight: '1px solid var(--border)', height: '100vh',
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '0 6px 14px',
        borderBottom: '1px solid rgba(244,239,224,0.12)',
        marginBottom: 10,
      }}>
        <VittaMark size={32} bg="var(--vitta-cream)" fg="var(--vitta-navy-deep)"/>
        <div>
          <div className="display" style={{ fontStyle: 'italic', fontSize: 18, lineHeight: 1, color: 'var(--vitta-cream)' }}>VITTA</div>
          <div style={{ fontSize: 8, letterSpacing: '0.18em', color: 'rgba(244,239,224,0.6)', marginTop: 3 }}>HIGH PERFORMANCE</div>
        </div>
      </div>

      <div style={{ fontSize: 9, letterSpacing: '0.12em', color: 'rgba(244,239,224,0.45)', padding: '8px 8px 6px', fontWeight: 700 }}>WORKSPACE</div>

      {items.map(({ href, label, Icon }) => {
        const active = pathname === href || pathname.startsWith(href + '/');
        return (
          <Link key={href} href={href} style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '9px 10px', borderRadius: 8,
            textDecoration: 'none',
            background: active ? 'rgba(244,239,224,0.10)' : 'transparent',
            color: active ? 'var(--vitta-cream)' : 'rgba(244,239,224,0.7)',
            fontSize: 13, fontWeight: active ? 600 : 500,
            transition: 'all 0.15s',
          }}>
            <Icon size={16} strokeWidth={active ? 2 : 1.6}/>
            {label}
          </Link>
        );
      })}

      <div style={{ flex: 1 }}/>

      <div style={{
        background: 'rgba(244,239,224,0.04)', border: '1px solid rgba(244,239,224,0.10)',
        borderRadius: 10, padding: 12, fontSize: 11,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 28, height: 28, borderRadius: 14,
            background: 'linear-gradient(135deg, var(--vitta-blue) 0%, var(--vitta-blue-bright) 100%)',
            display: 'grid', placeItems: 'center', color: '#fff', fontWeight: 800, fontSize: 11,
            flexShrink: 0,
          }}>
            {initials || '…'}
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 600, color: 'var(--vitta-cream)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {name || 'Cargando...'}
            </div>
            <div style={{ fontSize: 9, color: 'rgba(244,239,224,0.55)', letterSpacing: '0.04em' }}>Administrador</div>
          </div>
        </div>
      </div>
    </div>
  );
}
