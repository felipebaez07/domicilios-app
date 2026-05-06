import { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import { Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import io from 'socket.io-client';
import { useAuth } from '../../context/AuthContext';
import DashboardLayout from '../../components/DashboardLayout';
import AppMap from '../../components/AppMap';

const TRACKING_URL = import.meta.env.VITE_TRACKING_URL;
const PEDIDOS_URL  = import.meta.env.VITE_PEDIDOS_URL;
const GPS_KEY      = 'dom_gps_active';

const myIcon = new L.DivIcon({
  html: `<div style="width:40px;height:40px;border-radius:50%;background:#10b981;border:3px solid rgba(16,185,129,0.4);display:flex;align-items:center;justify-content:center;font-size:20px;">🛵</div>`,
  iconSize: [40, 40], iconAnchor: [20, 20], className: '',
});

const ESTADOS_SIG = {
  asignado:  { next: 'en_camino', label: '▶ Iniciar entrega' },
  en_camino: { next: 'entregado', label: '✓ Marcar entregado' },
};

export default function DomiciliarioDashboard() {
  const { token, user } = useAuth();
  const [pedidoActivo, setPedidoActivo] = useState(null);
  const [pedidosHoy, setPedidosHoy]     = useState([]);
  const [myPos, setMyPos]   = useState(() => {
    const saved = localStorage.getItem('dom_last_pos');
    return saved ? JSON.parse(saved) : null;
  });
  const [gpsOn, setGpsOn]   = useState(() => localStorage.getItem(GPS_KEY) === 'true');
  const [gpsErr, setGpsErr] = useState('');
  const [updating, setUpdating] = useState(false);
  const [loading, setLoading]   = useState(true);

  const socketRef = useRef(null);
  const watchRef  = useRef(null);

  async function fetchData() {
    try {
      const { data } = await axios.get(`${PEDIDOS_URL}/pedidos/mis-entregas`, { headers: { Authorization: `Bearer ${token}` } });
      setPedidoActivo(data.find(p => p.estado === 'asignado' || p.estado === 'en_camino') || null);
      setPedidosHoy(data.filter(p => p.estado === 'entregado'));
    } catch {} finally { setLoading(false); }
  }

  useEffect(() => {
    fetchData();
    socketRef.current = io(TRACKING_URL, { auth: { token }, transports: ['websocket'] });

    // Si el GPS estaba activo antes, reanudarlo
    if (localStorage.getItem(GPS_KEY) === 'true') startWatch();

    return () => {
      socketRef.current?.disconnect();
      if (watchRef.current) navigator.geolocation.clearWatch(watchRef.current);
    };
  }, []);

  function startWatch() {
    if (!navigator.geolocation) { setGpsErr('GPS no disponible'); return; }
    setGpsErr('');
    watchRef.current = navigator.geolocation.watchPosition(
      pos => {
        const { latitude: lat, longitude: lng } = pos.coords;
        const newPos = [lat, lng];
        setMyPos(newPos);
        localStorage.setItem('dom_last_pos', JSON.stringify(newPos));
        socketRef.current?.emit('location_update', {
          lat, lng, domiciliario_id: user?.id,
          pedido_id: pedidoActivo?.id,
        });
      },
      err => { setGpsErr(err.message); setGpsOn(false); localStorage.removeItem(GPS_KEY); },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
    );
    setGpsOn(true);
    localStorage.setItem(GPS_KEY, 'true');
  }

  const toggleGPS = useCallback(() => {
    if (gpsOn) {
      if (watchRef.current) navigator.geolocation.clearWatch(watchRef.current);
      watchRef.current = null;
      setGpsOn(false);
      localStorage.removeItem(GPS_KEY);
      socketRef.current?.emit('gps_off', { domiciliario_id: user?.id });
    } else {
      startWatch();
    }
  }, [gpsOn, user, pedidoActivo]);

  async function actualizarEstado(nuevoEstado) {
    if (!pedidoActivo) return;
    setUpdating(true);
    try {
      await axios.patch(`${PEDIDOS_URL}/pedidos/${pedidoActivo.id}/estado`, { estado: nuevoEstado }, { headers: { Authorization: `Bearer ${token}` } });
      await fetchData();
    } catch {} finally { setUpdating(false); }
  }

  const accion = pedidoActivo ? ESTADOS_SIG[pedidoActivo.estado] : null;

  return (
    <DashboardLayout role="domiciliario" pageTitle="Mi turno" pageSubtitle={gpsOn ? 'GPS activo' : 'GPS inactivo'}>
      <div className="page-header flex-between">
        <div>
          <h1 className="page-title">Centro de entregas</h1>
          <p className="page-subtitle">Gestiona tu ruta y comparte tu ubicación GPS</p>
        </div>
        <button onClick={toggleGPS} style={{
          display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.55rem 1.1rem',
          borderRadius: 'var(--radius-md)', fontFamily: 'var(--font-ui)', fontSize: '0.82rem', fontWeight: 500,
          background: gpsOn ? 'rgba(16,185,129,0.12)' : 'var(--bg-surface)',
          border: `1px solid ${gpsOn ? 'rgba(16,185,129,0.35)' : 'var(--border-mid)'}`,
          color: gpsOn ? '#34d399' : 'var(--text-secondary)', cursor: 'pointer', transition: 'all 0.2s',
        }}>
          {gpsOn ? <><span className="pulse-dot live" /> GPS activo</> : <>📍 Activar GPS</>}
        </button>
      </div>

      {gpsErr && <div style={{ marginBottom: '1rem', padding: '0.65rem', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 'var(--radius-sm)', color: '#f87171', fontSize: '0.78rem', fontFamily: 'var(--font-mono)' }}>⚠ {gpsErr}</div>}

      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(3,1fr)' }}>
        {[
          { label: 'GPS',           value: gpsOn ? 'Activo' : 'Inactivo', accent: gpsOn ? '#10b981' : 'var(--border-subtle)', color: gpsOn ? '#34d399' : undefined },
          { label: 'Pedido activo', value: loading ? '—' : pedidoActivo ? 1 : 0, accent: '#10b981' },
          { label: 'Entregas hoy',  value: loading ? '—' : pedidosHoy.length, accent: '#10b981' },
        ].map(s => (
          <div className="stat-card" key={s.label}>
            <div className="stat-label">{s.label}</div>
            <div className="stat-value" style={s.color ? { color: s.color, fontSize: '1.3rem' } : {}}>{s.value}</div>
            <div className="stat-accent-line" style={{ background: s.accent }} />
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '1rem', marginTop: '1rem', alignItems: 'start' }}>
        {/* Mapa */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '0.85rem 1.1rem', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="card-title">MI POSICIÓN</span>
            {myPos && <span style={{ fontSize: '0.65rem', fontFamily: 'var(--font-mono)', color: 'var(--text-tertiary)' }}>{myPos[0].toFixed(4)}, {myPos[1].toFixed(4)}</span>}
          </div>
          <div style={{ height: 380 }}>
            <AppMap center={myPos || [4.4389, -75.2322]} zoom={14}>
              {myPos && <Marker position={myPos} icon={myIcon}><Popup>📍 Tu ubicación</Popup></Marker>}
            </AppMap>
          </div>
          {!myPos && (
            <div style={{ padding: '0.6rem 1.1rem', borderTop: '1px solid var(--border-subtle)', fontSize: '0.72rem', fontFamily: 'var(--font-mono)', color: 'var(--text-tertiary)' }}>
              📍 Activa el GPS para ver tu posición
            </div>
          )}
        </div>

        {/* Panel lateral */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Pedido activo */}
          <div className="card">
            <div className="card-header"><span className="card-title">PEDIDO ACTIVO</span></div>
            {loading ? (
              <p style={{ color: 'var(--text-tertiary)', fontSize: '0.82rem', fontFamily: 'var(--font-mono)' }}>Cargando...</p>
            ) : !pedidoActivo ? (
              <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
                <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>✓</div>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: 500 }}>Sin pedidos asignados</p>
                <p style={{ color: 'var(--text-tertiary)', fontSize: '0.72rem', marginTop: '0.25rem' }}>Espera asignación del operador</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.68rem', color: 'var(--text-tertiary)' }}>#{String(pedidoActivo.id).slice(-6)}</span>
                  <span className={`badge ${pedidoActivo.estado === 'en_camino' ? 'badge-info' : 'badge-warn'}`}>
                    <span className="badge-dot" style={{ background: 'currentColor' }} />
                    {pedidoActivo.estado === 'en_camino' ? 'En camino' : 'Asignado'}
                  </span>
                </div>
                {[
                  { icon: '👤', label: 'Cliente',    value: pedidoActivo.cliente_nombre },
                  { icon: '📍', label: 'Dirección',  value: pedidoActivo.direccion_entrega },
                  { icon: '📦', label: 'Pedido',     value: pedidoActivo.descripcion },
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
                {accion && (
                  <>
                    <div className="divider" />
                    <button className="btn btn-primary w-full" style={{ '--role-color': '#10b981', justifyContent: 'center' }} onClick={() => actualizarEstado(accion.next)} disabled={updating}>
                      {updating ? 'Actualizando...' : accion.label}
                    </button>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Entregas del día */}
          <div className="card">
            <div className="card-header">
              <span className="card-title">ENTREGAS HOY</span>
              <span style={{ fontSize: '0.72rem', fontFamily: 'var(--font-mono)', color: 'var(--text-tertiary)' }}>{pedidosHoy.length} completadas</span>
            </div>
            {pedidosHoy.length === 0 ? (
              <p style={{ color: 'var(--text-tertiary)', fontSize: '0.78rem', fontFamily: 'var(--font-mono)' }}>Sin entregas completadas aún</p>
            ) : (
              <div className="timeline">
                {pedidosHoy.slice(0, 5).map((p, i) => (
                  <div className="timeline-item" key={p.id}>
                    <div className="timeline-dot-col">
                      <div className="timeline-dot" style={{ background: '#10b981' }} />
                      {i < Math.min(pedidosHoy.length - 1, 4) && <div className="timeline-line" />}
                    </div>
                    <div className="timeline-content">
                      <div className="timeline-event">{p.cliente_nombre}</div>
                      <div className="timeline-time">{p.direccion_entrega}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}