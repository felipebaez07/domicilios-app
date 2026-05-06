import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import DashboardLayout from '../../components/DashboardLayout';

const API = import.meta.env.VITE_PEDIDOS_URL;
const ESTADO = {
  pendiente:  { label: 'Pendiente',  cls: 'badge-warn' },
  asignado:   { label: 'Asignado',   cls: 'badge-info' },
  en_camino:  { label: 'En camino',  cls: 'badge-info' },
  entregado:  { label: 'Entregado',  cls: 'badge-ok'   },
  cancelado:  { label: 'Cancelado',  cls: 'badge-err'  },
};
const PER_PAGE = 20;

export default function AdminPedidos() {
  const { token } = useAuth();
  const [pedidos, setPedidos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState('');
  const [filter, setFilter]   = useState('todos');
  const [page, setPage]       = useState(1);

  useEffect(() => {
    axios.get(`${API}/pedidos/todos`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => setPedidos(r.data)).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const filtrados = pedidos.filter(p => {
    const matchEstado = filter === 'todos' || p.estado === filter;
    const matchSearch = !search || [p.cliente_nombre, p.descripcion, p.direccion_entrega, p.domiciliario_nombre, String(p.id)].some(v => v?.toLowerCase().includes(search.toLowerCase()));
    return matchEstado && matchSearch;
  });

  const pages     = Math.ceil(filtrados.length / PER_PAGE) || 1;
  const paginated = filtrados.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  return (
    <DashboardLayout role="admin" pageTitle="Todos los pedidos">
      <div className="page-header flex-between">
        <div>
          <h1 className="page-title">Todos los pedidos</h1>
          <p className="page-subtitle">{filtrados.length} resultados</p>
        </div>
        <button className="btn btn-ghost" onClick={() => { setLoading(true); axios.get(`${API}/pedidos/todos`, { headers: { Authorization: `Bearer ${token}` } }).then(r => setPedidos(r.data)).finally(() => setLoading(false)); }}>
          ↺ Actualizar
        </button>
      </div>

      <div className="card">
        <div className="card-header" style={{ flexWrap: 'wrap', gap: '0.75rem' }}>
          <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
            {['todos', 'pendiente', 'asignado', 'en_camino', 'entregado', 'cancelado'].map(f => (
              <button key={f} onClick={() => { setFilter(f); setPage(1); }} style={{
                padding: '3px 10px', borderRadius: 99, fontSize: '0.68rem', fontFamily: 'var(--font-mono)',
                background: filter === f ? 'rgba(239,68,68,0.15)' : 'var(--bg-elevated)',
                border: `1px solid ${filter === f ? 'rgba(239,68,68,0.3)' : 'var(--border-subtle)'}`,
                color: filter === f ? '#f87171' : 'var(--text-tertiary)', cursor: 'pointer',
              }}>
                {f === 'todos' ? 'Todos' : ESTADO[f]?.label || f}
              </button>
            ))}
          </div>
          <input
            type="search" placeholder="Buscar por cliente, descripción, domiciliario..."
            value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
            style={{ width: 280, height: 30, fontSize: '0.78rem', padding: '0 0.75rem' }}
          />
        </div>

        <div className="data-table-wrap">
          <table className="data-table">
            <thead><tr><th>#</th><th>Cliente</th><th>Descripción</th><th>Dirección</th><th>Domiciliario</th><th>Estado</th><th>Fecha</th></tr></thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)', fontSize: '0.78rem' }}>Cargando...</td></tr>
              ) : paginated.length === 0 ? (
                <tr><td colSpan={7} style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)', fontSize: '0.78rem' }}>Sin resultados</td></tr>
              ) : paginated.map(p => {
                const est = ESTADO[p.estado] || { label: p.estado, cls: 'badge-neutral' };
                return (
                  <tr key={p.id}>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.68rem', color: 'var(--text-tertiary)' }}>#{String(p.id).slice(-6)}</td>
                    <td style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{p.cliente_nombre}</td>
                    <td style={{ fontSize: '0.8rem', maxWidth: 160 }}>{p.descripcion}</td>
                    <td style={{ fontSize: '0.75rem', maxWidth: 180 }}>{p.direccion_entrega}</td>
                    <td style={{ fontSize: '0.8rem', color: p.domiciliario_nombre ? '#34d399' : 'var(--text-tertiary)' }}>{p.domiciliario_nombre || '—'}</td>
                    <td><span className={`badge ${est.cls}`}><span className="badge-dot" style={{ background: 'currentColor' }} />{est.label}</span></td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.68rem', color: 'var(--text-tertiary)', whiteSpace: 'nowrap' }}>{p.created_at ? new Date(p.created_at).toLocaleDateString('es-CO') : '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {pages > 1 && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 0.5rem 0', borderTop: '1px solid var(--border-subtle)', marginTop: '0.75rem' }}>
            <span style={{ fontSize: '0.72rem', fontFamily: 'var(--font-mono)', color: 'var(--text-tertiary)' }}>Página {page} de {pages}</span>
            <div style={{ display: 'flex', gap: '0.35rem' }}>
              <button className="btn btn-ghost" style={{ padding: '3px 10px', fontSize: '0.75rem' }} disabled={page === 1} onClick={() => setPage(v => v - 1)}>← Ant</button>
              <button className="btn btn-ghost" style={{ padding: '3px 10px', fontSize: '0.75rem' }} disabled={page === pages} onClick={() => setPage(v => v + 1)}>Sig →</button>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}