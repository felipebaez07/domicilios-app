import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import io from 'socket.io-client';
import { useAuth } from '../../context/AuthContext';
import DashboardLayout from '../../components/DashboardLayout';
import StatCard from '../../components/StatCard';
import AppMap from '../../components/AppMap';
import Modal from '../../components/Modal';

const TRACKING_URL = import.meta.env.VITE_TRACKING_URL;
const PEDIDOS_URL  = import.meta.env.VITE_PEDIDOS_URL;
const ESTADO = { pendiente:{label:'Pendiente',cls:'badge-warn',emoji:'⏳'}, asignado:{label:'Asignado',cls:'badge-info',emoji:'👤'}, en_camino:{label:'En camino',cls:'badge-info',emoji:'🛵'}, entregado:{label:'Entregado',cls:'badge-ok',emoji:'✅'}, cancelado:{label:'Cancelado',cls:'badge-err',emoji:'❌'} };

function makeDomiIcon(nombre, activo) {
  const c = activo ? '#10b981' : '#94a3b8';
  return new L.DivIcon({
    html: `<div style="display:flex;flex-direction:column;align-items:center;gap:2px;">
      <div style="width:36px;height:36px;border-radius:50%;background:${c};border:3px solid white;display:flex;align-items:center;justify-content:center;font-size:16px;box-shadow:0 4px 12px rgba(0,0,0,0.2);">🛵</div>
      <div style="background:white;color:#1a1a2e;font-size:9px;padding:2px 7px;border-radius:99px;white-space:nowrap;font-family:Poppins,sans-serif;font-weight:600;box-shadow:0 2px 8px rgba(0,0,0,0.15);">${nombre}</div>
    </div>`,
    iconSize: [70, 52], iconAnchor: [35, 52], className: '',
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
      setPositions(prev => ({ ...prev, [domiciliario_id]: { lat, lng, nombre: nombre || prev[domiciliario_id]?.nombre || `Dom`, activo: true } }));
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

  const domisActivos = Object.values(positions).filter(d => d.activo).length;
  const pedidosFilt  = filter === 'todos' ? pedidos : pedidos.filter(p => p.estado === filter);

  return (
    <DashboardLayout role="operador" pageTitle="Centro de control">
      <div className="page-header">
        <div>
          <div className="page-title">🎮 Centro de control</div>
          <div className="page-subtitle">Monitoreo en tiempo real · {domisActivos} GPS activos</div>
        </div>
        <button className="btn btn-ghost" onClick={fetchData}>🔄 Actualizar</button>
      </div>

      <div className="stats-grid-4">
        <StatCard icon="📦" value={String(pedidos.length)} label="Total pedidos" delay={0} />
        <StatCard icon="⏳" value={String(pedidos.filter(p=>p.estado==='pendiente').length)} label="Pendientes" delay={100} />
        <StatCard icon="🛵" value={String(pedidos.filter(p=>p.estado==='en_camino').length)} label="En tránsito" delay={200} />
        <StatCard icon="📡" value={String(domisActivos)} label="GPS activos" delay={300} />
      </div>

      {/* Split mapa / tabla */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', height: 'calc(100vh - 260px)', minHeight: 380 }}>
        {/* Mapa */}
        <div style={{ borderRight: '1px solid rgba(255,255,255,0.15)', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: 10, left: 12, zIndex: 10, background: 'rgba(255,255,255,0.9)', borderRadius: 99, padding: '4px 12px', fontSize: 11, fontWeight: 600, color: '#1a1a2e', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', gap: 6, boxShadow: '0 2px 10px rgba(0,0,0,0.1)' }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#10b981', display: 'inline-block', boxShadow: '0 0 6px #10b981' }} />
            Mapa en vivo · {domisActivos} activos
          </div>
          <div style={{ width: '100%', height: '100%' }}>
            <AppMap center={[4.4389, -75.2322]} zoom={13}>
              {Object.entries(positions).filter(([,d]) => d.lat && d.lng).map(([id, d]) => (
                <Marker key={id} position={[d.lat, d.lng]} icon={makeDomiIcon(d.nombre || `Dom-${id}`, d.activo)}>
                  <Popup><b>{d.nombre}</b><br />{d.activo ? '🟢 En línea' : '⚫ Sin señal'}</Popup>
                </Marker>
              ))}
            </AppMap>
          </div>
        </div>

        {/* Tabla */}
        <div style={{ display: 'flex', flexDirection: 'column', background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
          <div style={{ display: 'flex', gap: 4, padding: '8px 12px', borderBottom: '1px solid rgba(255,255,255,0.12)', flexWrap: 'wrap' }}>
            {['todos','pendiente','asignado','en_camino','entregado'].map(f => (
              <button key={f} onClick={() => setFilter(f)} style={{ padding: '4px 10px', borderRadius: 99, fontSize: 10, fontWeight: 600, border: 'none', cursor: 'pointer', background: filter===f ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.1)', color: '#fff', transition: 'all 0.15s' }}>
                {f==='todos'?'Todos':`${ESTADO[f]?.emoji} ${ESTADO[f]?.label}`}
              </button>
            ))}
          </div>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: 10 }}>
              {loading ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: 'rgba(255,255,255,0.5)', fontSize: 12 }}>⏳ Cargando...</div>
              ) : pedidosFilt.map(p => {
                const est = ESTADO[p.estado] || { label: p.estado, cls: 'badge-neutral', emoji: '📌' };
                return (
                  <div key={p.id} style={{ background: 'rgba(255,255,255,0.12)', borderRadius: 14, padding: '10px 12px', border: '1px solid rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.cliente_nombre || p.descripcion || '—'}</div>
                      <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.6)', marginTop: 2 }}>{p.direccion_entrega || p.direccion_destino || '—'}</div>
                    </div>
                    <span className={`badge ${est.cls}`}><span className="badge-dot"/>{est.emoji} {est.label}</span>
                    {p.estado === 'pendiente' && (
                      <button onClick={() => setSelected(p)} style={{ padding: '4px 10px', borderRadius: 99, background: 'rgba(255,255,255,0.25)', border: '1px solid rgba(255,255,255,0.4)', color: '#fff', fontSize: 10, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: 'Poppins,sans-serif' }}>
                        Asignar →
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Modal asignación */}
      {selected && (
        <Modal onClose={() => setSelected(null)} width={420}>
          <div className="modal-inner">
            <div className="modal-title">🛵 Asignar domiciliario</div>
            <div className="modal-sub">Pedido #{String(selected.id).slice(-6)} · {selected.cliente_nombre || selected.descripcion}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {domisInfo.length === 0 ? (
                <p style={{ textAlign: 'center', padding: '1rem', color: '#aaa', fontSize: 12 }}>Sin domiciliarios registrados 😔</p>
              ) : domisInfo.map(d => {
                const enLinea = positions[d.id]?.activo;
                return (
                  <button key={d.id} onClick={() => asignar(selected.id, d.id)} disabled={asignando} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 14, background: enLinea ? 'linear-gradient(135deg,rgba(16,185,129,0.1),rgba(5,150,105,0.1))' : '#f8f9ff', border: `2px solid ${enLinea ? '#10b981' : '#e8eaff'}`, cursor: 'pointer', textAlign: 'left', width: '100%', transition: 'all 0.2s', fontFamily: 'Poppins,sans-serif' }}>
                    <span style={{ fontSize: '1.4rem' }}>🛵</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#1a1a2e' }}>{d.nombre}</div>
                      <div style={{ fontSize: 10, color: enLinea ? '#10b981' : '#aaa', fontWeight: 500 }}>{enLinea ? '🟢 GPS activo' : '⚫ Sin señal'}</div>
                    </div>
                    <span style={{ fontSize: 16 }}>→</span>
                  </button>
                );
              })}
            </div>
          </div>
        </Modal>
      )}
    </DashboardLayout>
  );
}