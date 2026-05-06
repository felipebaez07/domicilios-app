import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import DashboardLayout from '../../components/DashboardLayout';

const API = import.meta.env.VITE_PEDIDOS_URL;
const ESTADO = { pendiente:{label:'PENDIENTE',cls:'badge-warn'}, asignado:{label:'ASIGNADO',cls:'badge-info'}, en_camino:{label:'EN CAMINO',cls:'badge-info'}, entregado:{label:'ENTREGADO',cls:'badge-ok'}, cancelado:{label:'CANCELADO',cls:'badge-err'} };

export default function DistribuidorHistorial() {
  const { token } = useAuth();
  const [pedidos, setPedidos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter]   = useState('todos');
  const [search, setSearch]   = useState('');

  useEffect(() => {
    axios.get(`${API}/pedidos/mis-pedidos`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => setPedidos(r.data)).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const filtrados = pedidos.filter(p => {
    const ok = filter === 'todos' || p.estado === filter;
    const s  = !search || [p.cliente_nombre, p.descripcion, p.direccion_entrega].some(v => v?.toLowerCase().includes(search.toLowerCase()));
    return ok && s;
  });

  return (
    <DashboardLayout role="distribuidor" pageTitle="Historial">
      <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--txt-1)' }}>Historial de pedidos</div>
          <div style={{ fontSize: 7, fontFamily: 'var(--font-mono)', color: 'var(--txt-3)', marginTop: 2, letterSpacing: '0.08em' }}>{pedidos.length} PEDIDOS REGISTRADOS</div>
        </div>
      </div>
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', alignItems: 'center' }}>
        {['todos','pendiente','asignado','en_camino','entregado','cancelado'].map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{ padding: '8px 10px', fontSize: 6, fontFamily: 'var(--font-mono)', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', background: filter === f ? 'var(--bg-active)' : 'transparent', color: filter === f ? 'var(--accent)' : 'var(--txt-3)', border: 'none', borderRight: '1px solid var(--border)', cursor: 'pointer' }}>
            {f === 'todos' ? 'TODOS' : ESTADO[f]?.label || f}
          </button>
        ))}
        <div style={{ flex: 1, borderLeft: '1px solid var(--border)' }}>
          <input type="search" placeholder="Buscar..." value={search} onChange={e => setSearch(e.target.value)} style={{ border: 'none', height: 32, background: 'transparent', fontSize: 9 }} />
        </div>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table className="rv-table">
          <thead><tr><th>#</th><th>Cliente</th><th>Dirección</th><th>Descripción</th><th>Estado</th><th>Fecha</th></tr></thead>
          <tbody>
            {loading ? <tr><td colSpan={6} style={{ padding: '2rem', textAlign: 'center', fontSize: 9, fontFamily: 'var(--font-mono)', color: 'var(--txt-3)' }}>CARGANDO...</td></tr>
              : filtrados.length === 0 ? <tr><td colSpan={6} style={{ padding: '2rem', textAlign: 'center', fontSize: 9, fontFamily: 'var(--font-mono)', color: 'var(--txt-3)' }}>SIN RESULTADOS</td></tr>
              : filtrados.map(p => { const est = ESTADO[p.estado] || {label:p.estado.toUpperCase(),cls:'badge-neutral'}; return (
                <tr key={p.id}>
                  <td className="m">#{String(p.id).slice(-6)}</td>
                  <td className="p">{p.cliente_nombre}</td>
                  <td>{p.direccion_entrega}</td>
                  <td>{p.descripcion}</td>
                  <td><span className={`badge ${est.cls}`}>{est.label}</span></td>
                  <td className="m">{p.created_at ? new Date(p.created_at).toLocaleDateString('es-CO') : '—'}</td>
                </tr>
              );})}
          </tbody>
        </table>
      </div>
    </DashboardLayout>
  );
}