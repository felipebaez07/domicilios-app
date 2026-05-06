import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import DashboardLayout from '../../components/DashboardLayout';

const API = import.meta.env.VITE_PEDIDOS_URL;

const ESTADO = {
  pendiente: { label: 'PENDIENTE', cls: 'badge-warn', color: 'rgba(184,207,232,0.3)' },
  asignado:  { label: 'ASIGNADO',  cls: 'badge-info', color: 'var(--mid)'            },
  en_camino: { label: 'EN CAMINO', cls: 'badge-info', color: 'var(--mid)'            },
  entregado: { label: 'ENTREGADO', cls: 'badge-ok',   color: 'var(--blue)'           },
  cancelado: { label: 'CANCELADO', cls: 'badge-err',  color: 'rgba(200,100,100,0.6)' },
};

function MiniBar({ data, max }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 60, padding: '0 0.25rem' }}>
      {data.map(d => (
        <div key={d.label} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
          <div style={{ fontSize: 7, fontFamily: 'var(--font-mono)', color: 'rgba(184,207,232,0.2)', letterSpacing: '0.04em' }}>{d.value || ''}</div>
          <div style={{ width: '100%', background: 'var(--blue)', opacity: d.value ? 0.7 : 0.1, height: max > 0 ? `${(d.value / max) * 44 + 4}px` : '4px', transition: 'height 0.4s ease', minHeight: 4 }} />
          <div style={{ fontSize: 6, fontFamily: 'var(--font-mono)', color: 'rgba(184,207,232,0.2)', letterSpacing: '0.04em' }}>{d.label}</div>
        </div>
      ))}
    </div>
  );
}

