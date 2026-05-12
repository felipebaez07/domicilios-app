import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import DashboardLayout from '../../components/DashboardLayout';
import Modal from '../../components/Modal';

const AUTH_URL = import.meta.env.VITE_AUTH_URL;

export default function SuperadminDashboard() {
  const { token } = useAuth();
  const [empresas, setEmpresas]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [modal, setModal]         = useState(false);
  const [saving, setSaving]       = useState(false);
  const [success, setSuccess]     = useState('');
  const [form, setForm] = useState({
    nombre: '', admin_nombre: '', admin_email: '', admin_password: ''
  });

  const h = { Authorization: `Bearer ${token}` };

  function fetchEmpresas() {
    axios.get(`${AUTH_URL}/empresas`, { headers: h })
      .then(r => setEmpresas(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }

  useEffect(() => { fetchEmpresas(); }, []);

  async function crearEmpresa(e) {
    e.preventDefault(); setSaving(true);
    try {
      await axios.post(`${AUTH_URL}/empresas`, form, { headers: h });
      setSuccess(`✅ Empresa "${form.nombre}" creada`);
      setModal(false);
      setForm({ nombre: '', admin_nombre: '', admin_email: '', admin_password: '' });
      fetchEmpresas();
      setTimeout(() => setSuccess(''), 4000);
    } catch (err) {
      alert(err.response?.data?.error || 'Error al crear empresa');
    } finally { setSaving(false); }
  }

  async function toggleEmpresa(id, activa) {
    try {
      await axios.patch(`${AUTH_URL}/empresas/${id}`, { activa: !activa }, { headers: h });
      fetchEmpresas();
    } catch {}
  }

  return (
    <DashboardLayout role="superadmin" pageTitle="Empresas">
      {success && <div className="alert alert-ok" style={{ margin: '1rem 1.5rem 0' }}>{success}</div>}

      <div className="page-header">
        <div>
          <div className="page-title">🏢 Gestión de empresas</div>
          <div className="page-subtitle">{empresas.length} empresas registradas en RAVEN</div>
        </div>
        <button className="btn btn-ghost" onClick={() => setModal(true)}>➕ Nueva empresa</button>
      </div>

      <div style={{ padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'rgba(255,255,255,.6)' }}>⏳ Cargando...</div>
        ) : empresas.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'rgba(255,255,255,.6)' }}>
            <div style={{ fontSize: '3rem', marginBottom: 12 }}>🏢</div>
            <div style={{ fontWeight: 600 }}>No hay empresas aún</div>
            <button onClick={() => setModal(true)} style={{ marginTop: 16, padding: '10px 24px', borderRadius: 99, background: 'rgba(255,255,255,.25)', border: '1px solid rgba(255,255,255,.3)', color: '#fff', fontFamily: 'Poppins,sans-serif', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
              ➕ Crear primera empresa
            </button>
          </div>
        ) : empresas.map(emp => (
          <div key={emp.id} style={{ background: 'rgba(255,255,255,.15)', borderRadius: 20, padding: '1.25rem', border: '1px solid rgba(255,255,255,.25)', display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ width: 50, height: 50, borderRadius: 14, background: 'rgba(255,255,255,.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', flexShrink: 0 }}>
              🏢
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>{emp.nombre}</div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,.6)', marginTop: 2 }}>
                ID: {emp.id.slice(0, 8)}... · Creada {new Date(emp.created_at).toLocaleDateString('es-CO')}
              </div>
            </div>
            <span style={{ padding: '4px 12px', borderRadius: 99, fontSize: 11, fontWeight: 700, background: emp.activa ? 'rgba(16,185,129,.3)' : 'rgba(239,68,68,.3)', color: emp.activa ? '#6ee7b7' : '#fca5a5', border: `1px solid ${emp.activa ? '#6ee7b7' : '#fca5a5'}` }}>
              {emp.activa ? '● Activa' : '○ Inactiva'}
            </span>
            <button onClick={() => toggleEmpresa(emp.id, emp.activa)} style={{ padding: '6px 14px', borderRadius: 99, background: 'rgba(255,255,255,.15)', border: '1px solid rgba(255,255,255,.3)', color: '#fff', fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'Poppins,sans-serif' }}>
              {emp.activa ? '⏸ Pausar' : '▶ Activar'}
            </button>
          </div>
        ))}
      </div>

      {modal && (
        <Modal onClose={() => setModal(false)} width={460}>
          <div style={{ padding: '1.5rem' }}>
            <div style={{ fontSize: '1rem', fontWeight: 700, color: '#1a1a2e', marginBottom: 4 }}>🏢 Nueva empresa</div>
            <div style={{ fontSize: 11, color: '#9090b0', marginBottom: '1.25rem' }}>Se creará la empresa y su administrador</div>
            <form onSubmit={crearEmpresa} style={{ display: 'flex', flexDirection: 'column', gap: '.75rem' }}>
              <div style={{ background: '#f0f7ff', borderRadius: 12, padding: '12px', marginBottom: 4 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#2563eb', marginBottom: 8 }}>🏢 Datos de la empresa</div>
                <div className="field-label">Nombre de la empresa</div>
                <input placeholder="Ej: Domicilios Express" value={form.nombre} onChange={e => setForm(v => ({...v, nombre: e.target.value}))} required />
              </div>
              <div style={{ background: '#f0faf5', borderRadius: 12, padding: '12px' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#10b981', marginBottom: 8 }}>👤 Administrador</div>
                {[
                  { k: 'admin_nombre',   l: 'Nombre del admin',    p: 'Juan García' },
                  { k: 'admin_email',    l: 'Email del admin',     p: 'admin@empresa.com', t: 'email' },
                  { k: 'admin_password', l: 'Contraseña temporal', p: '••••••••',           t: 'password' },
                ].map(f => (
                  <div key={f.k} style={{ marginBottom: 8 }}>
                    <div className="field-label">{f.l}</div>
                    <input type={f.t || 'text'} placeholder={f.p} value={form[f.k]} onChange={e => setForm(v => ({...v, [f.k]: e.target.value}))} required />
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="button" onClick={() => setModal(false)} style={{ flex: 1, height: 44, borderRadius: 12, background: '#f0f2ff', border: 'none', fontFamily: 'Poppins,sans-serif', fontWeight: 600, fontSize: 13, color: '#4a4a6a', cursor: 'pointer' }}>
                  Cancelar
                </button>
                <button type="submit" disabled={saving} style={{ flex: 2, height: 44, borderRadius: 12, background: 'linear-gradient(135deg,#667eea,#764ba2)', border: 'none', fontFamily: 'Poppins,sans-serif', fontWeight: 700, fontSize: 13, color: '#fff', cursor: 'pointer', opacity: saving ? 0.7 : 1 }}>
                  {saving ? '⏳ Creando...' : '🚀 Crear empresa'}
                </button>
              </div>
            </form>
          </div>
        </Modal>
      )}
    </DashboardLayout>
  );
}