import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import DashboardLayout from '../../components/DashboardLayout';
import Modal from '../../components/Modal';
import Icon from '../../components/Icon';

const AUTH_URL = import.meta.env.VITE_AUTH_URL;

const ROL_INFO = {
  operador:     { icon: 'map',     label: 'Operador',     color: '#d9820b' },
  domiciliario: { icon: 'scooter', label: 'Domiciliario', color: '#1a9c53' },
  distribuidor: { icon: 'package', label: 'Distribuidor', color: '#0c7ec4' },
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
      setSuccess(`${ROL_INFO[form.rol]?.label} "${form.nombre}" agregado`);
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
          <div className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Icon name="users" size={18} />Mi equipo</div>
          <div className="page-subtitle">{usuarios.length} miembros en tu empresa</div>
        </div>
        <button className="btn btn-primary" onClick={() => setModal(true)}><Icon name="plus" size={14} color="#fff" />Agregar miembro</button>
      </div>

      {/* Stats por rol */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, padding: '1.25rem 1.5rem', paddingBottom: 0 }}>
        {Object.entries(ROL_INFO).map(([rol, info]) => (
          <div key={rol} style={{ background: '#fff', borderRadius: 16, padding: '1rem', border: '1px solid #e9dcdb', boxShadow: '0 2px 10px rgba(34,20,21,0.05)', textAlign: 'center' }}>
            <Icon name={info.icon} size={22} color={info.color} style={{ marginBottom: 6 }} />
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#221415' }}>{usuarios.filter(u => u.rol === rol).length}</div>
            <div style={{ fontSize: 10, color: '#8a6d6e', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '.06em' }}>{info.label}s</div>
          </div>
        ))}
      </div>

      <div className="white-card" style={{ marginTop: '1.25rem' }}>
        <div className="white-card-header">
          <div className="white-card-title"><Icon name="users" size={15} />Miembros del equipo</div>
        </div>
        <div className="filters-row">
          {['todos', 'operador', 'domiciliario', 'distribuidor'].map(f => (
            <button key={f} className={`filter-btn ${filter === f ? 'active' : ''}`} onClick={() => setFilter(f)} style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
              {f === 'todos' ? <><Icon name="list" size={12} />Todos</> : <><Icon name={ROL_INFO[f]?.icon} size={12} />{ROL_INFO[f]?.label}s</>}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {loading ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: '#8a6d6e' }}>Cargando...</div>
          ) : filtrados.length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: '#8a6d6e' }}>
              <Icon name="users" size={30} color="#c9b6b6" style={{ marginBottom: 8 }} />
              <div>No hay miembros en este rol</div>
            </div>
          ) : filtrados.map(u => {
            const info = ROL_INFO[u.rol] || { icon: 'user', label: u.rol, color: '#8a6d6e' };
            return (
              <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 1.25rem', borderBottom: '1px solid #e9dcdb' }}>
                <div style={{ width: 42, height: 42, borderRadius: 12, background: `${info.color}20`, border: `2px solid ${info.color}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Icon name={info.icon} size={19} color={info.color} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#221415' }}>{u.nombre}</div>
                  <div style={{ fontSize: 11, color: '#8a6d6e', marginTop: 1 }}>{u.email}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {u.telegram_chat_id && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10, padding: '3px 8px', borderRadius: 99, background: '#e5f4fc', color: '#0c7ec4', fontWeight: 600 }}><Icon name="send" size={10} />TG</span>}
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 99, background: `${info.color}20`, color: info.color, fontSize: 10, fontWeight: 700, border: `1px solid ${info.color}40` }}>
                    <Icon name={info.icon} size={11} />{info.label}
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
            <div className="modal-title">Agregar miembro</div>
            <div style={{ fontSize: 11, color: '#8a6d6e', marginBottom: '1.25rem' }}>El usuario podrá iniciar sesión en RAVEN</div>
            <form onSubmit={agregarUsuario} style={{ display: 'flex', flexDirection: 'column', gap: '.75rem' }}>
              <div>
                <div className="field-label">Nombre completo</div>
                <input placeholder="Ingresa el nombre completo" value={form.nombre} onChange={e => setForm(v => ({...v, nombre: e.target.value}))} required />
              </div>
              <div>
                <div className="field-label">Email</div>
                <input type="email" placeholder="Ingresa el correo electrónico" value={form.email} onChange={e => setForm(v => ({...v, email: e.target.value}))} required />
              </div>
              <div>
                <div className="field-label">Contraseña temporal</div>
                <input type="password" placeholder="••••••••" value={form.password} onChange={e => setForm(v => ({...v, password: e.target.value}))} required />
              </div>
              <div>
                <div className="field-label">Rol</div>
                <select value={form.rol} onChange={e => setForm(v => ({...v, rol: e.target.value}))}>
                  <option value="domiciliario">Domiciliario</option>
                  <option value="operador">Operador</option>
                  <option value="distribuidor">Distribuidor</option>
                </select>
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                <button type="button" onClick={() => setModal(false)} className="btn btn-ghost" style={{ flex: 1, height: 44, justifyContent: 'center' }}>
                  Cancelar
                </button>
                <button type="submit" disabled={saving} className="btn btn-primary" style={{ flex: 2, height: 44, justifyContent: 'center', opacity: saving ? 0.7 : 1 }}>
                  {saving ? <span className="rv-spinner" /> : <><Icon name="checkCircle" size={14} color="#fff" />Agregar al equipo</>}
                </button>
              </div>
            </form>
          </div>
        </Modal>
      )}
    </DashboardLayout>
  );
}