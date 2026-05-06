import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import ravenLogo  from '../../assets/raven_logo.png';
import ilDist     from '../../assets/rol_distribuidor.png';
import ilCliente  from '../../assets/rol_cliente.png';
import ilDomi     from '../../assets/rol_domiciliario.png';
import ilOper     from '../../assets/rol_operador.png';
import ilAdmin    from '../../assets/rol_admin.png';
import './Login.css';

const ROLES = [
  { id: 'distribuidor', code: 'D', label: 'Distribuidor', desc: 'Crear y despachar pedidos',  img: ilDist    },
  { id: 'cliente',      code: 'C', label: 'Cliente',      desc: 'Rastrear mis pedidos',        img: ilCliente },
  { id: 'domiciliario', code: 'M', label: 'Domiciliario', desc: 'Gestionar entregas en ruta',  img: ilDomi    },
  { id: 'operador',     code: 'O', label: 'Operador',     desc: 'Centro de control en vivo',   img: ilOper    },
  { id: 'admin',        code: 'A', label: 'Admin',        desc: 'Métricas globales',            img: ilAdmin   },
];

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

  return (
    <div className="rv-root">
      {/* Patrón de fondo */}
      <div className="rv-bg-grid" />

      {/* Ilustración de rol como fondo suave */}
      <div className="rv-bg-il">
        {ROLES.map(r => (
          <img key={r.id} src={r.img} alt="" className={`rv-bg-il-img ${selected?.id === r.id ? 'vis' : ''}`} />
        ))}
      </div>

      {/* Tarjeta centrada */}
      <div className="rv-card">
        {/* Logo protagonista */}
        <div className="rv-card-logo">
          <img src={ravenLogo} alt="Raven" className="rv-logo-img" />
          <div className="rv-logo-name">RAVEN</div>
          <div className="rv-logo-tag">Plataforma de domicilios · Ibagué</div>
        </div>

        {/* Roles */}
        <div className="rv-roles">
          {ROLES.map(r => (
            <button
              key={r.id}
              className={`rv-role-row ${role === r.id ? 'active' : ''}`}
              onClick={() => { setRole(r.id); setError(''); }}
              type="button"
            >
              <div className="rv-role-code">{r.code}</div>
              <div className="rv-role-label">{r.label}</div>
              <div className="rv-role-desc">{r.desc}</div>
              <div className="rv-role-arr">{role === r.id ? '●' : '→'}</div>
            </button>
          ))}
        </div>

        {/* Formulario */}
        <form className="rv-form" onSubmit={handleSubmit}>
          <div className="rv-fields">
            <div className="rv-field">
              <span className="rv-ftag">Email</span>
              <input
                type="email" className="rv-fin"
                placeholder="usuario@raven.co"
                value={email} onChange={e => setEmail(e.target.value)}
                required autoComplete="email"
              />
            </div>
            <div className="rv-field">
              <span className="rv-ftag">Pass</span>
              <input
                type={showPw ? 'text' : 'password'} className="rv-fin"
                placeholder="••••••••"
                value={password} onChange={e => setPassword(e.target.value)}
                required autoComplete="current-password"
              />
              <button type="button" className="rv-pw" onClick={() => setShowPw(v => !v)}>
                {showPw ? '○' : '●'}
              </button>
            </div>
          </div>

          {error && <div className="rv-error">⚠ {error}</div>}

          <button
            type="submit"
            className={`rv-submit ${!role || loading ? 'off' : ''}`}
            disabled={!role || loading}
          >
            {loading
              ? <span className="rv-spinner" />
              : <><span>{selected ? `Entrar como ${selected.label}` : 'Selecciona un rol'}</span><span className="rv-arr">→</span></>
            }
          </button>
        </form>

        <div className="rv-footer">RAVEN · Arquitectura de Software · 2025</div>
      </div>
    </div>
  );
}