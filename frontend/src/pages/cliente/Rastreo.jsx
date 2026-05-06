import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import io from 'socket.io-client';
import { useAuth } from '../../context/AuthContext';
import DashboardLayout from '../../components/DashboardLayout';
import AppMap from '../../components/AppMap';

const PEDIDOS_URL  = import.meta.env.VITE_PEDIDOS_URL;
const TRACKING_URL = import.meta.env.VITE_TRACKING_URL;

const domiIcon = new L.DivIcon({
  html: `<div style="width:36px;height:36px;border-radius:50%;background:#10b981;border:3px solid rgba(16,185,129,0.4);display:flex;align-items:center;justify-content:center;font-size:18px;">🛵</div>`,
  iconSize: [36, 36], iconAnchor: [18, 18], className: '',
});

const PASOS = ['pendiente','asignado','en_camino','entregado'];
const LABELS = { pendiente:'Pendiente', asignado:'Asignado', en_camino:'En camino', entregado:'Entregado', cancelado:'Cancelado' };
const ROLE_COLOR = '#8b5cf6';

export default function ClienteRastreo() {
  const { token } = useAuth();
  const [pedidos, setPedidos]   = useState([]);
  const [selected, setSelected] = useState(null);
  const [domiPos, setDomiPos]   = useState(null);
  const [loading, setLoading]   = useState(true);
  const socketRef = useRef(null);

  useEffect(() => {
    axios.get(`${PEDIDOS_URL}/pedidos/mis-pedidos`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => { setPedidos(r.data); if (r.data.length) setSelected(r.data[0]); })
      .catch(() => {}).finally(() => setLoading(false));

    socketRef.current = io(TRACKING_URL, { auth: { token }, transports: ['websocket'] });
    socketRef.current.on('location_update', ({ pedido_id, lat, lng }) => {
      setDomiPos(prev => selected?.id === pedido_id ? [lat, lng] : prev);
    });
    return () => socketRef.current?.disconnect();
  }, []);

  useEffect(() => {
    if (selected?.id && socketRef.current) socketRef.current.emit('join_pedido', { pedido_id: selected.id });
    setDomiPos(null);
  }, [selected?.id]);

  const stepIdx = PASOS.indexOf(selected?.estado);

  return (
    <DashboardLayout role="cliente" pageTitle="Rastrear pedido">
      <div className="page-header">
        <h1 className="page-title">Rastreo en tiempo real</h1>
        <p className="page-subtitle">Sigue la ubicación de tu domiciliario</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: '1rem', alignItems: 'start' }}>
        {/* Lista pedidos */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <span style={{ fontSize: '0.65rem', fontFamily: 'var(--font-mono)', color: 'var(--text-tertiary)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            {pedidos.length} pedido{pedidos.length !== 1 ? 's' : ''}
          </span>
          {loading ? (
            <div className="card" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)', fontSize: '0.78rem' }}>Cargando...</div>
          ) : pedidos.map(p => (
            <button key={p.id} onClick={() => setSelected(p)} style={{
              background: selected?.id === p.id ? 'rgba(139,92,246,0.1)' : 'var(--bg-surface)',
              border: `1px solid ${selected?.id === p.id ? 'rgba(139,92,246,0.35)' : 'var(--border-subtle)'}`,
              borderRadius: 'var(--radius-md)', padding: '0.85rem 1rem',
              cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s', width: '100%',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
                <span style={{ fontSize: '0.68rem', fontFamily: 'var(--font-mono)', color: 'var(--text-tertiary)' }}>#{String(p.id).slice(-6)}</span>
                <span className={`badge ${p.estado === 'entregado' ? 'badge-ok' : p.estado === 'cancelado' ? 'badge-err' : p.estado === 'en_camino' ? 'badge-info' : 'badge-warn'}`}>
                  {LABELS[p.estado] || p.estado}
                </span>
              </div>
              <div style={{ fontSize: '0.82rem', fontWeight: 500, color: 'var(--text-primary)' }}>{p.descripcion}</div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', marginTop: 2 }}>{p.direccion_entrega}</div>
            </button>
          ))}
        </div>

        {/* Mapa + timeline */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '0.85rem 1.1rem', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="card-title">MAPA EN VIVO</span>
              {domiPos && <div className="status-indicator"><span className="pulse-dot live" /><span style={{ fontSize: '0.68rem', fontFamily: 'var(--font-mono)', color: 'var(--text-tertiary)' }}>GPS activo</span></div>}
            </div>
            <div style={{ height: 340 }}>
              <AppMap center={domiPos || [4.4389, -75.2322]} zoom={13}>
                {domiPos && <Marker position={domiPos} icon={domiIcon}><Popup>🛵 Domiciliario en camino</Popup></Marker>}
              </AppMap>
            </div>
            {!domiPos && (
              <div style={{ padding: '0.6rem 1.1rem', background: 'rgba(245,158,11,0.05)', borderTop: '1px solid var(--border-subtle)', fontSize: '0.72rem', fontFamily: 'var(--font-mono)', color: '#fbbf24' }}>
                ⏳ Esperando señal GPS del domiciliario...
              </div>
            )}
          </div>

          {/* Timeline */}
          {selected && selected.estado !== 'cancelado' && (
            <div className="card">
              <div className="card-header"><span className="card-title">PROGRESO DEL PEDIDO</span></div>
              <div style={{ display: 'flex', gap: 0 }}>
                {PASOS.map((paso, i) => {
                  const done    = i <= stepIdx;
                  const current = i === stepIdx;
                  return (
                    <div key={paso} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', position: 'relative' }}>
                      {i < PASOS.length - 1 && (
                        <div style={{ position: 'absolute', top: 10, left: '50%', width: '100%', height: 2, background: done && i < stepIdx ? ROLE_COLOR : 'var(--border-subtle)', zIndex: 0 }} />
                      )}
                      <div style={{
                        width: 22, height: 22, borderRadius: '50%', zIndex: 1,
                        background: done ? ROLE_COLOR : 'var(--bg-elevated)',
                        border: `2px solid ${done ? ROLE_COLOR : 'var(--border-mid)'}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '0.6rem', color: done ? '#fff' : 'var(--text-tertiary)', fontWeight: 600,
                        boxShadow: current ? `0 0 0 4px rgba(139,92,246,0.2)` : 'none',
                      }}>
                        {done ? '✓' : i + 1}
                      </div>
                      <span style={{ fontSize: '0.65rem', fontFamily: 'var(--font-mono)', color: done ? ROLE_COLOR : 'var(--text-tertiary)', textAlign: 'center', fontWeight: current ? 600 : 400 }}>
                        {LABELS[paso]}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}