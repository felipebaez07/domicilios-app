import { useState, useEffect, useRef } from 'react';
import { Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import io from 'socket.io-client';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { usePersistentState } from '../../hooks/usePersistentState';
import DashboardLayout from '../../components/DashboardLayout';
import AppMap from '../../components/AppMap';

const TRACKING_URL = import.meta.env.VITE_TRACKING_URL;
const PEDIDOS_URL  = import.meta.env.VITE_PEDIDOS_URL;

const myIcon = new L.DivIcon({
  html: `<div style="width:34px;height:34px;border-radius:50%;background:#b8cfe8;border:3px solid rgba(184,207,232,0.35);display:flex;align-items:center;justify-content:center;font-size:16px;">🛵</div>`,
  iconSize: [34, 34], iconAnchor: [17, 17], className: '',
});

export default function DomiciliarioRuta() {
  const { token, user } = useAuth();
  const [gpsOn,   setGpsOn  ] = usePersistentState('dom_gps_active', false);
  const [lastPos, setLastPos] = usePersistentState('dom_last_pos', null);
  const [pedidoActivo, setPedidoActivo] = useState(null);
  const [myPos, setMyPos]   = useState(lastPos);
  const [gpsErr, setGpsErr] = useState('');

  const socketRef = useRef(null);
  const watchRef  = useRef(null);
  const gpsRef    = useRef(gpsOn);
  const pedidoRef = useRef(pedidoActivo);
  const userRef   = useRef(user);

  useEffect(() => { gpsRef.current = gpsOn; },         [gpsOn]);
  useEffect(() => { pedidoRef.current = pedidoActivo; },[pedidoActivo]);
  useEffect(() => { userRef.current = user; },          [user]);

  useEffect(() => {
    axios.get(`${PEDIDOS_URL}/pedidos/mis-entregas`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => setPedidoActivo(r.data.find(p => p.estado === 'asignado' || p.estado === 'en_camino') || null))
      .catch(() => {});
    socketRef.current = io(TRACKING_URL, { auth: { token }, transports: ['websocket'] });
    if (localStorage.getItem('dom_gps_active') === 'true') setTimeout(() => startWatch(), 600);
    return () => { socketRef.current?.disconnect(); if (watchRef.current) navigator.geolocation.clearWatch(watchRef.current); };
  }, []);

  function startWatch() {
    if (!navigator.geolocation) { setGpsErr('GPS no disponible'); return; }
    if (watchRef.current) navigator.geolocation.clearWatch(watchRef.current);
    setGpsErr('');
    watchRef.current = navigator.geolocation.watchPosition(
      pos => {
        const { latitude: lat, longitude: lng } = pos.coords;
        const arr = [lat, lng]; setMyPos(arr); setLastPos(arr);
        socketRef.current?.emit('location_update', { lat, lng, domiciliario_id: userRef.current?.id, pedido_id: pedidoRef.current?.id, nombre: userRef.current?.nombre });
      },
      err => { setGpsErr(err.message); setGpsOn(false); gpsRef.current = false; },
      { enableHighAccuracy: true, maximumAge: 3000, timeout: 15000 }
    );
    setGpsOn(true); gpsRef.current = true;
  }

  function stopWatch() {
    if (watchRef.current) { navigator.geolocation.clearWatch(watchRef.current); watchRef.current = null; }
    setGpsOn(false); gpsRef.current = false;
    socketRef.current?.emit('gps_off', { domiciliario_id: userRef.current?.id });
  }

  function toggleGPS() { gpsRef.current ? stopWatch() : startWatch(); }

  return (
    <DashboardLayout role="domiciliario" pageTitle="Ruta activa">
      <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--txt-1)' }}>Mi ruta activa</div>
          <div style={{ fontSize: 7, fontFamily: 'var(--font-mono)', color: 'var(--txt-3)', marginTop: 2, letterSpacing: '0.08em' }}>COMPARTE TU UBICACIÓN GPS EN TIEMPO REAL</div>
        </div>
        <button onClick={toggleGPS} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '7px 14px', background: gpsOn ? 'var(--bg-active)' : 'transparent', border: `1px solid ${gpsOn ? 'var(--border-md)' : 'var(--border)'}`, color: gpsOn ? 'var(--accent)' : 'var(--txt-2)', fontSize: 8, fontFamily: 'var(--font-mono)', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', cursor: 'pointer', transition: 'all 0.2s' }}>
          {gpsOn ? <><span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--accent)', display: 'inline-block', animation: 'blink 2s infinite' }} /> GPS ACTIVO</> : <>📍 ACTIVAR GPS</>}
        </button>
      </div>
      {gpsErr && <div className="alert alert-err" style={{ margin: '0.75rem 1.25rem 0' }}>⚠ {gpsErr}</div>}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', height: 'calc(100vh - 190px)', minHeight: 380 }}>
        <div style={{ borderRight: '1px solid var(--border)', position: 'relative', overflow: 'hidden' }}>
          {myPos && <div style={{ position: 'absolute', bottom: 8, right: 10, zIndex: 10, fontSize: 7, fontFamily: 'var(--font-mono)', color: 'var(--txt-3)', background: 'rgba(22,45,74,0.85)', padding: '3px 7px', letterSpacing: '0.04em' }}>{myPos[0].toFixed(4)}, {myPos[1].toFixed(4)}</div>}
          <div style={{ width: '100%', height: '100%' }}>
            <AppMap center={myPos || [4.4389, -75.2322]} zoom={14}>
              {myPos && <Marker position={myPos} icon={myIcon}><Popup>📍 Tu ubicación</Popup></Marker>}
            </AppMap>
          </div>
          {!myPos && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(22,45,74,0.5)', zIndex: 5 }}>
              <div style={{ textAlign: 'center', color: 'var(--txt-3)', fontSize: 9, fontFamily: 'var(--font-mono)', letterSpacing: '0.06em' }}>
                <div style={{ fontSize: '1.5rem', marginBottom: 8 }}>📍</div>ACTIVA EL GPS
              </div>
            </div>
          )}
        </div>
        <div style={{ padding: '1rem', overflowY: 'auto' }}>
          <div style={{ fontSize: 7, fontFamily: 'var(--font-mono)', color: 'var(--txt-3)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.75rem' }}>PEDIDO ACTIVO</div>
          {!pedidoActivo ? (
            <div style={{ textAlign: 'center', padding: '1.5rem 0', color: 'var(--txt-3)' }}>
              <div style={{ fontSize: '1.5rem', marginBottom: 6 }}>✓</div>
              <div style={{ fontSize: 9, fontFamily: 'var(--font-mono)', letterSpacing: '0.06em' }}>SIN PEDIDOS ASIGNADOS</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
              {[
                { l: 'Cliente',   v: pedidoActivo.cliente_nombre },
                { l: 'Dirección', v: pedidoActivo.direccion_entrega },
                { l: 'Pedido',    v: pedidoActivo.descripcion },
                { l: 'Teléfono', v: pedidoActivo.telefono },
              ].map(r => (
                <div key={r.l}>
                  <div style={{ fontSize: 7, fontFamily: 'var(--font-mono)', color: 'var(--txt-3)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 2 }}>{r.l}</div>
                  <div style={{ fontSize: 11, color: 'var(--txt-1)', fontWeight: 500 }}>{r.v || '—'}</div>
                </div>
              ))}
              {!gpsOn && <div className="alert alert-warn" style={{ marginTop: '0.5rem', fontSize: 8 }}>⚠ ACTIVA EL GPS PARA COMPARTIR TU UBICACIÓN</div>}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}