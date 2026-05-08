'use client';
import { useEffect, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { AthleteProvider, useAthlete } from '@/lib/athlete-context';
import { createClient } from '@/lib/supabase';
import { VittaMark, HomeIcon, CalendarIcon, TrendIcon, MessageIcon, BellIcon, LogOutIcon, LockIcon, CheckIcon, XIcon } from '@/components/icons';
import type { ReactNode } from 'react';

const TABS = [
  { href: '/today',  label: 'Hoy',     Icon: HomeIcon     },
  { href: '/month',  label: 'Mes',     Icon: CalendarIcon },
  { href: '/stats',  label: 'Progreso',Icon: TrendIcon    },
  { href: '/coach',  label: 'Coach',   Icon: MessageIcon  },
];

interface CoachMsg {
  id: string;
  text: string;
  created_at: string;
}

function NotifPanel({ athleteId, onClose }: { athleteId: string; onClose: () => void }) {
  const [msgs, setMsgs] = useState<CoachMsg[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from('messages')
      .select('id, text, created_at')
      .eq('thread_id', athleteId)
      .eq('from_role', 'coach')
      .order('created_at', { ascending: false })
      .limit(15)
      .then(({ data }) => {
        setMsgs(data || []);
        setLoading(false);
        // Mark all as seen
        localStorage.setItem('vitta_notif_last_seen', new Date().toISOString());
      });
  }, [athleteId]);

  function formatDate(iso: string) {
    const d = new Date(iso);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    const diffH = Math.floor(diffMin / 60);
    const diffDays = Math.floor(diffH / 24);
    if (diffMin < 1) return 'Ahora';
    if (diffMin < 60) return `Hace ${diffMin} min`;
    if (diffH < 24) return `Hace ${diffH}h`;
    if (diffDays === 1) return 'Ayer';
    return d.toLocaleDateString('es-CL', { day: 'numeric', month: 'short' });
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 300, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
      <div onClick={onClose} style={{ flex: 1, background: 'rgba(0,0,0,0.55)' }}/>
      <div className="thin-scroll-dark" style={{
        background: 'var(--d-bg)', borderRadius: '20px 20px 0 0',
        maxHeight: '70vh', overflowY: 'auto',
        boxShadow: '0 -8px 40px rgba(0,0,0,0.5)',
      }}>
        {/* Header */}
        <div style={{ position: 'sticky', top: 0, background: 'var(--d-bg)', padding: '14px 16px 12px', borderBottom: '1px solid var(--d-border)', zIndex: 1 }}>
          <div style={{ width: 40, height: 4, borderRadius: 2, background: 'var(--d-border-strong)', margin: '0 auto 14px' }}/>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--d-text)' }}>Mensajes del coach</div>
              <div style={{ fontSize: 11, color: 'var(--d-text-muted)', marginTop: 2 }}>Últimas comunicaciones</div>
            </div>
            <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: 16, border: '1px solid var(--d-border)', background: 'rgba(255,255,255,0.06)', color: 'var(--d-text-muted)', display: 'grid', placeItems: 'center', cursor: 'pointer' }}>
              <XIcon size={15}/>
            </button>
          </div>
        </div>

        {/* Messages */}
        <div style={{ padding: '8px 16px 32px' }}>
          {loading ? (
            <div style={{ padding: '32px 0', textAlign: 'center', color: 'var(--d-text-muted)', fontSize: 13 }}>Cargando…</div>
          ) : msgs.length === 0 ? (
            <div style={{ padding: '32px 0', textAlign: 'center' }}>
              <div style={{ fontSize: 28, marginBottom: 10 }}>💬</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--d-text)', marginBottom: 5 }}>Sin mensajes aún</div>
              <div style={{ fontSize: 12, color: 'var(--d-text-muted)' }}>Tu coach no ha enviado mensajes todavía.</div>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: 8, marginTop: 8 }}>
              {msgs.map(msg => (
                <div key={msg.id} style={{ padding: '12px 14px', background: 'var(--d-surface)', border: '1px solid var(--d-border)', borderRadius: 14, borderTopLeftRadius: 4 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <div style={{ width: 26, height: 26, borderRadius: 13, background: 'var(--vitta-blue)', display: 'grid', placeItems: 'center', fontSize: 11, fontWeight: 700, color: '#fff', flexShrink: 0 }}>C</div>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--d-text)' }}>Coach</div>
                      <div style={{ fontSize: 10, color: 'var(--d-text-faint)' }}>{formatDate(msg.created_at)}</div>
                    </div>
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--d-text)', lineHeight: 1.5 }}>{msg.text}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function AthleteLayoutInner({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router   = useRouter();
  const { athleteId, name, initials, loading } = useAthlete();
  const menuRef  = useRef<HTMLDivElement>(null);
  const [menuOpen, setMenuOpen]     = useState(false);
  const [showPwForm, setShowPwForm] = useState(false);
  const [newPw, setNewPw]           = useState('');
  const [pwSaving, setPwSaving]     = useState(false);
  const [pwDone, setPwDone]         = useState(false);
  const [pwError, setPwError]       = useState('');

  // Bell / notifications
  const [notifOpen, setNotifOpen]   = useState(false);
  const [hasUnread, setHasUnread]   = useState(false);

  useEffect(() => {
    if (!loading && !athleteId) router.replace('/login');
  }, [loading, athleteId, router]);

  // Check for unread coach messages on mount
  useEffect(() => {
    if (!athleteId) return;
    const lastSeen = localStorage.getItem('vitta_notif_last_seen') || '1970-01-01T00:00:00Z';
    const supabase = createClient();
    supabase
      .from('messages')
      .select('id', { count: 'exact', head: true })
      .eq('thread_id', athleteId)
      .eq('from_role', 'coach')
      .gt('created_at', lastSeen)
      .then(({ count }) => {
        setHasUnread((count ?? 0) > 0);
      });
  }, [athleteId]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false); setShowPwForm(false);
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
    setPwDone(true); setNewPw('');
    setTimeout(() => { setPwDone(false); setShowPwForm(false); setMenuOpen(false); }, 1500);
  }

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
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          {/* Bell button */}
          <button
            onClick={() => {
              setNotifOpen(true);
              setHasUnread(false);
            }}
            style={{ position: 'relative', width: 32, height: 32, borderRadius: 16, border: '1px solid var(--d-border)', background: 'rgba(255,255,255,0.04)', color: 'var(--d-text)', display: 'grid', placeItems: 'center', cursor: 'pointer' }}
          >
            <BellIcon size={16}/>
            {hasUnread && (
              <span style={{ position: 'absolute', top: 6, right: 6, width: 7, height: 7, borderRadius: '50%', background: 'var(--vitta-blue)' }}/>
            )}
          </button>

          {/* Avatar + dropdown */}
          <div ref={menuRef} style={{ position: 'relative' }}>
            <button
              onClick={() => { setMenuOpen(o => !o); setShowPwForm(false); setPwError(''); }}
              style={{ width: 32, height: 32, borderRadius: 16, background: 'linear-gradient(135deg, var(--vitta-blue) 0%, var(--vitta-blue-bright) 100%)', color: '#fff', display: 'grid', placeItems: 'center', fontSize: 12, fontWeight: 700, border: 'none', cursor: 'pointer' }}
            >
              {avatarText}
            </button>

            {menuOpen && (
              <div style={{
                position: 'absolute', top: 'calc(100% + 8px)', right: 0,
                width: 200, background: 'var(--d-surface)',
                border: '1px solid var(--d-border-strong)', borderRadius: 12,
                overflow: 'hidden', zIndex: 50,
                boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
              }}>
                {!showPwForm ? (
                  <>
                    <button
                      onClick={() => setShowPwForm(true)}
                      style={{ width: '100%', padding: '11px 14px', border: 'none', background: 'transparent', color: 'var(--d-text)', fontSize: 13, fontFamily: 'inherit', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 9, borderBottom: '1px solid var(--d-border)' }}
                    >
                      <LockIcon size={14} stroke="currentColor"/> Cambiar contraseña
                    </button>
                    <button
                      onClick={handleSignOut}
                      style={{ width: '100%', padding: '11px 14px', border: 'none', background: 'transparent', color: '#f87171', fontSize: 13, fontFamily: 'inherit', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 9 }}
                    >
                      <LogOutIcon size={14} stroke="currentColor"/> Cerrar sesión
                    </button>
                  </>
                ) : (
                  <div style={{ padding: 12 }}>
                    <div style={{ fontSize: 11, color: 'var(--d-text-muted)', marginBottom: 8, fontWeight: 600 }}>Nueva contraseña</div>
                    <input
                      type="password"
                      value={newPw}
                      onChange={e => setNewPw(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleChangePassword()}
                      placeholder="Mínimo 6 caracteres"
                      autoFocus
                      style={{ width: '100%', padding: '7px 10px', borderRadius: 7, border: '1px solid var(--d-border-strong)', background: 'rgba(255,255,255,0.06)', color: 'var(--d-text)', fontSize: 12, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }}
                    />
                    {pwError && <div style={{ fontSize: 11, color: '#f87171', marginTop: 5 }}>{pwError}</div>}
                    <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                      <button onClick={() => { setShowPwForm(false); setPwError(''); setNewPw(''); }} style={{ flex: 1, padding: '6px 0', borderRadius: 6, border: '1px solid var(--d-border)', background: 'transparent', color: 'var(--d-text-muted)', fontSize: 11, cursor: 'pointer', fontFamily: 'inherit' }}>
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

      {/* Notification panel */}
      {notifOpen && athleteId && (
        <NotifPanel athleteId={athleteId} onClose={() => setNotifOpen(false)}/>
      )}
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
