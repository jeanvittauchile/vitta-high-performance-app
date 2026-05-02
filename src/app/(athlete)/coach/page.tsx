'use client';
import { useState } from 'react';
import { SendIcon, PaperclipIcon } from '@/components/icons';

const MESSAGES = [
  { from: 'coach', text: '¡Buen trabajo ayer Mateo! El press banca se vio sólido hasta la 3ra serie. Recuerda mantener los codos a 45°.' },
  { from: 'me',    text: 'Gracias coach! Sentí algo en el hombro derecho en la última serie. ¿Bajo carga hoy?' },
  { from: 'coach', text: 'Mantén la carga pero baja a RPE 7. Te dejo más Y-T-W antes del empuje.' },
  { from: 'coach', text: 'Te dejo este plan para hacer post entrenamiento.', attachment: 'Plan preventivo de hombro · 12 min' },
];

export default function CoachPage() {
  const [msg, setMsg] = useState('');

  return (
    <div style={{ padding: '16px 16px 28px' }}>
      <div style={{ background: 'var(--d-surface)', border: '1px solid var(--d-border)', borderRadius: 16, padding: 14, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 44, height: 44, borderRadius: 22, background: 'linear-gradient(135deg, var(--vitta-navy) 0%, var(--vitta-navy-deep) 100%)', color: 'var(--vitta-cream)', display: 'grid', placeItems: 'center', fontSize: 14, fontWeight: 800, fontFamily: 'var(--font-display)', fontStyle: 'italic' }}>V</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 600 }}>Coach Vitta</div>
          <div style={{ fontSize: 11, color: 'var(--green)', display: 'flex', alignItems: 'center', gap: 5 }}>
            <span className="pulse-dot" style={{ width: 6, height: 6, borderRadius: 3, background: 'var(--green)', display: 'inline-block' }}/>
            En línea
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gap: 10 }}>
        {MESSAGES.map((m, i) => {
          const me = m.from === 'me';
          return (
            <div key={i} style={{ display: 'flex', justifyContent: me ? 'flex-end' : 'flex-start' }}>
              <div style={{ maxWidth: '78%', background: me ? 'var(--vitta-blue)' : 'var(--d-surface)', color: me ? '#fff' : 'var(--d-text)', border: me ? 'none' : '1px solid var(--d-border)', borderRadius: me ? '14px 14px 4px 14px' : '14px 14px 14px 4px', padding: '10px 12px', fontSize: 13, lineHeight: 1.4 }}>
                {m.text}
                {m.attachment && (
                  <div style={{ marginTop: 8, padding: '8px 10px', borderRadius: 8, background: 'rgba(0,0,0,0.2)', display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
                    <PaperclipIcon size={13}/>
                    <span style={{ fontWeight: 600 }}>{m.attachment}</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ marginTop: 16, display: 'flex', gap: 8, alignItems: 'center', background: 'var(--d-surface)', border: '1px solid var(--d-border)', borderRadius: 22, padding: '8px 8px 8px 16px' }}>
        <input
          value={msg} onChange={e => setMsg(e.target.value)}
          placeholder="Escribe un mensaje..."
          style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: 'var(--d-text)', fontSize: 13, fontFamily: 'inherit' }}
        />
        <button style={{ width: 34, height: 34, borderRadius: 17, border: 'none', background: 'var(--vitta-blue)', color: '#fff', display: 'grid', placeItems: 'center', cursor: 'pointer' }}>
          <SendIcon size={14}/>
        </button>
      </div>
    </div>
  );
}
