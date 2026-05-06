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

export default function DistribuidorHistorial() {
  const { token } = useAuth();
  const [pedidos, setPedidos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter]   = useState('todos');
  const [search, setSearch]   = useState('');

  useEffect(() => {
    axios.get(`${API}/pedidos/mis-pedidos`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => setPedidos(r.data))
      .catch(() => setPedidos([]))
      .finally(() => setLoading(false));
  }, []);

  const filtrados = pedidos.filter(p => {
    const matchEstado = filter === 'todos' || p.estado === filter;
    const matchSearch = !search || [p.cliente_nombre, p.descripcion, p.direccion_entrega].some(v => v?.toLowerCase().includes(search.toLowerCase()));
    return matchEstado && matchSearch;
  });

  return (
    <DashboardLayout role="distribuidor" pageTitle="Historial">
      <div className="page-header flex-between">
        <div>
          <h1 className="page-title">Historial de pedidos</h1>
          <p className="page-subtitle">{pedidos.length} pedidos registrados</p>
        </div>
      </div>

      <div className="card">
        <div className="card-header" style={{ flexWrap: 'wrap', gap: '0.75rem' }}>
          <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
            {['todos', 'pendiente', 'asignado', 'en_camino', 'entregado', 'cancelado'].map(f => (
              <button key={f} onClick={() => setFilter(f)} style={{
                padding: '3px 10px', borderRadius: 99, fontSize: '0.68rem', fontFamily: 'var(--font-mono)',
                background: filter === f ? 'rgba(59,130,246,0.15)' : 'var(--bg-elevated)',
                border: `1px solid ${filter === f ? 'rgba(59,130,246,0.3)' : 'var(--border-subtle)'}`,
                color: filter === f ? '#60a5fa' : 'var(--text-tertiary)', cursor: 'pointer',
              }}>
                {f === 'todos' ? 'Todos' : ESTADO[f]?.label || f}
              </button>
            ))}
          </div>
          <input
            type="search" placeholder="Buscar..." value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ width: 180, height: 30, fontSize: '0.78rem', padding: '0 0.75rem' }}
          />
        </div>

        <div className="data-table-wrap">
          <table className="data-table">
            <thead>
              <tr><th>#</th><th>Cliente</th><th>Dirección</th><th>Descripción</th><th>Estado</th><th>Fecha</th></tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)', fontSize: '0.78rem' }}>Cargando...</td></tr>
              ) : filtrados.length === 0 ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)', fontSize: '0.78rem' }}>Sin resultados</td></tr>
              ) : filtrados.map(p => {
                const est = ESTADO[p.estado] || { label: p.estado, cls: 'badge-neutral' };
                return (
                  <tr key={p.id}>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>#{String(p.id).slice(-6)}</td>
                    <td style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{p.cliente_nombre}</td>
                    <td style={{ fontSize: '0.8rem' }}>{p.direccion_entrega}</td>
                    <td style={{ fontSize: '0.8rem' }}>{p.descripcion}</td>
                    <td><span className={`badge ${est.cls}`}><span className="badge-dot" style={{ background: 'currentColor' }} />{est.label}</span></td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>
                      {p.created_at ? new Date(p.created_at).toLocaleDateString('es-CO') : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardLayout>
  );
}