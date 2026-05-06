import { useState, useEffect, useRef } from 'react';
import { Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import io from 'socket.io-client';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import DashboardLayout from '../../components/DashboardLayout';
import AppMap from '../../components/AppMap';

const TRACKING_URL = import.meta.env.VITE_TRACKING_URL;
const PEDIDOS_URL  = import.meta.env.VITE_PEDIDOS_URL;

function makeDomiIcon(nombre, activo) {
  const color = activo ? '#10b981' : '#6b7280';
  return new L.DivIcon({
    html: `<div style="display:flex;flex-direction:column;align-items:center;gap:2px;">
      <div style="width:32px;height:32px;border-radius:50%;background:${color};border:2px solid ${color}55;display:flex;align-items:center;justify-content:center;font-size:15px;">🛵</div>
      <div style="background:#111827cc;color:#fff;font-size:9px;padding:1px 5px;border-radius:3px;white-space:nowrap;font-family:monospace;">${nombre}</div>
    </div>`,
    iconSize: [70, 48], iconAnchor: [35, 48], className: '',
  });
}

export default function OperadorDomiciliarios() {
  const { token } = useAuth();
  const [domisInfo, setDomisInfo]   = useState([]);
  const [positions, setPositions]   = useState({});
  const socketRef = useRef(null);

  useEffect(() => {
    axios.get(`${PEDIDOS_URL}/usuarios/domiciliarios`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => setDomisInfo(r.data)).catch(() => {});

    socketRef.current = io(TRACKING_URL, { auth: { token }, transports: ['websocket'] });
    socketRef.current.on('location_update', ({ domiciliario_id, lat, lng, nombre }) => {
      setPositions(prev => ({ ...prev, [domiciliario_id]: { lat, lng, nombre, activo: true, lastSeen: Date.now() } }));
    });
    socketRef.current.on('gps_off', ({ domiciliario_id }) => {
      setPositions(prev => ({ ...prev, [domiciliario_id]: { ...prev[domiciliario_id], activo: false } }));
    });
    return () => socketRef.current?.disconnect();
  }, []);

  const domisEnLinea = Object.values(positions).filter(d => d.activo).length;

  return (
    <DashboardLayout role="operador" pageTitle="Domiciliarios">
      <div className="page-header">
        <h1 className="page-title">Domiciliarios en campo</h1>
        <p className="page-subtitle">{domisEnLinea} con GPS activo · {domisInfo.length} registrados</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 260px', gap: '1rem' }}>
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '0.85rem 1.1rem', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span className="card-title">MAPA EN VIVO</span>
            <div className="status-indicator"><span className="pulse-dot live" /><span style={{ fontSize: '0.68rem', fontFamily: 'var(--font-mono)', color: 'var(--text-tertiary)' }}>escuchando GPS...</span></div>
          </div>
          <div style={{ height: 460 }}>
            <AppMap center={[4.4389, -75.2322]} zoom={13}>
              {Object.entries(positions).filter(([,d]) => d.lat && d.lng).map(([id, d]) => (
                <Marker key={id} position={[d.lat, d.lng]} icon={makeDomiIcon(d.nombre || `Dom-${id}`, d.activo)}>
                  <Popup>
                    <div style={{ fontFamily: 'monospace', fontSize: '12px', lineHeight: 1.6 }}>
                      <strong>{d.nombre}</strong><br />
                      {d.activo ? '🟢 En línea' : '⚫ Sin señal'}
                    </div>
                  </Popup>
                </Marker>
              ))}
            </AppMap>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <span style={{ fontSize: '0.65rem', fontFamily: 'var(--font-mono)', color: 'var(--text-tertiary)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            Estado del equipo
          </span>
          {domisInfo.map(d => {
            const pos    = positions[d.id];
            const activo = pos?.activo || false;
            return (
              <div key={d.id} className="card" style={{ padding: '0.85rem 1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <div style={{ width: 34, height: 34, borderRadius: '50%', background: activo ? 'rgba(16,185,129,0.12)' : 'var(--bg-elevated)', border: `1px solid ${activo ? 'rgba(16,185,129,0.25)' : 'var(--border-subtle)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', flexShrink: 0 }}>🛵</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{d.nombre}</div>
                    <div style={{ fontSize: '0.65rem', fontFamily: 'var(--font-mono)', color: activo ? '#34d399' : 'var(--text-tertiary)', marginTop: 1 }}>
                      {activo ? '● GPS activo' : '○ Sin señal'}
                    </div>
                  </div>
                </div>
                {pos?.lat && (
                  <div style={{ marginTop: '0.5rem', fontSize: '0.62rem', fontFamily: 'var(--font-mono)', color: 'var(--text-tertiary)', borderTop: '1px solid var(--border-subtle)', paddingTop: '0.5rem' }}>
                    {pos.lat.toFixed(4)}, {pos.lng.toFixed(4)}
                  </div>
                )}
              </div>
            );
          })}
          {domisInfo.length === 0 && (
            <div className="card" style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)', fontSize: '0.78rem' }}>Sin domiciliarios registrados</div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}