import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import DashboardLayout from '../../components/DashboardLayout';

const API = import.meta.env.VITE_AUTH_URL;
const ROLES = ['distribuidor','cliente','domiciliario','operador','admin'];

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
      <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border)' }}>
        <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--txt-1)' }}>Usuarios del sistema</div>
        <div style={{ fontSize: 7, fontFamily: 'var(--font-mono)', color: 'var(--txt-3)', marginTop: 2, letterSpacing: '0.08em' }}>{usuarios.length} REGISTRADOS</div>
      </div>
      {/* Stats por rol */}
      <div className="stats-row" style={{ gridTemplateColumns: 'repeat(5,1fr)' }}>
        {ROLES.map((r, i) => (
          <div key={r} className="stat-cell" style={{ borderRight: i < 4 ? '1px solid var(--border)' : 'none' }}>
            <div className="stat-lbl">{r}</div>
            <div className="stat-val">{loading ? '—' : String(conteo[r] || 0).padStart(2,'0')}</div>
          </div>
        ))}
      </div>
      {/* Filtros */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', alignItems: 'center' }}>
        {['todos', ...ROLES].map(r => (
          <button key={r} onClick={() => setFilterRol(r)} style={{ padding: '8px 9px', fontSize: 6, fontFamily: 'var(--font-mono)', fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', background: filterRol === r ? 'var(--bg-active)' : 'transparent', color: filterRol === r ? 'var(--accent)' : 'var(--txt-3)', border: 'none', borderRight: '1px solid var(--border)', cursor: 'pointer' }}>
            {r === 'todos' ? 'TODOS' : r.slice(0,4).toUpperCase()}
          </button>
        ))}
        <div style={{ flex: 1, borderLeft: '1px solid var(--border)' }}>
          <input type="search" placeholder="Buscar nombre o email..." value={search} onChange={e => setSearch(e.target.value)} style={{ border: 'none', height: 32, background: 'transparent', fontSize: 9 }} />
        </div>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table className="rv-table">
          <thead><tr><th>#</th><th>Nombre</th><th>Email</th><th>Rol</th><th>Registro</th></tr></thead>
          <tbody>
            {loading ? <tr><td colSpan={5} style={{ padding: '2rem', textAlign: 'center', fontSize: 9, fontFamily: 'var(--font-mono)', color: 'var(--txt-3)' }}>CARGANDO...</td></tr>
              : filtrados.length === 0 ? <tr><td colSpan={5} style={{ padding: '2rem', textAlign: 'center', fontSize: 9, fontFamily: 'var(--font-mono)', color: 'var(--txt-3)' }}>SIN RESULTADOS</td></tr>
              : filtrados.map((u, i) => (
                <tr key={u.id}>
                  <td className="m">{i+1}</td>
                  <td className="p">{u.nombre}</td>
                  <td style={{ fontSize: 9, fontFamily: 'var(--font-mono)', color: 'var(--txt-2)' }}>{u.email}</td>
                  <td><span className="badge badge-info">{u.rol?.toUpperCase()}</span></td>
                  <td className="m">{u.created_at ? new Date(u.created_at).toLocaleDateString('es-CO') : '—'}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </DashboardLayout>
  );
}