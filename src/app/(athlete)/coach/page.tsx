'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { createClient } from '@/lib/supabase';
import { useAthlete } from '@/lib/athlete-context';
import { SendIcon, PaperclipIcon } from '@/components/icons';

interface MsgRow {
  id: string;
  from_role: 'coach' | 'athlete';
  text: string;
  created_at: string;
  attachment_name: string | null;
}

function formatTime(ts: string): string {
  const diff = (Date.now() - new Date(ts).getTime()) / 1000;
  if (diff < 60)    return 'ahora';
  if (diff < 3600)  return `${Math.round(diff / 60)}m`;
  if (diff < 86400) return `${Math.round(diff / 3600)}h`;
  return new Date(ts).toLocaleDateString('es-CL', { day: 'numeric', month: 'short' });
}

export default function CoachPage() {
  const { athleteId, loading: authLoading } = useAthlete();
  const [messages, setMessages] = useState<MsgRow[]>([]);
  const [msg, setMsg] = useState('');
  const [sending, setSending] = useState(false);
  const [loadingMsgs, setLoadingMsgs] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);

  const fetchMessages = useCallback(async () => {
    if (!athleteId) return;
    const supabase = createClient();
    const { data } = await supabase
      .from('messages')
      .select('id, from_role, text, created_at, attachment_name')
      .eq('thread_id', athleteId)
      .order('created_at');
    setMessages((data as MsgRow[]) || []);
    setLoadingMsgs(false);
  }, [athleteId]);

  // Initial load + real-time subscription
  useEffect(() => {
    if (authLoading || !athleteId) return;

    fetchMessages();

    const supabase = createClient();
    const channel = supabase
      .channel(`coach-messages:${athleteId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `thread_id=eq.${athleteId}` },
        (payload) => {
          setMessages(prev => {
            if (prev.some(m => m.id === payload.new.id)) return prev;
            return [...prev, payload.new as MsgRow];
          });
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [athleteId, authLoading, fetchMessages]);

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function sendMessage() {
    if (!msg.trim() || !athleteId || sending) return;
    setSending(true);
    const supabase = createClient();
    const text = msg.trim();
    setMsg('');
    const { error } = await supabase.from('messages').insert({
      thread_id: athleteId,
      from_role: 'athlete',
      text,
    });
    if (error) setMsg(text);
    setSending(false);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  return (
    <div style={{ padding: '16px 16px 28px', display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Coach card */}
      <div style={{ background: 'var(--d-surface)', border: '1px solid var(--d-border)', borderRadius: 16, padding: 14, display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 44, height: 44, borderRadius: 22, background: 'linear-gradient(135deg, var(--vitta-navy) 0%, var(--vitta-navy-deep) 100%)', color: 'var(--vitta-cream)', display: 'grid', placeItems: 'center', fontSize: 14, fontWeight: 800, fontFamily: 'var(--font-display)', fontStyle: 'italic', flexShrink: 0 }}>V</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 600 }}>Coach Vitta</div>
          <div style={{ fontSize: 11, color: 'var(--green)', display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ width: 6, height: 6, borderRadius: 3, background: 'var(--green)', display: 'inline-block' }}/>
            En línea
          </div>
        </div>
      </div>

      {/* Messages */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, minHeight: 200 }}>
        {authLoading || loadingMsgs ? (
          <div style={{ textAlign: 'center', color: 'var(--d-text-muted)', fontSize: 13, padding: '20px 0' }}>Cargando mensajes...</div>
        ) : messages.length === 0 ? (
          <div style={{ textAlign: 'center', color: 'var(--d-text-muted)', fontSize: 13, padding: '20px 0' }}>
            Aún no hay mensajes con tu coach. Escribe el primero.
          </div>
        ) : (
          messages.map(m => {
            const me = m.from_role === 'athlete';
            return (
              <div key={m.id} style={{ display: 'flex', justifyContent: me ? 'flex-end' : 'flex-start' }}>
                <div style={{
                  maxWidth: '78%',
                  background: me ? 'var(--vitta-blue)' : 'var(--d-surface)',
                  color: me ? '#fff' : 'var(--d-text)',
                  border: me ? 'none' : '1px solid var(--d-border)',
                  borderRadius: me ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                  padding: '10px 12px', fontSize: 13, lineHeight: 1.4,
                }}>
                  {m.text}
                  {m.attachment_name && (
                    <div style={{ marginTop: 8, padding: '8px 10px', borderRadius: 8, background: 'rgba(0,0,0,0.2)', display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
                      <PaperclipIcon size={13}/>
                      <span style={{ fontWeight: 600 }}>{m.attachment_name}</span>
                    </div>
                  )}
                  <div style={{ fontSize: 9, marginTop: 4, opacity: 0.6, textAlign: me ? 'right' : 'left' }}>
                    {formatTime(m.created_at)}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef}/>
      </div>

      {/* Input */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', background: 'var(--d-surface)', border: '1px solid var(--d-border)', borderRadius: 22, padding: '8px 8px 8px 16px', position: 'sticky', bottom: 16 }}>
        <input
          value={msg}
          onChange={e => setMsg(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={!athleteId || authLoading}
          placeholder="Escribe un mensaje..."
          style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: 'var(--d-text)', fontSize: 13, fontFamily: 'inherit' }}
        />
        <button
          onClick={sendMessage}
          disabled={!msg.trim() || sending || !athleteId}
          style={{ width: 34, height: 34, borderRadius: 17, border: 'none', background: msg.trim() && !sending ? 'var(--vitta-blue)' : 'var(--d-border)', color: '#fff', display: 'grid', placeItems: 'center', cursor: msg.trim() ? 'pointer' : 'default', transition: 'background 0.15s' }}
        >
          <SendIcon size={14}/>
        </button>
      </div>
    </div>
  );
}
