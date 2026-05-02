'use client';
import { useState } from 'react';
import { CATEGORIES } from '@/lib/constants';
import { SearchIcon, PaperclipIcon, SendIcon } from '@/components/icons';

const CONVERSATIONS = [
  { id: 'a2', name: 'Mateo Herrera',  preview: 'Gracias coach! Sentí algo en...', time: 'ahora', unread: 1, focus: 'envion'     },
  { id: 'a1', name: 'Camila Rojas',   preview: 'Listo, hice los 5km a Z2.',        time: '12m',   unread: 0, focus: 'aerobicos'  },
  { id: 'a3', name: 'Lucía Mendoza',  preview: '¿Subimos 5 watts en el FTP?',     time: '1h',    unread: 2, focus: 'aerobicos'  },
  { id: 'a4', name: 'Diego Salinas',  preview: 'Necesito mover la sesión del...', time: '3h',    unread: 0, focus: 'preventivos'},
  { id: 'a5', name: 'Ana Vargas',     preview: 'El video del power clean...',     time: '1d',    unread: 0, focus: 'movilidad'  },
];

const THREAD_MESSAGES = [
  { side: 'them', name: 'MH', text: '¡Buen trabajo ayer! El press banca se vio sólido hasta la 3ra serie.' },
  { side: 'them', name: 'MH', text: 'Sentí algo en el hombro derecho en la última serie. ¿Bajo carga hoy?' },
  { side: 'me',   name: 'SC', text: 'Mantén la carga pero baja a RPE 7. Te dejo más Y-T-W antes del empuje.' },
  { side: 'me',   name: 'SC', text: 'Te dejo este plan preventivo de hombro.', attachment: 'Plan_preventivo_hombro.pdf · 12 min' },
  { side: 'them', name: 'MH', text: 'Genial, gracias. Lo veo ahora.' },
  { side: 'them', name: 'MH', text: '¿Subimos carga el viernes en push press?' },
  { side: 'me',   name: 'SC', text: 'Si todo va bien hoy, sí: subimos a 80kg. Te lo dejo en el plan.' },
];

export default function MessagesPage() {
  const [active, setActive] = useState('a2');
  const [msg, setMsg] = useState('');

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', height: '100vh', overflow: 'hidden' }}>
      {/* Sidebar */}
      <div style={{ borderRight: '1px solid var(--border)', overflow: 'auto' }}>
        <div style={{ padding: '16px 16px 12px', borderBottom: '1px solid var(--border)' }}>
          <div className="display" style={{ fontSize: 18, fontStyle: 'italic' }}>Mensajes</div>
          <div className="input-wrap" style={{ marginTop: 10, width: '100%' }}>
            <SearchIcon size={13} stroke="var(--text-muted)"/>
            <input placeholder="Buscar conversación..."/>
          </div>
        </div>
        {CONVERSATIONS.map(c => {
          const cat = CATEGORIES[c.focus];
          const initials = c.name.split(' ').map(p => p[0]).slice(0, 2).join('');
          return (
            <button key={c.id} onClick={() => setActive(c.id)} style={{
              width: '100%', border: 'none', textAlign: 'left', cursor: 'pointer',
              padding: '14px 16px', display: 'grid', gridTemplateColumns: '40px 1fr auto', gap: 10,
              background: active === c.id ? 'var(--surface-2)' : 'transparent',
              borderLeft: active === c.id ? `2px solid ${cat.color}` : '2px solid transparent',
              borderBottom: '1px solid var(--border)', fontFamily: 'inherit',
            }}>
              <div style={{ width: 40, height: 40, borderRadius: 20, background: cat.color, color: '#fff', display: 'grid', placeItems: 'center', fontSize: 12, fontWeight: 700 }}>
                {initials}
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>{c.name}</span>
                  <span className="muted" style={{ fontSize: 10 }}>{c.time}</span>
                </div>
                <div className="muted" style={{ fontSize: 11, marginTop: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.preview}</div>
              </div>
              {c.unread > 0 && (
                <div style={{ width: 18, height: 18, borderRadius: 9, background: 'var(--vitta-blue)', color: '#fff', fontSize: 10, fontWeight: 700, display: 'grid', placeItems: 'center', alignSelf: 'center' }}>
                  {c.unread}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Chat panel */}
      <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ padding: '16px 22px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 38, height: 38, borderRadius: 19, background: CATEGORIES.envion.color, color: '#fff', display: 'grid', placeItems: 'center', fontSize: 12, fontWeight: 700 }}>MH</div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600 }}>Mateo Herrera</div>
              <div className="muted" style={{ fontSize: 11 }}>Foco: Envión · Pico de mesociclo</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button className="btn btn-ghost btn-sm">Ver plan</button>
            <button className="btn btn-ghost btn-sm">Notas</button>
          </div>
        </div>

        <div className="thin-scroll" style={{ flex: 1, padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 10, overflowY: 'auto', background: 'var(--surface-2)' }}>
          {THREAD_MESSAGES.map((m, i) => {
            const me = m.side === 'me';
            return (
              <div key={i} style={{ display: 'flex', justifyContent: me ? 'flex-end' : 'flex-start', gap: 8 }}>
                {!me && (
                  <div style={{ width: 26, height: 26, borderRadius: 13, background: 'var(--vitta-navy)', color: '#fff', display: 'grid', placeItems: 'center', fontSize: 10, fontWeight: 700, flexShrink: 0, alignSelf: 'flex-end' }}>{m.name}</div>
                )}
                <div style={{
                  maxWidth: '60%',
                  background: me ? 'var(--vitta-blue)' : 'white',
                  color: me ? '#fff' : 'var(--text)',
                  padding: '9px 13px',
                  borderRadius: me ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                  fontSize: 13, lineHeight: 1.4,
                  border: me ? 'none' : '1px solid var(--border)',
                }}>
                  {m.text}
                  {m.attachment && (
                    <div style={{ marginTop: 7, padding: '7px 10px', borderRadius: 6, background: me ? 'rgba(255,255,255,0.15)' : 'var(--surface-2)', display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 600 }}>
                      <PaperclipIcon size={12}/> {m.attachment}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div style={{ padding: '12px 18px', borderTop: '1px solid var(--border)', display: 'flex', gap: 8, alignItems: 'center' }}>
          <button className="btn btn-ghost btn-sm"><PaperclipIcon size={13}/></button>
          <input
            value={msg} onChange={e => setMsg(e.target.value)}
            placeholder="Responder a Mateo..."
            style={{
              flex: 1, padding: '8px 12px', borderRadius: 999,
              border: '1px solid var(--border)', background: 'var(--surface-2)',
              fontSize: 13, fontFamily: 'inherit', outline: 'none', color: 'var(--text)',
            }}
          />
          <button className="btn btn-primary btn-sm"><SendIcon size={13}/>Enviar</button>
        </div>
      </div>
    </div>
  );
}
