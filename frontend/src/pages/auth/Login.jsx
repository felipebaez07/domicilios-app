import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import ravenLogo from '../../assets/raven_logo.png';
import './Login.css';

const AUTH_URL = import.meta.env.VITE_AUTH_URL;

const ROL_INFO = {
  distribuidor: { emoji: '📦', label: 'Distribuidor',  color: '#667eea', desc: 'Gestiona tus envíos' },
  cliente:      { emoji: '👤', label: 'Cliente',       color: '#8b5cf6', desc: 'Rastrea tus pedidos' },
  domiciliario: { emoji: '🛵', label: 'Domiciliario',  color: '#10b981', desc: 'Gestiona tus entregas' },
  operador:     { emoji: '🗺️', label: 'Operador',      color: '#f59e0b', desc: 'Centro de control' },
  admin:        { emoji: '⚡', label: 'Administrador', color: '#ef4444', desc: 'Panel de empresa' },
  superadmin:   { emoji: '👑', label: 'Superadmin',    color: '#1a1a2e', desc: 'Plataforma RAVEN' },
};

// Pantalla de bienvenida
function WelcomeScreen({ usuario }) {
  const info = ROL_INFO[usuario?.rol] || { emoji: '👤', label: usuario?.rol, color: '#667eea' };
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: `linear-gradient(135deg, ${info.color}, ${info.color}cc)`,
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      fontFamily: 'Poppins, sans-serif',
      animation: 'fadeIn .4s ease both',
    }}>
      {/* Logo */}
      <img src={ravenLogo} alt="RAVEN" style={{ height: 60, filter: 'brightness(10)', marginBottom: 24, animation: 'bounceIn .6s ease both' }} />

      {/* Rol emoji grande */}
      <div style={{ fontSize: '5rem', marginBottom: 16, animation: 'bounceIn .5s .1s ease both' }}>
        {info.emoji}
      </div>

      {/* Bienvenida */}
      <div style={{ fontSize: 14, color: 'rgba(255,255,255,.8)', fontWeight: 500, marginBottom: 8, animation: 'fadeUp .4s .2s ease both', opacity: 0, animationFillMode: 'forwards' }}>
        Bienvenido a RAVEN
      </div>
      <div style={{ fontSize: 22, color: '#fff', fontWeight: 800, marginBottom: 6, animation: 'fadeUp .4s .3s ease both', opacity: 0, animationFillMode: 'forwards' }}>
        {usuario?.nombre}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 20px', borderRadius: 99, background: 'rgba(255,255,255,.2)', border: '1px solid rgba(255,255,255,.3)', animation: 'fadeUp .4s .4s ease both', opacity: 0, animationFillMode: 'forwards' }}>
        <span style={{ fontSize: 16 }}>{info.emoji}</span>
        <span style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>Accediendo como {info.label}</span>
      </div>

      {/* Spinner */}
      <div style={{ marginTop: 40, display: 'flex', alignItems: 'center', gap: 10, color: 'rgba(255,255,255,.7)', fontSize: 12, animation: 'fadeUp .4s .5s ease both', opacity: 0, animationFillMode: 'forwards' }}>
        <div style={{ width: 16, height: 16, borderRadius: '50%', border: '2px solid rgba(255,255,255,.3)', borderTopColor: '#fff', animation: 'spin .7s linear infinite' }}/>
        Redirigiendo...
      </div>

      <style>{`
        @keyframes bounceIn { from{opacity:0;transform:scale(.5)} 70%{transform:scale(1.1)} to{opacity:1;transform:scale(1)} }
        @keyframes fadeUp   { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
        @keyframes fadeIn   { from{opacity:0} to{opacity:1} }
        @keyframes spin     { to{transform:rotate(360deg)} }
      `}</style>
    </div>
  );
}

