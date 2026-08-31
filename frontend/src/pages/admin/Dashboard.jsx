import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import DashboardLayout from '../../components/DashboardLayout';
import StatCard from '../../components/StatCard';
import Icon from '../../components/Icon';
import { useAutoRefresh } from '../../hooks/useAutoRefresh';

const API = import.meta.env.VITE_PEDIDOS_URL;
const ESTADO = {
  pendiente:{label:'Pendiente',cls:'badge-warn',icon:'bell'},
  asignado:{label:'Asignado',cls:'badge-info',icon:'user'},
  en_camino:{label:'En camino',cls:'badge-info',icon:'scooter'},
  entregado:{label:'Entregado',cls:'badge-ok',icon:'checkCircle'},
  cancelado:{label:'Cancelado',cls:'badge-err',icon:'x'},
};

export default function AdminDashboard() {
  const { token } = useAuth();
  const [pedidos, setPedidos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState('');
  const [filter, setFilter]   = useState('todos');
  const [page, setPage]       = useState(1);
  const PER = 12;

  function fetchData() {
    setLoading(true);
    axios.get(`${API}/pedidos/todos`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => setPedidos(r.data)).catch(() => {}).finally(() => setLoading(false));
  }

  useEffect(() => { fetchData(); }, []);
  useAutoRefresh(fetchData, 15000);

  const counts = Object.fromEntries(Object.keys(ESTADO).map(k => [k, pedidos.filter(p => p.estado===k).length]));
  const total  = pedidos.length;
  const tasa   = total > 0 ? Math.round((counts.entregado/total)*100) : 0;

  const filtrados = pedidos.filter(p => {
    const ok = filter==='todos' || p.estado===filter;
    const s  = !search || [p.cliente_nombre,p.descripcion,p.direccion_entrega,String(p.id)].some(v => v?.toLowerCase().includes(search.toLowerCase()));
    return ok && s;
  });
  const pages = Math.ceil(filtrados.length/PER)||1;
  const paged = filtrados.slice((page-1)*PER, page*PER);

  return (
    <DashboardLayout role="admin" pageTitle="Métricas">
      <div className="page-header">
        <div>
          <div className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Icon name="barChart" size={18} />Panel de métricas</div>
          <div className="page-subtitle">Vista global · {total} pedidos registrados · auto-sync cada 15s</div>
        </div>
        <button className="btn btn-ghost" onClick={fetchData}><Icon name="refresh" size={14} />Sync</button>
      </div>

      <div className="stats-grid-4" style={{ paddingBottom: 0 }}>
        <StatCard icon={<Icon name="package" size={20} />} value={String(total)} label="Total pedidos" delay={0} />
        <StatCard icon={<Icon name="bell" size={20} />} value={String(counts.pendiente||0)} label="Pendientes" delay={100} />
        <StatCard icon={<Icon name="scooter" size={20} />} value={String(counts.en_camino||0)} label="En camino" delay={200} />
        <StatCard icon={<Icon name="checkCircle" size={20} />} value={`${tasa}%`} label="Tasa éxito" delay={300} />
      </div>

      <div style={{ padding:'0 1.5rem 1rem', display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:8 }}>
        {Object.entries(ESTADO).map(([k,v]) => {
          const n = counts[k]||0;
          const pct = total > 0 ? (n/total)*100 : 0;
          return (
            <div key={k} style={{ background:'#fff', borderRadius:14, padding:'0.75rem', border:'1px solid #e9dcdb', boxShadow:'0 2px 8px rgba(34,20,21,0.04)', textAlign:'center' }}>
              <Icon name={v.icon} size={19} color="#55393b" style={{ marginBottom: 4 }} />
              <div style={{ fontSize:'1.2rem', fontWeight:800, color:'#221415', lineHeight:1 }}>{n}</div>
              <div style={{ fontSize:9, color:'#8a6d6e', fontWeight:500, marginTop:2 }}>{v.label}</div>
              <div style={{ height:4, background:'#f4ebea', borderRadius:4, marginTop:6 }}>
                <div style={{ height:'100%', background:'linear-gradient(90deg,#d0121b,#a80e17)', borderRadius:4, width:`${pct}%`, transition:'width 0.8s ease' }} />
              </div>
            </div>
          );
        })}
      </div>

      <div className="white-card">
        <div className="white-card-header">
          <div className="white-card-title"><Icon name="list" size={15} />Todos los pedidos</div>
          <input type="search" placeholder="Buscar..." value={search} onChange={e=>{setSearch(e.target.value);setPage(1);}} style={{ width:200, height:32, fontSize:12 }} />
        </div>
        <div className="filters-row">
          {['todos','pendiente','asignado','en_camino','entregado','cancelado'].map(f => (
            <button key={f} className={`filter-btn ${filter===f?'active':''}`} onClick={()=>{setFilter(f);setPage(1);}} style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
              {f==='todos' ? <><Icon name="list" size={12} />Todos</> : <><Icon name={ESTADO[f]?.icon} size={12} />{ESTADO[f]?.label||f}</>}
            </button>
          ))}
        </div>
        <div style={{ overflowX:'auto' }}>
          <table className="rv-table">
            <thead><tr><th>#</th><th>Cliente</th><th>Descripción</th><th>Domiciliario</th><th>Estado</th><th>Fecha</th></tr></thead>
            <tbody>
              {loading
                ? <tr><td colSpan={6} style={{padding:'2rem',textAlign:'center',color:'#8a6d6e'}}>Cargando...</td></tr>
                : paged.map(p => {
                  const est = ESTADO[p.estado]||{label:p.estado,cls:'badge-neutral',icon:'mapPin'};
                  return (
                    <tr key={p.id}>
                      <td className="m">#{String(p.id).slice(-6)}</td>
                      <td className="p">{p.cliente_nombre||p.descripcion}</td>
                      <td>{p.descripcion}</td>
                      <td style={{color:p.domiciliario_nombre?'#1a9c53':'#c9b6b6'}}>{p.domiciliario_nombre||'—'}</td>
                      <td><span className={`badge ${est.cls}`}><Icon name={est.icon} size={10} />{est.label}</span></td>
                      <td className="m">{p.created_at?new Date(p.created_at).toLocaleDateString('es-CO'):'—'}</td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
        {pages>1 && (
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'0.75rem 1.25rem',borderTop:'2px solid #e9dcdb'}}>
            <span style={{fontSize:11,color:'#8a6d6e'}}>Página {page} de {pages}</span>
            <div style={{display:'flex',gap:6}}>
              <button onClick={()=>setPage(v=>v-1)} disabled={page===1} className="btn btn-white" style={{fontSize:11,padding:'4px 12px',opacity:page===1?0.4:1}}><Icon name="chevronLeft" size={12} />Anterior</button>
              <button onClick={()=>setPage(v=>v+1)} disabled={page===pages} className="btn btn-white" style={{fontSize:11,padding:'4px 12px',opacity:page===pages?0.4:1}}>Siguiente<Icon name="chevronRight" size={12} /></button>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}