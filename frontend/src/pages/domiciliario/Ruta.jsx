import { useState, useEffect, useRef, useCallback } from 'react';
import { Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import io from 'socket.io-client';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import DashboardLayout from '../../components/DashboardLayout';
import AppMap from '../../components/AppMap';

const TRACKING_URL = import.meta.env.VITE_TRACKING_URL;
const PEDIDOS_URL  = import.meta.env.VITE_PEDIDOS_URL;

const myIcon = new L.DivIcon({
  html: `<div style="width:40px;height:40px;border-radius:50%;background:#10b981;border:3px solid rgba(16,185,129,0.4);display:flex;align-items:center;justify-content:center;font-size:20px;">🛵</div>`,
  iconSize: [40, 40], iconAnchor: [20, 20], className: '',
});

export default function DomiciliarioRuta() {
  const { token, user } = useAuth();
  const [pedidoActivo, setPedidoActivo] = useState(null);
  const [myPos, setMyPos]   = useState(null);
  const [gpsOn, setGpsOn]   = useState(false);
  const [gpsErr, setGpsErr] = useState('');
  const socketRef  = useRef(null);
  const watchRef   = useRef(null);
  const mapRef     = useRef(null);

  useEffect(() => {
    axios.get(`${PEDIDOS_URL}/pedidos/mis-entregas`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => setPedidoActivo(r.data.find(p => p.estado === 'asignado' || p.estado === 'en_camino') || null))
      .catch(() => {});
    socketRef.current = io(TRACKING_URL, { auth: { token }, transports: ['websocket'] });
    return () => {
      socketRef.current?.disconnect();
      if (watchRef.current) navigator.geolocation.clearWatch(watchRef.current);
    };
  }, []);

  const toggleGPS = useCallback(() => {
    if (gpsOn) {
      navigator.geolocation.clearWatch(watchRef.current);
      watchRef.current = null; setGpsOn(false); return;
    }
    if (!navigator.geolocation) { setGpsErr('GPS no disponible'); return; }
    setGpsErr('');
    watchRef.current = navigator.geolocation.watchPosition(
      pos => {
        const { latitude: lat, longitude: lng } = pos.coords;
        setMyPos([lat, lng]);
        socketRef.current?.emit('location_update', { lat, lng, domiciliario_id: user?.id, pedido_id: pedidoActivo?.id });
        if (mapRef.current) mapRef.current.flyTo([lat, lng], 15, { duration: 1 });
      },
      err => { setGpsErr(err.message); setGpsOn(false); },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
    );
    setGpsOn(true);
  }, [gpsOn, pedidoActivo, user]);

  return (
    <DashboardLayout role="domiciliario" pageTitle="Ruta activa">
      <div className="page-header flex-between">
        <div>
          <h1 className="page-title">Mi ruta activa</h1>
          <p className="page-subtitle">Comparte tu ubicación GPS en tiempo real</p>
        </div>
        <button onClick={toggleGPS} style={{
          display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.55rem 1.1rem',
          borderRadius: 'var(--radius-md)', fontFamily: 'var(--font-ui)', fontSize: '0.82rem', fontWeight: 500,
          background: gpsOn ? 'rgba(16,185,129,0.12)' : 'var(--bg-surface)',
          border: `1px solid ${gpsOn ? 'rgba(16,185,129,0.35)' : 'var(--border-mid)'}`,
          color: gpsOn ? '#34d399' : 'var(--text-secondary)', cursor: 'pointer', transition: 'all 0.2s',
        }}>
          {gpsOn ? <><span className="pulse-dot live" />GPS activo</> : <>📍 Activar GPS</>}
        </button>
      </div>

      {gpsErr && <div style={{ marginBottom: '1rem', padding: '0.65rem', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 'var(--radius-sm)', color: '#f87171', fontSize: '0.78rem', fontFamily: 'var(--font-mono)' }}>⚠ {gpsErr}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '1rem' }}>
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '0.85rem 1.1rem', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="card-title">MI POSICIÓN</span>
            {myPos && <span style={{ fontSize: '0.65rem', fontFamily: 'var(--font-mono)', color: 'var(--text-tertiary)' }}>{myPos[0].toFixed(5)}, {myPos[1].toFixed(5)}</span>}
          </div>
          <div style={{ height: 420 }}>
            <AppMap center={myPos || [4.4389, -75.2322]} zoom={14}>
              {myPos && <Marker position={myPos} icon={myIcon}><Popup>📍 Tu ubicación</Popup></Marker>}
            </AppMap>
          </div>
        </div>

        <div className="card">
          <div className="card-header"><span className="card-title">PEDIDO ACTIVO</span></div>
          {!pedidoActivo ? (
            <div style={{ textAlign: 'center', padding: '2rem 0' }}>
              <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>✓</div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Sin pedidos asignados</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              {[
                { icon: '👤', label: 'Cliente',    value: pedidoActivo.cliente_nombre },
                { icon: '📍', label: 'Dirección',  value: pedidoActivo.direccion_entrega },
                { icon: '📦', label: 'Descripción', value: pedidoActivo.descripcion },
                { icon: '📞', label: 'Teléfono',   value: pedidoActivo.telefono },
              ].map(r => (
                <div key={r.label} style={{ display: 'flex', gap: '0.6rem', fontSize: '0.82rem' }}>
                  <span style={{ width: 22, textAlign: 'center', flexShrink: 0 }}>{r.icon}</span>
                  <div>
                    <div style={{ fontSize: '0.62rem', fontFamily: 'var(--font-mono)', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 1 }}>{r.label}</div>
                    <div style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{r.value || '—'}</div>
                  </div>
                </div>
              ))}
              {!gpsOn && (
                <div style={{ padding: '0.6rem', background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.15)', borderRadius: 'var(--radius-sm)', fontSize: '0.72rem', fontFamily: 'var(--font-mono)', color: '#34d399', textAlign: 'center' }}>
                  Activa el GPS para compartir tu ubicación
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}