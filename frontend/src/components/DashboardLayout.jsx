import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import '../styles/design-system.css';

const ROLE_CONFIG = {
  distribuidor: {
    color: '#3b82f6', glow: 'rgba(59,130,246,0.15)',
    label: 'Distribuidor', icon: '📦',
    nav: [
      { id: 'dashboard', label: 'Dashboard',     icon: '⊞',  path: '/distribuidor' },
      { id: 'pedidos',   label: 'Nuevo pedido',  icon: '+',  path: '/distribuidor/nuevo' },
      { id: 'historial', label: 'Historial',     icon: '☰',  path: '/distribuidor/historial' },
    ],
  },
  cliente: {
    color: '#8b5cf6', glow: 'rgba(139,92,246,0.15)',
    label: 'Cliente', icon: '👤',
    nav: [
      { id: 'dashboard', label: 'Mis pedidos',  icon: '⊞',  path: '/cliente' },
      { id: 'rastreo',   label: 'Rastrear',     icon: '📍', path: '/cliente/rastreo' },
      { id: 'historial', label: 'Historial',    icon: '☰',  path: '/cliente/historial' },
    ],
  },
  domiciliario: {
    color: '#10b981', glow: 'rgba(16,185,129,0.15)',
    label: 'Domiciliario', icon: '🛵',
    nav: [
      { id: 'dashboard',  label: 'Mi turno',   icon: '⊞',  path: '/domiciliario' },
      { id: 'ruta',       label: 'Ruta activa', icon: '🗺', path: '/domiciliario/ruta' },
      { id: 'historial',  label: 'Entregas',    icon: '✓',  path: '/domiciliario/historial' },
    ],
  },
  operador: {
    color: '#f59e0b', glow: 'rgba(245,158,11,0.15)',
    label: 'Operador', icon: '🗺️',
    nav: [
      { id: 'dashboard', label: 'Centro de control', icon: '⊞', path: '/operador' },
      { id: 'pedidos',   label: 'Pedidos',           icon: '☰', path: '/operador/pedidos' },
      { id: 'domis',     label: 'Domiciliarios',     icon: '🛵', path: '/operador/domiciliarios' },
    ],
  },
  admin: {
    color: '#ef4444', glow: 'rgba(239,68,68,0.15)',
    label: 'Administrador', icon: '⚡',
    nav: [
      { id: 'dashboard', label: 'Métricas',    icon: '📊', path: '/admin' },
      { id: 'pedidos',   label: 'Todos los pedidos', icon: '☰', path: '/admin/pedidos' },
      { id: 'usuarios',  label: 'Usuarios',    icon: '👥', path: '/admin/usuarios' },
      { id: 'config',    label: 'Config',      icon: '⚙',  path: '/admin/config' },
    ],
  },
};

export default function DashboardLayout({ role, children, pageTitle, pageSubtitle }) {
  const { user, logout } = useAuth();
  const navigate  = useNavigate();
  const location  = useLocation();
  const [notifOpen, setNotifOpen] = useState(false);

  const cfg = ROLE_CONFIG[role] || ROLE_CONFIG.admin;

  function handleLogout() {
    logout();
    navigate('/login');
  }

  const initials = (user?.nombre || user?.email || 'U')
    .split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

  return (
    <div className="app-shell" style={{ '--role-color': cfg.color, '--role-glow': cfg.glow }}>
      {/* ===== SIDEBAR ===== */}
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div
            className="sidebar-brand-icon"
            style={{ background: cfg.glow, border: `1px solid ${cfg.color}33` }}
          >
            <span style={{ fontSize: '1rem' }}>{cfg.icon}</span>
          </div>
          <div>
            <div className="sidebar-brand-text">DomiciliosApp</div>
            <div className="sidebar-brand-sub">{cfg.label}</div>
          </div>
        </div>

        <nav className="sidebar-nav" aria-label="Navegación principal">
          <div className="sidebar-section-label">Menú</div>

          {cfg.nav.map(item => {
            const active = location.pathname === item.path ||
              (item.path !== `/${role}` && location.pathname.startsWith(item.path));
            return (
              <button
                key={item.id}
                className={`nav-item ${active ? 'active' : ''}`}
                onClick={() => navigate(item.path)}
                style={active ? {
                  background: cfg.glow,
                  borderColor: `${cfg.color}33`,
                  color: cfg.color,
                } : {}}
              >
                <span className="nav-item-icon">{item.icon}</span>
                {item.label}
                {item.badge && (
                  <span
                    className="nav-badge"
                    style={{ background: `${cfg.color}20`, color: cfg.color }}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}

          <div className="sidebar-section-label" style={{ marginTop: '0.75rem' }}>Sistema</div>

          <button className="nav-item" onClick={handleLogout}>
            <span className="nav-item-icon">→</span>
            Cerrar sesión
          </button>
        </nav>

        {/* Footer del sidebar */}
        <div className="sidebar-footer">
          <div className="user-card">
            <div
              className="user-avatar"
              style={{ background: cfg.glow, color: cfg.color, border: `1px solid ${cfg.color}33` }}
            >
              {initials}
            </div>
            <div className="user-info">
              <div className="user-name">{user?.nombre || user?.email?.split('@')[0] || 'Usuario'}</div>
              <div className="user-role">{cfg.label}</div>
            </div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>•••</span>
          </div>
        </div>
      </aside>

      {/* ===== TOPBAR ===== */}
      <header className="topbar">
        <div className="topbar-title">
          <span>{pageTitle || cfg.label}</span>
          {pageSubtitle && <> · {pageSubtitle}</>}
        </div>

        <div className="topbar-actions">
          {/* Indicador de conexión */}
          <div className="status-indicator" style={{ marginRight: '0.5rem' }}>
            <span className="pulse-dot live" />
            <span style={{ fontSize: '0.68rem', fontFamily: 'var(--font-mono)', color: 'var(--text-tertiary)' }}>
              live
            </span>
          </div>

          <button
            className="icon-btn"
            onClick={() => setNotifOpen(v => !v)}
            title="Notificaciones"
            aria-label="Notificaciones"
          >
            🔔
          </button>

          <button
            className="icon-btn"
            title="Configuración"
            aria-label="Configuración"
          >
            ⚙
          </button>

          {/* Miniavatar en topbar */}
          <div
            style={{
              width: 30, height: 30, borderRadius: '50%',
              background: cfg.glow, color: cfg.color,
              border: `1px solid ${cfg.color}44`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '0.72rem', fontWeight: 600, cursor: 'pointer',
              marginLeft: '0.25rem',
            }}
          >
            {initials}
          </div>
        </div>
      </header>

      {/* ===== CONTENIDO PRINCIPAL ===== */}
      <main className="main-content">
        {children}
      </main>
    </div>
  );
}