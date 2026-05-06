import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import DashboardLayout from '../../components/DashboardLayout';

const API = import.meta.env.VITE_PEDIDOS_URL;
const ESTADO = { pendiente:{label:'PENDIENTE',cls:'badge-warn'}, asignado:{label:'ASIGNADO',cls:'badge-info'}, en_camino:{label:'EN CAMINO',cls:'badge-info'}, entregado:{label:'ENTREGADO',cls:'badge-ok'}, cancelado:{label:'CANCELADO',cls:'badge-err'} };

export default function AdminPedidos() {
  const { token } = useAuth();
  const [pedidos, setPedidos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState('');
  const [filter, setFilter]   = useState('todos');
  const [page, setPage]       = useState(1);
  const PER = 15;

  useEffect(() => {
    axios.get(`${API}/pedidos/todos`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => setPedidos(r.data)).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const filtrados = pedidos.filter(p => {
    const ok = filter === 'todos' || p.estado === filter;
    const s  = !search || [p.cliente_nombre, p.descripcion, p.direccion_entrega, String(p.id)].some(v => v?.toLowerCase().includes(search.toLowerCase()));
    return ok && s;
  });
  const pages = Math.ceil(filtrados.length / PER) || 1;
  const paged = filtrados.slice((page-1)*PER, page*PER);

  return (
    <DashboardLayout role="admin" pageTitle="Pedidos">
      <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--txt-1)' }}>Todos los pedidos</div>
          <div style={{ fontSize: 7, fontFamily: 'var(--font-mono)', color: 'var(--txt-3)', marginTop: 2, letterSpacing: '0.08em' }}>{filtrados.length} RESULTADOS</div>
        </div>
      </div>
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', alignItems: 'center' }}>
        {['todos','pendiente','asignado','en_camino','entregado','cancelado'].map(f => (
          <button key={f} onClick={() => { setFilter(f); setPage(1); }} style={{ padding: '8px 9px', fontSize: 6, fontFamily: 'var(--font-mono)', fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', background: filter === f ? 'var(--bg-active)' : 'transparent', color: filter === f ? 'var(--accent)' : 'var(--txt-3)', border: 'none', borderRight: '1px solid var(--border)', cursor: 'pointer' }}>
            {f === 'todos' ? 'TODOS' : ESTADO[f]?.label || f}
          </button>
        ))}
        <div style={{ flex: 1, borderLeft: '1px solid var(--border)' }}>
          <input type="search" placeholder="Buscar..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} style={{ border: 'none', height: 32, background: 'transparent', fontSize: 9 }} />
        </div>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table className="rv-table">
          <thead><tr><th>#</th><th>Cliente</th><th>Descripción</th><th>Dirección</th><th>Domiciliario</th><th>Estado</th><th>Fecha</th></tr></thead>
          <tbody>
            {loading ? <tr><td colSpan={7} style={{ padding: '2.5rem', textAlign: 'center', fontSize: 9, fontFamily: 'var(--font-mono)', color: 'var(--txt-3)' }}>CARGANDO...</td></tr>
              : paged.map(p => { const est = ESTADO[p.estado] || {label:p.estado.toUpperCase(),cls:'badge-neutral'}; return (
                <tr key={p.id}>
                  <td className="m">#{String(p.id).slice(-6)}</td>
                  <td className="p">{p.cliente_nombre}</td>
                  <td style={{ maxWidth: 140 }}>{p.descripcion}</td>
                  <td style={{ maxWidth: 160 }}>{p.direccion_entrega}</td>
                  <td style={{ color: p.domiciliario_nombre ? 'var(--accent)' : 'var(--txt-3)' }}>{p.domiciliario_nombre || '—'}</td>
                  <td><span className={`badge ${est.cls}`}>{est.label}</span></td>
                  <td className="m">{p.created_at ? new Date(p.created_at).toLocaleDateString('es-CO') : '—'}</td>
                </tr>
              );})}
          </tbody>
        </table>
      </div>
      {pages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 1.25rem', borderTop: '1px solid var(--border)' }}>
          <span style={{ fontSize: 8, fontFamily: 'var(--font-mono)', color: 'var(--txt-3)' }}>PÁG {page}/{pages}</span>
          <div style={{ display: 'flex', gap: 4 }}>
            <button onClick={() => setPage(v => v-1)} disabled={page===1} style={{ padding: '4px 10px', fontSize: 8, fontFamily: 'var(--font-mono)', background: 'transparent', border: '1px solid var(--border)', color: 'var(--txt-2)', cursor: 'pointer', opacity: page===1?0.3:1 }}>← ANT</button>
            <button onClick={() => setPage(v => v+1)} disabled={page===pages} style={{ padding: '4px 10px', fontSize: 8, fontFamily: 'var(--font-mono)', background: 'transparent', border: '1px solid var(--border)', color: 'var(--txt-2)', cursor: 'pointer', opacity: page===pages?0.3:1 }}>SIG →</button>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}