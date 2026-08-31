import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { useAuth } from '../context/AuthContext';
import RavenMark from './RavenMark';
import Icon from './Icon';
import ChatBubble from './ChatBubble';
import '../styles/design-system.css';

const NAV = {
  distribuidor: [
    { icon: 'barChart', label: 'Dashboard',    path: '/distribuidor' },
    { icon: 'plus',     label: 'Nuevo pedido', path: '/distribuidor/nuevo' },
    { icon: 'list',     label: 'Historial',    path: '/distribuidor/historial' },
  ],
  cliente: [
    { icon: 'bag',    label: 'Mis pedidos', path: '/cliente' },
    { icon: 'mapPin', label: 'Rastrear',    path: '/cliente/rastreo' },
    { icon: 'list',   label: 'Historial',   path: '/cliente/historial' },
  ],
  domiciliario: [
    { icon: 'home',    label: 'Mi turno',    path: '/domiciliario' },
    { icon: 'map',     label: 'Ruta activa', path: '/domiciliario/ruta' },
    { icon: 'checkCircle', label: 'Entregas', path: '/domiciliario/historial' },
    { icon: 'send',    label: 'Telegram',    path: '/domiciliario/perfil' },
  ],
  operador: [
    { icon: 'gauge',   label: 'Control',       path: '/operador' },
    { icon: 'package', label: 'Pedidos',       path: '/operador/pedidos' },
    { icon: 'scooter', label: 'Domiciliarios', path: '/operador/domiciliarios' },
  ],
  admin: [
    { icon: 'barChart', label: 'Métricas',     path: '/admin' },
    { icon: 'package',  label: 'Pedidos',      path: '/admin/pedidos' },
    { icon: 'users',    label: 'Mi equipo',    path: '/admin/equipo' },
    { icon: 'user',     label: 'Usuarios',     path: '/admin/usuarios' },
    { icon: 'palette',  label: 'Personalizar', path: '/admin/personalizar' },
  ],
  superadmin: [
    { icon: 'building', label: 'Empresas', path: '/superadmin' },
  ],
};

const RC = {
  distribuidor: { label: 'Distribuidor', icon: 'package' },
  cliente:      { label: 'Cliente',      icon: 'user' },
  domiciliario: { label: 'Domiciliario', icon: 'scooter' },
  operador:     { label: 'Operador',     icon: 'map' },
  admin:        { label: 'Admin',        icon: 'bolt' },
  superadmin:   { label: 'Superadmin',   icon: 'crown' },
};

// Una sola marca (rojo carmesí) para todos los roles — el color ya no
// distingue el portal, la navegación y el texto se encargan de eso.
const BRAND_GRAD = 'linear-gradient(135deg, #d0121b, #a80e17)';
const BRAND_C1 = '#d0121b';
const BRAND_C2 = '#a80e17';

// La barra inferior es mobile-first: como mucho 4 accesos directos,
// el resto vive en el menú completo (hamburguesa).
const TAB_LIMIT = 4;

