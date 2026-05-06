import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import io from 'socket.io-client';
import { useAuth } from '../../context/AuthContext';
import DashboardLayout from '../../components/DashboardLayout';
import AppMap from '../../components/AppMap';

const TRACKING_URL = import.meta.env.VITE_TRACKING_URL;
const PEDIDOS_URL  = import.meta.env.VITE_PEDIDOS_URL;

const ESTADO = {
  pendiente: { label: 'Pendiente', cls: 'badge-warn' },
  asignado:  { label: 'Asignado',  cls: 'badge-info' },
  en_camino: { label: 'En camino', cls: 'badge-info' },
  entregado: { label: 'Entregado', cls: 'badge-ok'   },
  cancelado: { label: 'Cancelado', cls: 'badge-err'  },
};

function makeDomiIcon(nombre, activo) {
  const c = activo ? '#10b981' : '#6b7280';
  return new L.DivIcon({
    html: `<div style="display:flex;flex-direction:column;align-items:center;gap:2px;">
      <div style="width:32px;height:32px;border-radius:50%;background:${c};border:2px solid ${c}55;display:flex;align-items:center;justify-content:center;font-size:15px;">🛵</div>
      <div style="background:rgba(0,0,0,0.75);color:#fff;font-size:9px;padding:1px 5px;border-radius:3px;white-space:nowrap;font-family:monospace;">${nombre}</div>
    </div>`,
    iconSize: [70, 48], iconAnchor: [35, 48], className: '',
  });
}

