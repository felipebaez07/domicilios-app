import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import DashboardLayout from '../../components/DashboardLayout';

const API = import.meta.env.VITE_PEDIDOS_URL;
const ESTADO = { pendiente:{label:'PENDIENTE',cls:'badge-warn'}, asignado:{label:'ASIGNADO',cls:'badge-info'}, en_camino:{label:'EN CAMINO',cls:'badge-info'}, entregado:{label:'ENTREGADO',cls:'badge-ok'}, cancelado:{label:'CANCELADO',cls:'badge-err'} };

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
      <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border)' }}>
        <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--txt-1)' }}>Mis pedidos</div>
        <div style={{ fontSize: 7, fontFamily: 'var(--font-mono)', color: 'var(--txt-3)', marginTop: 2, letterSpacing: '0.08em' }}>{pedidos.length} PEDIDOS EN TOTAL</div>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table className="rv-table">
          <thead><tr><th>#</th><th>Descripción</th><th>Dirección</th><th>Domiciliario</th><th>Estado</th><th>Fecha</th></tr></thead>
          <tbody>
            {loading ? <tr><td colSpan={6} style={{ padding: '2rem', textAlign: 'center', fontSize: 9, fontFamily: 'var(--font-mono)', color: 'var(--txt-3)' }}>CARGANDO...</td></tr>
              : pedidos.length === 0 ? <tr><td colSpan={6} style={{ padding: '2rem', textAlign: 'center', fontSize: 9, fontFamily: 'var(--font-mono)', color: 'var(--txt-3)' }}>SIN PEDIDOS</td></tr>
              : pedidos.map(p => { const est = ESTADO[p.estado] || {label:p.estado.toUpperCase(),cls:'badge-neutral'}; return (
                <tr key={p.id}>
                  <td className="m">#{String(p.id).slice(-6)}</td>
                  <td className="p">{p.descripcion}</td>
                  <td>{p.direccion_entrega}</td>
                  <td style={{ color: p.domiciliario_nombre ? 'var(--accent)' : 'var(--txt-3)' }}>{p.domiciliario_nombre || '—'}</td>
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