import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import DashboardLayout from '../../components/DashboardLayout';

const AUTH_URL = import.meta.env.VITE_AUTH_URL;

export default function DomiciliarioPerfil() {
  const { token, user } = useAuth();
  const [perfil, setPerfil]       = useState(null);
  const [chatId, setChatId]       = useState('');
  const [saving, setSaving]       = useState(false);
  const [msg, setMsg]             = useState('');
  const [error, setError]         = useState('');

  useEffect(() => {
    axios.get(`${AUTH_URL}/perfil`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => { setPerfil(r.data); setChatId(r.data.telegram_chat_id || ''); })
      .catch(() => {});
  }, []);

  async function vincularTelegram(e) {
    e.preventDefault();
    if (!chatId.trim()) return;
    setSaving(true); setMsg(''); setError('');
    try {
      await axios.patch(`${AUTH_URL}/perfil/telegram`,
        { telegram_chat_id: chatId.trim() },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setMsg('✅ ¡Telegram vinculado! Revisa tu chat para confirmar.');
    } catch {
      setError('❌ Error al vincular. Verifica el Chat ID.');
    } finally { setSaving(false); }
  }

  const BOT_NAME = 'raven_domicilios_bot'; // cambia por tu bot username

  return (
    <DashboardLayout role="domiciliario" pageTitle="Mi perfil">
      <div className="page-header">
        <div>
          <div className="page-title">👤 Mi perfil</div>
          <div className="page-subtitle">Configura tus notificaciones de Telegram</div>
        </div>
      </div>

      <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem', maxWidth: 480 }}>

        {/* Info usuario */}
        <div style={{ background: 'rgba(255,255,255,.15)', borderRadius: 20, padding: '1.25rem', border: '1px solid rgba(255,255,255,.25)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: '1rem' }}>
            <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(255,255,255,.25)', border: '3px solid rgba(255,255,255,.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem' }}>
              🛵
            </div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>{user?.nombre}</div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,.7)' }}>{user?.email}</div>
              <div style={{ fontSize: 11, color: '#10b981', fontWeight: 600, marginTop: 2 }}>● Domiciliario activo</div>
            </div>
          </div>
        </div>

        {/* Vincular Telegram */}
        <div style={{ background: '#fff', borderRadius: 20, padding: '1.5rem', boxShadow: '0 8px 32px rgba(0,0,0,.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: '1rem' }}>
            <span style={{ fontSize: '1.5rem' }}>📲</span>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#1a1a2e' }}>Notificaciones Telegram</div>
              <div style={{ fontSize: 11, color: '#9090b0' }}>Recibe alertas de pedidos en tu Telegram</div>
            </div>
            {perfil?.telegram_chat_id && (
              <span style={{ marginLeft: 'auto', padding: '3px 10px', borderRadius: 99, background: '#dcfce7', color: '#16a34a', fontSize: 10, fontWeight: 700 }}>✅ Vinculado</span>
            )}
          </div>

          {/* Instrucciones */}
          <div style={{ background: '#f0f7ff', borderRadius: 12, padding: '1rem', marginBottom: '1rem', border: '1px solid #bfdbfe' }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#1e40af', marginBottom: 8 }}>📋 Cómo obtener tu Chat ID:</div>
            <ol style={{ fontSize: 11, color: '#3b5afe', paddingLeft: '1.2rem', lineHeight: 1.8 }}>
              <li>Abre Telegram y busca <b>@{BOT_NAME}</b></li>
              <li>Presiona <b>Iniciar</b> o escribe <b>/start</b></li>
              <li>El bot te responderá con tu <b>Chat ID</b></li>
              <li>Copia ese número y pégalo aquí abajo</li>
            </ol>
            <a href={`https://t.me/${BOT_NAME}`} target="_blank" rel="noopener noreferrer"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 10, padding: '6px 14px', borderRadius: 99, background: '#2563eb', color: '#fff', fontSize: 11, fontWeight: 600, textDecoration: 'none' }}>
              📲 Abrir @{BOT_NAME}
            </a>
          </div>

          {msg   && <div className="alert alert-ok"  style={{ marginBottom: '1rem' }}>{msg}</div>}
          {error && <div className="alert alert-err" style={{ marginBottom: '1rem' }}>{error}</div>}

          <form onSubmit={vincularTelegram} style={{ display: 'flex', flexDirection: 'column', gap: '.75rem' }}>
            <div>
              <div className="field-label">🔢 Tu Chat ID de Telegram</div>
              <input
                type="number"
                placeholder="Ej: 123456789"
                value={chatId}
                onChange={e => setChatId(e.target.value)}
                required
              />
            </div>
            <button type="submit" disabled={saving} style={{
              height: 44, borderRadius: 12,
              background: 'linear-gradient(135deg,#10b981,#059669)',
              border: 'none', fontFamily: 'Poppins,sans-serif',
              fontWeight: 700, fontSize: 13, color: '#fff',
              cursor: 'pointer', opacity: saving ? 0.7 : 1,
            }}>
              {saving ? '⏳ Vinculando...' : perfil?.telegram_chat_id ? '🔄 Actualizar Telegram' : '✅ Vincular Telegram'}
            </button>
          </form>
        </div>

        {/* Qué notificaciones recibirá */}
        <div style={{ background: 'rgba(255,255,255,.1)', borderRadius: 20, padding: '1.25rem', border: '1px solid rgba(255,255,255,.2)' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#fff', marginBottom: '.75rem' }}>🔔 Notificaciones que recibirás:</div>
          {[
            { emoji: '🛵', texto: 'Nuevo pedido asignado — con dirección y datos del cliente' },
            { emoji: '📍', texto: 'Recordatorio de recogida — cuando llevas mucho tiempo sin marcar en camino' },
          ].map((n, i) => (
            <div key={i} style={{ display: 'flex', gap: 10, padding: '8px 0', borderBottom: i === 0 ? '1px solid rgba(255,255,255,.1)' : 'none' }}>
              <span style={{ fontSize: '1rem', flexShrink: 0 }}>{n.emoji}</span>
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,.8)', lineHeight: 1.5 }}>{n.texto}</span>
            </div>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}