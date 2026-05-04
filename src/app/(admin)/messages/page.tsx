'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import { CATEGORIES } from '@/lib/constants';
import { SearchIcon, PaperclipIcon, SendIcon } from '@/components/icons';

interface ConvRow {
  id: string;
  name: string;
  initials: string;
  focus: string;
  latestMsg: string;
  latestTime: string;
  unread: number;
}

interface MsgRow {
  id: string;
  from_role: 'coach' | 'athlete';
  text: string;
  created_at: string;
  attachment_name?: string | null;
}

function formatTime(ts: string): string {
  const diff = (Date.now() - new Date(ts).getTime()) / 1000;
  if (diff < 60) return 'ahora';
  if (diff < 3600) return `${Math.round(diff / 60)}m`;
  if (diff < 86400) return `${Math.round(diff / 3600)}h`;
  return `${Math.round(diff / 86400)}d`;
}

function getInitials(name: string): string {
  return name.split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase();
}

export default function MessagesPage() {
  const router = useRouter();
  const [conversations, setConversations] = useState<ConvRow[]>([]);
  const [active, setActive] = useState<string | null>(null);
  const [messages, setMessages] = useState<MsgRow[]>([]);
  const [msg, setMsg] = useState('');
  const [sending, setSending] = useState(false);
  const [loadingConvs, setLoadingConvs] = useState(true);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const fetchConversations = useCallback(async () => {
    const supabase = createClient();
    const { data: athletes } = await supabase
      .from('athletes')
      .select('id, name, focus')
      .order('name');

    if (!athletes || athletes.length === 0) {
      setLoadingConvs(false);
      return;
    }

    const { data: allMessages } = await supabase
      .from('messages')
      .select('thread_id, text, created_at')
      .in('thread_id', athletes.map(a => a.id))
      .order('created_at', { ascending: false });

    const latestPerThread: Record<string, { text: string; created_at: string }> = {};
    for (const m of allMessages || []) {
      if (!latestPerThread[m.thread_id]) {
        latestPerThread[m.thread_id] = { text: m.text, created_at: m.created_at };
      }
    }

    const convs: ConvRow[] = athletes.map(a => ({
      id:         a.id,
      name:       a.name,
      initials:   getInitials(a.name),
      focus:      a.focus,
      latestMsg:  latestPerThread[a.id]?.text || 'Sin mensajes aún',
      latestTime: latestPerThread[a.id] ? formatTime(latestPerThread[a.id].created_at) : '',
      unread:     0,
    }));

    setConversations(convs);
    if (convs.length > 0 && !active) setActive(convs[0].id);
    setLoadingConvs(false);
  }, [active]);

  const fetchMessages = useCallback(async (athleteId: string) => {
    setLoadingMsgs(true);
    const supabase = createClient();
    const { data } = await supabase
      .from('messages')
      .select('id, from_role, text, created_at, attachment_name')
      .eq('thread_id', athleteId)
      .order('created_at');
    setMessages((data as MsgRow[]) || []);
    setLoadingMsgs(false);
  }, []);

  useEffect(() => { fetchConversations(); }, []);

  useEffect(() => {
    if (active) fetchMessages(active);
  }, [active, fetchMessages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function sendMessage() {
    if (!msg.trim() || !active || sending) return;
    setSending(true);
    const supabase = createClient();
    const { error } = await supabase.from('messages').insert({
      thread_id: active,
      from_role: 'coach',
      text: msg.trim(),
    });
    if (!error) {
      setMsg('');
      await fetchMessages(active);
      await fetchConversations();
    }
    setSending(false);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  const activeConv = conversations.find(c => c.id === active);

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

        {loadingConvs ? (
          <div style={{ padding: '20px 16px', color: 'var(--text-muted)', fontSize: 13 }}>Cargando...</div>
        ) : conversations.length === 0 ? (
          <div style={{ padding: '20px 16px', color: 'var(--text-muted)', fontSize: 13 }}>
            No hay atletas registrados.
          </div>
        ) : (
          conversations.map(c => {
            const cat = CATEGORIES[c.focus];
            return (
              <button key={c.id} onClick={() => setActive(c.id)} style={{
                width: '100%', border: 'none', textAlign: 'left', cursor: 'pointer',
                padding: '14px 16px', display: 'grid', gridTemplateColumns: '40px 1fr auto', gap: 10,
                background: active === c.id ? 'var(--surface-2)' : 'transparent',
                borderLeft: active === c.id ? `2px solid ${cat?.color || 'var(--vitta-blue)'}` : '2px solid transparent',
                borderBottom: '1px solid var(--border)', fontFamily: 'inherit',
              }}>
                <div style={{ width: 40, height: 40, borderRadius: 20, background: cat?.color || 'var(--vitta-navy)', color: '#fff', display: 'grid', placeItems: 'center', fontSize: 12, fontWeight: 700 }}>
                  {c.initials}
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 13, fontWeight: 600 }}>{c.name}</span>
                    <span className="muted" style={{ fontSize: 10 }}>{c.latestTime}</span>
                  </div>
                  <div className="muted" style={{ fontSize: 11, marginTop: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.latestMsg}</div>
                </div>
                {c.unread > 0 && (
                  <div style={{ width: 18, height: 18, borderRadius: 9, background: 'var(--vitta-blue)', color: '#fff', fontSize: 10, fontWeight: 700, display: 'grid', placeItems: 'center', alignSelf: 'center' }}>
                    {c.unread}
                  </div>
                )}
              </button>
            );
          })
        )}
      </div>

      {/* Chat panel */}
      {!activeConv ? (
        <div style={{ display: 'grid', placeItems: 'center', color: 'var(--text-muted)', fontSize: 14 }}>
          Selecciona una conversación
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ padding: '16px 22px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                width: 38, height: 38, borderRadius: 19,
                background: CATEGORIES[activeConv.focus]?.color || 'var(--vitta-navy)',
                color: '#fff', display: 'grid', placeItems: 'center', fontSize: 12, fontWeight: 700,
              }}>
                {activeConv.initials}
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{activeConv.name}</div>
                <div className="muted" style={{ fontSize: 11 }}>Foco: {CATEGORIES[activeConv.focus]?.label || activeConv.focus}</div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => router.push(`/athletes/${activeConv.id}/planner`)}
              >
                Ver plan
              </button>
              <button className="btn btn-ghost btn-sm">Notas</button>
            </div>
          </div>

          <div className="thin-scroll" style={{ flex: 1, padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 10, overflowY: 'auto', background: 'var(--surface-2)' }}>
            {loadingMsgs ? (
              <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 13, paddingTop: 20 }}>Cargando mensajes...</div>
            ) : messages.length === 0 ? (
              <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 13, paddingTop: 20 }}>
                Sin mensajes aún. Escribe el primero.
              </div>
            ) : (
              messages.map(m => {
                const me = m.from_role === 'coach';
                return (
                  <div key={m.id} style={{ display: 'flex', justifyContent: me ? 'flex-end' : 'flex-start', gap: 8 }}>
                    {!me && (
                      <div style={{ width: 26, height: 26, borderRadius: 13, background: 'var(--vitta-navy)', color: '#fff', display: 'grid', placeItems: 'center', fontSize: 10, fontWeight: 700, flexShrink: 0, alignSelf: 'flex-end' }}>
                        {activeConv.initials}
                      </div>
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
                      {m.attachment_name && (
                        <div style={{ marginTop: 7, padding: '7px 10px', borderRadius: 6, background: me ? 'rgba(255,255,255,0.15)' : 'var(--surface-2)', display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 600 }}>
                          <PaperclipIcon size={12}/> {m.attachment_name}
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

          <div style={{ padding: '12px 18px', borderTop: '1px solid var(--border)', display: 'flex', gap: 8, alignItems: 'center' }}>
            <button className="btn btn-ghost btn-sm"><PaperclipIcon size={13}/></button>
            <input
              value={msg}
              onChange={e => setMsg(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={`Responder a ${activeConv.name.split(' ')[0]}...`}
              style={{
                flex: 1, padding: '8px 12px', borderRadius: 999,
                border: '1px solid var(--border)', background: 'var(--surface-2)',
                fontSize: 13, fontFamily: 'inherit', outline: 'none', color: 'var(--text)',
              }}
            />
            <button
              onClick={sendMessage}
              disabled={sending || !msg.trim()}
              className="btn btn-primary btn-sm"
            >
              <SendIcon size={13}/>{sending ? 'Enviando...' : 'Enviar'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
