'use client';
import { useEffect, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { AthleteProvider, useAthlete } from '@/lib/athlete-context';
import { createClient } from '@/lib/supabase';
import { VittaMark, HomeIcon, CalendarIcon, TrendIcon, UserIcon, LogOutIcon, LockIcon, CheckIcon, SunIcon, MoonIcon } from '@/components/icons';
import { type TimerSound, SOUND_LABELS, TIMER_SOUND_KEY, playSound } from '@/lib/sounds';
import type { ReactNode } from 'react';

const THEME_KEY = 'vitta_theme';

const TABS = [
  { href: '/today',   label: 'Hoy',     Icon: HomeIcon     },
  { href: '/month',   label: 'Mes',     Icon: CalendarIcon },
  { href: '/stats',   label: 'Progreso',Icon: TrendIcon    },
  { href: '/profile', label: 'Perfil',  Icon: UserIcon     },
];

const SOUNDS: TimerSound[] = ['campana', 'beep', 'silbato', 'silencio'];

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

  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    if (typeof window === 'undefined') return 'dark';
    return (localStorage.getItem(THEME_KEY) as 'dark' | 'light') || 'dark';
  });
  const [timerSound, setTimerSound] = useState<TimerSound>(() => {
    if (typeof window === 'undefined') return 'campana';
    return (localStorage.getItem(TIMER_SOUND_KEY) as TimerSound) || 'campana';
  });

  function handleTheme(t: 'dark' | 'light') {
    setTheme(t);
    localStorage.setItem(THEME_KEY, t);
  }

  function handleSound(s: TimerSound) {
    setTimerSound(s);
    localStorage.setItem(TIMER_SOUND_KEY, s);
    playSound(s);
  }

  useEffect(() => {
    if (!loading && !athleteId) router.replace('/login');
  }, [loading, athleteId, router]);

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
    '/today':   'Tu sesión de hoy',
    '/month':   'Plan mensual',
    '/stats':   'Tu progreso',
    '/profile': 'Perfil deportivo',
  };
  const title      = titleMap[pathname] || 'Vitta';
  const firstName  = loading ? '…' : (name.split(' ')[0] || 'Atleta');
  const avatarText = loading ? '…' : (initials || '?');

  return (
    <div className="athlete-root thin-scroll-dark" data-theme={theme} style={{
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
                width: 224, background: 'var(--d-surface)',
                border: '1px solid var(--d-border-strong)', borderRadius: 12,
                overflow: 'hidden', zIndex: 50,
                boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
              }}>
                {!showPwForm ? (
                  <>
                    {/* Theme */}
                    <div style={{ padding: '10px 12px 8px', borderBottom: '1px solid var(--d-border)' }}>
                      <div style={{ fontSize: 10, color: 'var(--d-text-faint)', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 7 }}>Tema</div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                        {(['dark', 'light'] as const).map(t => (
                          <button key={t} onClick={() => handleTheme(t)} style={{
                            padding: '6px 0', borderRadius: 7, border: `1px solid ${theme === t ? 'var(--vitta-blue)' : 'var(--d-border-strong)'}`,
                            background: theme === t ? 'rgba(46,107,214,0.18)' : 'transparent',
                            color: theme === t ? 'var(--vitta-blue-bright)' : 'var(--d-text-muted)',
                            fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                          }}>
                            {t === 'dark' ? <MoonIcon size={12} stroke="currentColor"/> : <SunIcon size={12} stroke="currentColor"/>}
                            {t === 'dark' ? 'Oscuro' : 'Claro'}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Timer sound */}
                    <div style={{ padding: '10px 12px 8px', borderBottom: '1px solid var(--d-border)' }}>
                      <div style={{ fontSize: 10, color: 'var(--d-text-faint)', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 7 }}>Sonido del timer</div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                        {SOUNDS.map(s => (
                          <button key={s} onClick={() => handleSound(s)} style={{
                            padding: '6px 0', borderRadius: 7, border: `1px solid ${timerSound === s ? 'var(--vitta-blue)' : 'var(--d-border-strong)'}`,
                            background: timerSound === s ? 'rgba(46,107,214,0.18)' : 'transparent',
                            color: timerSound === s ? 'var(--vitta-blue-bright)' : 'var(--d-text-muted)',
                            fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                          }}>
                            {SOUND_LABELS[s]}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Account */}
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
