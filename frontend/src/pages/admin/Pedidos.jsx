import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import DashboardLayout from '../../components/DashboardLayout';
import StatCard from '../../components/StatCard';
import Modal from '../../components/Modal';
import Icon from '../../components/Icon';
import { useAutoRefresh } from '../../hooks/useAutoRefresh';

const API = import.meta.env.VITE_PEDIDOS_URL;
const ESTADO = {
  pendiente:  { label: 'Pendiente',  cls: 'badge-warn', icon: 'bell' },
  asignado:   { label: 'Asignado',   cls: 'badge-info', icon: 'user' },
  en_camino:  { label: 'En camino',  cls: 'badge-info', icon: 'scooter' },
  entregado:  { label: 'Entregado',  cls: 'badge-ok',   icon: 'checkCircle' },
  cancelado:  { label: 'Cancelado',  cls: 'badge-err',  icon: 'x' },
};

const DETALLE_ROWS = [
  { k: 'cliente_nombre',     icon: 'user',    label: 'Cliente' },
  { k: 'telefono',           icon: 'phone',   label: 'Teléfono' },
  { k: 'descripcion',        icon: 'package', label: 'Pedido' },
  { k: 'direccion_origen',   icon: 'mapPin',  label: 'Recogida' },
  { k: 'direccion_entrega',  icon: 'home',    label: 'Entrega' },
  { k: 'domiciliario_nombre',icon: 'scooter', label: 'Domiciliario' },
];

