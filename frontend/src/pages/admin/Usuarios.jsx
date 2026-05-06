import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import DashboardLayout from '../../components/DashboardLayout';

const API = import.meta.env.VITE_AUTH_URL;
const ROL_COLOR = { distribuidor: '#3b82f6', cliente: '#8b5cf6', domiciliario: '#10b981', operador: '#f59e0b', admin: '#ef4444' };
const ROL_EMOJI = { distribuidor: '📦', cliente: '👤', domiciliario: '🛵', operador: '🗺️', admin: '⚡' };

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
    const matchRol    = filterRol === 'todos' || u.rol === filterRol;
    const matchSearch = !search || [u.nombre, u.email, u.rol].some(v => v?.toLowerCase().includes(search.toLowerCase()));
    return matchRol && matchSearch;
  });

  const conteo = Object.fromEntries(['distribuidor','cliente','domiciliario','operador','admin'].map(r => [r, usuarios.filter(u => u.rol === r).length]));

  return (
    <DashboardLayout role="admin" pageTitle="Usuarios">
      <div className="page-header">
        <h1 className="page-title">Usuarios del sistema</h1>
        <p className="page-subtitle">{usuarios.length} registrados</p>
      </div>

      <div className="stats-grid" style={{ marginBottom: '1.5rem' }}>
        {['distribuidor','cliente','domiciliario','operador','admin'].map(r => (
          <div className="stat-card" key={r}>
            <div className="stat-label">{ROL_EMOJI[r]} {r}</div>
            <div className="stat-value" style={{ fontSize: '1.6rem' }}>{loading ? '—' : conteo[r]}</div>
            <div className="stat-accent-line" style={{ background: ROL_COLOR[r] }} />
          </div>
        ))}
      </div>

      <div className="card">
        <div className="card-header" style={{ flexWrap: 'wrap', gap: '0.75rem' }}>
          <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
            {['todos','distribuidor','cliente','domiciliario','operador','admin'].map(r => (
              <button key={r} onClick={() => setFilterRol(r)} style={{
                padding: '3px 10px', borderRadius: 99, fontSize: '0.68rem', fontFamily: 'var(--font-mono)',
                background: filterRol === r ? `${ROL_COLOR[r] || '#ef4444'}22` : 'var(--bg-elevated)',
                border: `1px solid ${filterRol === r ? `${ROL_COLOR[r] || '#ef4444'}55` : 'var(--border-subtle)'}`,
                color: filterRol === r ? (ROL_COLOR[r] || '#f87171') : 'var(--text-tertiary)', cursor: 'pointer',
              }}>
                {r === 'todos' ? 'Todos' : `${ROL_EMOJI[r] || ''} ${r}`}
              </button>
            ))}
          </div>
          <input
            type="search" placeholder="Buscar nombre o email..." value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ width: 220, height: 30, fontSize: '0.78rem', padding: '0 0.75rem' }}
          />
        </div>

        <div className="data-table-wrap">
          <table className="data-table">
            <thead><tr><th>#</th><th>Nombre</th><th>Email</th><th>Rol</th><th>Registro</th></tr></thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)', fontSize: '0.78rem' }}>Cargando...</td></tr>
              ) : filtrados.length === 0 ? (
                <tr><td colSpan={5} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)', fontSize: '0.78rem' }}>Sin resultados</td></tr>
              ) : filtrados.map((u, i) => (
                <tr key={u.id}>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>{i + 1}</td>
                  <td style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{u.nombre}</td>
                  <td style={{ fontSize: '0.8rem', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>{u.email}</td>
                  <td>
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px',
                      borderRadius: 99, fontSize: '0.68rem', fontFamily: 'var(--font-mono)', fontWeight: 500,
                      background: `${ROL_COLOR[u.rol] || '#888'}18`,
                      color: ROL_COLOR[u.rol] || 'var(--text-secondary)',
                    }}>
                      {ROL_EMOJI[u.rol]} {u.rol}
                    </span>
                  </td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>
                    {u.created_at ? new Date(u.created_at).toLocaleDateString('es-CO') : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardLayout>
  );
}