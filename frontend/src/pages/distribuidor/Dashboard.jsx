import Modal from '../../components/Modal';
import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import DashboardLayout from '../../components/DashboardLayout';

const API = import.meta.env.VITE_PEDIDOS_URL;

const ESTADO = {
  pendiente:  { label: 'PENDIENTE',  cls: 'badge-warn' },
  asignado:   { label: 'ASIGNADO',   cls: 'badge-info' },
  en_camino:  { label: 'EN CAMINO',  cls: 'badge-info' },
  entregado:  { label: 'ENTREGADO',  cls: 'badge-ok'   },
  cancelado:  { label: 'CANCELADO',  cls: 'badge-err'  },
};

const S = {
  section: { padding: '0 1.25rem 1.25rem' },
  sectionTop: { padding: '1rem 1.25rem', borderBottom: '1px solid rgba(184,207,232,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  label: { fontSize: 7, fontFamily: 'var(--font-mono)', color: 'var(--dim)', letterSpacing: '0.1em', textTransform: 'uppercase' },
  val: { fontSize: '1.6rem', fontWeight: 700, color: 'rgba(184,207,232,0.7)', letterSpacing: '-0.05em', lineHeight: 1 },
};

export default function DistribuidorDashboard() {
  const { token } = useAuth();
  const [pedidos, setPedidos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal]     = useState(false);
  const [form, setForm]       = useState({ cliente_nombre: '', telefono: '', direccion_entrega: '', descripcion: '' });
  const [saving, setSaving]   = useState(false);
  const [filter, setFilter]   = useState('todos');

  const h = { Authorization: `Bearer ${token}` };

  async function fetch() {
    try { const { data } = await axios.get(`${API}/pedidos/mis-pedidos`, { headers: h }); setPedidos(data); }
    catch {} finally { setLoading(false); }
  }

  useEffect(() => { fetch(); }, []);

  async function crear(e) {
    e.preventDefault(); setSaving(true);
    try { await axios.post(`${API}/pedidos`, form, { headers: h }); setModal(false); setForm({ cliente_nombre: '', telefono: '', direccion_entrega: '', descripcion: '' }); fetch(); }
    catch {} finally { setSaving(false); }
  }

  const filtrados = filter === 'todos' ? pedidos : pedidos.filter(p => p.estado === filter);
  const stats = { total: pedidos.length, pendientes: pedidos.filter(p => p.estado === 'pendiente').length, en_camino: pedidos.filter(p => p.estado === 'en_camino').length, entregados: pedidos.filter(p => p.estado === 'entregado').length };

  return (
    <DashboardLayout role="distribuidor" pageTitle="Dashboard">

      {/* Header */}
      <div style={S.sectionTop}>
        <div>
          <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--blue2)', letterSpacing: '-0.02em' }}>Mis pedidos</div>
          <div style={{ ...S.label, marginTop: 2 }}>GESTIONA Y CREA SOLICITUDES DE ENTREGA</div>
        </div>
        <button onClick={() => setModal(true)} style={{ height: 32, padding: '0 14px', background: 'var(--blue)', border: 'none', cursor: 'pointer', fontSize: 8, fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--ink)', letterSpacing: '0.08em', textTransform: 'uppercase', transition: 'background 0.15s' }}>
          + NUEVO PEDIDO
        </button>
      </div>

      {/* Stats 2x2 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', borderBottom: '1px solid rgba(184,207,232,0.08)' }}>
        {[
          { label: 'Total',      value: stats.total },
          { label: 'Pendientes', value: stats.pendientes },
          { label: 'En camino',  value: stats.en_camino },
          { label: 'Entregados', value: stats.entregados },
        ].map((s, i) => (
          <div key={s.label} style={{ padding: '0.85rem 1.1rem', borderRight: i < 3 ? '1px solid rgba(184,207,232,0.08)' : 'none', transition: 'background 0.15s', cursor: 'default' }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(184,207,232,0.04)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
            <div style={S.label}>{s.label}</div>
            <div style={S.val}>{loading ? '—' : String(s.value).padStart(2, '0')}</div>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div style={{ display: 'flex', borderBottom: '1px solid rgba(184,207,232,0.08)', padding: '0 1.25rem' }}>
        {['todos', 'pendiente', 'asignado', 'en_camino', 'entregado'].map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{
            padding: '8px 12px', fontSize: 7, fontFamily: 'var(--font-mono)', fontWeight: 700,
            letterSpacing: '0.08em', textTransform: 'uppercase',
            background: filter === f ? 'rgba(184,207,232,0.07)' : 'transparent',
            color: filter === f ? 'var(--blue)' : 'var(--dim)',
            border: 'none', borderRight: '1px solid rgba(184,207,232,0.06)', cursor: 'pointer', transition: 'all 0.15s',
          }}>
            {f === 'todos' ? 'TODOS' : ESTADO[f]?.label || f}
          </button>
        ))}
      </div>

      {/* Tabla */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              {['#', 'Cliente', 'Descripción', 'Dirección', 'Estado', 'Fecha'].map(h => (
                <th key={h} style={{ padding: '6px 1rem', textAlign: 'left', fontSize: 6, fontFamily: 'var(--font-mono)', color: 'rgba(184,207,232,0.2)', letterSpacing: '0.1em', textTransform: 'uppercase', borderBottom: '1px solid rgba(184,207,232,0.07)', whiteSpace: 'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} style={{ padding: '2rem', textAlign: 'center', fontSize: 9, fontFamily: 'var(--font-mono)', color: 'rgba(184,207,232,0.2)', letterSpacing: '0.06em' }}>CARGANDO...</td></tr>
            ) : filtrados.length === 0 ? (
              <tr><td colSpan={6} style={{ padding: '2rem', textAlign: 'center', fontSize: 9, fontFamily: 'var(--font-mono)', color: 'rgba(184,207,232,0.15)', letterSpacing: '0.06em' }}>SIN RESULTADOS</td></tr>
            ) : filtrados.map(p => {
              const est = ESTADO[p.estado] || { label: p.estado.toUpperCase(), cls: 'badge-neutral' };
              return (
                <tr key={p.id} style={{ borderBottom: '1px solid rgba(184,207,232,0.05)', transition: 'background 0.15s', cursor: 'default' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(184,207,232,0.04)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <td style={{ padding: '7px 1rem', fontSize: 9, fontFamily: 'var(--font-mono)', color: 'rgba(184,207,232,0.2)' }}>#{String(p.id).slice(-6)}</td>
                  <td style={{ padding: '7px 1rem', fontSize: 11, fontWeight: 600, color: 'var(--blue2)' }}>{p.cliente_nombre}</td>
                  <td style={{ padding: '7px 1rem', fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--dim)' }}>{p.descripcion}</td>
                  <td style={{ padding: '7px 1rem', fontSize: 9, fontFamily: 'var(--font-mono)', color: 'var(--dim)', maxWidth: 180 }}>{p.direccion_entrega}</td>
                  <td style={{ padding: '7px 1rem' }}><span className={`badge ${est.cls}`}>{est.label}</span></td>
                  <td style={{ padding: '7px 1rem', fontSize: 8, fontFamily: 'var(--font-mono)', color: 'rgba(184,207,232,0.2)', whiteSpace: 'nowrap' }}>{p.created_at ? new Date(p.created_at).toLocaleDateString('es-CO') : '—'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {modal && (
        <Modal onClose={() => setModal(false)} width={420}>
          <div style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--blue2)' }}>Nuevo pedido</div>
              <button onClick={() => setModal(false)} style={{ background: 'none', border: '1px solid rgba(184,207,232,0.15)', color: 'var(--dim)', fontSize: 12, cursor: 'pointer', width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-mono)' }}>✕</button>
            </div>
            <form onSubmit={crear} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {[
                { key: 'cliente_nombre',    label: 'Nombre del cliente',    placeholder: 'Juan García' },
                { key: 'telefono',          label: 'Teléfono',              placeholder: '300 000 0000' },
                { key: 'direccion_entrega', label: 'Dirección de entrega',  placeholder: 'Calle 10 #5-20' },
                { key: 'descripcion',       label: 'Descripción',           placeholder: 'Caja de documentos' },
              ].map(f => (
                <div key={f.key}>
                  <div style={{ fontSize: 7, fontFamily: 'var(--font-mono)', color: 'var(--dim)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4 }}>{f.label}</div>
                  <input type="text" placeholder={f.placeholder} value={form[f.key]} onChange={e => setForm(v => ({ ...v, [f.key]: e.target.value }))} required />
                </div>
              ))}
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                <button type="button" onClick={() => setModal(false)} style={{ flex: 1, height: 38, background: 'transparent', border: '1px solid rgba(184,207,232,0.15)', color: 'var(--dim)', fontSize: 8, fontFamily: 'var(--font-mono)', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', cursor: 'pointer' }}>CANCELAR</button>
                <button type="submit" disabled={saving} style={{ flex: 1, height: 38, background: 'var(--blue)', border: 'none', color: 'var(--ink)', fontSize: 8, fontFamily: 'var(--font-mono)', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', cursor: 'pointer', opacity: saving ? 0.5 : 1 }}>
                  {saving ? 'CREANDO...' : '+ CREAR'}
                </button>
              </div>
            </form>
          </div>
        </Modal>
      )}
    </DashboardLayout>
  );
}