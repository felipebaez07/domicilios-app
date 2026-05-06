import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import './Login.css';

const ROLES = [
  { id: 'distribuidor', emoji: '📦', name: 'Distribuidor', color: '#3b82f6', desc: 'Crea y gestiona pedidos de entrega' },
  { id: 'cliente',      emoji: '👤', name: 'Cliente',      color: '#8b5cf6', desc: 'Rastrea tus pedidos en tiempo real' },
  { id: 'domiciliario', emoji: '🛵', name: 'Domiciliario', color: '#10b981', desc: 'Activa GPS y actualiza entregas' },
  { id: 'operador',     emoji: '🗺️', name: 'Operador',     color: '#f59e0b', desc: 'Centro de control y asignación' },
  { id: 'admin',        emoji: '⚡', name: 'Admin',        color: '#ef4444', desc: 'Métricas globales del sistema' },
];

function hex2rgba(hex, alpha) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

export default function Login() {
  const [role, setRole]         = useState(null);
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw]     = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const { login }               = useAuth();
  const navigate                = useNavigate();

  const selected = ROLES.find(r => r.id === role);
  const c = selected?.color || '#3b82f6';

  async function handleSubmit(e) {
    e.preventDefault();
    if (!role) { setError('Selecciona tu rol primero'); return; }
    setError('');
    setLoading(true);
    try {
      const { data } = await axios.post(
        `${import.meta.env.VITE_AUTH_URL}/login`,
        { email, password }
      );
      login(data.token, data.usuario);
      navigate(`/${data.usuario.rol}`);
    } catch (err) {
      setError(err.response?.data?.message || 'Credenciales incorrectas');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-root">
      <div className="login-grid-bg" />

      <div
        className="login-card"
        style={{ borderColor: selected ? hex2rgba(c, 0.2) : 'rgba(255,255,255,0.08)' }}
      >
        <div className="login-logo-row">
          <div
            className="login-logo-box"
            style={{ background: hex2rgba(c, 0.12), borderColor: hex2rgba(c, 0.25) }}
          >
            ⚡
          </div>
          <div>
            <div className="login-app-name">DomiciliosApp</div>
            <div className="login-app-ver">v2.0 · microservices</div>
          </div>
        </div>

        <div className="login-head">
          <h1 className="login-title" style={{ color: selected ? c : 'var(--text-primary)' }}>
            {selected ? `Hola, ${selected.name}` : 'Bienvenido'}
          </h1>
          <p className="login-subtitle">
            {selected ? 'Ingresa tus credenciales para acceder' : 'Selecciona tu rol para continuar'}
          </p>
        </div>

        <div className="login-roles-label">¿Quién eres?</div>
        <div className="login-roles-track">
          {ROLES.map(r => {
            const active = role === r.id;
            return (
              <button
                key={r.id}
                type="button"
                className={`login-role-pill ${active ? 'active' : ''}`}
                style={active ? {
                  borderColor: hex2rgba(r.color, 0.4),
                  background:  hex2rgba(r.color, 0.1),
                } : {}}
                onClick={() => { setRole(r.id); setError(''); }}
              >
                {active && <span className="login-role-shine" style={{ background: hex2rgba(r.color, 0.06) }} />}
                <span className="login-role-emoji">{r.emoji}</span>
                <span className="login-role-name" style={{ color: active ? r.color : undefined }}>
                  {r.name}
                </span>
                {active && <span className="login-role-check" style={{ color: r.color }}>✓</span>}
              </button>
            );
          })}
        </div>

        <div
          className="login-desc-bar"
          style={{ background: hex2rgba(c, 0.06), borderColor: hex2rgba(c, 0.14) }}
        >
          <span className="login-desc-icon">{selected ? selected.emoji : '👋'}</span>
          <span className="login-desc-text" style={{ color: selected ? c : 'var(--text-tertiary)' }}>
            {selected ? selected.desc : 'Elige un rol para ver tu acceso al sistema'}
          </span>
        </div>

        <form className="login-form" onSubmit={handleSubmit}>
          <div className="login-field">
            <label className="login-field-label">Correo electrónico</label>
            <div className="login-field-wrap">
              <span className="login-field-icon">✉</span>
              <input
                type="email"
                className="login-field-input"
                placeholder="usuario@empresa.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoComplete="email"
                onFocus={e => selected && (e.target.style.borderColor = hex2rgba(c, 0.45))}
                onBlur={e  => (e.target.style.borderColor = '')}
              />
            </div>
          </div>

          <div className="login-field">
            <label className="login-field-label">Contraseña</label>
            <div className="login-field-wrap">
              <span className="login-field-icon">🔒</span>
              <input
                type={showPw ? 'text' : 'password'}
                className="login-field-input"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                onFocus={e => selected && (e.target.style.borderColor = hex2rgba(c, 0.45))}
                onBlur={e  => (e.target.style.borderColor = '')}
              />
              <button
                type="button"
                className="login-pw-toggle"
                onClick={() => setShowPw(v => !v)}
                aria-label={showPw ? 'Ocultar' : 'Mostrar'}
                style={{ opacity: showPw ? 0.7 : 0.3 }}
              >
                {showPw ? '🙈' : '👁'}
              </button>
            </div>
          </div>

          {error && (
            <div className="login-error" role="alert">
              <span>⚠</span> {error}
            </div>
          )}

          <button
            type="submit"
            className="login-submit"
            disabled={loading || !role}
            style={{
              background: c,
              boxShadow:  selected ? `0 4px 24px ${hex2rgba(c, 0.3)}` : 'none',
              opacity:    !role ? 0.45 : 1,
              cursor:     !role ? 'not-allowed' : 'pointer',
            }}
          >
            {loading ? (
              <span className="login-spinner" />
            ) : (
              <>
                <span>{selected ? `Entrar como ${selected.name}` : 'Selecciona un rol'}</span>
                <span className="login-arrow">→</span>
              </>
            )}
          </button>
        </form>

        <p className="login-footer-note">Proyecto final · Arquitectura de Software · 2025</p>
      </div>
    </div>
  );
}