import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import io from 'socket.io-client';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import Icon from './Icon';

const TRACKING_URL = import.meta.env.VITE_TRACKING_URL;

// Acentos para distinguir de un vistazo a OTROS usuarios en el chat.
// El color de marca (rojo) se reserva para la propia burbuja/cabecera.
const ROL_COLOR = {
  distribuidor: '#0c7ec4', cliente: '#7d5ba6',
  domiciliario: '#1a9c53', operador: '#d9820b', admin: '#4a3538',
};
const BRAND = '#d0121b';
const ROL_ICON = {
  distribuidor: 'package', cliente: 'user',
  domiciliario: 'scooter', operador: 'map', admin: 'bolt',
};

function timeAgo(ts) {
  const d = new Date(ts);
  return d.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
}

export default function ChatBubble() {
  const { token, user } = useAuth();
  const [open, setOpen]             = useState(false);
  const [usuarios, setUsuarios]     = useState([]);
  const [chatWith, setChatWith]     = useState(null);
  const [mensajes, setMensajes]     = useState([]);
  const [texto, setTexto]           = useState('');
  const [unread, setUnread]         = useState(0);
  const [escribiendo, setEscribiendo] = useState(false);
  const [loadingMsgs, setLoadingMsgs] = useState(false);

  const socketRef  = useRef(null);
  const bottomRef  = useRef(null);
  const typingRef  = useRef(null);

  const myId  = user?.id;
  const myRol = user?.rol;
  const myColor = BRAND;

useEffect(() => {
    if (!token) return;
    socketRef.current = io(TRACKING_URL, {
      auth: { token },
      transports: ['polling'],
    });

    socketRef.current.on('usuarios_conectados', (lista) => {
      setUsuarios(lista.filter(u => u.id !== myId));
    });

    socketRef.current.on('chat_mensaje', (msg) => {
      setMensajes(prev => {
        if (prev.find(m => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
      if (!open) setUnread(v => v + 1);
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
    });

    socketRef.current.on('chat_escribiendo', ({ from_id, escribiendo: e }) => {
      if (chatWith?.id === from_id) {
        setEscribiendo(e);
        if (e) {
          clearTimeout(typingRef.current);
          typingRef.current = setTimeout(() => setEscribiendo(false), 3000);
        }
      }
    });

    return () => socketRef.current?.disconnect();
  }, [token, myId]);

  useEffect(() => {
    if (!chatWith || !token) return;
    const room = [myId, chatWith.id].sort().join(':');
    setLoadingMsgs(true);
    axios.get(`${TRACKING_URL}/chat/${room}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => setMensajes(r.data))
      .catch(() => setMensajes([]))
      .finally(() => {
        setLoadingMsgs(false);
        setTimeout(() => bottomRef.current?.scrollIntoView(), 100);
      });
  }, [chatWith?.id]);

  useEffect(() => { if (open) setUnread(0); }, [open]);

  function enviar(e) {
    e.preventDefault();
    if (!texto.trim() || !chatWith) return;
    socketRef.current?.emit('chat_mensaje', { to_user_id: chatWith.id, mensaje: texto.trim() });
    setTexto('');
    socketRef.current?.emit('chat_escribiendo', { to_user_id: chatWith.id, escribiendo: false });
  }

  function onType(e) {
    setTexto(e.target.value);
    if (!chatWith) return;
    socketRef.current?.emit('chat_escribiendo', { to_user_id: chatWith.id, escribiendo: true });
    clearTimeout(typingRef.current);
    typingRef.current = setTimeout(() => {
      socketRef.current?.emit('chat_escribiendo', { to_user_id: chatWith.id, escribiendo: false });
    }, 1500);
  }

  const chatMsgs = chatWith
    ? mensajes.filter(m =>
        (m.from_id === myId && m.to_user_id === chatWith.id) ||
        (m.from_id === chatWith.id && m.to_user_id === myId)
      )
    : [];

  return createPortal(
    <>
      {/* Burbuja flotante */}
      <button onClick={() => setOpen(v => !v)} style={{
        position: 'fixed', bottom: 24, right: 24, zIndex: 1000,
        width: 56, height: 56, borderRadius: '50%',
        background: myColor, border: 'none', cursor: 'pointer',
        boxShadow: `0 4px 20px ${myColor}60`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '1.4rem', transition: 'all 0.2s',
        transform: open ? 'scale(0.9)' : 'scale(1)',
        fontFamily: 'Poppins, sans-serif',
      }}>
        <Icon name={open ? 'x' : 'messageCircle'} size={22} color="#fff" strokeWidth={2.2} />
        {!open && unread > 0 && (
          <span style={{
            position: 'absolute', top: -4, right: -4,
            width: 20, height: 20, borderRadius: '50%',
            background: '#d0121b', color: '#fff',
            fontSize: 10, fontWeight: 700,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: '2px solid #fff', fontFamily: 'Poppins, sans-serif',
          }}>{unread > 9 ? '9+' : unread}</span>
        )}
      </button>

      {/* Panel del chat */}
      {open && (
        <div style={{
          position: 'fixed', bottom: 90, right: 24, zIndex: 1000,
          width: 340, height: 500,
          background: '#fff', borderRadius: 24,
          boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
          display: 'flex', flexDirection: 'column',
          overflow: 'hidden',
          animation: 'chatIn 0.25s ease both',
          fontFamily: 'Poppins, sans-serif',
        }}>
          {/* Header */}
          <div style={{ padding: '14px 16px', background: myColor, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            {chatWith ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <button onClick={() => setChatWith(null)} style={{ background: 'rgba(255,255,255,.2)', border: 'none', borderRadius: '50%', width: 28, height: 28, color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name="chevronLeft" size={15} color="#fff" /></button>
                <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'rgba(255,255,255,.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon name={ROL_ICON[chatWith.rol] || 'user'} size={15} color="#fff" />
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>{chatWith.nombre}</div>
                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,.75)' }}>
                    {escribiendo ? 'Escribiendo...' : chatWith.rol}
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ fontSize: 14, fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', gap: 8 }}><Icon name="messageCircle" size={16} color="#fff" />Chat en vivo</div>
            )}
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,.7)', fontWeight: 500 }}>
              {usuarios.length} en línea
            </div>
          </div>

          {/* Lista usuarios o mensajes */}
          {!chatWith ? (
            <div style={{ flex: 1, overflowY: 'auto' }}>
              {usuarios.length === 0 ? (
                <div style={{ padding: '2rem', textAlign: 'center', color: '#8a6d6e' }}>
                  <Icon name="messageCircle" size={30} color="#c9b6b6" style={{ marginBottom: 8 }} />
                  <div style={{ fontSize: 12 }}>No hay otros usuarios conectados</div>
                </div>
              ) : (
                <>
                  <div style={{ padding: '10px 14px 4px', fontSize: 10, fontWeight: 600, color: '#8a6d6e', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    Usuarios conectados
                  </div>
                  {usuarios.map(u => (
                    <button key={u.id} onClick={() => setChatWith(u)} style={{
                      width: '100%', padding: '10px 14px',
                      display: 'flex', alignItems: 'center', gap: 10,
                      background: 'transparent', border: 'none',
                      borderBottom: '1px solid #f4ebea', cursor: 'pointer',
                      textAlign: 'left', transition: 'background 0.15s',
                      fontFamily: 'Poppins, sans-serif',
                    }}>
                      <div style={{ width: 38, height: 38, borderRadius: '50%', background: `${ROL_COLOR[u.rol]}20`, border: `2px solid ${ROL_COLOR[u.rol]}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Icon name={ROL_ICON[u.rol] || 'user'} size={16} color={ROL_COLOR[u.rol] || '#8a6d6e'} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: '#221415', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{u.nombre}</div>
                        <div style={{ fontSize: 10, color: ROL_COLOR[u.rol], fontWeight: 500, marginTop: 1 }}>{u.rol}</div>
                      </div>
                      <span style={{ fontSize: 10, color: '#1a9c53', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#1a9c53', display: 'inline-block' }} />En línea
                      </span>
                    </button>
                  ))}
                </>
              )}
            </div>
          ) : (
            <>
              {/* Mensajes */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '12px 12px 4px', display: 'flex', flexDirection: 'column', gap: 8, background: '#f4ebea' }}>
                {loadingMsgs ? (
                  <div style={{ textAlign: 'center', color: '#8a6d6e', fontSize: 12, padding: '2rem' }}>Cargando...</div>
                ) : chatMsgs.length === 0 ? (
                  <div style={{ textAlign: 'center', color: '#8a6d6e', fontSize: 12, padding: '2rem' }}>
                    <Icon name="messageCircle" size={30} color="#c9b6b6" style={{ marginBottom: 8 }} />
                    ¡Inicia la conversación!
                  </div>
                ) : chatMsgs.map(m => {
                  const mine = m.from_id === myId;
                  return (
                    <div key={m.id} style={{ display: 'flex', justifyContent: mine ? 'flex-end' : 'flex-start' }}>
                      {!mine && (
                        <div style={{ width: 26, height: 26, borderRadius: '50%', background: `${ROL_COLOR[m.from_rol]}20`, border: `2px solid ${ROL_COLOR[m.from_rol]}`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: 6, flexShrink: 0, alignSelf: 'flex-end' }}>
                          <Icon name={ROL_ICON[m.from_rol] || 'user'} size={12} color={ROL_COLOR[m.from_rol] || '#8a6d6e'} />
                        </div>
                      )}
                      <div style={{ maxWidth: '72%', display: 'flex', flexDirection: 'column', alignItems: mine ? 'flex-end' : 'flex-start', gap: 2 }}>
                        {!mine && <span style={{ fontSize: 9, color: '#8a6d6e', fontWeight: 600, marginLeft: 4 }}>{m.from_nombre}</span>}
                        <div style={{
                          padding: '8px 12px',
                          borderRadius: mine ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                          background: mine ? myColor : '#fff',
                          color: mine ? '#fff' : '#221415',
                          fontSize: 13, lineHeight: 1.4,
                          boxShadow: mine ? `0 2px 8px ${myColor}40` : '0 1px 4px rgba(0,0,0,.08)',
                          wordBreak: 'break-word',
                        }}>
                          {m.mensaje}
                        </div>
                        <span style={{ fontSize: 9, color: '#c9b6b6', marginLeft: 4, marginRight: 4 }}>{timeAgo(m.timestamp)}</span>
                      </div>
                    </div>
                  );
                })}
                {escribiendo && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{ padding: '8px 14px', borderRadius: '18px 18px 18px 4px', background: '#fff', boxShadow: '0 1px 4px rgba(0,0,0,.08)', display: 'flex', gap: 4, alignItems: 'center' }}>
                      {[0,1,2].map(i => (
                        <span key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: '#c9b6b6', display: 'inline-block', animation: `bounce 1.2s ${i*0.2}s infinite` }}/>
                      ))}
                    </div>
                  </div>
                )}
                <div ref={bottomRef}/>
              </div>

              {/* Input */}
              <form onSubmit={enviar} style={{ padding: '10px 12px', borderTop: '1px solid #e9dcdb', display: 'flex', gap: 8, background: '#fff' }}>
                <input
                  value={texto} onChange={onType}
                  placeholder="Escribe un mensaje..."
                  autoComplete="off"
                  style={{
                    flex: 1, height: 40, borderRadius: 99,
                    border: '2px solid #e9dcdb', padding: '0 14px',
                    fontSize: 13, fontFamily: 'Poppins, sans-serif',
                    outline: 'none', background: '#f4ebea',
                  }}
                  onFocus={e => e.target.style.borderColor = myColor}
                  onBlur={e  => e.target.style.borderColor = '#e9dcdb'}
                />
                <button type="submit" disabled={!texto.trim()} style={{
                  width: 40, height: 40, borderRadius: '50%',
                  background: texto.trim() ? myColor : '#e9dcdb',
                  border: 'none', cursor: texto.trim() ? 'pointer' : 'default',
                  color: '#fff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all 0.2s', flexShrink: 0,
                }}><Icon name="send" size={16} color="#fff" /></button>
              </form>
            </>
          )}
        </div>
      )}

      <style>{`
        @keyframes chatIn { from{opacity:0;transform:translateY(20px) scale(.95)} to{opacity:1;transform:translateY(0) scale(1)} }
        @keyframes bounce { 0%,60%,100%{transform:translateY(0)} 30%{transform:translateY(-6px)} }
      `}</style>
    </>,
    document.body
  );
}