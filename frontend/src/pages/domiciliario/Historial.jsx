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
      .then(r => setPedidos(r.data.filter(p => p.estado === 'entregado'))).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const hoy = pedidos.filter(p => p.created_at && new Date(p.created_at).toDateString() === new Date().toDateString()).length;

  return (
    <DashboardLayout role="domiciliario" pageTitle="Entregas">
      <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--txt-1)' }}>Mis entregas</div>
          <div style={{ fontSize: 7, fontFamily: 'var(--font-mono)', color: 'var(--txt-3)', marginTop: 2, letterSpacing: '0.08em' }}>{hoy} HOY · {pedidos.length} TOTAL</div>
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          {[{ l: 'Hoy', v: hoy }, { l: 'Total', v: pedidos.length }].map(s => (
            <div key={s.l} style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 7, fontFamily: 'var(--font-mono)', color: 'var(--txt-3)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>{s.l}</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--txt-1)', letterSpacing: '-0.04em', lineHeight: 1 }}>{loading ? '—' : s.v}</div>
            </div>
          ))}
        </div>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table className="rv-table">
          <thead><tr><th>#</th><th>Cliente</th><th>Dirección</th><th>Descripción</th><th>Fecha</th></tr></thead>
          <tbody>
            {loading ? <tr><td colSpan={5} style={{ padding: '2rem', textAlign: 'center', fontSize: 9, fontFamily: 'var(--font-mono)', color: 'var(--txt-3)' }}>CARGANDO...</td></tr>
              : pedidos.length === 0 ? <tr><td colSpan={5} style={{ padding: '2rem', textAlign: 'center', fontSize: 9, fontFamily: 'var(--font-mono)', color: 'var(--txt-3)' }}>SIN ENTREGAS</td></tr>
              : pedidos.map(p => (
                <tr key={p.id}>
                  <td className="m">#{String(p.id).slice(-6)}</td>
                  <td className="p">{p.cliente_nombre}</td>
                  <td>{p.direccion_entrega}</td>
                  <td>{p.descripcion}</td>
                  <td className="m">{p.created_at ? new Date(p.created_at).toLocaleDateString('es-CO') : '—'}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </DashboardLayout>
  );
}