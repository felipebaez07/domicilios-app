import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import DashboardLayout from '../../components/DashboardLayout';
import Modal from '../../components/Modal';
import Icon from '../../components/Icon';

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
      setSuccess(`Empresa "${form.nombre}" creada`);
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
          <div className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Icon name="building" size={18} />Gestión de empresas</div>
          <div className="page-subtitle">{empresas.length} empresas registradas en RAVEN</div>
        </div>
        <button className="btn btn-primary" onClick={() => setModal(true)}><Icon name="plus" size={14} color="#fff" />Nueva empresa</button>
      </div>

      <div style={{ padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: '#8a6d6e' }}>Cargando...</div>
        ) : empresas.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: '#8a6d6e' }}>
            <Icon name="building" size={40} color="#c9b6b6" style={{ marginBottom: 12 }} />
            <div style={{ fontWeight: 600 }}>No hay empresas aún</div>
            <button onClick={() => setModal(true)} className="btn btn-primary" style={{ marginTop: 16, justifyContent: 'center' }}>
              <Icon name="plus" size={14} color="#fff" />Crear primera empresa
            </button>
          </div>
        ) : empresas.map(emp => (
          <div key={emp.id} style={{ background: '#fff', borderRadius: 20, padding: '1.25rem', border: '1px solid #e9dcdb', boxShadow: '0 2px 10px rgba(34,20,21,0.05)', display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ width: 50, height: 50, borderRadius: 14, background: '#f4ebea', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Icon name="building" size={24} color="#55393b" />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#221415' }}>{emp.nombre}</div>
              <div style={{ fontSize: 11, color: '#8a6d6e', marginTop: 2 }}>
                ID: {emp.id.slice(0, 8)}... · Creada {new Date(emp.created_at).toLocaleDateString('es-CO')}
              </div>
            </div>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 12px', borderRadius: 99, fontSize: 11, fontWeight: 700, background: emp.activa ? '#e7f9ee' : '#fff1f0', color: emp.activa ? '#1a9c53' : '#d0121b', border: `1px solid ${emp.activa ? '#a6e8bf' : '#ffb8b2'}` }}>
              <span className="badge-dot" />{emp.activa ? 'Activa' : 'Inactiva'}
            </span>
            <button onClick={() => toggleEmpresa(emp.id, emp.activa)} className="btn btn-ghost" style={{ padding: '6px 14px' }}>
              {emp.activa ? 'Pausar' : 'Activar'}
            </button>
          </div>
        ))}
      </div>

      {modal && (
        <Modal onClose={() => setModal(false)} width={460}>
          <div style={{ padding: '1.5rem' }}>
            <div className="modal-title">Nueva empresa</div>
            <div style={{ fontSize: 11, color: '#8a6d6e', marginBottom: '1.25rem' }}>Se creará la empresa y su administrador</div>
            <form onSubmit={crearEmpresa} style={{ display: 'flex', flexDirection: 'column', gap: '.75rem' }}>
              <div style={{ background: '#fff1f0', borderRadius: 12, padding: '12px', marginBottom: 4 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 700, color: '#d0121b', marginBottom: 8 }}><Icon name="building" size={13} />Datos de la empresa</div>
                <div className="field-label">Nombre de la empresa</div>
                <input placeholder="Ingresa el nombre de la empresa" value={form.nombre} onChange={e => setForm(v => ({...v, nombre: e.target.value}))} required />
              </div>
              <div style={{ background: '#e7f9ee', borderRadius: 12, padding: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 700, color: '#1a9c53', marginBottom: 8 }}><Icon name="user" size={13} />Administrador</div>
                {[
                  { k: 'admin_nombre',   l: 'Nombre del admin',    p: 'Ingresa el nombre del administrador' },
                  { k: 'admin_email',    l: 'Email del admin',     p: 'Ingresa el correo del administrador', t: 'email' },
                  { k: 'admin_password', l: 'Contraseña temporal', p: '••••••••',           t: 'password' },
                ].map(f => (
                  <div key={f.k} style={{ marginBottom: 8 }}>
                    <div className="field-label">{f.l}</div>
                    <input type={f.t || 'text'} placeholder={f.p} value={form[f.k]} onChange={e => setForm(v => ({...v, [f.k]: e.target.value}))} required />
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="button" onClick={() => setModal(false)} style={{ flex: 1, height: 44, borderRadius: 12, background: '#f4ebea', border: 'none', fontFamily: 'Poppins,sans-serif', fontWeight: 600, fontSize: 13, color: '#55393b', cursor: 'pointer' }}>
                  Cancelar
                </button>
                <button type="submit" disabled={saving} style={{ flex: 2, height: 44, borderRadius: 12, background: 'linear-gradient(135deg,#d0121b,#a80e17)', border: 'none', fontFamily: 'Poppins,sans-serif', fontWeight: 700, fontSize: 13, color: '#fff', cursor: 'pointer', opacity: saving ? 0.7 : 1 }}>
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