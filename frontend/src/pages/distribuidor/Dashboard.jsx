import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import DashboardLayout from '../../components/DashboardLayout';
import StatCard from '../../components/StatCard';
import Modal from '../../components/Modal';

const API = import.meta.env.VITE_PEDIDOS_URL;

const ESTADO = {
  pendiente: { label: 'Pendiente', cls: 'badge-warn', emoji: '⏳' },
  asignado:  { label: 'Asignado',  cls: 'badge-info', emoji: '👤' },
  en_camino: { label: 'En camino', cls: 'badge-info', emoji: '🛵' },
  entregado: { label: 'Entregado', cls: 'badge-ok',   emoji: '✅' },
  cancelado: { label: 'Cancelado', cls: 'badge-err',  emoji: '❌' },
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

  async function fetchData() {
    try { const { data } = await axios.get(`${API}/pedidos/mis-pedidos`, { headers: h }); setPedidos(data); }
    catch {} finally { setLoading(false); }
  }

  useEffect(() => { fetchData(); }, []);

  async function crear(e) {
    e.preventDefault(); setSaving(true);
    try {
      await axios.post(`${API}/pedidos`, form, { headers: h });
      setSuccess('¡Pedido creado! 🎉'); setModal(false);
      setForm({ cliente_nombre:'', telefono:'', direccion_entrega:'', descripcion:'' });
      fetchData(); setTimeout(() => setSuccess(''), 3000);
    } catch {} finally { setSaving(false); }
  }

  const filtrados = filter === 'todos' ? pedidos : pedidos.filter(p => p.estado === filter);
  const stats = { total: pedidos.length, pendientes: pedidos.filter(p => p.estado==='pendiente').length, en_camino: pedidos.filter(p => p.estado==='en_camino').length, entregados: pedidos.filter(p => p.estado==='entregado').length };

  return (
    <DashboardLayout role="distribuidor" pageTitle="Dashboard">
      {success && <div className="alert alert-ok" style={{ margin: '1rem 1.5rem 0' }}>{success}</div>}

      <div className="page-header">
        <div>
          <div className="page-title">Mis pedidos 📦</div>
          <div className="page-subtitle">Gestiona y crea solicitudes de entrega</div>
        </div>
        <button className="btn btn-ghost" onClick={() => setModal(true)}>➕ Nuevo pedido</button>
      </div>

      <div className="stats-grid-4">
        <StatCard icon="📦" value={String(stats.total)} label="Total pedidos" delay={0} />
        <StatCard icon="⏳" value={String(stats.pendientes)} label="Pendientes" delay={100} />
        <StatCard icon="🛵" value={String(stats.en_camino)} label="En camino" delay={200} />
        <StatCard icon="✅" value={String(stats.entregados)} label="Entregados" delay={300} />
      </div>

      <div className="white-card">
        <div className="white-card-header">
          <div className="white-card-title">📋 Historial de pedidos</div>
          <button className="btn btn-white" style={{ fontSize: 11, padding: '5px 12px' }} onClick={fetchData}>🔄 Actualizar</button>
        </div>
        <div className="filters-row">
          {['todos','pendiente','asignado','en_camino','entregado','cancelado'].map(f => (
            <button key={f} className={`filter-btn ${filter===f?'active':''}`} onClick={() => setFilter(f)}>
              {f === 'todos' ? '🗂️ Todos' : `${ESTADO[f]?.emoji} ${ESTADO[f]?.label || f}`}
            </button>
          ))}
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table className="rv-table">
            <thead><tr><th>#</th><th>Cliente</th><th>Descripción</th><th>Dirección</th><th>Estado</th><th>Fecha</th></tr></thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} style={{ padding: '2rem', textAlign: 'center', color: '#aaa' }}>⏳ Cargando...</td></tr>
              ) : filtrados.length === 0 ? (
                <tr><td colSpan={6} style={{ padding: '2rem', textAlign: 'center', color: '#aaa' }}>😶 Sin resultados</td></tr>
              ) : filtrados.map(p => {
                const est = ESTADO[p.estado] || { label: p.estado, cls: 'badge-neutral', emoji: '📌' };
                return (
                  <tr key={p.id}>
                    <td className="m">#{String(p.id).slice(-6)}</td>
                    <td className="p">{p.cliente_nombre || p.descripcion}</td>
                    <td>{p.descripcion}</td>
                    <td>{p.direccion_entrega || p.direccion_destino}</td>
                    <td><span className={`badge ${est.cls}`}><span className="badge-dot" />{est.emoji} {est.label}</span></td>
                    <td className="m">{p.created_at ? new Date(p.created_at).toLocaleDateString('es-CO') : '—'}</td>
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
            <div className="modal-title">➕ Nuevo pedido</div>
            <div className="modal-sub">Completa los datos de la entrega</div>
            <form onSubmit={crear} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {[
                { k:'cliente_nombre',    l:'👤 Nombre del cliente',   p:'Juan García' },
                { k:'telefono',          l:'📞 Teléfono',             p:'300 000 0000' },
                { k:'direccion_entrega', l:'📍 Dirección de entrega', p:'Calle 10 #5-20' },
                { k:'descripcion',       l:'📦 Descripción',          p:'Caja de documentos' },
              ].map(f => (
                <div key={f.k}>
                  <div className="field-label">{f.l}</div>
                  <input type="text" placeholder={f.p} value={form[f.k]} onChange={e => setForm(v => ({...v,[f.k]:e.target.value}))} required />
                </div>
              ))}
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                <button type="button" onClick={() => setModal(false)} style={{ flex:1, height:44, borderRadius:12, background:'#f0f2ff', border:'none', fontFamily:'Poppins,sans-serif', fontWeight:600, fontSize:13, color:'#4a4a6a', cursor:'pointer' }}>Cancelar</button>
                <button type="submit" disabled={saving} style={{ flex:1, height:44, borderRadius:12, background:'linear-gradient(135deg,#667eea,#764ba2)', border:'none', fontFamily:'Poppins,sans-serif', fontWeight:700, fontSize:13, color:'#fff', cursor:'pointer', opacity: saving ? 0.7 : 1 }}>
                  {saving ? '⏳ Creando...' : '🚀 Crear pedido'}
                </button>
              </div>
            </form>
          </div>
        </Modal>
      )}
    </DashboardLayout>
  );
}