export default function OperadorDashboard() {
  const { token } = useAuth();
  const [pedidos, setPedidos]     = useState([]);
  const [domisInfo, setDomisInfo] = useState([]);
  const [positions, setPositions] = useState({});
  const [selected, setSelected]   = useState(null);
  const [asignando, setAsignando] = useState(false);
  const [loading, setLoading]     = useState(true);
  const [filter, setFilter]       = useState('todos');
  const socketRef = useRef(null);

  async function fetchData() {
    try {
      const [{ data: p }, { data: d }] = await Promise.all([
        axios.get(`${PEDIDOS_URL}/pedidos`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${PEDIDOS_URL}/usuarios/domiciliarios`, { headers: { Authorization: `Bearer ${token}` } }).catch(() => ({ data: [] })),
      ]);
      setPedidos(p); setDomisInfo(d);
    } catch {} finally { setLoading(false); }
  }

  useEffect(() => {
    fetchData();
    socketRef.current = io(TRACKING_URL, { auth: { token }, transports: ['websocket'] });
    socketRef.current.on('location_update', ({ domiciliario_id, lat, lng, nombre }) => {
      setPositions(prev => ({
        ...prev,
        [domiciliario_id]: { lat, lng, nombre: nombre || prev[domiciliario_id]?.nombre || `Dom-${domiciliario_id}`, activo: true, lastSeen: Date.now() },
      }));
    });
    socketRef.current.on('gps_off', ({ domiciliario_id }) => {
      setPositions(prev => ({ ...prev, [domiciliario_id]: { ...prev[domiciliario_id], activo: false } }));
    });
    return () => socketRef.current?.disconnect();
  }, []);

  async function asignar(pedidoId, domiciliarioId) {
    setAsignando(true);
    try {
      await axios.patch(`${PEDIDOS_URL}/pedidos/${pedidoId}/asignar`, { domiciliario_id: domiciliarioId }, { headers: { Authorization: `Bearer ${token}` } });
      setSelected(null); fetchData();
    } catch {} finally { setAsignando(false); }
  }

  const domisActivos  = Object.values(positions).filter(d => d.activo).length;
  const pedidosFilt   = filter === 'todos' ? pedidos : pedidos.filter(p => p.estado === filter);

  return (
    <DashboardLayout role="operador" pageTitle="Centro de control" pageSubtitle={`${domisActivos} domiciliarios en línea`}>
      <div className="page-header">
        <h1 className="page-title">Centro de control</h1>
        <p className="page-subtitle">Monitoreo en tiempo real · {domisActivos} GPS activos</p>
      </div>

      <div className="stats-grid">
        {[
          { label: 'Total pedidos', value: pedidos.length,                                        accent: '#f59e0b' },
          { label: 'Pendientes',    value: pedidos.filter(p => p.estado === 'pendiente').length,  accent: '#f59e0b' },
          { label: 'En tránsito',  value: pedidos.filter(p => p.estado === 'en_camino').length,  accent: '#3b82f6' },
          { label: 'GPS activos',  value: domisActivos,                                           accent: '#10b981' },
        ].map(s => (
          <div className="stat-card" key={s.label}>
            <div className="stat-label">{s.label}</div>
            <div className="stat-value">{loading ? '—' : s.value}</div>
            <div className="stat-accent-line" style={{ background: s.accent }} />
          </div>
        ))}
      </div>

      {/* Mapa */}
      <div className="card mb-md" style={{ padding: 0, overflow: 'hidden', marginTop: '1rem' }}>
        <div style={{ padding: '0.85rem 1.1rem', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <span className="card-title">MAPA EN VIVO</span>
            <div className="status-indicator"><span className="pulse-dot live" /><span style={{ fontSize: '0.68rem', fontFamily: 'var(--font-mono)', color: 'var(--text-tertiary)' }}>actualizando...</span></div>
          </div>
          <div style={{ display: 'flex', gap: '0.4rem' }}>
            {Object.entries(positions).map(([id, d]) => (
              <div key={id} style={{ padding: '2px 8px', borderRadius: 99, fontSize: '0.65rem', fontFamily: 'var(--font-mono)', background: d.activo ? 'rgba(16,185,129,0.12)' : 'var(--bg-elevated)', border: `1px solid ${d.activo ? 'rgba(16,185,129,0.25)' : 'var(--border-subtle)'}`, color: d.activo ? '#34d399' : 'var(--text-tertiary)', display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'currentColor', display: 'inline-block' }} />{d.nombre}
              </div>
            ))}
          </div>
        </div>
        <div style={{ height: 400 }}>
          <AppMap center={[4.4389, -75.2322]} zoom={13}>
            {Object.entries(positions).filter(([,d]) => d.lat && d.lng).map(([id, d]) => (
              <Marker key={id} position={[d.lat, d.lng]} icon={makeDomiIcon(d.nombre || `Dom-${id}`, d.activo)}>
                <Popup><div style={{ fontFamily: 'monospace', fontSize: '12px', lineHeight: 1.6 }}><strong>{d.nombre}</strong><br />{d.activo ? '🟢 En línea' : '⚫ Sin señal'}</div></Popup>
              </Marker>
            ))}
          </AppMap>
        </div>
      </div>

      {/* Tabla pedidos */}
      <div className="card">
        <div className="card-header" style={{ flexWrap: 'wrap', gap: '0.5rem' }}>
          <span className="card-title">PEDIDOS</span>
          <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap', marginLeft: 'auto' }}>
            {['todos','pendiente','asignado','en_camino','entregado'].map(f => (
              <button key={f} onClick={() => setFilter(f)} style={{
                padding: '3px 10px', borderRadius: 99, fontSize: '0.65rem', fontFamily: 'var(--font-mono)',
                background: filter === f ? 'rgba(245,158,11,0.15)' : 'var(--bg-elevated)',
                border: `1px solid ${filter === f ? 'rgba(245,158,11,0.3)' : 'var(--border-subtle)'}`,
                color: filter === f ? '#fbbf24' : 'var(--text-tertiary)', cursor: 'pointer',
              }}>
                {f === 'todos' ? 'Todos' : ESTADO[f]?.label || f}
              </button>
            ))}
            <button className="btn btn-ghost" style={{ fontSize: '0.72rem', padding: '2px 8px' }} onClick={fetchData}>↺</button>
          </div>
        </div>
        <div className="data-table-wrap">
          <table className="data-table">
            <thead><tr><th>#</th><th>Cliente</th><th>Descripción</th><th>Dirección</th><th>Estado</th><th>Domiciliario</th><th></th></tr></thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)', fontSize: '0.78rem' }}>Cargando...</td></tr>
              ) : pedidosFilt.map(p => {
                const est = ESTADO[p.estado] || { label: p.estado, cls: 'badge-neutral' };
                return (
                  <tr key={p.id}>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.68rem', color: 'var(--text-tertiary)' }}>#{String(p.id).slice(-6)}</td>
                    <td style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{p.cliente_nombre}</td>
                    <td style={{ fontSize: '0.8rem' }}>{p.descripcion}</td>
                    <td style={{ fontSize: '0.75rem', maxWidth: 160 }}>{p.direccion_entrega}</td>
                    <td><span className={`badge ${est.cls}`}><span className="badge-dot" style={{ background: 'currentColor' }} />{est.label}</span></td>
                    <td style={{ fontSize: '0.78rem', color: p.domiciliario_nombre ? '#34d399' : 'var(--text-tertiary)' }}>{p.domiciliario_nombre || '—'}</td>
                    <td>
                      {p.estado === 'pendiente' && (
                        <button className="btn btn-ghost" style={{ fontSize: '0.72rem', padding: '3px 8px' }} onClick={() => setSelected(p)}>Asignar →</button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal asignación */}
      {selected && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
          onClick={e => e.target === e.currentTarget && setSelected(null)}>
          <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-mid)', borderRadius: 'var(--radius-lg)', padding: '1.75rem', width: '100%', maxWidth: 420 }}>
            <div className="flex-between mb-md">
              <h2 style={{ fontSize: '1rem', fontWeight: 600 }}>Asignar pedido #{String(selected.id).slice(-6)}</h2>
              <button className="icon-btn" onClick={() => setSelected(null)}>✕</button>
            </div>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>{selected.descripcion} · {selected.direccion_entrega}</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {domisInfo.length === 0 ? (
                <p style={{ textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '0.82rem', fontFamily: 'var(--font-mono)', padding: '1rem' }}>Sin domiciliarios registrados</p>
              ) : domisInfo.map(d => {
                const enLinea = positions[d.id]?.activo;
                return (
                  <button key={d.id} onClick={() => asignar(selected.id, d.id)} disabled={asignando} style={{
                    display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 0.9rem',
                    background: 'var(--bg-elevated)', border: `1px solid ${enLinea ? 'rgba(16,185,129,0.2)' : 'var(--border-subtle)'}`,
                    borderRadius: 'var(--radius-md)', cursor: 'pointer', textAlign: 'left', width: '100%', transition: 'all 0.15s',
                  }}>
                    <span style={{ fontSize: '1.1rem' }}>🛵</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-primary)' }}>{d.nombre}</div>
                      <div style={{ fontSize: '0.65rem', fontFamily: 'var(--font-mono)', color: enLinea ? '#34d399' : 'var(--text-tertiary)' }}>{enLinea ? '● GPS activo' : '○ Sin señal'}</div>
                    </div>
                    <span style={{ color: 'var(--text-tertiary)', fontSize: '0.78rem' }}>→</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}