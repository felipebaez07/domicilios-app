import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import DashboardLayout from '../../components/DashboardLayout';

const PEDIDOS_URL = import.meta.env.VITE_PEDIDOS_URL;

const ESTADO_CONFIG = {
  pendiente:  { label: 'Pendiente',  cls: 'badge-warn',    color: '#f59e0b' },
  asignado:   { label: 'Asignado',   cls: 'badge-info',    color: '#3b82f6' },
  en_camino:  { label: 'En camino',  cls: 'badge-info',    color: '#6366f1' },
  entregado:  { label: 'Entregado',  cls: 'badge-ok',      color: '#10b981' },
  cancelado:  { label: 'Cancelado',  cls: 'badge-err',     color: '#ef4444' },
};

// Mini gráfica de barras con SVG inline
function BarChart({ data, height = 120 }) {
  if (!data || data.length === 0) return null;
  const max = Math.max(...data.map(d => d.value), 1);
  const barW = Math.floor(480 / data.length) - 6;

  return (
    <svg width="100%" viewBox={`0 0 480 ${height + 30}`} style={{ display: 'block' }}>
      {data.map((d, i) => {
        const barH = Math.max((d.value / max) * height, 2);
        const x = i * (barW + 6) + 3;
        const y = height - barH;
        return (
          <g key={d.label}>
            <rect
              x={x} y={y} width={barW} height={barH}
              rx={3}
              fill={d.color || '#ef4444'}
              opacity={0.85}
            />
            <text
              x={x + barW / 2} y={height + 16}
              textAnchor="middle"
              fontSize="10"
              fill="#4a5570"
              fontFamily="'DM Mono', monospace"
            >
              {d.label}
            </text>
            {d.value > 0 && (
              <text
                x={x + barW / 2} y={y - 5}
                textAnchor="middle"
                fontSize="11"
                fill="#8b9ab8"
                fontFamily="'DM Mono', monospace"
                fontWeight="500"
              >
                {d.value}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

// Donut SVG
function DonutChart({ data, size = 100 }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  if (total === 0) return null;

  const r = 38, cx = size / 2, cy = size / 2;
  const circumference = 2 * Math.PI * r;

  let cumulative = 0;
  const segments = data.map(d => {
    const pct    = d.value / total;
    const offset = cumulative * circumference;
    const dash   = pct * circumference;
    cumulative  += pct;
    return { ...d, offset, dash };
  });

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-90deg)' }}>
      {segments.map(s => (
        <circle
          key={s.label}
          cx={cx} cy={cy} r={r}
          fill="none"
          stroke={s.color}
          strokeWidth={14}
          strokeDasharray={`${s.dash} ${circumference - s.dash}`}
          strokeDashoffset={-s.offset}
          opacity={0.9}
        />
      ))}
      <circle cx={cx} cy={cy} r={28} fill="var(--bg-surface, #111827)" />
    </svg>
  );
}

export default function AdminDashboard() {
  const { token } = useAuth();
  const [pedidos, setPedidos]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [page, setPage]         = useState(1);
  const [search, setSearch]     = useState('');
  const PER_PAGE = 15;

  const headers = { Authorization: `Bearer ${token}` };

  async function fetchPedidos() {
    try {
      const { data } = await axios.get(`${PEDIDOS_URL}/pedidos/todos`, { headers });
      setPedidos(data);
    } catch { setPedidos([]); }
    finally { setLoading(false); }
  }

  useEffect(() => { fetchPedidos(); }, []);

  // Métricas derivadas
  const counts = Object.fromEntries(
    Object.keys(ESTADO_CONFIG).map(k => [k, pedidos.filter(p => p.estado === k).length])
  );

  const total      = pedidos.length;
  const tasaExito  = total > 0 ? Math.round((counts.entregado / total) * 100) : 0;

  // Datos para gráfica de últimos 7 días
  const last7 = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const key = d.toLocaleDateString('es-CO', { day: '2-digit', month: 'short' });
    const count = pedidos.filter(p => {
      if (!p.created_at) return false;
      const pd = new Date(p.created_at);
      return pd.toDateString() === d.toDateString();
    }).length;
    return { label: key.split(' ')[0], value: count, color: '#ef4444' };
  });

  const donutData = Object.entries(ESTADO_CONFIG).map(([k, v]) => ({
    label: v.label, value: counts[k] || 0, color: v.color,
  }));

  // Tabla con búsqueda y paginación
  const filtered = pedidos.filter(p =>
    !search ||
    p.cliente_nombre?.toLowerCase().includes(search.toLowerCase()) ||
    p.descripcion?.toLowerCase().includes(search.toLowerCase()) ||
    p.direccion_entrega?.toLowerCase().includes(search.toLowerCase()) ||
    String(p.id).includes(search)
  );
  const pages     = Math.ceil(filtered.length / PER_PAGE);
  const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  return (
    <DashboardLayout
      role="admin"
      pageTitle="Panel administrativo"
      pageSubtitle="Métricas globales"
    >
      <div className="page-header flex-between">
        <div>
          <h1 className="page-title">Panel de métricas</h1>
          <p className="page-subtitle">Vista global del sistema · {total} pedidos registrados</p>
        </div>
        <button className="btn btn-ghost" onClick={fetchPedidos}>↺ Actualizar</button>
      </div>

      {/* KPIs */}
      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(5, 1fr)' }}>
        {[
          { label: 'Total',      value: total,              accent: '#ef4444' },
          { label: 'Pendientes', value: counts.pendiente,   accent: '#f59e0b' },
          { label: 'En camino',  value: counts.en_camino,   accent: '#6366f1' },
          { label: 'Entregados', value: counts.entregado,   accent: '#10b981' },
          { label: 'Tasa éxito', value: `${tasaExito}%`,   accent: '#ef4444', delta: tasaExito > 80 ? '↑ bueno' : '↓ mejorar' },
        ].map(s => (
          <div className="stat-card" key={s.label}>
            <div className="stat-label">{s.label}</div>
            <div className="stat-value" style={{ fontSize: '1.6rem' }}>{loading ? '—' : s.value}</div>
            {s.delta && <div className={`stat-delta ${tasaExito > 80 ? 'up' : 'down'}`}>{s.delta}</div>}
            <div className="stat-accent-line" style={{ background: s.accent }} />
          </div>
        ))}
      </div>

      {/* Gráficas */}
      <div className="grid-2 mb-md">
        {/* Barras - pedidos por día */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">PEDIDOS ÚLTIMOS 7 DÍAS</span>
          </div>
          {loading ? (
            <div style={{ height: 150, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)', fontSize: '0.78rem' }}>
              Cargando...
            </div>
          ) : (
            <BarChart data={last7} height={120} />
          )}
        </div>

        {/* Donut - distribución por estado */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">DISTRIBUCIÓN POR ESTADO</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
            <div style={{ flexShrink: 0 }}>
              {!loading && <DonutChart data={donutData} size={100} />}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1 }}>
              {donutData.map(d => (
                <div key={d.label} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: d.color, flexShrink: 0 }} />
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', flex: 1 }}>{d.label}</span>
                  <span style={{ fontSize: '0.78rem', fontFamily: 'var(--font-mono)', color: 'var(--text-primary)', fontWeight: 500 }}>
                    {loading ? '—' : d.value}
                  </span>
                  <span style={{ fontSize: '0.65rem', fontFamily: 'var(--font-mono)', color: 'var(--text-tertiary)', minWidth: 32, textAlign: 'right' }}>
                    {total > 0 ? `${Math.round(d.value / total * 100)}%` : '0%'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Tabla completa */}
      <div className="card">
        <div className="card-header">
          <span className="card-title">TODOS LOS PEDIDOS</span>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <input
              type="search"
              placeholder="Buscar..."
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              style={{ width: 200, height: 32, fontSize: '0.78rem', padding: '0 0.75rem' }}
            />
            <span style={{ fontSize: '0.68rem', fontFamily: 'var(--font-mono)', color: 'var(--text-tertiary)', whiteSpace: 'nowrap' }}>
              {filtered.length} resultados
            </span>
          </div>
        </div>

        <div className="data-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>#ID</th>
                <th>Cliente</th>
                <th>Descripción</th>
                <th>Dirección</th>
                <th>Domiciliario</th>
                <th>Estado</th>
                <th>Fecha</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)', fontSize: '0.78rem' }}>Cargando datos...</td></tr>
              ) : paginated.length === 0 ? (
                <tr><td colSpan={7} style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)', fontSize: '0.78rem' }}>Sin resultados</td></tr>
              ) : paginated.map(p => {
                const est = ESTADO_CONFIG[p.estado] || { label: p.estado, cls: 'badge-neutral' };
                return (
                  <tr key={p.id}>
                    <td><span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.68rem', color: 'var(--text-tertiary)' }}>#{String(p.id).slice(-6)}</span></td>
                    <td style={{ color: 'var(--text-primary)', fontWeight: 500, fontSize: '0.85rem' }}>{p.cliente_nombre}</td>
                    <td style={{ fontSize: '0.8rem', maxWidth: 160 }}>{p.descripcion}</td>
                    <td style={{ fontSize: '0.75rem', maxWidth: 180 }}>{p.direccion_entrega}</td>
                    <td style={{ fontSize: '0.8rem', color: p.domiciliario_nombre ? '#34d399' : 'var(--text-tertiary)' }}>
                      {p.domiciliario_nombre || '—'}
                    </td>
                    <td>
                      <span className={`badge ${est.cls}`}>
                        <span className="badge-dot" style={{ background: 'currentColor' }} />
                        {est.label}
                      </span>
                    </td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.68rem', color: 'var(--text-tertiary)', whiteSpace: 'nowrap' }}>
                      {p.created_at ? new Date(p.created_at).toLocaleDateString('es-CO') : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Paginación */}
        {pages > 1 && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 0.5rem 0', borderTop: '1px solid var(--border-subtle)', marginTop: '0.75rem' }}>
            <span style={{ fontSize: '0.72rem', fontFamily: 'var(--font-mono)', color: 'var(--text-tertiary)' }}>
              Página {page} de {pages}
            </span>
            <div style={{ display: 'flex', gap: '0.35rem' }}>
              <button
                className="btn btn-ghost"
                style={{ padding: '3px 10px', fontSize: '0.75rem' }}
                disabled={page === 1}
                onClick={() => setPage(v => v - 1)}
              >
                ← Ant
              </button>
              {Array.from({ length: Math.min(pages, 5) }, (_, i) => {
                const p = i + 1;
                return (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    style={{
                      padding: '3px 8px', fontSize: '0.75rem', borderRadius: 'var(--radius-sm)',
                      background: page === p ? 'rgba(239,68,68,0.12)' : 'transparent',
                      border: `1px solid ${page === p ? 'rgba(239,68,68,0.25)' : 'transparent'}`,
                      color: page === p ? '#f87171' : 'var(--text-secondary)',
                      cursor: 'pointer',
                      fontFamily: 'var(--font-mono)',
                    }}
                  >
                    {p}
                  </button>
                );
              })}
              <button
                className="btn btn-ghost"
                style={{ padding: '3px 10px', fontSize: '0.75rem' }}
                disabled={page === pages}
                onClick={() => setPage(v => v + 1)}
              >
                Sig →
              </button>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}