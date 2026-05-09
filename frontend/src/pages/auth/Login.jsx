import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import ravenLogo from '../../assets/raven_logo.png';
import ilDist  from '../../assets/rol_distribuidor.png';
import ilCli   from '../../assets/rol_cliente.png';
import ilDomi  from '../../assets/rol_domiciliario.png';
import ilOper  from '../../assets/rol_operador.png';
import ilAdm   from '../../assets/rol_admin.png';
import './Login.css';

const ROLES = [
  { id:'distribuidor', emoji:'📦', label:'Distribuidor', desc:'Crear y despachar pedidos',   g1:'#667eea', g2:'#764ba2', img:ilDist },
  { id:'cliente',      emoji:'👤', label:'Cliente',      desc:'Rastrear mis pedidos',         g1:'#8b5cf6', g2:'#6d28d9', img:ilCli  },
  { id:'domiciliario', emoji:'🛵', label:'Domiciliario', desc:'Gestionar entregas en ruta',   g1:'#10b981', g2:'#059669', img:ilDomi },
  { id:'operador',     emoji:'🗺️', label:'Operador',     desc:'Centro de control en vivo',    g1:'#f59e0b', g2:'#d97706', img:ilOper },
  { id:'admin',        emoji:'⚡', label:'Admin',        desc:'Métricas globales',             g1:'#ef4444', g2:'#dc2626', img:ilAdm  },
];

export default function Login() {
  const [role, setRole]         = useState(null);
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw]     = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const { login }   = useAuth();
  const navigate    = useNavigate();
  const r = ROLES.find(x => x.id === role);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!role) { setError('Selecciona tu rol'); return; }
    setError(''); setLoading(true);
    try {
      const { data } = await axios.post(`${import.meta.env.VITE_AUTH_URL}/login`, { email, password });
      login(data.token, data.usuario);
      navigate(`/${data.usuario.rol}`);
    } catch (err) {
      setError(err.response?.data?.error || 'Credenciales incorrectas');
    } finally { setLoading(false); }
  }

  const bg = r ? `linear-gradient(135deg, ${r.g1}, ${r.g2})` : 'linear-gradient(135deg, #667eea, #764ba2)';

  return (
    <div className="lv-root" style={{ background: bg, transition: 'background 0.5s ease' }}>
      {/* Ilustración de fondo */}
      <div className="lv-bg-il">
        {ROLES.map(ro => (
          <img key={ro.id} src={ro.img} alt="" className={`lv-il-img ${r?.id === ro.id ? 'vis' : ''}`} />
        ))}
      </div>

      {/* Burbujas decorativas */}
      <div className="lv-bubble lv-bubble-1" style={{ background: 'rgba(255,255,255,0.08)' }} />
      <div className="lv-bubble lv-bubble-2" style={{ background: 'rgba(255,255,255,0.05)' }} />

      {/* Card */}
      <div className="lv-card">
        {/* Header */}
        <div className="lv-card-top">
          <img src={ravenLogo} alt="Raven" className="lv-logo" />
          <div className="lv-app-name">RAVEN</div>
          <div className="lv-app-tag">Plataforma de domicilios · Ibagué</div>
        </div>

        {/* Roles */}
        <div className="lv-roles-label">Selecciona tu rol 👇</div>
        <div className="lv-roles">
          {ROLES.map(ro => (
            <button key={ro.id} className={`lv-role ${role === ro.id ? 'active' : ''}`}
              onClick={() => { setRole(ro.id); setError(''); }}
              style={role === ro.id ? { background: `linear-gradient(135deg,${ro.g1},${ro.g2})`, boxShadow: `0 4px 20px ${ro.g1}60` } : {}}
            >
              <span className="lv-role-emoji">{ro.emoji}</span>
              <div className="lv-role-info">
                <div className="lv-role-name" style={role === ro.id ? { color: '#fff' } : {}}>{ro.label}</div>
                <div className="lv-role-desc" style={role === ro.id ? { color: 'rgba(255,255,255,0.75)' } : {}}>{ro.desc}</div>
              </div>
              {role === ro.id && <span style={{ color: '#fff', fontSize: 16 }}>✓</span>}
            </button>
          ))}
        </div>

        {/* Form */}
        <form className="lv-form" onSubmit={handleSubmit}>
          <div className="lv-field">
            <label className="lv-field-label">✉️ Correo electrónico</label>
            <input type="email" placeholder="usuario@raven.co" value={email} onChange={e => setEmail(e.target.value)} required autoComplete="email"
              style={r ? { borderColor: r.g1 + '60' } : {}}
              onFocus={e => { if (r) e.target.style.borderColor = r.g1; }}
              onBlur={e  => { if (r) e.target.style.borderColor = r.g1 + '60'; }}
            />
          </div>
          <div className="lv-field">
            <label className="lv-field-label">🔒 Contraseña</label>
            <div style={{ position: 'relative' }}>
              <input type={showPw ? 'text' : 'password'} placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} required autoComplete="current-password"
                style={{ paddingRight: '2.5rem', ...(r ? { borderColor: r.g1 + '60' } : {}) }}
                onFocus={e => { if (r) e.target.style.borderColor = r.g1; }}
                onBlur={e  => { if (r) e.target.style.borderColor = r.g1 + '60'; }}
              />
              <button type="button" onClick={() => setShowPw(v => !v)} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: '#aaa' }}>
                {showPw ? '🙈' : '👁️'}
              </button>
            </div>
          </div>

          {error && <div className="alert alert-err">{error}</div>}

          <button type="submit" disabled={!role || loading} className="lv-submit"
            style={{ background: r ? `linear-gradient(135deg,${r.g1},${r.g2})` : '#ccc', boxShadow: r ? `0 4px 20px ${r.g1}50` : 'none', cursor: !role ? 'not-allowed' : 'pointer', opacity: !role ? 0.6 : 1 }}
          >
            {loading ? <span className="rv-spinner" /> : <>{r ? `🚀 Entrar como ${r.label}` : 'Selecciona un rol'}</>}
          </button>
        </form>

        <p className="lv-footer">RAVEN · Arquitectura de Software · 2025 🐦</p>
      </div>
    </div>
  );
}