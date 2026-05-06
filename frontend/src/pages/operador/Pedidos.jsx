import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import DashboardLayout from '../../components/DashboardLayout';

const API = import.meta.env.VITE_PEDIDOS_URL;
const ESTADO = { pendiente:{label:'PENDIENTE',cls:'badge-warn'}, asignado:{label:'ASIGNADO',cls:'badge-info'}, en_camino:{label:'EN CAMINO',cls:'badge-info'}, entregado:{label:'ENTREGADO',cls:'badge-ok'}, cancelado:{label:'CANCELADO',cls:'badge-err'} };

export default function OperadorPedidos() {
  const { token } = useAuth();
  const [pedidos, setPedidos]   = useState([]);
  const [domis, setDomis]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [filter, setFilter]     = useState('todos');
  const [selected, setSelected] = useState(null);
  const [asignando, setAsig]    = useState(false);

  const h = { Authorization: `Bearer ${token}` };

  async function fetchData() {
    try {
      const [{ data: p }, { data: d }] = await Promise.all([
        axios.get(`${API}/pedidos`, { headers: h }),
        axios.get(`${API}/usuarios/domiciliarios`, { headers: h }).catch(() => ({ data: [] })),
      ]);
      setPedidos(p); setDomis(d);
    } catch {} finally { setLoading(false); }
  }

  useEffect(() => { fetchData(); }, []);

  async function asignar(pedidoId, domiciliarioId) {
    setAsig(true);
    try { await axios.patch(`${API}/pedidos/${pedidoId}/asignar`, { domiciliario_id: domiciliarioId }, { headers: h }); setSelected(null); fetchData(); }
    catch {} finally { setAsig(false); }
  }

  const filtrados = filter === 'todos' ? pedidos : pedidos.filter(p => p.estado === filter);

  return (
    <DashboardLayout role="operador" pageTitle="Pedidos">
      <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--txt-1)' }}>Gestión de pedidos</div>
          <div style={{ fontSize: 7, fontFamily: 'var(--font-mono)', color: 'var(--txt-3)', marginTop: 2, letterSpacing: '0.08em' }}>{pedidos.length} PEDIDOS · {pedidos.filter(p => p.estado === 'pendiente').length} SIN ASIGNAR</div>
        </div>
        <button onClick={fetchData} style={{ padding: '5px 12px', fontSize: 7, fontFamily: 'var(--font-mono)', fontWeight: 700, letterSpacing: '0.08em', background: 'transparent', border: '1px solid var(--border)', color: 'var(--txt-2)', cursor: 'pointer' }}>↺ SYNC</button>
      </div>
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border)' }}>
        {['todos','pendiente','asignado','en_camino','entregado'].map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{ padding: '8px 10px', fontSize: 6, fontFamily: 'var(--font-mono)', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', background: filter === f ? 'var(--bg-active)' : 'transparent', color: filter === f ? 'var(--accent)' : 'var(--txt-3)', border: 'none', borderRight: '1px solid var(--border)', cursor: 'pointer' }}>
            {f === 'todos' ? 'TODOS' : ESTADO[f]?.label || f}
          </button>
        ))}
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table className="rv-table">
          <thead><tr><th>#</th><th>Cliente</th><th>Descripción</th><th>Dirección</th><th>Estado</th><th>Domiciliario</th><th></th></tr></thead>
          <tbody>
            {loading ? <tr><td colSpan={7} style={{ padding: '2rem', textAlign: 'center', fontSize: 9, fontFamily: 'var(--font-mono)', color: 'var(--txt-3)' }}>CARGANDO...</td></tr>
              : filtrados.map(p => { const est = ESTADO[p.estado] || {label:p.estado.toUpperCase(),cls:'badge-neutral'}; return (
                <tr key={p.id}>
                  <td className="m">#{String(p.id).slice(-6)}</td>
                  <td className="p">{p.cliente_nombre}</td>
                  <td>{p.descripcion}</td>
                  <td style={{ maxWidth: 160 }}>{p.direccion_entrega}</td>
                  <td><span className={`badge ${est.cls}`}>{est.label}</span></td>
                  <td style={{ color: p.domiciliario_nombre ? 'var(--accent)' : 'var(--txt-3)' }}>{p.domiciliario_nombre || '—'}</td>
                  <td>{p.estado === 'pendiente' && <button onClick={() => setSelected(p)} style={{ padding: '2px 8px', fontSize: 7, fontFamily: 'var(--font-mono)', fontWeight: 700, letterSpacing: '0.06em', background: 'transparent', border: '1px solid var(--border-md)', color: 'var(--txt-2)', cursor: 'pointer' }}>ASIGNAR →</button>}</td>
                </tr>
              );})}
          </tbody>
        </table>
      </div>
      {selected && (
        <div style={{ position: "fixed", inset: 0, zIndex: 60, background: "rgba(10,25,50,0.85)", display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }} onClick={e => e.target === e.currentTarget && setSelected(null)}>
          <div className="modal">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <div className="modal-title">Asignar #{String(selected.id).slice(-6)}</div>
              <button onClick={() => setSelected(null)} style={{ width: 26, height: 26, border: '1px solid var(--border-md)', background: 'transparent', color: 'var(--txt-2)', cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              {domis.map(d => (
                <button key={d.id} onClick={() => asignar(selected.id, d.id)} disabled={asignando} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.65rem', background: 'var(--bg-hover)', border: '1px solid var(--border)', cursor: 'pointer', width: '100%', textAlign: 'left', transition: 'all 0.15s' }}>
                  <span style={{ fontSize: '1.1rem' }}>🛵</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--txt-1)' }}>{d.nombre}</div>
                    <div style={{ fontSize: 7, fontFamily: 'var(--font-mono)', color: 'var(--txt-3)', letterSpacing: '0.06em' }}>{d.email}</div>
                  </div>
                  <span style={{ color: 'var(--txt-3)', fontSize: 10 }}>→</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}