export default function Login() {
  const [vista, setVista]       = useState('login'); // 'login' | 'registro'
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const [welcome, setWelcome]   = useState(null); // usuario para pantalla bienvenida

  // Login
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw]     = useState(false);

  // Registro
  const [reg, setReg] = useState({
    nombre: '', apellido: '', email: '', password: '', confirmar: '',
    fechaNac: '', rol: 'cliente', telefono: '',
  });

  const { login } = useAuth();
  const navigate  = useNavigate();

  // ── LOGIN ──
  async function handleLogin(e) {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const { data } = await axios.post(`${AUTH_URL}/login`, { email, password });
      login(data.token, data.usuario);
      // Mostrar pantalla de bienvenida 2.5 segundos
      setWelcome(data.usuario);
      setTimeout(() => navigate(`/${data.usuario.rol}`), 2500);
    } catch (err) {
      setError(err.response?.data?.error || 'Credenciales incorrectas');
    } finally { setLoading(false); }
  }

  // ── REGISTRO ──
  function calcularEdad(fechaNac) {
    if (!fechaNac) return 0;
    const hoy = new Date();
    const nac = new Date(fechaNac);
    let edad = hoy.getFullYear() - nac.getFullYear();
    const m = hoy.getMonth() - nac.getMonth();
    if (m < 0 || (m === 0 && hoy.getDate() < nac.getDate())) edad--;
    return edad;
  }

  async function handleRegistro(e) {
    e.preventDefault();
    setError('');

    if (reg.password !== reg.confirmar) { setError('Las contraseñas no coinciden'); return; }
    if (reg.password.length < 6) { setError('La contraseña debe tener al menos 6 caracteres'); return; }

    const edad = calcularEdad(reg.fechaNac);
    if (edad < 18) { setError('Debes ser mayor de 18 años para registrarte'); return; }

    setLoading(true);
    try {
      const { data } = await axios.post(`${AUTH_URL}/register`, {
        nombre:   `${reg.nombre} ${reg.apellido}`.trim(),
        email:    reg.email,
        password: reg.password,
        rol:      reg.rol,
        telefono: reg.telefono,
      });
      login(data.token, data.usuario);
      setWelcome(data.usuario);
      setTimeout(() => navigate(`/${data.usuario.rol}`), 2500);
    } catch (err) {
      setError(err.response?.data?.error || 'Error al registrarse');
    } finally { setLoading(false); }
  }

  const edad = calcularEdad(reg.fechaNac);
  const edadOk = reg.fechaNac && edad >= 18;
  const edadErr = reg.fechaNac && edad < 18;

  // Pantalla de bienvenida
  if (welcome) return <WelcomeScreen usuario={welcome} />;

  return (
    <div className="lv-root" style={{ background: 'linear-gradient(135deg, #667eea, #764ba2)', transition: 'background 0.5s ease', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>

      {/* Burbujas decorativas */}
      <div className="lv-bubble lv-bubble-1" style={{ background: 'rgba(255,255,255,0.08)' }} />
      <div className="lv-bubble lv-bubble-2" style={{ background: 'rgba(255,255,255,0.05)' }} />

      <div className="lv-card" style={{ maxHeight: '95vh', overflowY: 'auto' }}>
        {/* Header */}
        <div className="lv-card-top">
          <img src={ravenLogo} alt="Raven" className="lv-logo" />
          <div className="lv-app-name">RAVEN</div>
          <div className="lv-app-tag">Plataforma de domicilios · Ibagué</div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 6, padding: '0 1.5rem', marginBottom: '1.25rem' }}>
          {[
            { id: 'login',    label: '🔑 Iniciar sesión' },
            { id: 'registro', label: '✨ Registrarme' },
          ].map(tab => (
            <button key={tab.id} onClick={() => { setVista(tab.id); setError(''); }} style={{
              flex: 1, padding: '10px 0', borderRadius: 12,
              background: vista === tab.id ? 'linear-gradient(135deg,#667eea,#764ba2)' : '#f0f2ff',
              color: vista === tab.id ? '#fff' : '#4a4a6a',
              border: 'none', fontFamily: 'Poppins,sans-serif', fontWeight: 700,
              fontSize: 13, cursor: 'pointer', transition: 'all .2s',
              boxShadow: vista === tab.id ? '0 4px 15px rgba(102,126,234,.4)' : 'none',
            }}>
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── LOGIN ── */}
        {vista === 'login' && (
          <form className="lv-form" onSubmit={handleLogin} style={{ padding: '0 1.5rem 1.5rem' }}>
            <div className="lv-field">
              <label className="lv-field-label">✉️ Correo electrónico</label>
              <input type="email" placeholder="usuario@raven.co" value={email} onChange={e => setEmail(e.target.value)} required autoComplete="email" />
            </div>
            <div className="lv-field">
              <label className="lv-field-label">🔒 Contraseña</label>
              <div style={{ position: 'relative' }}>
                <input type={showPw ? 'text' : 'password'} placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} required style={{ paddingRight: '2.5rem' }} />
                <button type="button" onClick={() => setShowPw(v => !v)} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: '#aaa' }}>
                  {showPw ? '🙈' : '👁️'}
                </button>
              </div>
            </div>
            {error && <div className="alert alert-err">{error}</div>}
            <button type="submit" disabled={loading} className="lv-submit" style={{ background: 'linear-gradient(135deg,#667eea,#764ba2)', boxShadow: '0 4px 20px rgba(102,126,234,.5)', opacity: loading ? 0.7 : 1 }}>
              {loading ? <span className="rv-spinner" /> : '🚀 Entrar a RAVEN'}
            </button>
            <p style={{ textAlign: 'center', fontSize: 12, color: '#9090b0', marginTop: 12 }}>
              ¿No tienes cuenta?{' '}
              <button type="button" onClick={() => { setVista('registro'); setError(''); }} style={{ background: 'none', border: 'none', color: '#667eea', fontWeight: 700, cursor: 'pointer', fontFamily: 'Poppins,sans-serif', fontSize: 12 }}>
                Regístrate aquí
              </button>
            </p>
          </form>
        )}

        {/* ── REGISTRO ── */}
        {vista === 'registro' && (
          <form onSubmit={handleRegistro} style={{ padding: '0 1.5rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '.75rem' }}>

            {/* Nombre y apellido */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <div className="lv-field-label">👤 Nombre</div>
                <input placeholder="Juan" value={reg.nombre} onChange={e => setReg(v => ({...v, nombre: e.target.value}))} required />
              </div>
              <div>
                <div className="lv-field-label">👤 Apellido</div>
                <input placeholder="García" value={reg.apellido} onChange={e => setReg(v => ({...v, apellido: e.target.value}))} required />
              </div>
            </div>

            {/* Email */}
            <div>
              <div className="lv-field-label">✉️ Correo electrónico</div>
              <input type="email" placeholder="juan@ejemplo.com" value={reg.email} onChange={e => setReg(v => ({...v, email: e.target.value}))} required />
            </div>

            {/* Teléfono */}
            <div>
              <div className="lv-field-label">📞 Teléfono</div>
              <input type="tel" placeholder="300 000 0000" value={reg.telefono} onChange={e => setReg(v => ({...v, telefono: e.target.value}))} />
            </div>

            {/* Fecha nacimiento */}
            <div>
              <div className="lv-field-label">🎂 Fecha de nacimiento</div>
              <input type="date" value={reg.fechaNac} onChange={e => setReg(v => ({...v, fechaNac: e.target.value}))} required
                max={new Date(new Date().setFullYear(new Date().getFullYear() - 18)).toISOString().split('T')[0]}
              />
              {reg.fechaNac && (
                <div style={{ fontSize: 11, marginTop: 4, fontWeight: 600, color: edadOk ? '#10b981' : '#ef4444' }}>
                  {edadOk ? `✅ ${edad} años — Mayor de edad` : `❌ ${edad} años — Debes ser mayor de 18 años`}
                </div>
              )}
            </div>

            {/* Rol */}
            <div>
              <div className="lv-field-label">🎭 Tipo de cuenta</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {[
                  { id: 'cliente',      emoji: '👤', label: 'Cliente',      desc: 'Quiero pedir domicilios' },
                  { id: 'distribuidor', emoji: '📦', label: 'Distribuidor', desc: 'Quiero enviar productos' },
                ].map(r => (
                  <button key={r.id} type="button" onClick={() => setReg(v => ({...v, rol: r.id}))} style={{
                    padding: '12px 10px', borderRadius: 14, textAlign: 'center',
                    background: reg.rol === r.id ? 'linear-gradient(135deg,#667eea,#764ba2)' : '#f0f2ff',
                    border: `2px solid ${reg.rol === r.id ? '#764ba2' : '#e8eaff'}`,
                    cursor: 'pointer', transition: 'all .2s', fontFamily: 'Poppins,sans-serif',
                  }}>
                    <div style={{ fontSize: '1.5rem', marginBottom: 4 }}>{r.emoji}</div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: reg.rol === r.id ? '#fff' : '#1a1a2e' }}>{r.label}</div>
                    <div style={{ fontSize: 10, color: reg.rol === r.id ? 'rgba(255,255,255,.8)' : '#9090b0', marginTop: 2 }}>{r.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Contraseña */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <div className="lv-field-label">🔒 Contraseña</div>
                <input type="password" placeholder="••••••••" value={reg.password} onChange={e => setReg(v => ({...v, password: e.target.value}))} required minLength={6} />
              </div>
              <div>
                <div className="lv-field-label">🔒 Confirmar</div>
                <input type="password" placeholder="••••••••" value={reg.confirmar} onChange={e => setReg(v => ({...v, confirmar: e.target.value}))} required />
                {reg.confirmar && reg.password !== reg.confirmar && (
                  <div style={{ fontSize: 10, color: '#ef4444', marginTop: 3, fontWeight: 600 }}>❌ No coinciden</div>
                )}
                {reg.confirmar && reg.password === reg.confirmar && reg.confirmar.length >= 6 && (
                  <div style={{ fontSize: 10, color: '#10b981', marginTop: 3, fontWeight: 600 }}>✅ Coinciden</div>
                )}
              </div>
            </div>

            {error && <div className="alert alert-err">{error}</div>}

            <button type="submit" disabled={loading || edadErr} style={{
              height: 48, borderRadius: 14, marginTop: 4,
              background: edadErr ? '#e0e0f0' : 'linear-gradient(135deg,#667eea,#764ba2)',
              border: 'none', fontFamily: 'Poppins,sans-serif', fontWeight: 700,
              fontSize: 14, color: edadErr ? '#aaa' : '#fff',
              cursor: edadErr ? 'not-allowed' : 'pointer',
              boxShadow: edadErr ? 'none' : '0 4px 20px rgba(102,126,234,.5)',
              opacity: loading ? 0.7 : 1,
            }}>
              {loading ? <span className="rv-spinner" /> : '✨ Crear mi cuenta'}
            </button>

            <p style={{ textAlign: 'center', fontSize: 12, color: '#9090b0', marginTop: 4 }}>
              ¿Ya tienes cuenta?{' '}
              <button type="button" onClick={() => { setVista('login'); setError(''); }} style={{ background: 'none', border: 'none', color: '#667eea', fontWeight: 700, cursor: 'pointer', fontFamily: 'Poppins,sans-serif', fontSize: 12 }}>
                Inicia sesión
              </button>
            </p>
          </form>
        )}

        <p className="lv-footer">RAVEN · Arquitectura de Software · 2025 🐦</p>
      </div>
    </div>
  );
}