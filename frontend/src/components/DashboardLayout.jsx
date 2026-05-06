import { useState, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ravenLogo from '../assets/raven_logo.png';
import '../styles/design-system.css';

const NAV = {
  distribuidor: [
    { label: 'Dashboard',    path: '/distribuidor',           num: '01' },
    { label: 'Nuevo pedido', path: '/distribuidor/nuevo',     num: '02' },
    { label: 'Historial',    path: '/distribuidor/historial', num: '03' },
  ],
  cliente: [
    { label: 'Mis pedidos', path: '/cliente',           num: '01' },
    { label: 'Rastrear',    path: '/cliente/rastreo',   num: '02' },
    { label: 'Historial',   path: '/cliente/historial', num: '03' },
  ],
  domiciliario: [
    { label: 'Mi turno',    path: '/domiciliario',           num: '01' },
    { label: 'Ruta activa', path: '/domiciliario/ruta',      num: '02' },
    { label: 'Entregas',    path: '/domiciliario/historial', num: '03' },
  ],
  operador: [
    { label: 'Control',       path: '/operador',               num: '01' },
    { label: 'Pedidos',       path: '/operador/pedidos',        num: '02' },
    { label: 'Domiciliarios', path: '/operador/domiciliarios',  num: '03' },
  ],
  admin: [
    { label: 'Métricas',  path: '/admin',           num: '01' },
    { label: 'Pedidos',   path: '/admin/pedidos',   num: '02' },
    { label: 'Usuarios',  path: '/admin/usuarios',  num: '03' },
  ],
};

const ROLE_LABEL = {
  distribuidor: 'Distribuidor', cliente: 'Cliente',
  domiciliario: 'Domiciliario', operador: 'Operador', admin: 'Admin',
};

export default function DashboardLayout({ role, children, pageTitle }) {
  const { user, logout } = useAuth();
  const navigate  = useNavigate();
  const location  = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const lineRef   = useRef(null);
  const nav       = NAV[role] || [];
  const initials  = (user?.nombre || user?.email || 'U')
    .split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  const currentNav = nav.find(n =>
    n.path === location.pathname ||
    (n.path !== `/${role}` && location.pathname.startsWith(n.path))
  );

  function triggerLine(cb) {
    const line = lineRef.current;
    if (!line) { cb?.(); return; }
    line.style.transition = 'none';
    line.style.left = '-4px';
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

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-outer)', position: 'relative' }}>
      {/* Cuadrícula de fondo */}
      <div style={{
        position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0,
        backgroundImage: 'linear-gradient(rgba(100,150,200,0.12) 1px,transparent 1px),linear-gradient(90deg,rgba(100,150,200,0.12) 1px,transparent 1px)',
        backgroundSize: '36px 36px',
      }} />

      {/* App centrada */}
      <div className="app-wrap">

        {/* Línea de transición */}
        <div ref={lineRef} className="page-line" />

        {/* ── MENÚ OVERLAY ── */}
        {menuOpen && (
          <div style={{
            position: 'absolute', inset: 0, zIndex: 50,
            display: 'grid', gridTemplateColumns: '1fr 1fr',
            background: 'var(--bg-top)',
          }}>
            {/* Izquierda — nav */}
            <div style={{
              padding: '1.5rem 2rem',
              borderRight: '1px solid var(--border)',
              display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
            }}>
              {/* Cerrar */}
              <button onClick={() => setMenuOpen(false)} style={{
                alignSelf: 'flex-end', width: 30, height: 30,
                border: '1px solid var(--border-md)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'transparent', color: 'var(--txt-2)',
                fontSize: 13, cursor: 'pointer', fontFamily: 'var(--font-mono)',
                transition: 'all 0.15s',
              }}
                onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-active)'; e.currentTarget.style.color = 'var(--txt-1)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--txt-2)'; }}
              >✕</button>

              {/* Ítems de nav */}
              <nav style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                {nav.map(item => {
                  const isActive = location.pathname === item.path ||
                    (item.path !== `/${role}` && location.pathname.startsWith(item.path));
                  return (
                    <button key={item.path} onClick={() => handleNav(item.path)} style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '14px 0',
                      borderTop: '1px solid var(--border)',
                      background: 'none', border: 'none',
                      borderTop: '1px solid var(--border)',
                      cursor: 'pointer', textAlign: 'left', width: '100%',
                    }}
                      onMouseEnter={e => e.currentTarget.querySelector('.mn-l').style.color = 'var(--txt-1)'}
                      onMouseLeave={e => e.currentTarget.querySelector('.mn-l').style.color = isActive ? 'var(--accent2)' : 'var(--txt-3)'}
                    >
                      <span className="mn-l" style={{
                        fontSize: '1.3rem', fontWeight: 700, fontFamily: 'var(--font-ui)',
                        letterSpacing: '-0.03em', transition: 'color 0.15s',
                        color: isActive ? 'var(--accent2)' : 'var(--txt-3)',
                      }}>{item.label}</span>
                      <span style={{ fontSize: 8, fontFamily: 'var(--font-mono)', color: 'var(--txt-3)' }}>{item.num}</span>
                    </button>
                  );
                })}

                {/* Cerrar sesión — siempre visible */}
                <button onClick={handleLogout} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '14px 0',
                  borderTop: '1px solid var(--border)',
                  borderBottom: '1px solid var(--border)',
                  background: 'none', border: 'none',
                  borderTop: '1px solid var(--border)',
                  borderBottom: '1px solid var(--border)',
                  cursor: 'pointer', textAlign: 'left', width: '100%',
                }}
                  onMouseEnter={e => e.currentTarget.querySelector('.mn-l').style.color = 'var(--err-txt)'}
                  onMouseLeave={e => e.currentTarget.querySelector('.mn-l').style.color = 'var(--txt-3)'}
                >
                  <span className="mn-l" style={{
                    fontSize: '1.3rem', fontWeight: 700, fontFamily: 'var(--font-ui)',
                    letterSpacing: '-0.03em', transition: 'color 0.15s', color: 'var(--txt-3)',
                  }}>Cerrar sesión</span>
                  <span style={{ fontSize: 8, fontFamily: 'var(--font-mono)', color: 'var(--txt-3)' }}>→</span>
                </button>
              </nav>

              <div style={{ fontSize: 7, fontFamily: 'var(--font-mono)', color: 'var(--txt-3)', letterSpacing: '0.08em' }}>
                RAVEN · IBAGUÉ · 2025
              </div>
            </div>

            {/* Derecha — info usuario */}
            <div style={{ padding: '1.5rem 2rem', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <div style={{
                fontSize: '5rem', fontWeight: 700, lineHeight: 0.85,
                letterSpacing: '-0.06em', fontFamily: 'var(--font-mono)',
                color: 'rgba(184,207,232,0.07)',
                WebkitTextStroke: '1px rgba(184,207,232,0.12)',
                marginBottom: '0.75rem',
              }}>
                {ROLE_LABEL[role]?.toUpperCase().slice(0, 4)}
              </div>
              <img src={ravenLogo} alt="Raven" style={{ height: 28, objectFit: 'contain', filter: 'brightness(0.55)', alignSelf: 'flex-start' }} />
              <div style={{ fontSize: 8, fontFamily: 'var(--font-mono)', color: 'var(--txt-2)', letterSpacing: '0.06em', lineHeight: 2.2 }}>
                USUARIO / {user?.nombre || user?.email?.split('@')[0]}<br />
                ROL / {ROLE_LABEL[role]}<br />
                SESIÓN / Activa
              </div>
            </div>
          </div>
        )}

        {/* ── TOPBAR ── */}
        <header className="topbar">
          <div className="topbar-left">
            <button className="topbar-hamburger" onClick={() => setMenuOpen(true)} aria-label="Menú">
              <span /><span /><span />
            </button>
            <img src={ravenLogo} alt="Raven" className="topbar-logo" />
            <span className="topbar-sep">/</span>
            <span className="topbar-page">{pageTitle || currentNav?.label || 'Dashboard'}</span>
          </div>
          <div className="topbar-right">
            <div className="topbar-live"><div className="topbar-live-dot" />EN LÍNEA</div>
            <div className="topbar-badge">{ROLE_LABEL[role]}</div>
            <div className="topbar-avatar">{initials}</div>
          </div>
        </header>

        {/* ── SUBNAV ── */}
        <nav className="subnav">
          {nav.map(item => {
            const active = location.pathname === item.path ||
              (item.path !== `/${role}` && location.pathname.startsWith(item.path));
            return (
              <button key={item.path} className={`subnav-btn ${active ? 'active' : ''}`} onClick={() => handleNav(item.path)}>
                <span className="subnav-num">{item.num}</span>{item.label}
              </button>
            );
          })}
        </nav>

        {/* ── CONTENIDO ── */}
        <main className="main-content page-enter">
          {children}
        </main>
      </div>
    </div>
  );
}