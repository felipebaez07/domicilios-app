import { useState, useEffect } from 'react';
import { INSIGNIAS, getNivel } from '../hooks/useGamification';
import Icon from './Icon';

const NIVELES_CONFIG = [
  { nivel: 1, nombre: 'Novato',     xpMin: 0,    xpMax: 100,  icon: 'mapPin',  color: '#94a3b8' },
  { nivel: 2, nombre: 'Mensajero',  xpMin: 100,  xpMax: 300,  icon: 'scooter', color: '#34d399' },
  { nivel: 3, nombre: 'Veloz',      xpMin: 300,  xpMax: 600,  icon: 'bolt',    color: '#60a5fa' },
  { nivel: 4, nombre: 'Experto',    xpMin: 600,  xpMax: 1000, icon: 'flame',   color: '#fb923c' },
  { nivel: 5, nombre: 'Élite',      xpMin: 1000, xpMax: 1500, icon: 'star',    color: '#a78bfa' },
  { nivel: 6, nombre: 'Legendario', xpMin: 1500, xpMax: 9999, icon: 'crown',   color: '#fbbf24' },
];

function getNivelConfig(nivel) {
  return NIVELES_CONFIG.find(n => n.nivel === nivel) || NIVELES_CONFIG[0];
}

/* ── Animación de insignia nueva ── */
function InsigniaBadge({ insignia, desbloqueada, nueva }) {
  const [glow, setGlow] = useState(nueva);
  useEffect(() => { if (nueva) { const t = setTimeout(() => setGlow(false), 3000); return () => clearTimeout(t); } }, [nueva]);

  return (
    <div title={`${insignia.nombre}: ${insignia.desc}`} style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
      opacity: desbloqueada ? 1 : 0.35, filter: desbloqueada ? 'none' : 'grayscale(1)',
      transition: 'all .3s',
    }}>
      <div style={{
        width: 48, height: 48, borderRadius: 12,
        background: desbloqueada ? '#fff1f0' : '#f4ebea',
        border: glow ? '2px solid #d0121b' : '2px solid #e9dcdb',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: 'pointer', position: 'relative',
        boxShadow: glow ? '0 0 20px rgba(208,18,27,.35)' : 'none',
        animation: glow ? 'pulse 1s infinite' : 'none',
        transition: 'all .3s',
      }}>
        <Icon name={insignia.icon} size={22} color={desbloqueada ? '#d0121b' : '#8a6d6e'} strokeWidth={1.6} />
        {nueva && glow && (
          <div style={{
            position: 'absolute', top: -8, right: -8,
            background: '#d0121b', color: '#fff',
            fontSize: 8, fontWeight: 800, padding: '2px 5px',
            borderRadius: 99, fontFamily: 'Poppins,sans-serif',
          }}>NEW</div>
        )}
      </div>
      <span style={{ fontSize: 9, color: '#8a6d6e', fontFamily: 'Poppins,sans-serif', textAlign: 'center', maxWidth: 52 }}>
        {insignia.nombre}
      </span>
    </div>
  );
}

