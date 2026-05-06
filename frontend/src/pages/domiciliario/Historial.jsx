import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import DashboardLayout from '../../components/DashboardLayout';

const API = import.meta.env.VITE_PEDIDOS_URL;

export default function DomiciliarioHistorial() {
  const { token } = useAuth();
  const [pedidos, setPedidos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get(`${API}/pedidos/mis-entregas`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => setPedidos(r.data.filter(p => p.estado === 'entregado')))
      .catch(() => {}).finally(() => setLoading(false));
  }, []);

  const hoy = pedidos.filter(p => {
    if (!p.created_at) return false;
    return new Date(p.created_at).toDateString() === new Date().toDateString();
  }).length;

  return (
    <DashboardLayout role="domiciliario" pageTitle="Entregas">
      <div className="page-header">
        <h1 className="page-title">Mis entregas</h1>
        <p className="page-subtitle">{hoy} hoy · {pedidos.length} en total</p>
      </div>

      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', marginBottom: '1.5rem' }}>
        {[
          { label: 'Entregas hoy',  value: hoy },
          { label: 'Esta semana',   value: pedidos.filter(p => { const d = new Date(p.created_at); const now = new Date(); return (now - d) < 7*24*60*60*1000; }).length },
          { label: 'Total histórico', value: pedidos.length },
        ].map(s => (
          <div className="stat-card" key={s.label}>
            <div className="stat-label">{s.label}</div>
            <div className="stat-value">{loading ? '—' : s.value}</div>
            <div className="stat-accent-line" style={{ background: '#10b981' }} />
          </div>
        ))}
      </div>

      <div className="card">
        <div className="data-table-wrap">
          <table className="data-table">
            <thead><tr><th>#</th><th>Cliente</th><th>Dirección</th><th>Descripción</th><th>Fecha</th></tr></thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)', fontSize: '0.78rem' }}>Cargando...</td></tr>
              ) : pedidos.length === 0 ? (
                <tr><td colSpan={5} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)', fontSize: '0.78rem' }}>Sin entregas completadas</td></tr>
              ) : pedidos.map(p => (
                <tr key={p.id}>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>#{String(p.id).slice(-6)}</td>
                  <td style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{p.cliente_nombre}</td>
                  <td style={{ fontSize: '0.8rem' }}>{p.direccion_entrega}</td>
                  <td style={{ fontSize: '0.8rem' }}>{p.descripcion}</td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>
                    {p.created_at ? new Date(p.created_at).toLocaleDateString('es-CO') : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardLayout>
  );
}