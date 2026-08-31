import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import DashboardLayout from '../../components/DashboardLayout';
import StatCard from '../../components/StatCard';
import Icon from '../../components/Icon';

const API = import.meta.env.VITE_AUTH_URL;

const ROL_INFO = {
  distribuidor: { icon: 'package',  label: 'Distribuidor', color: '#0c7ec4' },
  cliente:      { icon: 'bag',      label: 'Cliente',      color: '#8b5cf6' },
  domiciliario: { icon: 'scooter',  label: 'Domiciliario', color: '#1a9c53' },
  operador:     { icon: 'map',      label: 'Operador',     color: '#d9820b' },
  admin:        { icon: 'crown',    label: 'Admin',        color: '#d0121b' },
};
const ROLES = Object.keys(ROL_INFO);

export default function AdminUsuarios() {
  const { token } = useAuth();
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState('');
  const [filterRol, setFilterRol] = useState('todos');

  useEffect(() => {
    axios.get(`${API}/usuarios`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => setUsuarios(r.data)).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const filtrados = usuarios.filter(u => {
    const ok = filterRol === 'todos' || u.rol === filterRol;
    const s  = !search || [u.nombre, u.email, u.rol].some(v => v?.toLowerCase().includes(search.toLowerCase()));
    return ok && s;
  });

  const conteo = Object.fromEntries(ROLES.map(r => [r, usuarios.filter(u => u.rol === r).length]));

  return (
    <DashboardLayout role="admin" pageTitle="Usuarios">
      <div className="page-header">
        <div>
          <div className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Icon name="users" size={18} />Usuarios del sistema</div>
          <div className="page-subtitle">{usuarios.length} personas registradas en tu empresa</div>
        </div>
      </div>

      <div className="stats-grid-5" style={{ paddingBottom: 0 }}>
        {ROLES.map((r, i) => (
          <StatCard
            key={r}
            icon={<Icon name={ROL_INFO[r].icon} size={20} color={ROL_INFO[r].color} />}
            value={loading ? '—' : String(conteo[r] || 0)}
            label={`${ROL_INFO[r].label}s`}
            delay={i * 80}
          />
        ))}
      </div>

      <div className="white-card" style={{ marginTop: '1.25rem' }}>
        <div className="white-card-header">
          <div className="white-card-title"><Icon name="list" size={15} />Listado</div>
          <input type="search" placeholder="Buscar nombre o email..." value={search} onChange={e => setSearch(e.target.value)} style={{ width: 220, height: 32, fontSize: 12 }} />
        </div>
        <div className="filters-row">
          {['todos', ...ROLES].map(r => (
            <button key={r} className={`filter-btn ${filterRol === r ? 'active' : ''}`} onClick={() => setFilterRol(r)} style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
              {r === 'todos' ? <><Icon name="list" size={12} />Todos</> : <><Icon name={ROL_INFO[r].icon} size={12} />{ROL_INFO[r].label}s</>}
            </button>
          ))}
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table className="rv-table">
            <thead><tr><th>#</th><th>Nombre</th><th>Email</th><th>Rol</th><th>Registro</th></tr></thead>
            <tbody>
              {loading
                ? <tr><td colSpan={5} style={{ padding: '2.5rem', textAlign: 'center', color: '#8a6d6e' }}>Cargando...</td></tr>
                : filtrados.length === 0
                ? (
                  <tr><td colSpan={5} style={{ padding: '2.5rem', textAlign: 'center', color: '#8a6d6e' }}>
                    <Icon name="users" size={26} color="#c9b6b6" style={{ marginBottom: 6 }} />
                    <div>Sin resultados</div>
                  </td></tr>
                )
                : filtrados.map((u, i) => {
                  const info = ROL_INFO[u.rol] || { icon: 'user', label: u.rol, color: '#8a6d6e' };
                  return (
                    <tr key={u.id}>
                      <td className="m">{i + 1}</td>
                      <td className="p">{u.nombre}</td>
                      <td style={{ color: '#55393b' }}>{u.email}</td>
                      <td>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 9px', borderRadius: 99, background: `${info.color}18`, color: info.color, fontSize: 10, fontWeight: 700, border: `1px solid ${info.color}40` }}>
                          <Icon name={info.icon} size={10} />{info.label}
                        </span>
                      </td>
                      <td className="m">{u.created_at ? new Date(u.created_at).toLocaleDateString('es-CO') : '—'}</td>
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