export default function GamificationPanel({ stats }) {
  const { xp = 0, nivel = 1, rachaActual = 0, totalEntregas = 0, entregasHoy = 0, insignias = [], recienDesbloqueadas = [] } = stats;
  const nivelCfg  = getNivelConfig(nivel);
  const nivelSig  = getNivelConfig(Math.min(nivel + 1, 6));
  const xpEnNivel = xp - (NIVELES_CONFIG[nivel - 1]?.xpMin || 0);
  const xpParaSig = (nivelSig.xpMin || 9999) - (NIVELES_CONFIG[nivel - 1]?.xpMin || 0);
  const progreso  = Math.min(100, Math.round((xpEnNivel / xpParaSig) * 100));

  return (
    <div style={{
      background: '#fff', borderRadius: 20, padding: '1rem',
      border: '1px solid #e9dcdb', boxShadow: '0 2px 10px rgba(34,20,21,0.05)',
      display: 'flex', flexDirection: 'column', gap: 14,
    }}>
      {/* Header nivel */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{
          width: 52, height: 52, borderRadius: 14,
          background: `linear-gradient(135deg, ${nivelCfg.color}44, ${nivelCfg.color}22)`,
          border: `2px solid ${nivelCfg.color}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: `0 4px 20px ${nivelCfg.color}55`,
        }}>
          <Icon name={nivelCfg.icon} size={26} color={nivelCfg.color} strokeWidth={1.6} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
            <div>
              <span style={{ fontSize: 13, fontWeight: 800, color: nivelCfg.color, fontFamily: 'Poppins,sans-serif' }}>
                Nv.{nivel} {nivelCfg.nombre}
              </span>
              {nivel < 6 && (
                <span style={{ fontSize: 10, color: '#8a6d6e', marginLeft: 6, display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                  <Icon name="chevronRight" size={10} color="#8a6d6e" /> <Icon name={nivelSig.icon} size={11} color="#8a6d6e" /> {nivelSig.nombre}
                </span>
              )}
            </div>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#55393b', fontFamily: 'Poppins,sans-serif' }}>
              {xp} XP
            </span>
          </div>
          {/* Barra XP */}
          <div style={{ height: 8, borderRadius: 99, background: '#f4ebea', overflow: 'hidden' }}>
            <div style={{
              height: '100%', borderRadius: 99, width: `${progreso}%`,
              background: `linear-gradient(90deg, ${nivelCfg.color}, ${nivelSig.color})`,
              transition: 'width 1s ease',
              boxShadow: `0 0 8px ${nivelCfg.color}`,
            }}/>
          </div>
          {nivel < 6 && (
            <div style={{ fontSize: 9, color: '#c9b6b6', marginTop: 3, fontFamily: 'Poppins,sans-serif' }}>
              {xpEnNivel}/{xpParaSig} XP para {nivelSig.nombre}
            </div>
          )}
        </div>
      </div>

      {/* Stats rápidos */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
        {[
          { icon: 'package', value: totalEntregas, label: 'Total' },
          { icon: 'checkCircle', value: entregasHoy,   label: 'Hoy' },
          { icon: 'flame', value: `${rachaActual}d`, label: 'Racha' },
        ].map(s => (
          <div key={s.label} style={{
            background: '#f4ebea', borderRadius: 12, padding: '8px 6px',
            textAlign: 'center', border: '1px solid #e9dcdb',
          }}>
            <Icon name={s.icon} size={16} color="#55393b" style={{ marginBottom: 2 }} />
            <div style={{ fontSize: 14, fontWeight: 800, color: '#221415', fontFamily: 'Poppins,sans-serif' }}>{s.value}</div>
            <div style={{ fontSize: 9, color: '#8a6d6e', fontFamily: 'Poppins,sans-serif' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Racha visual */}
      {rachaActual > 0 && (
        <div style={{
          background: 'linear-gradient(135deg,rgba(251,146,60,.15),rgba(251,146,60,.05))',
          border: '1px solid rgba(251,146,60,.3)', borderRadius: 12, padding: '8px 12px',
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <Icon name="flame" size={22} color="#fb923c" />
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#fb923c', fontFamily: 'Poppins,sans-serif' }}>
              ¡{rachaActual} día{rachaActual !== 1 ? 's' : ''} de racha!
            </div>
            <div style={{ fontSize: 10, color: '#8a6d6e', fontFamily: 'Poppins,sans-serif' }}>
              {rachaActual >= 7 ? '¡Imparable! Sigue así' : `${7 - rachaActual} días más para la insignia Imparable`}
            </div>
          </div>
        </div>
      )}

      {/* Insignias */}
      <div>
        <div style={{ fontSize: 10, fontWeight: 700, color: '#8a6d6e', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 10, fontFamily: 'Poppins,sans-serif', display: 'flex', alignItems: 'center', gap: 5 }}>
          <Icon name="trophy" size={12} />Insignias ({insignias.length}/{INSIGNIAS.length})
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8 }}>
          {INSIGNIAS.map(ins => (
            <InsigniaBadge
              key={ins.id}
              insignia={ins}
              desbloqueada={insignias.includes(ins.id)}
              nueva={recienDesbloqueadas.includes(ins.id)}
            />
          ))}
        </div>
      </div>
      <style>{`@keyframes pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.1)}}`}</style>
    </div>
  );
}