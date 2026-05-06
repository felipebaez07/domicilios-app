import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import io from 'socket.io-client';
import { useAuth } from '../../context/AuthContext';
import { usePersistentState } from '../../hooks/usePersistentState';
import DashboardLayout from '../../components/DashboardLayout';
import AppMap from '../../components/AppMap';

const TRACKING_URL = import.meta.env.VITE_TRACKING_URL;
const PEDIDOS_URL  = import.meta.env.VITE_PEDIDOS_URL;

const myIcon = new L.DivIcon({
  html: `<div style="width:40px;height:40px;border-radius:50%;background:#8aaac8;border:3px solid rgba(138,170,200,0.4);display:flex;align-items:center;justify-content:center;font-size:20px;">🛵</div>`,
  iconSize: [40, 40], iconAnchor: [20, 20], className: '',
});

const ESTADOS_SIG = {
  asignado:  { next: 'en_camino', label: '▶ Iniciar entrega' },
  en_camino: { next: 'entregado', label: '✓ Marcar entregado' },
};

export default function DomiciliarioDashboard() {
  const { token, user } = useAuth();

  const [gpsOn,   setGpsOn  ] = usePersistentState('dom_gps_active', false);
  const [lastPos, setLastPos] = usePersistentState('dom_last_pos',   null);

  const [pedidoActivo, setPedidoActivo] = useState(null);
  const [pedidosHoy,   setPedidosHoy]   = useState([]);
  const [myPos,        setMyPos]        = useState(lastPos);
  const [gpsErr,       setGpsErr]       = useState('');
  const [updating,     setUpdating]     = useState(false);
  const [loading,      setLoading]      = useState(true);

  // Refs para evitar closures desactualizados
  const socketRef      = useRef(null);
  const watchRef       = useRef(null);
  const gpsOnRef       = useRef(gpsOn);
  const pedidoRef      = useRef(pedidoActivo);
  const userRef        = useRef(user);

  // Mantener refs sincronizados con state
  useEffect(() => { gpsOnRef.current = gpsOn; },       [gpsOn]);
  useEffect(() => { pedidoRef.current = pedidoActivo; }, [pedidoActivo]);
  useEffect(() => { userRef.current = user; },          [user]);

  async function fetchData() {
    try {
      const { data } = await axios.get(
        `${PEDIDOS_URL}/pedidos/mis-entregas`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setPedidoActivo(data.find(p => p.estado === 'asignado' || p.estado === 'en_camino') || null);
      setPedidosHoy(data.filter(p => {
        if (!p.created_at) return false;
        return new Date(p.created_at).toDateString() === new Date().toDateString()
          && p.estado === 'entregado';
      }));
    } catch {} finally { setLoading(false); }
  }

  // startWatch siempre lee desde los refs — nunca tiene closures viejos
  function startWatch() {
    if (!navigator.geolocation) {
      setGpsErr('GPS no disponible en este dispositivo');
      return;
    }
    if (watchRef.current) {
      navigator.geolocation.clearWatch(watchRef.current);
    }
    setGpsErr('');

    watchRef.current = navigator.geolocation.watchPosition(
      pos => {
        const { latitude: lat, longitude: lng } = pos.coords;
        const arr = [lat, lng];
        setMyPos(arr);
        setLastPos(arr);
        socketRef.current?.emit('location_update', {
          lat, lng,
          domiciliario_id: userRef.current?.id,
          pedido_id:       pedidoRef.current?.id,
          nombre:          userRef.current?.nombre,
        });
      },
      err => {
        setGpsErr(err.message);
        setGpsOn(false);
        gpsOnRef.current = false;
      },
      { enableHighAccuracy: true, maximumAge: 3000, timeout: 15000 }
    );
    setGpsOn(true);
    gpsOnRef.current = true;
  }

  function stopWatch() {
    if (watchRef.current) {
      navigator.geolocation.clearWatch(watchRef.current);
      watchRef.current = null;
    }
    setGpsOn(false);
    gpsOnRef.current = false;
    socketRef.current?.emit('gps_off', { domiciliario_id: userRef.current?.id });
  }

  // Toggle sin useCallback — lee de ref para evitar stale closure
  function toggleGPS() {
    if (gpsOnRef.current) {
      stopWatch();
    } else {
      startWatch();
    }
  }

  useEffect(() => {
    fetchData();

    socketRef.current = io(TRACKING_URL, {
      auth: { token },
      transports: ['websocket'],
    });

    // Si el GPS estaba activo antes de recargar, reanudarlo
    if (localStorage.getItem('dom_gps_active') === 'true') {
      setTimeout(() => startWatch(), 600);
    }

    return () => {
      socketRef.current?.disconnect();
      if (watchRef.current) navigator.geolocation.clearWatch(watchRef.current);
    };
  }, []); // solo al montar

  async function actualizarEstado(nuevoEstado) {
    if (!pedidoActivo) return;
    setUpdating(true);
    try {
      await axios.patch(
        `${PEDIDOS_URL}/pedidos/${pedidoActivo.id}/estado`,
        { estado: nuevoEstado },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      await fetchData();
    } catch {} finally { setUpdating(false); }
  }

  const accion = pedidoActivo ? ESTADOS_SIG[pedidoActivo.estado] : null;

  return (
    <DashboardLayout role="domiciliario" pageTitle="Mi turno">
      <div style={{ padding: '1.25rem', borderBottom: '1px solid rgba(184,207,232,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--blue2)', letterSpacing: '-0.02em' }}>Centro de entregas</div>
          <div style={{ fontSize: '8px', fontFamily: 'var(--font-mono)', color: 'var(--dim)', letterSpacing: '0.08em', marginTop: 2 }}>
            GESTIONA TU RUTA Y COMPARTE TU UBICACIÓN GPS
          </div>
        </div>
        <button
          onClick={toggleGPS}
          style={{
            display: 'flex', alignItems: 'center', gap: '0.5rem',
            padding: '8px 14px',
            background: gpsOn ? 'rgba(184,207,232,0.1)' : 'transparent',
            border: `1px solid ${gpsOn ? 'rgba(184,207,232,0.3)' : 'rgba(184,207,232,0.15)'}`,
            color: gpsOn ? 'var(--blue)' : 'var(--dim)',
            fontSize: '8px', fontFamily: 'var(--font-mono)', fontWeight: 700,
            letterSpacing: '0.08em', textTransform: 'uppercase',
            cursor: 'pointer', transition: 'all 0.2s',
          }}
        >
          {gpsOn
            ? <><span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--blue)', display: 'inline-block', animation: 'pulse 2s infinite' }} /> GPS ACTIVO</>
            : <>📍 ACTIVAR GPS</>
          }
        </button>
      </div>

      {gpsErr && (
        <div style={{ margin: '0.75rem 1.25rem 0', padding: '8px 12px', background: 'rgba(180,50,50,0.08)', border: '1px solid rgba(180,50,50,0.2)', color: '#c07070', fontSize: '10px', fontFamily: 'var(--font-mono)' }}>
          ⚠ {gpsErr}
        </div>
      )}

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', borderBottom: '1px solid rgba(184,207,232,0.08)' }}>
        {[
          { label: 'GPS', value: gpsOn ? 'ACTIVO' : 'INACTIVO', highlight: gpsOn },
          { label: 'Pedido activo', value: loading ? '—' : pedidoActivo ? '01' : '00' },
          { label: 'Entregas hoy',  value: loading ? '—' : String(pedidosHoy.length).padStart(2,'0') },
        ].map((s, i) => (
          <div key={s.label} style={{
            padding: '0.85rem 1.1rem',
            borderRight: i < 2 ? '1px solid rgba(184,207,232,0.08)' : 'none',
          }}>
            <div style={{ fontSize: '7px', fontFamily: 'var(--font-mono)', color: 'var(--dim)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 4 }}>{s.label}</div>
            <div style={{ fontSize: s.label === 'GPS' ? '1rem' : '1.6rem', fontWeight: 700, color: s.highlight ? 'var(--blue)' : 'rgba(184,207,232,0.7)', letterSpacing: '-0.04em', lineHeight: 1 }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Split mapa / panel */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', height: 'calc(100vh - 280px)', minHeight: 300 }}>
        {/* Mapa */}
        <div style={{ borderRight: '1px solid rgba(184,207,232,0.08)', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: 10, left: 12, fontSize: '7px', fontFamily: 'var(--font-mono)', color: 'var(--dim)', letterSpacing: '0.1em', textTransform: 'uppercase', zIndex: 10 }}>
            MI POSICIÓN
          </div>
          {myPos && (
            <div style={{ position: 'absolute', bottom: 10, right: 10, fontSize: '7px', fontFamily: 'var(--font-mono)', color: 'var(--dim)', zIndex: 10, letterSpacing: '0.04em' }}>
              {myPos[0].toFixed(4)}°N · {myPos[1].toFixed(4)}°W
            </div>
          )}
          <div style={{ width: '100%', height: '100%' }}>
            <AppMap center={myPos || [4.4389, -75.2322]} zoom={14}>
              {myPos && <Marker position={myPos} icon={myIcon}><Popup>📍 Tu ubicación actual</Popup></Marker>}
            </AppMap>
          </div>
          {!myPos && (
            <div style={{
              position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'rgba(15,27,45,0.6)', zIndex: 5,
            }}>
              <div style={{ textAlign: 'center', color: 'var(--dim)', fontSize: '10px', fontFamily: 'var(--font-mono)', letterSpacing: '0.06em' }}>
                <div style={{ fontSize: '1.5rem', marginBottom: 8 }}>📍</div>
                ACTIVA EL GPS
              </div>
            </div>
          )}
        </div>

        {/* Panel pedido */}
        <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* Pedido activo */}
          <div style={{ flex: 1, padding: '1rem 1.25rem', borderBottom: '1px solid rgba(184,207,232,0.08)', overflow: 'auto' }}>
            <div style={{ fontSize: '7px', fontFamily: 'var(--font-mono)', color: 'var(--dim)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.75rem' }}>
              PEDIDO ACTIVO
            </div>
            {loading ? (
              <p style={{ color: 'var(--dim)', fontSize: '10px', fontFamily: 'var(--font-mono)' }}>Cargando...</p>
            ) : !pedidoActivo ? (
              <div style={{ textAlign: 'center', padding: '1.5rem 0', color: 'var(--dim)' }}>
                <div style={{ fontSize: '1.5rem', marginBottom: 6 }}>✓</div>
                <div style={{ fontSize: '9px', fontFamily: 'var(--font-mono)', letterSpacing: '0.06em' }}>SIN PEDIDOS ASIGNADOS</div>
                <div style={{ fontSize: '8px', fontFamily: 'var(--font-mono)', color: 'rgba(184,207,232,0.2)', marginTop: 4 }}>ESPERA ASIGNACIÓN DEL OPERADOR</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '8px', fontFamily: 'var(--font-mono)', color: 'rgba(184,207,232,0.2)' }}>#{String(pedidoActivo.id).slice(-6)}</span>
                  <span style={{
                    padding: '1px 7px', fontSize: '7px', fontFamily: 'var(--font-mono)', fontWeight: 700, letterSpacing: '0.06em',
                    background: pedidoActivo.estado === 'en_camino' ? 'var(--blue)' : 'transparent',
                    color: pedidoActivo.estado === 'en_camino' ? 'var(--ink)' : 'var(--mid)',
                    border: pedidoActivo.estado === 'en_camino' ? 'none' : '1px solid var(--mid)',
                  }}>
                    {pedidoActivo.estado === 'en_camino' ? 'EN CAMINO' : 'ASIGNADO'}
                  </span>
                </div>
                {[
                  { label: 'Cliente',    value: pedidoActivo.cliente_nombre },
                  { label: 'Dirección',  value: pedidoActivo.direccion_entrega },
                  { label: 'Pedido',     value: pedidoActivo.descripcion },
                  { label: 'Teléfono',   value: pedidoActivo.telefono },
                ].map(r => (
                  <div key={r.label}>
                    <div style={{ fontSize: '7px', fontFamily: 'var(--font-mono)', color: 'rgba(184,207,232,0.2)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 2 }}>{r.label}</div>
                    <div style={{ fontSize: '11px', color: 'var(--blue2)', fontWeight: 500 }}>{r.value || '—'}</div>
                  </div>
                ))}
                {accion && (
                  <button
                    onClick={() => actualizarEstado(accion.next)}
                    disabled={updating}
                    style={{
                      marginTop: '0.5rem', height: 38, background: 'var(--blue)',
                      border: 'none', cursor: 'pointer',
                      fontFamily: 'var(--font-mono)', fontSize: '8px', fontWeight: 700,
                      color: 'var(--ink)', letterSpacing: '0.08em', textTransform: 'uppercase',
                      transition: 'all 0.2s', opacity: updating ? 0.5 : 1,
                    }}
                  >
                    {updating ? 'ACTUALIZANDO...' : accion.label}
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Entregas del día */}
          <div style={{ padding: '0.75rem 1.25rem', overflow: 'auto', flex: 1 }}>
            <div style={{ fontSize: '7px', fontFamily: 'var(--font-mono)', color: 'var(--dim)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
              ENTREGAS HOY — {pedidosHoy.length}
            </div>
            {pedidosHoy.length === 0 ? (
              <p style={{ fontSize: '9px', fontFamily: 'var(--font-mono)', color: 'rgba(184,207,232,0.15)', letterSpacing: '0.04em' }}>
                SIN ENTREGAS COMPLETADAS AÚN
              </p>
            ) : pedidosHoy.slice(0, 4).map(p => (
              <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px solid rgba(184,207,232,0.05)' }}>
                <span style={{ fontSize: '10px', color: 'var(--blue2)', fontWeight: 500 }}>{p.cliente_nombre}</span>
                <span style={{ fontSize: '8px', fontFamily: 'var(--font-mono)', color: 'var(--dim)' }}>✓</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <style>{`@keyframes pulse{0%,100%{opacity:1;box-shadow:0 0 0 0 rgba(184,207,232,0.4)}50%{box-shadow:0 0 0 5px rgba(184,207,232,0)}}`}</style>
    </DashboardLayout>
  );
}