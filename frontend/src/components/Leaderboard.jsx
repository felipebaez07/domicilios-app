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
      background: '#fff', borderRadius: 20, padding: '1rem',
      border: '1px solid #e9dcdb', boxShadow: '0 2px 10px rgba(34,20,21,0.05)',
    }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: '#55393b', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 12, fontFamily: 'Poppins,sans-serif' }}>
        🏆 Ranking domiciliarios
      </div>
      {loading ? (
        <p style={{ color: '#8a6d6e', fontSize: 12, fontFamily: 'Poppins,sans-serif' }}>⏳ Cargando...</p>
      ) : ranking.length === 0 ? (
        <p style={{ color: '#c9b6b6', fontSize: 12, fontFamily: 'Poppins,sans-serif' }}>Sin entregas registradas aún</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {ranking.slice(0, 10).map((d, i) => {
            const esYo = d.id === user?.id;
            return (
              <div key={d.id} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '8px 10px', borderRadius: 12,
                background: esYo ? '#fff1f0' : '#f4ebea',
                border: esYo ? '1px solid #ffb8b2' : '1px solid #e9dcdb',
                transition: 'all .2s',
              }}>
                <div style={{ fontSize: 18, width: 28, textAlign: 'center', flexShrink: 0 }}>
                  {MEDALLAS[i] || `#${i + 1}`}
                </div>
                <div style={{ fontSize: 18, flexShrink: 0 }}>{getNivelEmoji(d.xp)}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#221415', fontFamily: 'Poppins,sans-serif', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {d.nombre}{esYo ? ' (tú)' : ''}
                  </div>
                  <div style={{ fontSize: 10, color: '#8a6d6e', fontFamily: 'Poppins,sans-serif' }}>
                    {d.xp} XP
                  </div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 800, color: '#221415', fontFamily: 'Poppins,sans-serif' }}>{d.entregas}</div>
                  <div style={{ fontSize: 9, color: '#c9b6b6', fontFamily: 'Poppins,sans-serif' }}>entregas</div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}