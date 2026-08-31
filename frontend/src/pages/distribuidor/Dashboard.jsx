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
  pendiente: { label:'Pendiente', cls:'badge-warn', icon:'bell' },
  asignado:  { label:'Asignado',  cls:'badge-info', icon:'user' },
  en_camino: { label:'En camino', cls:'badge-info', icon:'scooter' },
  entregado: { label:'Entregado', cls:'badge-ok',   icon:'checkCircle' },
  cancelado: { label:'Cancelado', cls:'badge-err',  icon:'x' },
};

export default function DistribuidorDashboard() {
  const { token } = useAuth();
  const [pedidos, setPedidos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal]     = useState(false);
  const [filter, setFilter]   = useState('todos');
  const [form, setForm]       = useState({ cliente_nombre:'', telefono:'', direccion_entrega:'', descripcion:'' });
  const [saving, setSaving]   = useState(false);
  const [success, setSuccess] = useState('');

  const h = { Authorization: `Bearer ${token}` };

  function fetchData() {
    axios.get(`${API}/pedidos/mis-pedidos`, { headers: h })
      .then(r => setPedidos(r.data)).catch(() => {}).finally(() => setLoading(false));
  }

  useEffect(() => { fetchData(); }, []);
  useAutoRefresh(fetchData, 15000);

  async function crear(e) {
    e.preventDefault(); setSaving(true);
    try {
      await axios.post(`${API}/pedidos`, form, { headers: h });
      setSuccess('¡Pedido creado!');
      setModal(false);
      setForm({ cliente_nombre:'', telefono:'', direccion_entrega:'', descripcion:'' });
      fetchData();
      setTimeout(() => setSuccess(''), 3000);
    } catch {} finally { setSaving(false); }
  }

  const filtrados = filter === 'todos' ? pedidos : pedidos.filter(p => p.estado === filter);
  const stats = {
    total:     pedidos.length,
    pendientes: pedidos.filter(p => p.estado==='pendiente').length,
    en_camino:  pedidos.filter(p => p.estado==='en_camino').length,
    entregados: pedidos.filter(p => p.estado==='entregado').length,
  };

  return (
    <DashboardLayout role="distribuidor" pageTitle="Dashboard">
      {success && <div className="alert alert-ok" style={{ margin:'1rem 1.5rem 0' }}>{success}</div>}

      <div className="page-header">
        <div>
          <div className="page-title">Mis pedidos</div>
          <div className="page-subtitle">Gestiona y crea solicitudes de entrega · auto-sync cada 15s</div>
        </div>
        <button className="btn btn-primary" onClick={() => setModal(true)}><Icon name="plus" size={14} color="#fff" />Nuevo pedido</button>
      </div>

      <div className="stats-grid-4">
        <StatCard icon={<Icon name="package" size={20} />} value={String(stats.total)}     label="Total pedidos" delay={0} />
        <StatCard icon={<Icon name="bell" size={20} />} value={String(stats.pendientes)} label="Pendientes"    delay={100} />
        <StatCard icon={<Icon name="scooter" size={20} />} value={String(stats.en_camino)}  label="En camino"     delay={200} />
        <StatCard icon={<Icon name="checkCircle" size={20} />} value={String(stats.entregados)} label="Entregados"    delay={300} />
      </div>

      <div className="white-card">
        <div className="white-card-header">
          <div className="white-card-title"><Icon name="list" size={15} />Historial de pedidos</div>
          <button className="btn btn-white" style={{fontSize:11,padding:'5px 12px'}} onClick={fetchData}><Icon name="refresh" size={12} />Actualizar</button>
        </div>
        <div className="filters-row">
          {['todos','pendiente','asignado','en_camino','entregado','cancelado'].map(f => (
            <button key={f} className={`filter-btn ${filter===f?'active':''}`} onClick={() => setFilter(f)} style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
              {f==='todos' ? <><Icon name="list" size={11} />Todos</> : <><Icon name={ESTADO[f]?.icon} size={11} />{ESTADO[f]?.label||f}</>}
            </button>
          ))}
        </div>
        <div style={{ overflowX:'auto' }}>
          <table className="rv-table">
            <thead><tr><th>#</th><th>Cliente</th><th>Descripción</th><th>Dirección</th><th>Estado</th><th>Fecha</th></tr></thead>
            <tbody>
              {loading
                ? <tr><td colSpan={6} style={{padding:'2rem',textAlign:'center',color:'#8a6d6e'}}>Cargando...</td></tr>
                : filtrados.length === 0
                ? <tr><td colSpan={6} style={{padding:'2rem',textAlign:'center',color:'#8a6d6e'}}>Sin resultados</td></tr>
                : filtrados.map(p => {
                  const est = ESTADO[p.estado]||{label:p.estado,cls:'badge-neutral',icon:'mapPin'};
                  return (
                    <tr key={p.id}>
                      <td className="m">#{String(p.id).slice(-6)}</td>
                      <td className="p">{p.cliente_nombre||p.descripcion}</td>
                      <td>{p.descripcion}</td>
                      <td>{p.direccion_entrega||p.direccion_destino}</td>
                      <td><span className={`badge ${est.cls}`}><Icon name={est.icon} size={10} />{est.label}</span></td>
                      <td className="m">{p.created_at?new Date(p.created_at).toLocaleDateString('es-CO'):'—'}</td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </div>

      {modal && (
        <Modal onClose={() => setModal(false)} width={440}>
          <div className="modal-inner">
            <div className="modal-title">Nuevo pedido</div>
            <div className="modal-sub">Completa los datos de la entrega</div>
            <form onSubmit={crear} style={{ display:'flex', flexDirection:'column', gap:'.75rem' }}>
              {[
                { k:'cliente_nombre',    l:'Nombre del cliente',   p:'Ingresa el nombre del cliente' },
                { k:'telefono',          l:'Teléfono',             p:'Ingresa el número de teléfono' },
                { k:'direccion_entrega', l:'Dirección de entrega', p:'Ingresa la dirección de entrega' },
                { k:'descripcion',       l:'Descripción',          p:'Describe qué vas a enviar' },
              ].map(f => (
                <div key={f.k}>
                  <div className="field-label">{f.l}</div>
                  <input type="text" placeholder={f.p} value={form[f.k]} onChange={e => setForm(v => ({...v,[f.k]:e.target.value}))} required />
                </div>
              ))}
              <div style={{ display:'flex', gap:'.5rem', marginTop:'.25rem' }}>
                <button type="button" onClick={() => setModal(false)} className="btn btn-ghost" style={{ flex:1,height:44,justifyContent:'center' }}>
                  Cancelar
                </button>
                <button type="submit" disabled={saving} className="btn btn-primary" style={{ flex:1,height:44,justifyContent:'center',opacity:saving?0.7:1 }}>
                  {saving ? <span className="rv-spinner" /> : <><Icon name="checkCircle" size={14} color="#fff" />Crear pedido</>}
                </button>
              </div>
            </form>
          </div>
        </Modal>
      )}
    </DashboardLayout>
  );
}