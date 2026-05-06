import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import io from 'socket.io-client';
import { useAuth } from '../../context/AuthContext';
import DashboardLayout from '../../components/DashboardLayout';
import AppMap from '../../components/AppMap';
import Modal from '../../components/Modal';

const TRACKING_URL = import.meta.env.VITE_TRACKING_URL;
const PEDIDOS_URL  = import.meta.env.VITE_PEDIDOS_URL;

const ESTADO = {
  pendiente: { label: 'PENDIENTE', cls: 'badge-warn' },
  asignado:  { label: 'ASIGNADO',  cls: 'badge-info' },
  en_camino: { label: 'EN CAMINO', cls: 'badge-info' },
  entregado: { label: 'ENTREGADO', cls: 'badge-ok'   },
  cancelado: { label: 'CANCELADO', cls: 'badge-err'  },
};

function makeDomiIcon(nombre, activo) {
  const c = activo ? '#60a8d8' : '#5a7a9a';
  return new L.DivIcon({
    html: `<div style="display:flex;flex-direction:column;align-items:center;gap:2px;">
      <div style="width:28px;height:28px;border-radius:50%;background:${c};border:2px solid ${c}55;display:flex;align-items:center;justify-content:center;font-size:13px;">🛵</div>
      <div style="background:rgba(8,24,40,0.9);color:#e8f4ff;font-size:8px;padding:1px 5px;border-radius:2px;white-space:nowrap;font-family:monospace;">${nombre}</div>
    </div>`,
    iconSize: [70, 46], iconAnchor: [35, 46], className: '',
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
      await axios.patch(
        `${PEDIDOS_URL}/pedidos/${pedidoId}/asignar`,
        { domiciliario_id: domiciliarioId },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setSelected(null);
      fetchData();
    } catch {} finally { setAsignando(false); }
  }

  const domisActivos = Object.values(positions).filter(d => d.activo).length;
  const pedidosFilt  = filter === 'todos' ? pedidos : pedidos.filter(p => p.estado === filter);

  return (
    <DashboardLayout role="operador" pageTitle="Centro de control">

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', borderBottom: '1px solid var(--border)' }}>
        {[
          { l: 'Total pedidos', v: pedidos.length },
          { l: 'Pendientes',    v: pedidos.filter(p => p.estado === 'pendiente').length },
          { l: 'En tránsito',   v: pedidos.filter(p => p.estado === 'en_camino').length },
          { l: 'GPS activos',   v: domisActivos },
        ].map((s, i) => (
          <div key={s.l} style={{ padding: '0.85rem 1.1rem', borderRight: i < 3 ? '1px solid var(--border)' : 'none', transition: 'background 0.15s', cursor: 'default' }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
            <div style={{ fontSize: 7, fontFamily: 'var(--font-mono)', color: 'var(--txt-3)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 3 }}>{s.l}</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--txt-1)', letterSpacing: '-0.05em', lineHeight: 1 }}>
              {loading ? '—' : String(s.v).padStart(2, '0')}
            </div>
          </div>
        ))}
      </div>

      {/* Split mapa / tabla */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', height: 'calc(100vh - 170px)', minHeight: 380 }}>

        {/* Mapa */}
        <div style={{ borderRight: '1px solid var(--border)', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: 8, left: 10, zIndex: 10, fontSize: 7, fontFamily: 'var(--font-mono)', color: 'var(--txt-3)', letterSpacing: '0.1em', textTransform: 'uppercase', background: 'rgba(8,24,40,0.85)', padding: '3px 8px', display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--accent)', display: 'inline-block', animation: 'blink 2s infinite' }} />
            MAPA EN VIVO · {domisActivos} GPS
          </div>
          <div style={{ width: '100%', height: '100%' }}>
            <AppMap center={[4.4389, -75.2322]} zoom={13}>
              {Object.entries(positions).filter(([,d]) => d.lat && d.lng).map(([id, d]) => (
                <Marker key={id} position={[d.lat, d.lng]} icon={makeDomiIcon(d.nombre || `Dom-${id}`, d.activo)}>
                  <Popup>
                    <div style={{ fontFamily: 'monospace', fontSize: 11, lineHeight: 1.6 }}>
                      <strong>{d.nombre}</strong><br />
                      {d.activo ? '🟢 En línea' : '⚫ Sin señal'}
                    </div>
                  </Popup>
                </Marker>
              ))}
            </AppMap>
          </div>
        </div>

        {/* Tabla pedidos */}
        <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* Filtros */}
          <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
            {['todos','pendiente','asignado','en_camino','entregado'].map(f => (
              <button key={f} onClick={() => setFilter(f)} style={{
                padding: '7px 10px', fontSize: 6, fontFamily: 'var(--font-mono)', fontWeight: 700,
                letterSpacing: '0.08em', textTransform: 'uppercase',
                background: filter === f ? 'var(--bg-active)' : 'transparent',
                color: filter === f ? 'var(--accent)' : 'var(--txt-3)',
                border: 'none', borderRight: '1px solid var(--border)', cursor: 'pointer', transition: 'all 0.15s',
              }}>
                {f === 'todos' ? 'TODOS' : ESTADO[f]?.label || f}
              </button>
            ))}
            <button onClick={fetchData} style={{ marginLeft: 'auto', padding: '7px 10px', fontSize: 9, fontFamily: 'var(--font-mono)', color: 'var(--txt-3)', background: 'transparent', border: 'none', cursor: 'pointer' }}>↺</button>
          </div>

          <div style={{ flex: 1, overflowY: 'auto' }}>
            <table className="rv-table" style={{ width: '100%' }}>
              <thead>
                <tr>
                  {['#', 'Cliente', 'Estado', 'Domiciliario', ''].map(h => <th key={h}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={5} style={{ padding: '2rem', textAlign: 'center', fontSize: 9, fontFamily: 'var(--font-mono)', color: 'var(--txt-3)' }}>CARGANDO...</td></tr>
                ) : pedidosFilt.length === 0 ? (
                  <tr><td colSpan={5} style={{ padding: '2rem', textAlign: 'center', fontSize: 9, fontFamily: 'var(--font-mono)', color: 'var(--txt-3)' }}>SIN PEDIDOS</td></tr>
                ) : pedidosFilt.map(p => {
                  const est = ESTADO[p.estado] || { label: p.estado?.toUpperCase(), cls: 'badge-neutral' };
                  return (
                    <tr key={p.id}>
                      <td className="m">#{String(p.id).slice(-6)}</td>
                      <td className="p">{p.cliente_nombre || p.descripcion || '—'}</td>
                      <td><span className={`badge ${est.cls}`}>{est.label}</span></td>
                      <td style={{ color: p.domiciliario_nombre ? 'var(--accent)' : 'var(--txt-3)', fontSize: 10 }}>
                        {p.domiciliario_nombre || '—'}
                      </td>
                      <td>
                        {p.estado === 'pendiente' && (
                          <button onClick={() => setSelected(p)} style={{
                            padding: '2px 8px', fontSize: 7, fontFamily: 'var(--font-mono)', fontWeight: 700,
                            letterSpacing: '0.06em', background: 'transparent',
                            border: '1px solid var(--border-md)', color: 'var(--txt-2)', cursor: 'pointer',
                            transition: 'all 0.15s',
                          }}>
                            ASIGNAR →
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal asignación — usando portal, centrado correctamente */}
      {selected && (
        <Modal onClose={() => setSelected(null)} width={420}>
          <div style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <div>
                <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--txt-1)' }}>
                  Asignar pedido
                </div>
                <div style={{ fontSize: 8, fontFamily: 'var(--font-mono)', color: 'var(--txt-3)', marginTop: 2 }}>
                  #{String(selected.id).slice(-6)} · {selected.cliente_nombre || selected.descripcion}
                </div>
              </div>
              <button onClick={() => setSelected(null)} style={{
                width: 28, height: 28, border: '1px solid var(--border-md)',
                background: 'transparent', color: 'var(--txt-2)',
                cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: 12,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>✕</button>
            </div>

            <div style={{ fontSize: 8, fontFamily: 'var(--font-mono)', color: 'var(--txt-3)', marginBottom: '0.75rem', letterSpacing: '0.04em' }}>
              {selected.direccion_entrega || selected.direccion_destino}
            </div>

            <div style={{ borderTop: '1px solid var(--border)', paddingTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              {domisInfo.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '1.5rem', fontSize: 9, fontFamily: 'var(--font-mono)', color: 'var(--txt-3)', letterSpacing: '0.06em' }}>
                  SIN DOMICILIARIOS REGISTRADOS
                </div>
              ) : domisInfo.map(d => {
                const enLinea = positions[d.id]?.activo;
                return (
                  <button key={d.id} onClick={() => asignar(selected.id, d.id)} disabled={asignando}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '0.75rem',
                      padding: '0.65rem 0.9rem',
                      background: enLinea ? 'rgba(96,168,216,0.07)' : 'var(--bg-hover)',
                      border: `1px solid ${enLinea ? 'var(--border-md)' : 'var(--border)'}`,
                      cursor: 'pointer', textAlign: 'left', width: '100%',
                      transition: 'all 0.15s', opacity: asignando ? 0.5 : 1,
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(96,168,216,0.12)'}
                    onMouseLeave={e => e.currentTarget.style.background = enLinea ? 'rgba(96,168,216,0.07)' : 'var(--bg-hover)'}
                  >
                    <span style={{ fontSize: '1.1rem' }}>🛵</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--txt-1)' }}>{d.nombre}</div>
                      <div style={{ fontSize: 7, fontFamily: 'var(--font-mono)', color: enLinea ? 'var(--accent)' : 'var(--txt-3)', letterSpacing: '0.06em', marginTop: 1 }}>
                        {enLinea ? '● GPS ACTIVO' : '○ SIN SEÑAL GPS'}
                      </div>
                    </div>
                    <span style={{ color: 'var(--txt-3)', fontSize: 12 }}>→</span>
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