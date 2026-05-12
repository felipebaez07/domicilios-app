import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import DashboardLayout from '../../components/DashboardLayout';
import Modal from '../../components/Modal';

const AUTH_URL = import.meta.env.VITE_AUTH_URL;

const ROL_INFO = {
  operador:     { emoji: '🗺️', label: 'Operador',     color: '#f59e0b' },
  domiciliario: { emoji: '🛵', label: 'Domiciliario', color: '#10b981' },
  distribuidor: { emoji: '📦', label: 'Distribuidor', color: '#667eea' },
};

export default function AdminEquipo() {
  const { token, user } = useAuth();
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [modal, setModal]       = useState(false);
  const [saving, setSaving]     = useState(false);
  const [success, setSuccess]   = useState('');
  const [filter, setFilter]     = useState('todos');
  const [form, setForm] = useState({ nombre: '', email: '', password: '', rol: 'domiciliario' });

  const h = { Authorization: `Bearer ${token}` };
  const empresaId = user?.empresa_id;

  function fetchUsuarios() {
    axios.get(`${AUTH_URL}/usuarios`, { headers: h })
      .then(r => setUsuarios(r.data.filter(u => u.rol !== 'admin' && u.rol !== 'superadmin')))
      .catch(() => {})
      .finally(() => setLoading(false));
  }

  useEffect(() => { fetchUsuarios(); }, []);

  async function agregarUsuario(e) {
    e.preventDefault(); setSaving(true);
    try {
      await axios.post(`${AUTH_URL}/empresas/${empresaId}/usuarios`, form, { headers: h });
      setSuccess(`✅ ${ROL_INFO[form.rol]?.label} "${form.nombre}" agregado`);
      setModal(false);
      setForm({ nombre: '', email: '', password: '', rol: 'domiciliario' });
      fetchUsuarios();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      alert(err.response?.data?.error || 'Error al crear usuario');
    } finally { setSaving(false); }
  }

  const filtrados = filter === 'todos' ? usuarios : usuarios.filter(u => u.rol === filter);

  return (
    <DashboardLayout role="admin" pageTitle="Mi equipo">
      {success && <div className="alert alert-ok" style={{ margin: '1rem 1.5rem 0' }}>{success}</div>}

      <div className="page-header">
        <div>
          <div className="page-title">👥 Mi equipo</div>
          <div className="page-subtitle">{usuarios.length} miembros en tu empresa</div>
        </div>
        <button className="btn btn-ghost" onClick={() => setModal(true)}>➕ Agregar miembro</button>
      </div>

      {/* Stats por rol */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, padding: '1.25rem 1.5rem', paddingBottom: 0 }}>
        {Object.entries(ROL_INFO).map(([rol, info]) => (
          <div key={rol} style={{ background: 'rgba(255,255,255,.2)', borderRadius: 16, padding: '1rem', border: '1px solid rgba(255,255,255,.3)', textAlign: 'center' }}>
            <div style={{ fontSize: '1.5rem', marginBottom: 4 }}>{info.emoji}</div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#fff' }}>{usuarios.filter(u => u.rol === rol).length}</div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,.7)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '.06em' }}>{info.label}s</div>
          </div>
        ))}
      </div>

      <div className="white-card" style={{ marginTop: '1.25rem' }}>
        <div className="white-card-header">
          <div className="white-card-title">👥 Miembros del equipo</div>
        </div>
        <div className="filters-row">
          {['todos', 'operador', 'domiciliario', 'distribuidor'].map(f => (
            <button key={f} className={`filter-btn ${filter === f ? 'active' : ''}`} onClick={() => setFilter(f)}>
              {f === 'todos' ? '🗂️ Todos' : `${ROL_INFO[f]?.emoji} ${ROL_INFO[f]?.label}s`}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {loading ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: '#aaa' }}>⏳ Cargando...</div>
          ) : filtrados.length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: '#aaa' }}>
              <div style={{ fontSize: '2rem', marginBottom: 8 }}>😶</div>
              No hay miembros en este rol
            </div>
          ) : filtrados.map(u => {
            const info = ROL_INFO[u.rol] || { emoji: '👤', label: u.rol, color: '#aaa' };
            return (
              <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 1.25rem', borderBottom: '1px solid #f0f0ff' }}>
                <div style={{ width: 42, height: 42, borderRadius: 12, background: `${info.color}20`, border: `2px solid ${info.color}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', flexShrink: 0 }}>
                  {info.emoji}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#1a1a2e' }}>{u.nombre}</div>
                  <div style={{ fontSize: 11, color: '#9090b0', marginTop: 1 }}>{u.email}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {u.telegram_chat_id && <span style={{ fontSize: 10, padding: '3px 8px', borderRadius: 99, background: '#e0f2fe', color: '#0284c7', fontWeight: 600 }}>📲 TG</span>}
                  <span style={{ padding: '4px 10px', borderRadius: 99, background: `${info.color}20`, color: info.color, fontSize: 10, fontWeight: 700, border: `1px solid ${info.color}40` }}>
                    {info.emoji} {info.label}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {modal && (
        <Modal onClose={() => setModal(false)} width={420}>
          <div style={{ padding: '1.5rem' }}>
            <div style={{ fontSize: '1rem', fontWeight: 700, color: '#1a1a2e', marginBottom: 4 }}>➕ Agregar miembro</div>
            <div style={{ fontSize: 11, color: '#9090b0', marginBottom: '1.25rem' }}>El usuario podrá iniciar sesión en RAVEN</div>
            <form onSubmit={agregarUsuario} style={{ display: 'flex', flexDirection: 'column', gap: '.75rem' }}>
              <div>
                <div className="field-label">👤 Nombre completo</div>
                <input placeholder="Juan García" value={form.nombre} onChange={e => setForm(v => ({...v, nombre: e.target.value}))} required />
              </div>
              <div>
                <div className="field-label">📧 Email</div>
                <input type="email" placeholder="juan@empresa.com" value={form.email} onChange={e => setForm(v => ({...v, email: e.target.value}))} required />
              </div>
              <div>
                <div className="field-label">🔑 Contraseña temporal</div>
                <input type="password" placeholder="••••••••" value={form.password} onChange={e => setForm(v => ({...v, password: e.target.value}))} required />
              </div>
              <div>
                <div className="field-label">🎭 Rol</div>
                <select value={form.rol} onChange={e => setForm(v => ({...v, rol: e.target.value}))}>
                  <option value="domiciliario">🛵 Domiciliario</option>
                  <option value="operador">🗺️ Operador</option>
                  <option value="distribuidor">📦 Distribuidor</option>
                </select>
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                <button type="button" onClick={() => setModal(false)} style={{ flex: 1, height: 44, borderRadius: 12, background: '#f0f2ff', border: 'none', fontFamily: 'Poppins,sans-serif', fontWeight: 600, fontSize: 13, color: '#4a4a6a', cursor: 'pointer' }}>
                  Cancelar
                </button>
                <button type="submit" disabled={saving} style={{ flex: 2, height: 44, borderRadius: 12, background: 'linear-gradient(135deg,#ef4444,#dc2626)', border: 'none', fontFamily: 'Poppins,sans-serif', fontWeight: 700, fontSize: 13, color: '#fff', cursor: 'pointer', opacity: saving ? 0.7 : 1 }}>
                  {saving ? '⏳ Agregando...' : '✅ Agregar al equipo'}
                </button>
              </div>
            </form>
          </div>
        </Modal>
      )}
    </DashboardLayout>
  );
}