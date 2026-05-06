import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import DashboardLayout from '../../components/DashboardLayout';

const API = import.meta.env.VITE_PEDIDOS_URL;

export default function NuevoPedido() {
  const { token } = useAuth();
  const navigate  = useNavigate();
  const [form, setForm] = useState({ cliente_nombre: '', telefono: '', direccion_entrega: '', descripcion: '' });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError]     = useState('');

  async function handleSubmit(e) {
    e.preventDefault(); setLoading(true); setError('');
    try {
      await axios.post(`${API}/pedidos`, form, { headers: { Authorization: `Bearer ${token}` } });
      setSuccess(true);
      setTimeout(() => navigate('/distribuidor/historial'), 1800);
    } catch (err) {
      setError(err.response?.data?.error || 'No se pudo crear el pedido');
    } finally { setLoading(false); }
  }

  return (
    <DashboardLayout role="distribuidor" pageTitle="Nuevo pedido">
      <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border)' }}>
        <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--txt-1)' }}>Crear pedido</div>
        <div style={{ fontSize: 7, fontFamily: 'var(--font-mono)', color: 'var(--txt-3)', marginTop: 2, letterSpacing: '0.08em' }}>COMPLETA LOS DATOS DE LA ENTREGA</div>
      </div>
      <div style={{ padding: '1.25rem', maxWidth: 520 }}>
        {success ? (
          <div style={{ padding: '2rem', textAlign: 'center', border: '1px solid var(--border)' }}>
            <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>✓</div>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--txt-1)', marginBottom: 4 }}>¡Pedido creado!</div>
            <div style={{ fontSize: 9, fontFamily: 'var(--font-mono)', color: 'var(--txt-3)', letterSpacing: '0.06em' }}>REDIRIGIENDO AL HISTORIAL...</div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {[
              { k: 'cliente_nombre',    l: 'Nombre del cliente',   p: 'Juan García' },
              { k: 'telefono',          l: 'Teléfono',             p: '300 000 0000' },
              { k: 'direccion_entrega', l: 'Dirección de entrega', p: 'Calle 10 #5-20' },
              { k: 'descripcion',       l: 'Descripción',          p: 'Caja de documentos' },
            ].map(f => (
              <div key={f.k}>
                <div className="field-label">{f.l}</div>
                <input type="text" placeholder={f.p} value={form[f.k]} onChange={e => setForm(v => ({...v,[f.k]:e.target.value}))} required />
              </div>
            ))}
            {error && <div className="alert alert-err">⚠ {error}</div>}
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
              <button type="button" onClick={() => navigate('/distribuidor')} style={{ flex: 1, height: 40, background: 'transparent', border: '1px solid var(--border)', color: 'var(--txt-2)', fontSize: 8, fontFamily: 'var(--font-mono)', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', cursor: 'pointer' }}>CANCELAR</button>
              <button type="submit" disabled={loading} style={{ flex: 1, height: 40, background: 'var(--accent)', border: 'none', color: 'var(--bg-top)', fontSize: 8, fontFamily: 'var(--font-mono)', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', cursor: 'pointer', opacity: loading ? 0.6 : 1 }}>
                {loading ? 'CREANDO...' : '+ CREAR PEDIDO'}
              </button>
            </div>
          </form>
        )}
      </div>
    </DashboardLayout>
  );
}