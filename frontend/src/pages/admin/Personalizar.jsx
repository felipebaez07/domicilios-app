import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import DashboardLayout from '../../components/DashboardLayout';
import Icon from '../../components/Icon';

const AUTH_URL = import.meta.env.VITE_AUTH_URL;

const EMOJIS_EMPRESA = ['🏢','🚀','⚡','🌟','💎','🔥','🛵','📦','🎯','🦅','🐉','🏆'];

const PALETAS = [
  { nombre:'Carmesí',   c1:'#d0121b', c2:'#a80e17' },
  { nombre:'Índigo',    c1:'#667eea', c2:'#764ba2' },
  { nombre:'Violeta',   c1:'#8b5cf6', c2:'#6d28d9' },
  { nombre:'Verde',     c1:'#10b981', c2:'#059669' },
  { nombre:'Ámbar',     c1:'#f59e0b', c2:'#d97706' },
  { nombre:'Azul',      c1:'#3b82f6', c2:'#1d4ed8' },
  { nombre:'Rosa',      c1:'#ec4899', c2:'#be185d' },
  { nombre:'Naranja',   c1:'#f97316', c2:'#c2410c' },
  { nombre:'Cian',      c1:'#06b6d4', c2:'#0e7490' },
  { nombre:'Oscuro',    c1:'#221415', c2:'#16213e' },
];