export default function DashboardLayout({ role, children, pageTitle }) {
  const { user, logout } = useAuth();
  const navigate  = useNavigate();
  const location  = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const nav  = NAV[role] || [];
  const tabs = nav.slice(0, TAB_LIMIT);
  const rc   = RC[role] || {};
  // La navegación (topbar, menú, pestañas) es siempre la misma marca en
  // todas las empresas y roles — así toda vista se ve consistente.
  const grad = BRAND_GRAD
  const c1 = BRAND_C1
  const c2 = BRAND_C2

  const initials = (user?.nombre || user?.email || 'U')
    .split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

  function isActivePath(path) {
    return location.pathname === path || (path !== `/${role}` && location.pathname.startsWith(path));
  }
  const currentNav = nav.find(n => isActivePath(n.path));

  function handleNav(path) {
    setMenuOpen(false);
    if (location.pathname === path) return;
    navigate(path);
  }

  function handleLogout() {
    setMenuOpen(false);
    logout();
    navigate('/login');
  }

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
            <RavenMark size={38} mono />
          </div>
          <button onClick={() => setMenuOpen(false)} style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.3)', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="x" size={16} />
          </button>
        </div>

        {/* Usuario */}
        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid rgba(255,255,255,0.12)', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 46, height: 46, borderRadius: '50%', background: 'rgba(255,255,255,0.25)', border: '2px solid rgba(255,255,255,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 800, color: '#fff', flexShrink: 0 }}>{initials}</div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>{user?.nombre || user?.email?.split('@')[0]}</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.65)', marginTop: 1, display: 'flex', alignItems: 'center', gap: 5 }}><Icon name={rc.icon} size={12} /> {rc.label}</div>
            {user?.empresa_nombre && <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', marginTop: 1, display: 'flex', alignItems: 'center', gap: 5 }}><Icon name="building" size={11} /> {user.empresa_nombre}</div>}
          </div>
        </div>

        {/* Nav */}
        <nav style={{ padding: '0.75rem', flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div style={{ fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.08em', padding: '0 0.75rem', marginBottom: 4 }}>Navegación</div>
          {nav.map(item => {
            const isActive = isActivePath(item.path);
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
                <Icon name={item.icon} size={18} style={{ flexShrink: 0 }} />
                <span>{item.label}</span>
                {isActive && <span style={{ marginLeft: 'auto', width: 6, height: 6, borderRadius: '50%', background: '#fff' }} />}
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
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.22)'; e.currentTarget.style.color = '#fff'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = 'rgba(255,255,255,0.8)'; }}
          >
            <Icon name="logOut" size={18} />
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
      <div style={{ minHeight: '100vh', background: 'var(--canvas, #faf5f4)' }} data-role={role}>
        <div className="app-wrap" data-role={role} style={{ '--c1': c1, '--c2': c2, '--grad': grad, '--grad-bg': grad }}>
          {/* TOPBAR */}
          <header className="topbar">
            <div className="topbar-left">
              <button className="topbar-hamburger" onClick={() => setMenuOpen(true)}>
                <span /><span /><span />
              </button>
              <RavenMark size={26} />
              <span className="topbar-sep">/</span>
              <span className="topbar-page">{pageTitle || (currentNav ? currentNav.label : 'Dashboard')}</span>
            </div>
            <div className="topbar-right">
              <div className="topbar-live"><div className="topbar-live-dot" />En línea</div>
              <div className="topbar-badge"><Icon name={rc.icon} size={11} style={{ marginRight: 4, verticalAlign: -2 }} />{rc.label}</div>
              <div className="topbar-avatar">{initials}</div>
            </div>
          </header>

          {/* SUBNAV (desktop) */}
          <nav className="subnav subnav-desktop">
            {nav.map(item => {
              const active = isActivePath(item.path);
              return (
                <button key={item.path} className={`subnav-btn ${active ? 'active' : ''}`} onClick={() => handleNav(item.path)}>
                  <Icon name={item.icon} size={14} style={{ marginRight: 6, verticalAlign: -2 }} />{item.label}
                </button>
              );
            })}
          </nav>

          {/* CONTENIDO */}
          <main className="main-content page-enter" style={{ paddingBottom: tabs.length ? 70 : 0 }}>
            {children}
          </main>

          {/* BARRA DE PESTAÑAS (mobile): reemplaza el menú hamburguesa como acceso principal */}
          {tabs.length > 0 && (
            <nav className="tabbar">
              {tabs.map(item => {
                const active = isActivePath(item.path);
                return (
                  <button key={item.path} className={`tabbar-btn ${active ? 'active' : ''}`} onClick={() => handleNav(item.path)}>
                    <Icon name={item.icon} size={21} strokeWidth={active ? 2 : 1.8} />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>
          )}
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
