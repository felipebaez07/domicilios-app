import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import DashboardLayout from '../../components/DashboardLayout';

const API = import.meta.env.VITE_PEDIDOS_URL;
const ESTADO = {
  pendiente: { label: 'Pendiente', cls: 'badge-warn' },
  asignado:  { label: 'Asignado',  cls: 'badge-info' },
  en_camino: { label: 'En camino', cls: 'badge-info' },
  entregado: { label: 'Entregado', cls: 'badge-ok'   },
  cancelado: { label: 'Cancelado', cls: 'badge-err'  },
};

export default function ClienteHistorial() {
  const { token } = useAuth();
  const [pedidos, setPedidos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get(`${API}/pedidos/mis-pedidos`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => setPedidos(r.data)).catch(() => {}).finally(() => setLoading(false));
  }, []);

  return (
    <DashboardLayout role="cliente" pageTitle="Historial">
      <div className="page-header">
        <h1 className="page-title">Mis pedidos</h1>
        <p className="page-subtitle">{pedidos.length} pedidos en total</p>
      </div>
      <div className="card">
        <div className="data-table-wrap">
          <table className="data-table">
            <thead><tr><th>#</th><th>Descripción</th><th>Dirección</th><th>Domiciliario</th><th>Estado</th><th>Fecha</th></tr></thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)', fontSize: '0.78rem' }}>Cargando...</td></tr>
              ) : pedidos.length === 0 ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)', fontSize: '0.78rem' }}>Sin pedidos</td></tr>
              ) : pedidos.map(p => {
                const est = ESTADO[p.estado] || { label: p.estado, cls: 'badge-neutral' };
                return (
                  <tr key={p.id}>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>#{String(p.id).slice(-6)}</td>
                    <td style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{p.descripcion}</td>
                    <td style={{ fontSize: '0.8rem' }}>{p.direccion_entrega}</td>
                    <td style={{ fontSize: '0.8rem', color: p.domiciliario_nombre ? '#34d399' : 'var(--text-tertiary)' }}>{p.domiciliario_nombre || '—'}</td>
                    <td><span className={`badge ${est.cls}`}><span className="badge-dot" style={{ background: 'currentColor' }} />{est.label}</span></td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>{p.created_at ? new Date(p.created_at).toLocaleDateString('es-CO') : '—'}</td>
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