export default function AdminPersonalizar() {
  const { token, user, login } = useAuth();
  const [form, setForm]   = useState({
    nombre:  user?.empresa_nombre || '',
    color1:  user?.empresa_color1 || '#d0121b',
    color2:  user?.empresa_color2 || '#a80e17',
    emoji:   user?.empresa_emoji  || '🏢',
  });
  const [saving, setSaving]   = useState(false);
  const [success, setSuccess] = useState('');

  const h = { Authorization: `Bearer ${token}` };
  const empresaId = user?.empresa_id;

  async function guardar(e) {
    e.preventDefault(); setSaving(true);
    try {
      await axios.patch(`${AUTH_URL}/empresas/${empresaId}/personalizar`, form, { headers: h });
      // Actualizar el usuario en localStorage con los nuevos colores
      const nuevoUser = {
        ...user,
        empresa_nombre: form.nombre,
        empresa_color1: form.color1,
        empresa_color2: form.color2,
        empresa_emoji:  form.emoji,
      };
      login(token, nuevoUser);
      setSuccess('¡Cambios guardados! Recarga para ver los colores aplicados.');
      setTimeout(() => setSuccess(''), 4000);
    } catch {
      alert('Error al guardar');
    } finally { setSaving(false); }
  }

  const previewGrad = `linear-gradient(135deg, ${form.color1}, ${form.color2})`;

  return (
    <DashboardLayout role="admin" pageTitle="Personalizar">
      <div className="page-header">
        <div>
          <div className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Icon name="palette" size={18} />Personalizar empresa</div>
          <div className="page-subtitle">Configura los colores y la identidad de tu empresa</div>
        </div>
      </div>

      <div className="responsive-split" style={{ '--split-cols': '1fr 320px', padding: '1.5rem', gap: '1.5rem', alignItems: 'start' }}>

        {/* Formulario */}
        <form onSubmit={guardar} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

          {success && <div className="alert alert-ok">{success}</div>}

          {/* Nombre */}
          <div style={{ background: '#fff', borderRadius: 20, padding: '1.25rem', border: '1px solid #e9dcdb', boxShadow: '0 2px 10px rgba(34,20,21,0.05)' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#221415', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}><Icon name="building" size={14} />Nombre de la empresa</div>
            <input
              type="text"
              placeholder="Ingresa el nombre de tu empresa"
              value={form.nombre}
              onChange={e => setForm(v => ({...v, nombre: e.target.value}))}
              style={{ fontSize: 14, fontWeight: 600 }}
            />
          </div>

          {/* Emoji */}
          <div style={{ background: '#fff', borderRadius: 20, padding: '1.25rem', border: '1px solid #e9dcdb', boxShadow: '0 2px 10px rgba(34,20,21,0.05)' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#221415', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}><Icon name="sparkles" size={14} />Ícono de la empresa</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {EMOJIS_EMPRESA.map(em => (
                <button key={em} type="button" onClick={() => setForm(v => ({...v, emoji: em}))} style={{
                  width: 48, height: 48, borderRadius: 12, fontSize: '1.5rem',
                  background: form.emoji === em ? '#fff1f0' : '#f4ebea',
                  border: `2px solid ${form.emoji === em ? '#ffb8b2' : '#e9dcdb'}`,
                  cursor: 'pointer', transition: 'all .15s',
                  transform: form.emoji === em ? 'scale(1.15)' : 'scale(1)',
                }}>
                  {em}
                </button>
              ))}
            </div>
          </div>

          {/* Paletas predefinidas */}
          <div style={{ background: '#fff', borderRadius: 20, padding: '1.25rem', border: '1px solid #e9dcdb', boxShadow: '0 2px 10px rgba(34,20,21,0.05)' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#221415', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}><Icon name="palette" size={14} />Paleta de colores</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 8, marginBottom: 16 }}>
              {PALETAS.map(p => (
                <button key={p.nombre} type="button" onClick={() => setForm(v => ({...v, color1: p.c1, color2: p.c2}))} style={{
                  height: 48, borderRadius: 12,
                  background: `linear-gradient(135deg, ${p.c1}, ${p.c2})`,
                  border: `3px solid ${form.color1 === p.c1 ? '#fff' : 'transparent'}`,
                  cursor: 'pointer', transition: 'all .15s',
                  transform: form.color1 === p.c1 ? 'scale(1.08)' : 'scale(1)',
                  boxShadow: form.color1 === p.c1 ? '0 4px 15px rgba(0,0,0,.3)' : 'none',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 10, color: '#fff', fontWeight: 600, fontFamily: 'Poppins,sans-serif',
                }}>
                  {form.color1 === p.c1 ? <Icon name="checkCircle" size={16} color="#fff" strokeWidth={2.2} /> : ''}
                </button>
              ))}
            </div>

            {/* Colores custom */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {[
                { k: 'color1', l: 'Color principal' },
                { k: 'color2', l: 'Color secundario' },
              ].map(f => (
                <div key={f.k}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: '#55393b', marginBottom: 6 }}>{f.l}</div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <input
                      type="color"
                      value={form[f.k]}
                      onChange={e => setForm(v => ({...v, [f.k]: e.target.value}))}
                      style={{ width: 44, height: 44, borderRadius: 10, border: '2px solid #e9dcdb', cursor: 'pointer', background: 'none', padding: 2 }}
                    />
                    <input
                      type="text"
                      value={form[f.k]}
                      onChange={e => setForm(v => ({...v, [f.k]: e.target.value}))}
                      style={{ flex: 1, fontSize: 12, fontWeight: 600, fontFamily: 'monospace' }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <button type="submit" disabled={saving} style={{
            height: 50, borderRadius: 14,
            background: previewGrad,
            border: 'none', fontFamily: 'Poppins,sans-serif',
            fontWeight: 700, fontSize: 15, color: '#fff',
            cursor: 'pointer', opacity: saving ? 0.7 : 1,
            boxShadow: `0 6px 20px ${form.color1}50`,
            transition: 'all .2s',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}>
            {saving ? <span className="rv-spinner" /> : <><Icon name="checkCircle" size={15} color="#fff" />Guardar cambios</>}
          </button>
        </form>

        {/* Preview */}
        <div style={{ position: 'sticky', top: 20 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#8a6d6e', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Icon name="eye" size={13} />Vista previa
          </div>

          {/* Mini dashboard preview */}
          <div style={{ borderRadius: 20, overflow: 'hidden', boxShadow: '0 20px 50px rgba(34,20,21,0.12)', border: '1px solid #e9dcdb' }}>
            {/* Topbar */}
            <div style={{ background: '#fff', padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #e9dcdb' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: form.color1 }}/>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#221415' }}>RAVEN</div>
              </div>
              <div style={{ padding: '3px 10px', borderRadius: 99, background: `${form.color1}18`, fontSize: 10, color: form.color1, fontWeight: 700 }}>
                {form.emoji} Admin
              </div>
            </div>

            {/* Subnav */}
            <div style={{ background: '#fff', padding: '8px 12px', display: 'flex', gap: 6, borderBottom: '1px solid #e9dcdb' }}>
              {[{icon:'barChart',l:'Métricas'},{icon:'package',l:'Pedidos'},{icon:'users',l:'Equipo'}].map((item, i) => (
                <div key={i} style={{ padding: '4px 10px', borderRadius: 99, fontSize: 10, fontWeight: 600, background: i === 0 ? previewGrad : '#f4ebea', color: i === 0 ? '#fff' : '#55393b', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Icon name={item.icon} size={10} />{item.l}
                </div>
              ))}
            </div>

            {/* Stats */}
            <div style={{ background: '#faf5f4', padding: '12px', display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
              {[{icon:'package',v:'24',l:'Pedidos'},{icon:'scooter',v:'3',l:'En ruta'},{icon:'checkCircle',v:'18',l:'Entregados'}].map((s,i) => (
                <div key={i} style={{ background: '#fff', borderRadius: 10, padding: '8px', textAlign: 'center', border: '1px solid #e9dcdb' }}>
                  <Icon name={s.icon} size={14} color="#55393b" />
                  <div style={{ fontSize: 16, fontWeight: 800, color: '#221415' }}>{s.v}</div>
                  <div style={{ fontSize: 8, color: '#8a6d6e', textTransform: 'uppercase', letterSpacing: '.05em' }}>{s.l}</div>
                </div>
              ))}
            </div>

            {/* Empresa nombre */}
            <div style={{ background: '#fff', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: previewGrad, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}>
                {form.emoji}
              </div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#221415' }}>{form.nombre || 'Mi Empresa'}</div>
                <div style={{ fontSize: 10, color: '#8a6d6e' }}>Panel de administración</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}