export default function AdminPedidos() {
  const { token } = useAuth();
  const [pedidos, setPedidos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState('');
  const [filter, setFilter]   = useState('todos');
  const [page, setPage]       = useState(1);
  const [selected, setSelected] = useState(null);
  const PER = 12;

  function fetchData() {
    axios.get(`${API}/pedidos/todos`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => setPedidos(r.data)).catch(() => {}).finally(() => setLoading(false));
  }

  useEffect(() => { fetchData(); }, []);
  useAutoRefresh(fetchData, 15000);

  const counts = Object.fromEntries(Object.keys(ESTADO).map(k => [k, pedidos.filter(p => p.estado === k).length]));
  const total  = pedidos.length;

  const filtrados = pedidos.filter(p => {
    const ok = filter === 'todos' || p.estado === filter;
    const s  = !search || [p.cliente_nombre, p.descripcion, p.direccion_entrega, p.domiciliario_nombre, String(p.id)].some(v => v?.toLowerCase().includes(search.toLowerCase()));
    return ok && s;
  });
  const pages = Math.ceil(filtrados.length / PER) || 1;
  const paged = filtrados.slice((page-1)*PER, page*PER);

  return (
    <DashboardLayout role="admin" pageTitle="Pedidos">
      <div className="page-header">
        <div>
          <div className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Icon name="package" size={18} />Todos los pedidos</div>
          <div className="page-subtitle">{total} pedidos registrados · auto-sync cada 15s</div>
        </div>
        <button className="btn btn-ghost" onClick={fetchData}><Icon name="refresh" size={14} />Sync</button>
      </div>

      <div className="stats-grid-4" style={{ paddingBottom: 0 }}>
        <StatCard icon={<Icon name="package" size={20} />} value={String(total)} label="Total pedidos" delay={0} />
        <StatCard icon={<Icon name="bell" size={20} />} value={String(counts.pendiente || 0)} label="Pendientes" delay={100} />
        <StatCard icon={<Icon name="scooter" size={20} />} value={String(counts.en_camino || 0)} label="En camino" delay={200} />
        <StatCard icon={<Icon name="checkCircle" size={20} />} value={String(counts.entregado || 0)} label="Entregados" delay={300} />
      </div>

      <div className="white-card" style={{ marginTop: '1.25rem' }}>
        <div className="white-card-header">
          <div className="white-card-title"><Icon name="list" size={15} />Listado</div>
          <input type="search" placeholder="Buscar cliente, dirección, domiciliario..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} style={{ width: 240, height: 32, fontSize: 12 }} />
        </div>
        <div className="filters-row">
          {['todos', ...Object.keys(ESTADO)].map(f => (
            <button key={f} className={`filter-btn ${filter === f ? 'active' : ''}`} onClick={() => { setFilter(f); setPage(1); }} style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
              {f === 'todos' ? <><Icon name="list" size={12} />Todos</> : <><Icon name={ESTADO[f]?.icon} size={12} />{ESTADO[f]?.label}</>}
            </button>
          ))}
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table className="rv-table">
            <thead><tr><th>#</th><th>Cliente</th><th>Descripción</th><th>Dirección</th><th>Domiciliario</th><th>Estado</th><th>Fecha</th><th></th></tr></thead>
            <tbody>
              {loading
                ? <tr><td colSpan={8} style={{ padding: '2.5rem', textAlign: 'center', color: '#8a6d6e' }}>Cargando...</td></tr>
                : paged.length === 0
                ? <tr><td colSpan={8} style={{ padding: '2.5rem', textAlign: 'center', color: '#8a6d6e' }}>Sin resultados</td></tr>
                : paged.map(p => {
                  const est = ESTADO[p.estado] || { label: p.estado, cls: 'badge-neutral', icon: 'mapPin' };
                  return (
                    <tr key={p.id} onClick={() => setSelected(p)} style={{ cursor: 'pointer' }}>
                      <td className="m">#{String(p.id).slice(-6)}</td>
                      <td className="p">{p.cliente_nombre || '—'}</td>
                      <td style={{ maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.descripcion}</td>
                      <td style={{ maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.direccion_entrega}</td>
                      <td style={{ color: p.domiciliario_nombre ? '#1a9c53' : '#c9b6b6' }}>{p.domiciliario_nombre || '—'}</td>
                      <td><span className={`badge ${est.cls}`}><Icon name={est.icon} size={10} />{est.label}</span></td>
                      <td className="m">{p.created_at ? new Date(p.created_at).toLocaleDateString('es-CO') : '—'}</td>
                      <td>
                        <button onClick={e => { e.stopPropagation(); setSelected(p); }} style={{ width: 28, height: 28, borderRadius: 8, border: '1px solid #e9dcdb', background: '#f4ebea', color: '#55393b', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Icon name="eye" size={13} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
        {pages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 1.25rem', borderTop: '2px solid #e9dcdb' }}>
            <span style={{ fontSize: 11, color: '#8a6d6e' }}>Página {page} de {pages}</span>
            <div style={{ display: 'flex', gap: 6 }}>
              <button onClick={() => setPage(v => v-1)} disabled={page===1} className="btn btn-white" style={{ fontSize: 11, padding: '4px 12px', opacity: page===1?0.4:1 }}><Icon name="chevronLeft" size={12} />Anterior</button>
              <button onClick={() => setPage(v => v+1)} disabled={page===pages} className="btn btn-white" style={{ fontSize: 11, padding: '4px 12px', opacity: page===pages?0.4:1 }}>Siguiente<Icon name="chevronRight" size={12} /></button>
            </div>
          </div>
        )}
      </div>

      {selected && (
        <Modal onClose={() => setSelected(null)} width={440}>
          <div style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
              <div className="modal-title" style={{ marginBottom: 0 }}>Pedido #{String(selected.id).slice(-6)}</div>
              {(() => { const est = ESTADO[selected.estado] || { label: selected.estado, cls: 'badge-neutral', icon: 'mapPin' }; return (
                <span className={`badge ${est.cls}`}><Icon name={est.icon} size={10} />{est.label}</span>
              ); })()}
            </div>
            <div className="modal-sub">
              {selected.created_at ? new Date(selected.created_at).toLocaleString('es-CO') : '—'}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {DETALLE_ROWS.map(r => (
                <div key={r.k} style={{ display: 'flex', gap: 10 }}>
                  <Icon name={r.icon} size={16} color="#8a6d6e" style={{ flexShrink: 0, marginTop: 2 }} />
                  <div>
                    <div style={{ fontSize: 9, color: '#8a6d6e', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.06em' }}>{r.label}</div>
                    <div style={{ fontSize: 13, color: '#221415', fontWeight: 600, marginTop: 1 }}>{selected[r.k] || '—'}</div>
                  </div>
                </div>
              ))}
            </div>
            <button onClick={() => setSelected(null)} className="btn btn-ghost" style={{ width: '100%', justifyContent: 'center', marginTop: '1.5rem' }}>
              Cerrar
            </button>
          </div>
        </Modal>
      )}
    </DashboardLayout>
  );
}
