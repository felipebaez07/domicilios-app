import { useState, useEffect } from 'react';

// ── Configuración de niveles ──────────────────────────────
const NIVELES = [
  { nivel: 1, nombre: 'Novato',      xpMin: 0,    xpMax: 100,  icon: 'mapPin' },
  { nivel: 2, nombre: 'Mensajero',   xpMin: 100,  xpMax: 300,  icon: 'scooter' },
  { nivel: 3, nombre: 'Veloz',       xpMin: 300,  xpMax: 600,  icon: 'bolt' },
  { nivel: 4, nombre: 'Experto',     xpMin: 600,  xpMax: 1000, icon: 'flame' },
  { nivel: 5, nombre: 'Élite',       xpMin: 1000, xpMax: 1500, icon: 'star' },
  { nivel: 6, nombre: 'Legendario',  xpMin: 1500, xpMax: 9999, icon: 'crown' },
];

// ── Insignias disponibles ────────────────────────────────
export const INSIGNIAS = [
  { id: 'primera_entrega',   icon: 'package', nombre: 'Primera entrega',    desc: 'Completa tu primer pedido',         check: (s) => s.totalEntregas >= 1 },
  { id: 'racha_3',           icon: 'flame',   nombre: 'En llamas',          desc: '3 días activos seguidos',           check: (s) => s.rachaActual >= 3 },
  { id: 'racha_7',           icon: 'bolt',    nombre: 'Imparable',          desc: '7 días activos seguidos',           check: (s) => s.rachaActual >= 7 },
  { id: 'velocista',         icon: 'gauge',   nombre: 'Velocista',          desc: '5 entregas en un día',              check: (s) => s.maxEntregasDia >= 5 },
  { id: 'veterano',          icon: 'star',    nombre: 'Veterano',           desc: '50 entregas en total',              check: (s) => s.totalEntregas >= 50 },
  { id: 'centurion',         icon: 'trophy',  nombre: 'Centurión',          desc: '100 entregas en total',             check: (s) => s.totalEntregas >= 100 },
  { id: 'gps_master',        icon: 'mapPin',  nombre: 'GPS Master',         desc: 'Activa el GPS 10 días seguidos',    check: (s) => s.rachaGPS >= 10 },
  { id: 'nivel_elite',       icon: 'crown',   nombre: 'Élite',              desc: 'Alcanza el nivel 5',                check: (s) => s.nivel >= 5 },
];

export function getNivel(xp) {
  return NIVELES.findLast(n => xp >= n.xpMin) || NIVELES[0];
}

export function useGamification(pedidos = [], userId) {
  const storageKey = `gamification_${userId}`;

  const [stats, setStats] = useState(() => {
    try { return JSON.parse(localStorage.getItem(storageKey)) || {}; } catch { return {}; }
  });

  useEffect(() => {
    if (!pedidos.length && !userId) return;

    const entregados = pedidos.filter(p => p.estado === 'entregado');
    const totalEntregas = entregados.length;

    // XP: 10 por entrega base
    const xp = totalEntregas * 10;
    const nivelInfo = getNivel(xp);

    // Racha: días con al menos una entrega
    const diasConEntrega = new Set(
      entregados.map(p => new Date(p.created_at || p.updated_at).toDateString())
    );
    // Calcular racha actual (días consecutivos hasta hoy)
    let rachaActual = 0;
    const hoy = new Date();
    for (let i = 0; i < 365; i++) {
      const d = new Date(hoy);
      d.setDate(d.getDate() - i);
      if (diasConEntrega.has(d.toDateString())) rachaActual++;
      else if (i > 0) break;
    }

    // Máx entregas en un día
    const porDia = {};
    entregados.forEach(p => {
      const dia = new Date(p.created_at || p.updated_at).toDateString();
      porDia[dia] = (porDia[dia] || 0) + 1;
    });
    const maxEntregasDia = Math.max(0, ...Object.values(porDia));

    // GPS racha (guardado en localStorage separado)
    const rachaGPS = parseInt(localStorage.getItem(`gps_racha_${userId}`) || '0');

    const newStats = {
      xp, totalEntregas, rachaActual, maxEntregasDia,
      nivel: nivelInfo.nivel, rachaGPS,
      entregasHoy: porDia[new Date().toDateString()] || 0,
    };

    // Calcular insignias desbloqueadas
    const yaDesbloqueadas = stats.insignias || [];
    const nuevasInsignias = INSIGNIAS
      .filter(i => i.check(newStats))
      .map(i => i.id);
    // Detectar nuevas (para animación)
    const recienDesbloqueadas = nuevasInsignias.filter(id => !yaDesbloqueadas.includes(id));

    const finalStats = { ...newStats, insignias: nuevasInsignias, recienDesbloqueadas };
    setStats(finalStats);
    localStorage.setItem(storageKey, JSON.stringify(finalStats));
  }, [pedidos.length, userId]);

  return stats;
}