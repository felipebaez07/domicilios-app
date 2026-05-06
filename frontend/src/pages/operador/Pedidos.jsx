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

export default function OperadorPedidos() {
  const { token } = useAuth();
  const [pedidos, setPedidos]   = useState([]);
  const [domis, setDomis]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [filter, setFilter]     = useState('todos');
  const [asignando, setAsignando] = useState(null);
  const [selected, setSelected] = useState(null);

  const headers = { Authorization: `Bearer ${token}` };

  async function fetchData() {
    try {
      const [{ data: p }, { data: d }] = await Promise.all([
        axios.get(`${API}/pedidos`, { headers }),
        axios.get(`${API}/usuarios/domiciliarios`, { headers }).catch(() => ({ data: [] })),
      ]);
      setPedidos(p); setDomis(d);
    } catch {} finally { setLoading(false); }
  }

  useEffect(() => { fetchData(); }, []);

  async function asignar(pedidoId, domiciliarioId) {
    setAsignando(pedidoId);
    try {
      await axios.patch(`${API}/pedidos/${pedidoId}/asignar`, { domiciliario_id: domiciliarioId }, { headers });
      setSelected(null); fetchData();
    } catch {} finally { setAsignando(null); }
  }

  const filtrados = filter === 'todos' ? pedidos : pedidos.filter(p => p.estado === filter);

  return (
    <DashboardLayout role="operador" pageTitle="Pedidos">
      <div className="page-header flex-between">
        <div>
          <h1 className="page-title">Gestión de pedidos</h1>
          <p className="page-subtitle">{pedidos.length} pedidos · {pedidos.filter(p => p.estado === 'pendiente').length} pendientes de asignar</p>
        </div>
        <button className="btn btn-ghost" onClick={fetchData}>↺ Actualizar</button>
      </div>

      <div className="card">
        <div className="card-header" style={{ flexWrap: 'wrap', gap: '0.5rem' }}>
          <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
            {['todos', 'pendiente', 'asignado', 'en_camino', 'entregado'].map(f => (
              <button key={f} onClick={() => setFilter(f)} style={{
                padding: '3px 10px', borderRadius: 99, fontSize: '0.68rem', fontFamily: 'var(--font-mono)',
                background: filter === f ? 'rgba(245,158,11,0.15)' : 'var(--bg-elevated)',
                border: `1px solid ${filter === f ? 'rgba(245,158,11,0.3)' : 'var(--border-subtle)'}`,
                color: filter === f ? '#fbbf24' : 'var(--text-tertiary)', cursor: 'pointer',
              }}>
                {f === 'todos' ? 'Todos' : ESTADO[f]?.label || f}
              </button>
            ))}
          </div>
        </div>

        <div className="data-table-wrap">
          <table className="data-table">
            <thead><tr><th>#</th><th>Cliente</th><th>Descripción</th><th>Dirección</th><th>Estado</th><th>Domiciliario</th><th>Acción</th></tr></thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)', fontSize: '0.78rem' }}>Cargando...</td></tr>
              ) : filtrados.map(p => {
                const est = ESTADO[p.estado] || { label: p.estado, cls: 'badge-neutral' };
                return (
                  <tr key={p.id}>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>#{String(p.id).slice(-6)}</td>
                    <td style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{p.cliente_nombre}</td>
                    <td style={{ fontSize: '0.8rem' }}>{p.descripcion}</td>
                    <td style={{ fontSize: '0.78rem', maxWidth: 160 }}>{p.direccion_entrega}</td>
                    <td><span className={`badge ${est.cls}`}><span className="badge-dot" style={{ background: 'currentColor' }} />{est.label}</span></td>
                    <td style={{ fontSize: '0.78rem', color: p.domiciliario_nombre ? '#34d399' : 'var(--text-tertiary)' }}>{p.domiciliario_nombre || '—'}</td>
                    <td>
                      {p.estado === 'pendiente' && (
                        <button className="btn btn-ghost" style={{ fontSize: '0.72rem', padding: '3px 8px' }} onClick={() => setSelected(p)}>
                          Asignar →
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

      {/* Modal asignación */}
      {selected && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
          onClick={e => e.target === e.currentTarget && setSelected(null)}>
          <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-mid)', borderRadius: 'var(--radius-lg)', padding: '1.75rem', width: '100%', maxWidth: 420 }}>
            <div className="flex-between mb-md">
              <h2 style={{ fontSize: '1rem', fontWeight: 600 }}>Asignar domiciliario</h2>
              <button className="icon-btn" onClick={() => setSelected(null)}>✕</button>
            </div>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
              Pedido #{String(selected.id).slice(-6)} · {selected.descripcion}
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {domis.length === 0 ? (
                <p style={{ color: 'var(--text-tertiary)', fontSize: '0.82rem', fontFamily: 'var(--font-mono)', textAlign: 'center', padding: '1rem' }}>Sin domiciliarios disponibles</p>
              ) : domis.map(d => (
                <button key={d.id} onClick={() => asignar(selected.id, d.id)} disabled={!!asignando} style={{
                  display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 0.9rem',
                  background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)',
                  cursor: 'pointer', textAlign: 'left', width: '100%', transition: 'all 0.15s',
                }}>
                  <span style={{ fontSize: '1.2rem' }}>🛵</span>
                  <span style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-primary)' }}>{d.nombre}</span>
                  <span style={{ marginLeft: 'auto', fontSize: '0.78rem', color: 'var(--text-tertiary)' }}>→</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}