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
  html: `<div style="width:32px;height:32px;border-radius:50%;background:#b8cfe8;border:3px solid rgba(184,207,232,0.3);display:flex;align-items:center;justify-content:center;font-size:16px;">🛵</div>`,
  iconSize: [32, 32], iconAnchor: [16, 16], className: '',
});

const PASOS  = ['pendiente', 'asignado', 'en_camino', 'entregado'];
const LABELS = { pendiente: 'Pendiente', asignado: 'Asignado', en_camino: 'En camino', entregado: 'Entregado', cancelado: 'Cancelado' };
const BADGE  = { pendiente: 'badge-warn', asignado: 'badge-info', en_camino: 'badge-info', entregado: 'badge-ok', cancelado: 'badge-err' };

export default function ClienteDashboard() {
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
    <DashboardLayout role="cliente" pageTitle="Mis pedidos">
      {/* Header */}
      <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--txt-1)', letterSpacing: '-0.02em' }}>Rastreo en tiempo real</div>
          <div style={{ fontSize: 7, fontFamily: 'var(--font-mono)', color: 'var(--txt-3)', letterSpacing: '0.08em', marginTop: 2 }}>SIGUE TU DOMICILIO CON GPS</div>
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          {[
            { l: 'Total',     v: pedidos.length },
            { l: 'Activos',   v: pedidos.filter(p => p.estado !== 'entregado' && p.estado !== 'cancelado').length },
            { l: 'Entregados', v: pedidos.filter(p => p.estado === 'entregado').length },
          ].map(s => (
            <div key={s.l} style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 7, fontFamily: 'var(--font-mono)', color: 'var(--txt-3)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>{s.l}</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--txt-1)', letterSpacing: '-0.04em', lineHeight: 1 }}>{loading ? '—' : s.v}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Split */}
      <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', height: 'calc(100vh - 200px)', minHeight: 380 }}>
        {/* Lista pedidos */}
        <div style={{ borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ padding: '8px 1rem', borderBottom: '1px solid var(--border)', fontSize: 7, fontFamily: 'var(--font-mono)', color: 'var(--txt-3)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            {pedidos.length} PEDIDO{pedidos.length !== 1 ? 'S' : ''}
          </div>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {loading ? (
              <div style={{ padding: '2rem', textAlign: 'center', fontSize: 9, fontFamily: 'var(--font-mono)', color: 'var(--txt-3)' }}>CARGANDO...</div>
            ) : pedidos.length === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center', fontSize: 9, fontFamily: 'var(--font-mono)', color: 'var(--txt-3)' }}>SIN PEDIDOS</div>
            ) : pedidos.map(p => (
              <button key={p.id} onClick={() => setSelected(p)} style={{
                width: '100%', padding: '0.75rem 1rem', textAlign: 'left',
                borderBottom: '1px solid var(--border)', border: 'none',
                borderBottom: '1px solid var(--border)',
                background: selected?.id === p.id ? 'var(--bg-active)' : 'transparent',
                borderLeft: `2px solid ${selected?.id === p.id ? 'var(--accent)' : 'transparent'}`,
                cursor: 'pointer', transition: 'all 0.15s',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                  <span style={{ fontSize: 8, fontFamily: 'var(--font-mono)', color: 'var(--txt-3)' }}>#{String(p.id).slice(-6)}</span>
                  <span className={`badge ${BADGE[p.estado] || 'badge-neutral'}`}>{LABELS[p.estado] || p.estado}</span>
                </div>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--txt-1)', marginBottom: 2 }}>{p.descripcion}</div>
                <div style={{ fontSize: 8, fontFamily: 'var(--font-mono)', color: 'var(--txt-3)' }}>{p.direccion_entrega}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Mapa + timeline */}
        <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* Mapa */}
          <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: 8, left: 10, zIndex: 10, fontSize: 7, fontFamily: 'var(--font-mono)', color: 'var(--txt-3)', letterSpacing: '0.1em', textTransform: 'uppercase', background: 'rgba(22,45,74,0.8)', padding: '3px 7px' }}>
              MAPA EN VIVO {domiPos && <span style={{ color: 'var(--accent)' }}>● GPS</span>}
            </div>
            <div style={{ width: '100%', height: '100%' }}>
              <AppMap center={domiPos || [4.4389, -75.2322]} zoom={14}>
                {domiPos && <Marker position={domiPos} icon={domiIcon}><Popup>🛵 Domiciliario en camino</Popup></Marker>}
              </AppMap>
            </div>
            {!domiPos && (
              <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '6px 10px', background: 'var(--warn-bg)', borderTop: '1px solid var(--warn-bdr)', fontSize: 8, fontFamily: 'var(--font-mono)', color: 'var(--warn-txt)', display: 'flex', alignItems: 'center', gap: 6, zIndex: 10 }}>
                ⏳ ESPERANDO SEÑAL GPS DEL DOMICILIARIO...
              </div>
            )}
          </div>

          {/* Timeline de progreso */}
          {selected && selected.estado !== 'cancelado' && (
            <div style={{ padding: '0.85rem 1.25rem', borderTop: '1px solid var(--border)', flexShrink: 0 }}>
              <div style={{ fontSize: 7, fontFamily: 'var(--font-mono)', color: 'var(--txt-3)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.65rem' }}>PROGRESO</div>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                {PASOS.map((paso, i) => {
                  const done = i <= stepIdx; const cur = i === stepIdx;
                  return (
                    <div key={paso} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, position: 'relative' }}>
                      {i < PASOS.length - 1 && (
                        <div style={{ position: 'absolute', top: 9, left: '50%', width: '100%', height: 1, background: done && i < stepIdx ? 'var(--accent)' : 'var(--border)', zIndex: 0 }} />
                      )}
                      <div style={{
                        width: 18, height: 18, borderRadius: '50%', zIndex: 1,
                        background: done ? 'var(--accent)' : 'var(--bg-app)',
                        border: `1px solid ${done ? 'var(--accent)' : 'var(--border-md)'}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '0.5rem', color: done ? 'var(--bg-top)' : 'var(--txt-3)', fontWeight: 700,
                        boxShadow: cur ? '0 0 0 3px rgba(184,207,232,0.2)' : 'none',
                      }}>
                        {done ? '✓' : i + 1}
                      </div>
                      <span style={{ fontSize: 7, fontFamily: 'var(--font-mono)', color: done ? 'var(--accent)' : 'var(--txt-3)', textAlign: 'center', fontWeight: cur ? 700 : 400, letterSpacing: '0.04em' }}>
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