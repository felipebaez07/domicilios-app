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
  const c = activo ? '#b8cfe8' : '#5a7a9a';
  return new L.DivIcon({
    html: `<div style="display:flex;flex-direction:column;align-items:center;gap:2px;"><div style="width:28px;height:28px;border-radius:50%;background:${c};border:2px solid ${c}55;display:flex;align-items:center;justify-content:center;font-size:13px;">🛵</div><div style="background:rgba(22,45,74,0.9);color:#c8dcf0;font-size:8px;padding:1px 5px;border-radius:2px;white-space:nowrap;font-family:monospace;">${nombre}</div></div>`,
    iconSize: [70, 46], iconAnchor: [35, 46], className: '',
  });
}

export default function OperadorDomiciliarios() {
  const { token } = useAuth();
  const [domisInfo, setDomisInfo] = useState([]);
  const [positions, setPositions] = useState({});
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

  const activos = Object.values(positions).filter(d => d.activo).length;

  return (
    <DashboardLayout role="operador" pageTitle="Domiciliarios">
      <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border)' }}>
        <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--txt-1)' }}>Domiciliarios en campo</div>
        <div style={{ fontSize: 7, fontFamily: 'var(--font-mono)', color: 'var(--txt-3)', marginTop: 2, letterSpacing: '0.08em' }}>{activos} CON GPS ACTIVO · {domisInfo.length} REGISTRADOS</div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 240px', height: 'calc(100vh - 200px)', minHeight: 380 }}>
        {/* Mapa */}
        <div style={{ borderRight: '1px solid var(--border)', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: 8, left: 10, zIndex: 10, fontSize: 7, fontFamily: 'var(--font-mono)', color: 'var(--txt-3)', letterSpacing: '0.1em', textTransform: 'uppercase', background: 'rgba(22,45,74,0.85)', padding: '3px 7px', display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--accent)', display: 'inline-block', animation: 'blink 2s infinite' }} />
            MAPA EN VIVO
          </div>
          <div style={{ width: '100%', height: '100%' }}>
            <AppMap center={[4.4389, -75.2322]} zoom={13}>
              {Object.entries(positions).filter(([,d]) => d.lat && d.lng).map(([id, d]) => (
                <Marker key={id} position={[d.lat, d.lng]} icon={makeDomiIcon(d.nombre || `Dom-${id}`, d.activo)}>
                  <Popup><div style={{ fontFamily: 'monospace', fontSize: 11, lineHeight: 1.6 }}><strong>{d.nombre}</strong><br />{d.activo ? '🟢 En línea' : '⚫ Sin señal'}</div></Popup>
                </Marker>
              ))}
            </AppMap>
          </div>
        </div>
        {/* Lista */}
        <div style={{ overflowY: 'auto' }}>
          <div style={{ fontSize: 7, fontFamily: 'var(--font-mono)', color: 'var(--txt-3)', letterSpacing: '0.1em', textTransform: 'uppercase', padding: '8px 1rem', borderBottom: '1px solid var(--border)' }}>EQUIPO</div>
          {domisInfo.map(d => {
            const pos = positions[d.id]; const activo = pos?.activo || false;
            return (
              <div key={d.id} style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <div style={{ width: 30, height: 30, borderRadius: '50%', background: activo ? 'rgba(184,207,232,0.15)' : 'var(--bg-hover)', border: `1px solid ${activo ? 'var(--border-md)' : 'var(--border)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem', flexShrink: 0 }}>🛵</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--txt-1)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{d.nombre}</div>
                  <div style={{ fontSize: 7, fontFamily: 'var(--font-mono)', color: activo ? 'var(--accent)' : 'var(--txt-3)', letterSpacing: '0.06em', marginTop: 1 }}>
                    {activo ? '● GPS ACTIVO' : '○ SIN SEÑAL'}
                  </div>
                  {pos?.lat && <div style={{ fontSize: 7, fontFamily: 'var(--font-mono)', color: 'var(--txt-3)', marginTop: 1 }}>{pos.lat.toFixed(4)}, {pos.lng.toFixed(4)}</div>}
                </div>
              </div>
            );
          })}
          {domisInfo.length === 0 && <div style={{ padding: '2rem', textAlign: 'center', fontSize: 9, fontFamily: 'var(--font-mono)', color: 'var(--txt-3)', letterSpacing: '0.06em' }}>SIN DOMICILIARIOS</div>}
        </div>
      </div>
    </DashboardLayout>
  );
}