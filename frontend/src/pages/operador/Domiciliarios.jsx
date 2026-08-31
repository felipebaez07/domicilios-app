import { useState, useEffect, useRef } from 'react';
import { Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import io from 'socket.io-client';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import DashboardLayout from '../../components/DashboardLayout';
import AppMap from '../../components/AppMap';
import Icon from '../../components/Icon';

const TRACKING_URL = import.meta.env.VITE_TRACKING_URL;
const PEDIDOS_URL  = import.meta.env.VITE_PEDIDOS_URL;

const SVG_SCOOTER = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="5.5" cy="18.5" r="2.2"/><circle cx="18.5" cy="18.5" r="2.2"/><path d="M7.5 18.5H12L15 10H18"/><path d="M12 18.5L9.5 12H6.5"/><path d="M15 10L17 6"/></svg>`;

function makeDomiIcon(nombre, activo) {
  const c = activo ? '#1a9c53' : '#94a3b8';
  return new L.DivIcon({
    html: `<div style="display:flex;flex-direction:column;align-items:center;gap:2px;"><div style="width:28px;height:28px;border-radius:50%;background:${c};border:2px solid white;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(0,0,0,0.2);">${SVG_SCOOTER}</div><div style="background:white;color:#221415;font-size:8px;padding:1px 5px;border-radius:2px;white-space:nowrap;font-family:monospace;box-shadow:0 2px 6px rgba(0,0,0,0.12);">${nombre}</div></div>`,
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
    socketRef.current = io(TRACKING_URL, { auth: { token }, transports: ['polling'] });
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
      <div className="responsive-split" style={{ '--split-cols': '1fr 240px', height: 'calc(100dvh - 200px)', minHeight: 380 }}>
        {/* Mapa */}
        <div style={{ borderRight: '1px solid var(--border)', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: 8, left: 10, zIndex: 10, fontSize: 7, fontFamily: 'var(--font-mono)', color: 'var(--txt-2)', letterSpacing: '0.1em', textTransform: 'uppercase', background: 'rgba(255,255,255,.9)', boxShadow: '0 2px 10px rgba(0,0,0,.1)', padding: '3px 7px', display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#1a9c53', display: 'inline-block', animation: 'blink 2s infinite' }} />
            MAPA EN VIVO
          </div>
          <div style={{ width: '100%', height: '100%' }}>
            <AppMap center={[4.4389, -75.2322]} zoom={13}>
              {Object.entries(positions).filter(([,d]) => d.lat && d.lng).map(([id, d]) => (
                <Marker key={id} position={[d.lat, d.lng]} icon={makeDomiIcon(d.nombre || `Dom-${id}`, d.activo)}>
                  <Popup><div style={{ fontFamily: 'monospace', fontSize: 11, lineHeight: 1.6 }}><strong>{d.nombre}</strong><br />{d.activo ? 'En línea' : 'Sin señal'}</div></Popup>
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
                <div style={{ width: 30, height: 30, borderRadius: '50%', background: activo ? '#e7f9ee' : 'var(--bg-hover)', border: `1px solid ${activo ? '#a6e8bf' : 'var(--border)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Icon name="scooter" size={15} color={activo ? '#1a9c53' : 'var(--txt-3)'} /></div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--txt-1)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{d.nombre}</div>
                  <div style={{ fontSize: 7, fontFamily: 'var(--font-mono)', color: activo ? '#1a9c53' : 'var(--txt-3)', letterSpacing: '0.06em', marginTop: 1, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'currentColor', display: 'inline-block', flexShrink: 0 }} />{activo ? 'GPS ACTIVO' : 'SIN SEÑAL'}
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