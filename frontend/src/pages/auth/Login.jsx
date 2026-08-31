import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import RavenMark from '../../components/RavenMark';
import Icon from '../../components/Icon';
import './Login.css';

const AUTH_URL = import.meta.env.VITE_AUTH_URL;

const ROL_INFO = {
  distribuidor: { icon: 'package', label: 'Distribuidor',  desc: 'Gestiona tus envíos' },
  cliente:      { icon: 'user',    label: 'Cliente',       desc: 'Rastrea tus pedidos' },
  domiciliario: { icon: 'scooter', label: 'Domiciliario',  desc: 'Gestiona tus entregas' },
  operador:     { icon: 'map',     label: 'Operador',      desc: 'Centro de control' },
  admin:        { icon: 'bolt',    label: 'Administrador', desc: 'Panel de empresa' },
  superadmin:   { icon: 'crown',   label: 'Superadmin',    desc: 'Plataforma RAVEN' },
};

// Pantalla de bienvenida
function WelcomeScreen({ usuario }) {
  const info = ROL_INFO[usuario?.rol] || { icon: 'user', label: usuario?.rol };
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'linear-gradient(135deg, #d0121b, #a80e17)',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      fontFamily: 'Poppins, sans-serif',
      animation: 'fadeIn .4s ease both',
    }}>
      {/* Logo */}
      <div style={{ marginBottom: 24, animation: 'bounceIn .6s ease both' }}><RavenMark size={72} mono /></div>

      {/* Ícono de rol grande */}
      <div style={{ width: 84, height: 84, borderRadius: 24, background: 'rgba(255,255,255,.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16, animation: 'bounceIn .5s .1s ease both' }}>
        <Icon name={info.icon} size={42} color="#fff" strokeWidth={1.6} />
      </div>

      {/* Bienvenida */}
      <div style={{ fontSize: 14, color: 'rgba(255,255,255,.8)', fontWeight: 500, marginBottom: 8, animation: 'fadeUp .4s .2s ease both', opacity: 0, animationFillMode: 'forwards' }}>
        Bienvenido a RAVEN
      </div>
      <div style={{ fontSize: 22, color: '#fff', fontWeight: 800, marginBottom: 6, animation: 'fadeUp .4s .3s ease both', opacity: 0, animationFillMode: 'forwards' }}>
        {usuario?.nombre}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 20px', borderRadius: 99, background: 'rgba(255,255,255,.2)', border: '1px solid rgba(255,255,255,.3)', animation: 'fadeUp .4s .4s ease both', opacity: 0, animationFillMode: 'forwards' }}>
        <Icon name={info.icon} size={15} color="#fff" />
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
      // Mostrar pantalla de bienvenida ANTES de hacer login
      setWelcome(data.usuario);
      setTimeout(() => {
        login(data.token, data.usuario);
        navigate(`/${data.usuario.rol}`);
      }, 2500);
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
      setWelcome(data.usuario);
      setTimeout(() => {
        login(data.token, data.usuario);
        navigate(`/${data.usuario.rol}`);
      }, 2500);
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
    <div className="lv-root" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>

      {/* Burbujas decorativas */}
      <div className="lv-bubble lv-bubble-1" />
      <div className="lv-bubble lv-bubble-2" />

      <div className="lv-card" style={{ maxHeight: '95vh', overflowY: 'auto' }}>
        {/* Header */}
        <div className="lv-card-top">
          <RavenMark size={64} />
          <div className="lv-app-tag">Plataforma de domicilios · Ibagué</div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 6, padding: '0 1.5rem', marginBottom: '1.25rem' }}>
          {[
            { id: 'login',    label: 'Iniciar sesión', icon: 'lock' },
            { id: 'registro', label: 'Registrarme',    icon: 'sparkles' },
          ].map(tab => (
            <button key={tab.id} onClick={() => { setVista(tab.id); setError(''); }} style={{
              flex: 1, padding: '10px 0', borderRadius: 12,
              background: vista === tab.id ? 'linear-gradient(135deg,#d0121b,#a80e17)' : '#f4ebea',
              color: vista === tab.id ? '#fff' : '#55393b',
              border: 'none', fontFamily: 'Poppins,sans-serif', fontWeight: 700,
              fontSize: 13, cursor: 'pointer', transition: 'all .2s',
              boxShadow: vista === tab.id ? '0 4px 15px rgba(208,18,27,.35)' : 'none',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
            }}>
              <Icon name={tab.icon} size={14} />{tab.label}
            </button>
          ))}
        </div>

        {/* ── LOGIN ── */}
        {vista === 'login' && (
          <form className="lv-form" onSubmit={handleLogin} style={{ padding: '0 1.5rem 1.5rem' }}>
            <div className="lv-field">
              <label className="lv-field-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Icon name="mail" size={13} />Correo electrónico</label>
              <input type="email" placeholder="Ingresa tu correo electrónico" value={email} onChange={e => setEmail(e.target.value)} required autoComplete="email" />
            </div>
            <div className="lv-field">
              <label className="lv-field-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Icon name="lock" size={13} />Contraseña</label>
              <div style={{ position: 'relative' }}>
                <input type={showPw ? 'text' : 'password'} placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} required style={{ paddingRight: '2.5rem' }} />
                <button type="button" onClick={() => setShowPw(v => !v)} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#c9b6b6', display: 'flex' }}>
                  <Icon name={showPw ? 'eyeOff' : 'eye'} size={16} />
                </button>
              </div>
            </div>
            {error && <div className="alert alert-err">{error}</div>}
            <button type="submit" disabled={loading} className="lv-submit" style={{ background: 'linear-gradient(135deg,#d0121b,#a80e17)', boxShadow: '0 4px 20px rgba(208,18,27,.45)', opacity: loading ? 0.7 : 1 }}>
              {loading ? <span className="rv-spinner" /> : <><Icon name="rocket" size={15} color="#fff" />Entrar a RAVEN</>}
            </button>
            <p style={{ textAlign: 'center', fontSize: 12, color: '#8a6d6e', marginTop: 12 }}>
              ¿No tienes cuenta?{' '}
              <button type="button" onClick={() => { setVista('registro'); setError(''); }} style={{ background: 'none', border: 'none', color: '#d0121b', fontWeight: 700, cursor: 'pointer', fontFamily: 'Poppins,sans-serif', fontSize: 12 }}>
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
                <div className="lv-field-label">Nombre</div>
                <input placeholder="Ingresa tu nombre" value={reg.nombre} onChange={e => setReg(v => ({...v, nombre: e.target.value}))} required />
              </div>
              <div>
                <div className="lv-field-label">Apellido</div>
                <input placeholder="Ingresa tu apellido" value={reg.apellido} onChange={e => setReg(v => ({...v, apellido: e.target.value}))} required />
              </div>
            </div>

            {/* Email */}
            <div>
              <div className="lv-field-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Icon name="mail" size={13} />Correo electrónico</div>
              <input type="email" placeholder="Ingresa tu correo electrónico" value={reg.email} onChange={e => setReg(v => ({...v, email: e.target.value}))} required />
            </div>

            {/* Teléfono */}
            <div>
              <div className="lv-field-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Icon name="phone" size={13} />Teléfono</div>
              <input type="tel" placeholder="Ingresa tu número de teléfono" value={reg.telefono} onChange={e => setReg(v => ({...v, telefono: e.target.value}))} />
            </div>

            {/* Fecha nacimiento */}
            <div>
              <div className="lv-field-label">Fecha de nacimiento</div>
              <input type="date" value={reg.fechaNac} onChange={e => setReg(v => ({...v, fechaNac: e.target.value}))} required
                max={new Date(new Date().setFullYear(new Date().getFullYear() - 18)).toISOString().split('T')[0]}
              />
              {reg.fechaNac && (
                <div style={{ fontSize: 11, marginTop: 4, fontWeight: 600, color: edadOk ? '#1a9c53' : '#a80e17', display: 'flex', alignItems: 'center', gap: 5 }}>
                  <Icon name={edadOk ? 'checkCircle' : 'x'} size={12} />
                  {edadOk ? `${edad} años — Mayor de edad` : `${edad} años — Debes ser mayor de 18 años`}
                </div>
              )}
            </div>

            {/* Rol */}
            <div>
              <div className="lv-field-label">Tipo de cuenta</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {[
                  { id: 'cliente',      icon: 'user',    label: 'Cliente',      desc: 'Quiero pedir domicilios' },
                  { id: 'distribuidor', icon: 'package', label: 'Distribuidor', desc: 'Quiero enviar productos' },
                ].map(r => (
                  <button key={r.id} type="button" onClick={() => setReg(v => ({...v, rol: r.id}))} style={{
                    padding: '12px 10px', borderRadius: 14, textAlign: 'center',
                    background: reg.rol === r.id ? 'linear-gradient(135deg,#d0121b,#a80e17)' : '#f4ebea',
                    border: `2px solid ${reg.rol === r.id ? '#a80e17' : '#e9dcdb'}`,
                    cursor: 'pointer', transition: 'all .2s', fontFamily: 'Poppins,sans-serif',
                  }}>
                    <Icon name={r.icon} size={22} color={reg.rol === r.id ? '#fff' : '#55393b'} style={{ marginBottom: 4 }} />
                    <div style={{ fontSize: 12, fontWeight: 700, color: reg.rol === r.id ? '#fff' : '#221415' }}>{r.label}</div>
                    <div style={{ fontSize: 10, color: reg.rol === r.id ? 'rgba(255,255,255,.8)' : '#8a6d6e', marginTop: 2 }}>{r.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Contraseña */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <div className="lv-field-label">Contraseña</div>
                <input type="password" placeholder="••••••••" value={reg.password} onChange={e => setReg(v => ({...v, password: e.target.value}))} required minLength={6} />
              </div>
              <div>
                <div className="lv-field-label">Confirmar</div>
                <input type="password" placeholder="••••••••" value={reg.confirmar} onChange={e => setReg(v => ({...v, confirmar: e.target.value}))} required />
                {reg.confirmar && reg.password !== reg.confirmar && (
                  <div style={{ fontSize: 10, color: '#a80e17', marginTop: 3, fontWeight: 600 }}>No coinciden</div>
                )}
                {reg.confirmar && reg.password === reg.confirmar && reg.confirmar.length >= 6 && (
                  <div style={{ fontSize: 10, color: '#1a9c53', marginTop: 3, fontWeight: 600 }}>Coinciden</div>
                )}
              </div>
            </div>

            {error && <div className="alert alert-err">{error}</div>}

            <button type="submit" disabled={loading || edadErr} style={{
              height: 48, borderRadius: 14, marginTop: 4,
              background: edadErr ? '#e9dcdb' : 'linear-gradient(135deg,#d0121b,#a80e17)',
              border: 'none', fontFamily: 'Poppins,sans-serif', fontWeight: 700,
              fontSize: 14, color: edadErr ? '#c9b6b6' : '#fff',
              cursor: edadErr ? 'not-allowed' : 'pointer',
              boxShadow: edadErr ? 'none' : '0 4px 20px rgba(208,18,27,.45)',
              opacity: loading ? 0.7 : 1,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}>
              {loading ? <span className="rv-spinner" /> : <><Icon name="sparkles" size={15} color={edadErr ? '#c9b6b6' : '#fff'} />Crear mi cuenta</>}
            </button>

            <p style={{ textAlign: 'center', fontSize: 12, color: '#8a6d6e', marginTop: 4 }}>
              ¿Ya tienes cuenta?{' '}
              <button type="button" onClick={() => { setVista('login'); setError(''); }} style={{ background: 'none', border: 'none', color: '#d0121b', fontWeight: 700, cursor: 'pointer', fontFamily: 'Poppins,sans-serif', fontSize: 12 }}>
                Inicia sesión
              </button>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}