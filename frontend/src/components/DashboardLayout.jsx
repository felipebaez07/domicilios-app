import { useState, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { useAuth } from '../context/AuthContext';
import ravenLogo from '../assets/raven_logo.png';
import ChatBubble from './ChatBubble';
import '../styles/design-system.css';

const NAV = {
  distribuidor: [
    { label: '📊 Dashboard',    path: '/distribuidor' },
    { label: '➕ Nuevo pedido', path: '/distribuidor/nuevo' },
    { label: '📋 Historial',    path: '/distribuidor/historial' },
  ],
  cliente: [
    { label: '🛍️ Mis pedidos', path: '/cliente' },
    { label: '📍 Rastrear',    path: '/cliente/rastreo' },
    { label: '📋 Historial',   path: '/cliente/historial' },
  ],
  domiciliario: [
    { label: '🏠 Mi turno',     path: '/domiciliario' },
    { label: '🗺️ Ruta activa',  path: '/domiciliario/ruta' },
    { label: '✅ Entregas',     path: '/domiciliario/historial' },
    { label: '📲 Telegram',    path: '/domiciliario/perfil' },
  ],
  operador: [
    { label: '🎮 Control',       path: '/operador' },
    { label: '📦 Pedidos',       path: '/operador/pedidos' },
    { label: '🛵 Domiciliarios', path: '/operador/domiciliarios' },
  ],
  admin: [
    { label: '📈 Métricas',  path: '/admin' },
    { label: '📦 Pedidos',   path: '/admin/pedidos' },
    { label: '👥 Mi equipo', path: '/admin/equipo' },
    { label: '👤 Usuarios',  path: '/admin/usuarios' },
  ],
  superadmin: [
    { label: '🏢 Empresas', path: '/superadmin' },
  ],
};

const RC = {
  distribuidor: { label: 'Distribuidor', emoji: '📦' },
  cliente:      { label: 'Cliente',      emoji: '👤' },
  domiciliario: { label: 'Domiciliario', emoji: '🛵' },
  operador:     { label: 'Operador',     emoji: '🗺️' },
  admin:        { label: 'Admin',        emoji: '⚡' },
  superadmin:   { label: 'Superadmin',   emoji: '👑' },
};

const GRADIENTS = {
  distribuidor: 'linear-gradient(135deg, #667eea, #764ba2)',
  cliente:      'linear-gradient(135deg, #8b5cf6, #6d28d9)',
  domiciliario: 'linear-gradient(135deg, #10b981, #059669)',
  operador:     'linear-gradient(135deg, #f59e0b, #d97706)',
  admin:        'linear-gradient(135deg, #ef4444, #dc2626)',
  superadmin:   'linear-gradient(135deg, #1a1a2e, #16213e)',
};

export default function DashboardLayout({ role, children, pageTitle }) {
  const { user, logout } = useAuth();
  const navigate  = useNavigate();
  const location  = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const lineRef   = useRef(null);
  const nav  = NAV[role] || [];
  const rc   = RC[role] || {};
  const grad = GRADIENTS[role] || GRADIENTS.distribuidor;

  const initials = (user?.nombre || user?.email || 'U')
    .split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

  const currentNav = nav.find(n =>
    n.path === location.pathname ||
    (n.path !== `/${role}` && location.pathname.startsWith(n.path))
  );

  function triggerLine(cb) {
    const line = lineRef.current;
    if (!line) { cb?.(); return; }
    line.style.transition = 'none'; line.style.left = '-4px';
    requestAnimationFrame(() => requestAnimationFrame(() => {
      line.style.transition = 'left 0.48s cubic-bezier(0.76,0,0.24,1)';
      line.style.left = '110%';
      setTimeout(() => cb?.(), 460);
    }));
  }

  function handleNav(path) {
    setMenuOpen(false);
    if (location.pathname === path) return;
    triggerLine(() => navigate(path));
  }

  function handleLogout() {
    setMenuOpen(false);
    triggerLine(() => { logout(); navigate('/login'); });
  }

  const labelClean = (lbl) => lbl.replace(/^\S+\s/, '');

  const menuPortal = menuOpen && createPortal(
    <div
      onClick={e => e.target === e.currentTarget && setMenuOpen(false)}
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(0,0,0,0.4)',
        backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'stretch',
        animation: 'fadeIn 0.2s ease both',
      }}
    >
      <div style={{
        width: 320, maxWidth: '85vw',
        background: grad,
        display: 'flex', flexDirection: 'column',
        boxShadow: '4px 0 40px rgba(0,0,0,0.3)',
        animation: 'slideRight 0.25s ease both',
        overflowY: 'auto',
      }}>
        {/* Header */}
        <div style={{ padding: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <img src={ravenLogo} alt="Raven" style={{ height: 28, filter: 'brightness(10)' }} />
            <span style={{ fontSize: 16, fontWeight: 800, color: '#fff', letterSpacing: '0.05em' }}>RAVEN</span>
          </div>
          <button onClick={() => setMenuOpen(false)} style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.3)', color: '#fff', fontSize: 16, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
        </div>

        {/* Usuario */}
        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid rgba(255,255,255,0.12)', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 46, height: 46, borderRadius: '50%', background: 'rgba(255,255,255,0.25)', border: '2px solid rgba(255,255,255,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 800, color: '#fff', flexShrink: 0 }}>{initials}</div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>{user?.nombre || user?.email?.split('@')[0]}</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.65)', marginTop: 1 }}>{rc.emoji} {rc.label}</div>
            {user?.empresa_nombre && <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', marginTop: 1 }}>🏢 {user.empresa_nombre}</div>}
          </div>
        </div>

        {/* Nav */}
        <nav style={{ padding: '0.75rem', flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div style={{ fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.08em', padding: '0 0.75rem', marginBottom: 4 }}>Navegación</div>
          {nav.map(item => {
            const isActive = location.pathname === item.path ||
              (item.path !== `/${role}` && location.pathname.startsWith(item.path));
            return (
              <button key={item.path} onClick={() => handleNav(item.path)} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '11px 14px', borderRadius: 14,
                background: isActive ? 'rgba(255,255,255,0.25)' : 'transparent',
                border: `1.5px solid ${isActive ? 'rgba(255,255,255,0.4)' : 'transparent'}`,
                cursor: 'pointer', color: '#fff', width: '100%', textAlign: 'left',
                fontSize: 14, fontWeight: isActive ? 700 : 500,
                fontFamily: 'Poppins, sans-serif', transition: 'all 0.15s',
              }}
                onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'rgba(255,255,255,0.12)'; }}
                onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
              >
                <span style={{ fontSize: '1.2rem', flexShrink: 0 }}>{item.label.split(' ')[0]}</span>
                <span>{item.label.replace(/^\S+\s/, '')}</span>
                {isActive && <span style={{ marginLeft: 'auto', fontSize: 10 }}>◉</span>}
              </button>
            );
          })}
        </nav>

        {/* Logout */}
        <div style={{ padding: '0.75rem', borderTop: '1px solid rgba(255,255,255,0.12)' }}>
          <button onClick={handleLogout} style={{
            display: 'flex', alignItems: 'center', gap: 12, padding: '11px 14px', borderRadius: 14,
            background: 'rgba(255,255,255,0.1)', border: '1.5px solid rgba(255,255,255,0.15)',
            cursor: 'pointer', color: 'rgba(255,255,255,0.8)', width: '100%', textAlign: 'left',
            fontSize: 14, fontWeight: 500, fontFamily: 'Poppins, sans-serif', transition: 'all 0.15s',
          }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.25)'; e.currentTarget.style.color = '#fff'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = 'rgba(255,255,255,0.8)'; }}
          >
            <span style={{ fontSize: '1.2rem' }}>🚪</span>
            <span>Cerrar sesión</span>
          </button>
        </div>
      </div>
    </div>,
    document.body
  );

  return (
    <>
      {menuPortal}
      <div style={{ minHeight: '100vh' }} data-role={role}>
        <div className="app-wrap" data-role={role}>
          <div ref={lineRef} className="page-line" />

          {/* TOPBAR */}
          <header className="topbar">
            <div className="topbar-left">
              <button className="topbar-hamburger" onClick={() => setMenuOpen(true)}>
                <span /><span /><span />
              </button>
              <img src={ravenLogo} alt="Raven" className="topbar-logo" />
              <span className="topbar-sep">/</span>
              <span className="topbar-page">{pageTitle || (currentNav ? labelClean(currentNav.label) : 'Dashboard')}</span>
            </div>
            <div className="topbar-right">
              <div className="topbar-live"><div className="topbar-live-dot" />En línea</div>
              <div className="topbar-badge">{rc.emoji} {rc.label}</div>
              <div className="topbar-avatar">{initials}</div>
            </div>
          </header>

          {/* SUBNAV */}
          <nav className="subnav">
            {nav.map(item => {
              const active = location.pathname === item.path ||
                (item.path !== `/${role}` && location.pathname.startsWith(item.path));
              return (
                <button key={item.path} className={`subnav-btn ${active ? 'active' : ''}`} onClick={() => handleNav(item.path)}>
                  {item.label}
                </button>
              );
            })}
          </nav>

          {/* CONTENIDO */}
          <main className="main-content page-enter">
            {children}
          </main>
        </div>
      </div>

      <style>{`
        @keyframes slideRight { from{transform:translateX(-100%);opacity:0} to{transform:translateX(0);opacity:1} }
        @keyframes fadeIn     { from{opacity:0} to{opacity:1} }
      `}</style>
      <ChatBubble />
    </>
  );
}