export default function AdminDashboard() {
  const { token } = useAuth();
  const [pedidos, setPedidos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search,  setSearch]  = useState('');
  const [filter,  setFilter]  = useState('todos');
  const [page,    setPage]    = useState(1);
  const PER = 12;

  useEffect(() => {
    axios.get(`${API}/pedidos/todos`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => setPedidos(r.data)).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const counts = Object.fromEntries(Object.keys(ESTADO).map(k => [k, pedidos.filter(p => p.estado === k).length]));
  const total  = pedidos.length;
  const tasa   = total > 0 ? Math.round((counts.entregado / total) * 100) : 0;

  const last7 = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (6 - i));
    return {
      label: d.toLocaleDateString('es-CO', { day: '2-digit' }),
      value: pedidos.filter(p => p.created_at && new Date(p.created_at).toDateString() === d.toDateString()).length,
    };
  });
  const barMax = Math.max(...last7.map(d => d.value), 1);

  const filtrados = pedidos.filter(p => {
    const ok = filter === 'todos' || p.estado === filter;
    const s  = !search || [p.cliente_nombre, p.descripcion, p.direccion_entrega, String(p.id)].some(v => v?.toLowerCase().includes(search.toLowerCase()));
    return ok && s;
  });
  const pages     = Math.ceil(filtrados.length / PER) || 1;
  const paginated = filtrados.slice((page - 1) * PER, page * PER);

  return (
    <DashboardLayout role="admin" pageTitle="Métricas">
      {/* Header */}
      <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid rgba(184,207,232,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--blue2)', letterSpacing: '-0.02em' }}>Panel de métricas</div>
          <div style={{ fontSize: 7, fontFamily: 'var(--font-mono)', color: 'var(--dim)', letterSpacing: '0.08em', marginTop: 2 }}>VISTA GLOBAL · {total} PEDIDOS REGISTRADOS</div>
        </div>
        <button onClick={() => { setLoading(true); axios.get(`${API}/pedidos/todos`, { headers: { Authorization: `Bearer ${token}` } }).then(r => setPedidos(r.data)).finally(() => setLoading(false)); }}
          style={{ height: 30, padding: '0 12px', background: 'transparent', border: '1px solid rgba(184,207,232,0.15)', color: 'var(--dim)', fontSize: 8, fontFamily: 'var(--font-mono)', fontWeight: 700, letterSpacing: '0.08em', cursor: 'pointer' }}>
          ↺ SYNC
        </button>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', borderBottom: '1px solid rgba(184,207,232,0.08)' }}>
        {[
          { label: 'Total',      value: total },
          { label: 'Pendientes', value: counts.pendiente },
          { label: 'En camino',  value: counts.en_camino },
          { label: 'Entregados', value: counts.entregado },
          { label: 'Tasa éxito', value: `${tasa}%` },
        ].map((s, i) => (
          <div key={s.label} style={{ padding: '0.85rem 1rem', borderRight: i < 4 ? '1px solid rgba(184,207,232,0.08)' : 'none', transition: 'background 0.15s', cursor: 'default' }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(184,207,232,0.04)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
            <div style={{ fontSize: 6, fontFamily: 'var(--font-mono)', color: 'var(--dim)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 3 }}>{s.label}</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'rgba(184,207,232,0.7)', letterSpacing: '-0.05em', lineHeight: 1 }}>{loading ? '—' : s.value}</div>
          </div>
        ))}
      </div>

      {/* Gráficas */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderBottom: '1px solid rgba(184,207,232,0.08)' }}>
        {/* Barras últimos 7 días */}
        <div style={{ padding: '1rem 1.25rem', borderRight: '1px solid rgba(184,207,232,0.08)' }}>
          <div style={{ fontSize: 7, fontFamily: 'var(--font-mono)', color: 'var(--dim)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.75rem' }}>PEDIDOS ÚLTIMOS 7 DÍAS</div>
          <MiniBar data={last7} max={barMax} />
        </div>

        {/* Distribución por estado */}
        <div style={{ padding: '1rem 1.25rem' }}>
          <div style={{ fontSize: 7, fontFamily: 'var(--font-mono)', color: 'var(--dim)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.75rem' }}>DISTRIBUCIÓN POR ESTADO</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            {Object.entries(ESTADO).map(([k, v]) => {
              const n = counts[k] || 0;
              const pct = total > 0 ? (n / total) * 100 : 0;
              return (
                <div key={k} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <div style={{ fontSize: 7, fontFamily: 'var(--font-mono)', color: 'var(--dim)', width: 72, flexShrink: 0, letterSpacing: '0.04em' }}>{v.label}</div>
                  <div style={{ flex: 1, height: 4, background: 'rgba(184,207,232,0.08)', position: 'relative' }}>
                    <div style={{ position: 'absolute', inset: 0, width: `${pct}%`, background: v.color, transition: 'width 0.4s ease' }} />
                  </div>
                  <div style={{ fontSize: 8, fontFamily: 'var(--font-mono)', color: 'rgba(184,207,232,0.35)', width: 28, textAlign: 'right' }}>{n}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Barra búsqueda y filtros */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 0, borderBottom: '1px solid rgba(184,207,232,0.08)' }}>
        {['todos', 'pendiente', 'asignado', 'en_camino', 'entregado', 'cancelado'].map(f => (
          <button key={f} onClick={() => { setFilter(f); setPage(1); }} style={{
            padding: '8px 10px', fontSize: 6, fontFamily: 'var(--font-mono)', fontWeight: 700,
            letterSpacing: '0.08em', textTransform: 'uppercase',
            background: filter === f ? 'rgba(184,207,232,0.07)' : 'transparent',
            color: filter === f ? 'var(--blue)' : 'var(--dim)',
            border: 'none', borderRight: '1px solid rgba(184,207,232,0.06)', cursor: 'pointer',
          }}>
            {f === 'todos' ? 'TODOS' : ESTADO[f]?.label || f}
          </button>
        ))}
        <div style={{ flex: 1, borderLeft: '1px solid rgba(184,207,232,0.08)' }}>
          <input type="search" placeholder="Buscar cliente, pedido..." value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            style={{ border: 'none', borderRadius: 0, height: 32, background: 'transparent', fontSize: 9 }} />
        </div>
      </div>

      {/* Tabla */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              {['#', 'Cliente', 'Descripción', 'Dirección', 'Domiciliario', 'Estado', 'Fecha'].map(h => (
                <th key={h} style={{ padding: '5px 1rem', textAlign: 'left', fontSize: 6, fontFamily: 'var(--font-mono)', color: 'rgba(184,207,232,0.2)', letterSpacing: '0.1em', textTransform: 'uppercase', borderBottom: '1px solid rgba(184,207,232,0.07)', whiteSpace: 'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} style={{ padding: '2.5rem', textAlign: 'center', fontSize: 9, fontFamily: 'var(--font-mono)', color: 'rgba(184,207,232,0.15)', letterSpacing: '0.06em' }}>CARGANDO...</td></tr>
            ) : paginated.map(p => {
              const est = ESTADO[p.estado] || { label: p.estado.toUpperCase(), cls: 'badge-neutral' };
              return (
                <tr key={p.id} style={{ borderBottom: '1px solid rgba(184,207,232,0.05)', transition: 'background 0.15s' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(184,207,232,0.04)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <td style={{ padding: '6px 1rem', fontSize: 8, fontFamily: 'var(--font-mono)', color: 'rgba(184,207,232,0.2)' }}>#{String(p.id).slice(-6)}</td>
                  <td style={{ padding: '6px 1rem', fontSize: 11, fontWeight: 600, color: 'var(--blue2)' }}>{p.cliente_nombre}</td>
                  <td style={{ padding: '6px 1rem', fontSize: 9, fontFamily: 'var(--font-mono)', color: 'var(--dim)' }}>{p.descripcion}</td>
                  <td style={{ padding: '6px 1rem', fontSize: 9, fontFamily: 'var(--font-mono)', color: 'var(--dim)', maxWidth: 160 }}>{p.direccion_entrega}</td>
                  <td style={{ padding: '6px 1rem', fontSize: 10, color: p.domiciliario_nombre ? 'var(--blue)' : 'rgba(184,207,232,0.2)' }}>{p.domiciliario_nombre || '—'}</td>
                  <td style={{ padding: '6px 1rem' }}><span className={`badge ${est.cls}`}>{est.label}</span></td>
                  <td style={{ padding: '6px 1rem', fontSize: 8, fontFamily: 'var(--font-mono)', color: 'rgba(184,207,232,0.2)', whiteSpace: 'nowrap' }}>{p.created_at ? new Date(p.created_at).toLocaleDateString('es-CO') : '—'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Paginación */}
      {pages > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 1.25rem', borderTop: '1px solid rgba(184,207,232,0.08)' }}>
          <span style={{ fontSize: 8, fontFamily: 'var(--font-mono)', color: 'rgba(184,207,232,0.2)' }}>PÁG {page} / {pages}</span>
          <div style={{ display: 'flex', gap: 4 }}>
            <button onClick={() => setPage(v => v - 1)} disabled={page === 1} style={{ padding: '4px 10px', fontSize: 8, fontFamily: 'var(--font-mono)', background: 'transparent', border: '1px solid rgba(184,207,232,0.12)', color: 'var(--dim)', cursor: 'pointer', opacity: page === 1 ? 0.3 : 1 }}>← ANT</button>
            <button onClick={() => setPage(v => v + 1)} disabled={page === pages} style={{ padding: '4px 10px', fontSize: 8, fontFamily: 'var(--font-mono)', background: 'transparent', border: '1px solid rgba(184,207,232,0.12)', color: 'var(--dim)', cursor: 'pointer', opacity: page === pages ? 0.3 : 1 }}>SIG →</button>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}