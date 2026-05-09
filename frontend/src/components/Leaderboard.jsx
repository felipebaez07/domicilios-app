import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const PEDIDOS_URL = import.meta.env.VITE_PEDIDOS_URL;

const MEDALLAS = ['🥇','🥈','🥉'];

export default function Leaderboard() {
  const { token, user } = useAuth();
  const [ranking, setRanking] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Trae todos los pedidos entregados y agrupa por domiciliario
    axios.get(`${PEDIDOS_URL}/pedidos/ranking`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => {
        setRanking(r.data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token]);

  function getNivelEmoji(xp) {
    if (xp >= 1500) return '👑';
    if (xp >= 1000) return '💎';
    if (xp >= 600)  return '🔥';
    if (xp >= 300)  return '⚡';
    if (xp >= 100)  return '🛵';
    return '🥚';
  }

  return (
    <div style={{
      background: 'rgba(255,255,255,.12)', borderRadius: 20, padding: '1rem',
      border: '1px solid rgba(255,255,255,.2)',
    }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,.7)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 12, fontFamily: 'Poppins,sans-serif' }}>
        🏆 Ranking domiciliarios
      </div>
      {loading ? (
        <p style={{ color: 'rgba(255,255,255,.5)', fontSize: 12, fontFamily: 'Poppins,sans-serif' }}>⏳ Cargando...</p>
      ) : ranking.length === 0 ? (
        <p style={{ color: 'rgba(255,255,255,.4)', fontSize: 12, fontFamily: 'Poppins,sans-serif' }}>Sin entregas registradas aún</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {ranking.slice(0, 10).map((d, i) => {
            const esYo = d.id === user?.id;
            return (
              <div key={d.id} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '8px 10px', borderRadius: 12,
                background: esYo ? 'rgba(255,255,255,.2)' : 'rgba(255,255,255,.06)',
                border: esYo ? '1px solid rgba(255,255,255,.4)' : '1px solid rgba(255,255,255,.08)',
                transition: 'all .2s',
              }}>
                <div style={{ fontSize: 18, width: 28, textAlign: 'center', flexShrink: 0 }}>
                  {MEDALLAS[i] || `#${i + 1}`}
                </div>
                <div style={{ fontSize: 18, flexShrink: 0 }}>{getNivelEmoji(d.xp)}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#fff', fontFamily: 'Poppins,sans-serif', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {d.nombre}{esYo ? ' (tú)' : ''}
                  </div>
                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,.5)', fontFamily: 'Poppins,sans-serif' }}>
                    {d.xp} XP
                  </div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 800, color: '#fff', fontFamily: 'Poppins,sans-serif' }}>{d.entregas}</div>
                  <div style={{ fontSize: 9, color: 'rgba(255,255,255,.4)', fontFamily: 'Poppins,sans-serif' }}>entregas</div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}