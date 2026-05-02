'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import { VittaMark, LockIcon } from '@/components/icons';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    const supabase = createClient();
    const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password });
    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }
    const role = data.user?.user_metadata?.role;
    router.push(role === 'admin' ? '/dashboard' : '/today');
  }

  return (
    <div style={{
      minHeight: '100vh', background: 'var(--vitta-navy-deep)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 20,
    }}>
      <div style={{ width: '100%', maxWidth: 380 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <VittaMark size={52} bg="var(--vitta-cream)" fg="var(--vitta-navy-deep)"/>
          <div className="display" style={{ fontSize: 32, fontStyle: 'italic', color: 'var(--vitta-cream)', marginTop: 14, letterSpacing: '-0.03em' }}>
            VITTA
          </div>
          <div style={{ fontSize: 10, letterSpacing: '0.18em', color: 'rgba(244,239,224,0.55)', marginTop: 4, fontWeight: 700 }}>
            HIGH PERFORMANCE
          </div>
        </div>

        <div style={{
          background: 'rgba(244,239,224,0.04)', border: '1px solid rgba(244,239,224,0.12)',
          borderRadius: 16, padding: 28,
        }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--vitta-cream)', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
            <LockIcon size={16} stroke="var(--vitta-blue-bright)"/>
            Iniciar sesión
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 12 }}>
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: 'rgba(244,239,224,0.6)', letterSpacing: '0.06em', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>
                Email
              </label>
              <input
                type="email" value={email} onChange={e => setEmail(e.target.value)}
                required autoComplete="email"
                placeholder="coach@vitta.app"
                style={{
                  width: '100%', padding: '10px 12px', borderRadius: 8,
                  border: '1px solid rgba(244,239,224,0.15)',
                  background: 'rgba(255,255,255,0.06)', color: 'var(--vitta-cream)',
                  fontFamily: 'var(--font-body)', fontSize: 13, outline: 'none',
                }}
              />
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: 'rgba(244,239,224,0.6)', letterSpacing: '0.06em', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>
                Contraseña
              </label>
              <input
                type="password" value={password} onChange={e => setPassword(e.target.value)}
                required autoComplete="current-password"
                placeholder="••••••••"
                style={{
                  width: '100%', padding: '10px 12px', borderRadius: 8,
                  border: '1px solid rgba(244,239,224,0.15)',
                  background: 'rgba(255,255,255,0.06)', color: 'var(--vitta-cream)',
                  fontFamily: 'var(--font-body)', fontSize: 13, outline: 'none',
                }}
              />
            </div>

            {error && (
              <div style={{ padding: '8px 12px', borderRadius: 6, background: 'rgba(215,71,75,0.15)', border: '1px solid rgba(215,71,75,0.3)', color: '#D7474B', fontSize: 12 }}>
                {error}
              </div>
            )}

            <button
              type="submit" disabled={loading}
              style={{
                marginTop: 4, padding: '12px', borderRadius: 10,
                border: 'none', cursor: loading ? 'wait' : 'pointer',
                background: 'var(--vitta-cream)', color: 'var(--vitta-navy-ink)',
                fontFamily: 'var(--font-body)', fontSize: 14, fontWeight: 700,
                opacity: loading ? 0.7 : 1,
              }}
            >
              {loading ? 'Entrando…' : 'Entrar'}
            </button>
          </form>
        </div>

        <p style={{ textAlign: 'center', fontSize: 11, color: 'rgba(244,239,224,0.3)', marginTop: 20 }}>
          Vitta High Performance · Entrenamiento personalizado
        </p>
      </div>
    </div>
  );
}
