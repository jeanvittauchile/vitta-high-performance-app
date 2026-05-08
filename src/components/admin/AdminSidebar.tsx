'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase';
import { VittaMark, HomeIcon, UsersIcon, CalendarIcon, LayersIcon, MessageIcon, LogOutIcon, LockIcon, CheckIcon } from '@/components/icons';

const items = [
  { href: '/dashboard', label: 'Dashboard',    Icon: HomeIcon    },
  { href: '/athletes',  label: 'Atletas',      Icon: UsersIcon   },
  { href: '/planner',   label: 'Planificador', Icon: CalendarIcon},
  { href: '/library',   label: 'Biblioteca',   Icon: LayersIcon  },
  { href: '/messages',  label: 'Mensajes',     Icon: MessageIcon },
];

export default function AdminSidebar() {
  const pathname = usePathname();
  const router   = useRouter();
  const menuRef  = useRef<HTMLDivElement>(null);
  const [name, setName]           = useState<string>('');
  const [initials, setInitials]   = useState<string>('');
  const [menuOpen, setMenuOpen]   = useState(false);
  const [showPwForm, setShowPwForm] = useState(false);
  const [newPw, setNewPw]         = useState('');
  const [pwSaving, setPwSaving]   = useState(false);
  const [pwDone, setPwDone]       = useState(false);
  const [pwError, setPwError]     = useState('');

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

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
        setShowPwForm(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
  }

  async function handleChangePassword() {
    if (!newPw.trim() || newPw.length < 6) { setPwError('Mínimo 6 caracteres.'); return; }
    setPwSaving(true); setPwError('');
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password: newPw });
    setPwSaving(false);
    if (error) { setPwError(error.message); return; }
    setPwDone(true);
    setNewPw('');
    setTimeout(() => { setPwDone(false); setShowPwForm(false); setMenuOpen(false); }, 1500);
  }

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

      <div ref={menuRef} style={{ position: 'relative' }}>
        {/* Dropdown menu */}
        {menuOpen && (
          <div style={{
            position: 'absolute', bottom: 'calc(100% + 8px)', left: 0, right: 0,
            background: 'var(--vitta-navy)', border: '1px solid rgba(244,239,224,0.15)',
            borderRadius: 10, overflow: 'hidden', zIndex: 50,
            boxShadow: '0 -8px 24px rgba(0,0,0,0.4)',
          }}>
            {!showPwForm ? (
              <>
                <button
                  onClick={() => setShowPwForm(true)}
                  style={{ width: '100%', padding: '11px 14px', border: 'none', background: 'transparent', color: 'rgba(244,239,224,0.85)', fontSize: 12, fontFamily: 'inherit', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 9, borderBottom: '1px solid rgba(244,239,224,0.08)' }}
                >
                  <LockIcon size={14} stroke="currentColor"/> Cambiar contraseña
                </button>
                <button
                  onClick={handleSignOut}
                  style={{ width: '100%', padding: '11px 14px', border: 'none', background: 'transparent', color: '#f87171', fontSize: 12, fontFamily: 'inherit', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 9 }}
                >
                  <LogOutIcon size={14} stroke="currentColor"/> Cerrar sesión
                </button>
              </>
            ) : (
              <div style={{ padding: 12 }}>
                <div style={{ fontSize: 11, color: 'rgba(244,239,224,0.6)', marginBottom: 8, fontWeight: 600 }}>Nueva contraseña</div>
                <input
                  type="password"
                  value={newPw}
                  onChange={e => setNewPw(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleChangePassword()}
                  placeholder="Mínimo 6 caracteres"
                  autoFocus
                  style={{ width: '100%', padding: '7px 10px', borderRadius: 7, border: '1px solid rgba(244,239,224,0.2)', background: 'rgba(255,255,255,0.06)', color: 'var(--vitta-cream)', fontSize: 12, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }}
                />
                {pwError && <div style={{ fontSize: 11, color: '#f87171', marginTop: 5 }}>{pwError}</div>}
                <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                  <button onClick={() => { setShowPwForm(false); setPwError(''); setNewPw(''); }} style={{ flex: 1, padding: '6px 0', borderRadius: 6, border: '1px solid rgba(244,239,224,0.15)', background: 'transparent', color: 'rgba(244,239,224,0.6)', fontSize: 11, cursor: 'pointer', fontFamily: 'inherit' }}>
                    Cancelar
                  </button>
                  <button onClick={handleChangePassword} disabled={pwSaving} style={{ flex: 1, padding: '6px 0', borderRadius: 6, border: 'none', background: pwDone ? '#22c55e' : 'var(--vitta-blue)', color: '#fff', fontSize: 11, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
                    {pwDone ? <><CheckIcon size={12} stroke="#fff"/>Listo</> : pwSaving ? 'Guardando…' : 'Guardar'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* User card (clickable) */}
        <button
          onClick={() => { setMenuOpen(o => !o); setShowPwForm(false); setPwError(''); }}
          style={{
            width: '100%', background: menuOpen ? 'rgba(244,239,224,0.08)' : 'rgba(244,239,224,0.04)',
            border: '1px solid rgba(244,239,224,0.10)', borderRadius: 10, padding: 12,
            cursor: 'pointer', fontFamily: 'inherit', transition: 'background 0.15s',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{
              width: 28, height: 28, borderRadius: 14,
              background: 'linear-gradient(135deg, var(--vitta-blue) 0%, var(--vitta-blue-bright) 100%)',
              display: 'grid', placeItems: 'center', color: '#fff', fontWeight: 800, fontSize: 11, flexShrink: 0,
            }}>
              {initials || '…'}
            </div>
            <div style={{ minWidth: 0, flex: 1, textAlign: 'left' }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--vitta-cream)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {name || 'Cargando...'}
              </div>
              <div style={{ fontSize: 9, color: 'rgba(244,239,224,0.55)', letterSpacing: '0.04em' }}>Administrador</div>
            </div>
          </div>
        </button>
      </div>
    </div>
  );
}
