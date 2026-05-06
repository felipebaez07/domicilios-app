import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import DashboardLayout from '../../components/DashboardLayout';

const API = import.meta.env.VITE_PEDIDOS_URL;

export default function NuevoPedido() {
  const { token } = useAuth();
  const navigate  = useNavigate();
  const [form, setForm] = useState({
    cliente_nombre: '', telefono: '', direccion_entrega: '', descripcion: '',
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError]     = useState('');

  const headers = { Authorization: `Bearer ${token}` };

  function handleChange(e) {
    setForm(v => ({ ...v, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      await axios.post(`${API}/pedidos`, form, { headers });
      setSuccess(true);
      setTimeout(() => navigate('/distribuidor/historial'), 1800);
    } catch {
      setError('No se pudo crear el pedido. Intenta de nuevo.');
    } finally { setLoading(false); }
  }

  const fields = [
    { name: 'cliente_nombre',    label: 'Nombre del cliente',    placeholder: 'Juan García',              type: 'text' },
    { name: 'telefono',          label: 'Teléfono de contacto',  placeholder: '300 123 4567',              type: 'tel'  },
    { name: 'direccion_entrega', label: 'Dirección de entrega',  placeholder: 'Calle 10 #5-20, Ibagué',   type: 'text' },
    { name: 'descripcion',       label: 'Descripción del pedido', placeholder: 'Caja de documentos urgente', type: 'text' },
  ];

  return (
    <DashboardLayout role="distribuidor" pageTitle="Nuevo pedido">
      <div className="page-header">
        <h1 className="page-title">Crear pedido</h1>
        <p className="page-subtitle">Completa los datos para registrar una nueva entrega</p>
      </div>

      <div style={{ maxWidth: 560 }}>
        {success ? (
          <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>✅</div>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 600, marginBottom: '0.5rem' }}>¡Pedido creado!</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Redirigiendo al historial...</p>
          </div>
        ) : (
          <div className="card">
            <div className="card-header">
              <span className="card-title">DATOS DEL PEDIDO</span>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '0.5rem' }}>
              {fields.map(f => (
                <div key={f.name} style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  <label style={{ fontSize: '0.68rem', fontFamily: 'var(--font-mono)', color: 'var(--text-tertiary)', letterSpacing: '0.07em', textTransform: 'uppercase' }}>
                    {f.label}
                  </label>
                  <input
                    type={f.type}
                    name={f.name}
                    placeholder={f.placeholder}
                    value={form[f.name]}
                    onChange={handleChange}
                    required
                  />
                </div>
              ))}

              {error && (
                <div style={{ padding: '0.65rem 0.9rem', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 'var(--radius-sm)', color: '#f87171', fontSize: '0.8rem', fontFamily: 'var(--font-mono)' }}>
                  ⚠ {error}
                </div>
              )}

              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.25rem' }}>
                <button type="button" className="btn btn-ghost" style={{ flex: 1 }} onClick={() => navigate('/distribuidor')}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1, justifyContent: 'center' }} disabled={loading}>
                  {loading ? 'Creando...' : '+ Crear pedido'}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}